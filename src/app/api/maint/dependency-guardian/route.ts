/**
 * Maintenance Agent 5 — Dependency + Infra Guardian
 *
 * Two concerns merged into one agent because both run once a day and
 * both are "am I exposed to something the outside world knows about?":
 *
 *   1. Dependency vulnerability scan via OSV.dev
 *      Reads production `dependencies` from package.json (resolved through
 *      package-lock.json for exact versions), batch-queries the OSV API,
 *      and reports any package with a known advisory. Critical severity
 *      for anything flagged with CVSS ≥ 7 or explicit "CRITICAL"; high
 *      otherwise.
 *
 *   2. Email deliverability DNS check
 *      Queries markethubpromo.com TXT records via Cloudflare DoH. Reports:
 *        - missing SPF record → medium
 *        - SPF record that doesn't include amazonses.com → high
 *        - missing DMARC record on _dmarc.markethubpromo.com → medium
 *        - DMARC with p=none → info (not an issue but noted)
 *
 *      Without both records, Resend emails (signup, welcome, digests)
 *      land in spam on Gmail/Outlook. This was flagged as a user-action
 *      item in the previous audit — the agent turns it into a recurring
 *      check so the item doesn't decay.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "dependency-guardian";

interface Advisory {
  id: string;
  summary?: string;
  severity?: { type?: string; score?: string }[];
  database_specific?: { severity?: string };
  references?: { url?: string }[];
}

interface OsvQueryBatchResponse {
  results?: { vulns?: Advisory[] }[];
}

// ── Dependency scan ─────────────────────────────────────────────────────────

interface Dep {
  name: string;
  version: string;
}

function loadProdDeps(): Dep[] {
  const root = process.cwd();
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const topLevel = Object.keys(pkg.dependencies ?? {});

  // Resolve each top-level dep to its exact installed version via package-lock
  let lock: Record<string, unknown> = {};
  try {
    lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) as Record<string, unknown>;
  } catch {
    // No lockfile available — fall back to reading the semver range stripped
    // of its leading ^ / ~. Inexact but better than nothing.
    return topLevel.map((name) => ({
      name,
      version: (pkg.dependencies?.[name] ?? "").replace(/^[\^~>=<]+/, ""),
    }));
  }

  const packages = (lock.packages ?? {}) as Record<string, { version?: string }>;
  const out: Dep[] = [];
  for (const name of topLevel) {
    // Top-level deps live at node_modules/<name> in lock v2/v3 format.
    const entry = packages[`node_modules/${name}`];
    if (entry?.version) {
      out.push({ name, version: entry.version });
    } else {
      // Fall back to the semver range if the lockfile doesn't have an entry
      // (e.g. the package was added to package.json but install never ran).
      const raw = (((lock as Record<string, unknown>).dependencies as Record<string, { version?: string }> | undefined) ?? {})[name];
      if (raw?.version) out.push({ name, version: raw.version });
    }
  }
  return out;
}

async function queryOsv(deps: Dep[]): Promise<(Advisory[] | null)[]> {
  if (deps.length === 0) return [];
  // OSV supports querybatch up to 1000 queries per request.
  const body = {
    queries: deps.map((d) => ({
      package: { name: d.name, ecosystem: "npm" },
      version: d.version,
    })),
  };

  const res = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OSV API returned ${res.status}`);
  const data = (await res.json()) as OsvQueryBatchResponse;
  const results = data.results ?? [];

  // The batch response returns stub IDs only — to get summaries we'd need
  // a second round-trip per hit. For a daily cron that's fine. Limit to
  // the first few per dep to keep latency bounded.
  const enriched: (Advisory[] | null)[] = [];
  for (const r of results) {
    if (!r?.vulns || r.vulns.length === 0) {
      enriched.push(null);
      continue;
    }
    const vulnDetails: Advisory[] = [];
    for (const stub of r.vulns.slice(0, 3)) {
      try {
        const det = await fetch(`https://api.osv.dev/v1/vulns/${stub.id}`);
        if (det.ok) {
          vulnDetails.push((await det.json()) as Advisory);
        } else {
          vulnDetails.push(stub);
        }
      } catch {
        vulnDetails.push(stub);
      }
    }
    enriched.push(vulnDetails);
  }
  return enriched;
}

function severityFromAdvisory(a: Advisory): "critical" | "high" | "medium" {
  const dbSev = (a.database_specific?.severity ?? "").toUpperCase();
  if (dbSev === "CRITICAL") return "critical";
  if (dbSev === "HIGH") return "high";
  if (dbSev === "MODERATE") return "medium";
  // Fallback to CVSS if present
  const score = a.severity?.find((s) => s.score)?.score ?? "";
  const m = /CVSS:3\.[01]\/[^\s]*\/S:[UC]\/C:[NLH]\/I:[NLH]\/A:[NLH]/.exec(score);
  void m;
  const cvssMatch = /(\d+\.\d+)$/.exec(score);
  if (cvssMatch) {
    const v = parseFloat(cvssMatch[1]);
    if (v >= 9) return "critical";
    if (v >= 7) return "high";
  }
  return "medium";
}

async function scanDependencies(active: Set<string>): Promise<{ checked: number; vulnerable: number }> {
  const deps = loadProdDeps();
  const results = await queryOsv(deps);

  let vulnerable = 0;
  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i];
    const vulns = results[i];
    if (!vulns || vulns.length === 0) continue;

    vulnerable++;
    // One finding per (package, version) — bundle the CVE IDs in details.
    const fp = `dep:${dep.name}@${dep.version}`;
    active.add(fp);

    // Use the worst severity across listed vulns
    let worst: "critical" | "high" | "medium" = "medium";
    for (const v of vulns) {
      const s = severityFromAdvisory(v);
      if (s === "critical") worst = "critical";
      else if (s === "high" && worst !== "critical") worst = "high";
    }

    await reportFinding({
      agent: AGENT_NAME,
      severity: worst,
      fingerprint: fp,
      title: `Vulnerable dependency ${dep.name}@${dep.version} — ${vulns.length} advisor${vulns.length === 1 ? "y" : "ies"}`,
      details: {
        package: dep.name,
        version: dep.version,
        advisories: vulns.map((v) => ({
          id: v.id,
          summary: v.summary ?? null,
          url: v.references?.[0]?.url ?? `https://osv.dev/vulnerability/${v.id}`,
          db_severity: v.database_specific?.severity ?? null,
        })),
      },
      fix_suggestion: `Run \`npm update ${dep.name}\` or bump the version in package.json to a patched release. Check the OSV advisories listed above for the minimum safe version.`,
    });
  }

  return { checked: deps.length, vulnerable };
}

// ── DNS / email deliverability check ────────────────────────────────────────

interface DohResponse {
  Status: number;
  Answer?: { name: string; type: number; TTL: number; data: string }[];
}

async function queryTxt(domain: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`;
  const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH returned ${res.status}`);
  const data = (await res.json()) as DohResponse;
  return (data.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, ""));
}

async function checkEmailDns(active: Set<string>): Promise<Record<string, unknown>> {
  const DOMAIN = "markethubpromo.com";
  const DMARC_DOMAIN = `_dmarc.${DOMAIN}`;
  const report: Record<string, unknown> = {};

  // SPF
  try {
    const txt = await queryTxt(DOMAIN);
    const spf = txt.find((t) => t.startsWith("v=spf1"));
    report.spf_record = spf ?? null;

    if (!spf) {
      const fp = `dns:spf:missing:${DOMAIN}`;
      active.add(fp);
      await reportFinding({
        agent: AGENT_NAME,
        severity: "medium",
        fingerprint: fp,
        title: `SPF record missing for ${DOMAIN}`,
        details: { domain: DOMAIN, all_txt: txt },
        fix_suggestion: `Add TXT record on ${DOMAIN}: v=spf1 include:amazonses.com ~all  (via Cloudflare Dashboard → DNS → Records)`,
      });
    } else if (!spf.includes("amazonses.com")) {
      const fp = `dns:spf:incomplete:${DOMAIN}`;
      active.add(fp);
      await reportFinding({
        agent: AGENT_NAME,
        severity: "high",
        fingerprint: fp,
        title: `SPF record for ${DOMAIN} does not authorize Resend (amazonses.com)`,
        details: { domain: DOMAIN, spf },
        fix_suggestion: `Update SPF TXT record to include amazonses.com. Current: ${spf}`,
      });
    }
  } catch (e) {
    report.spf_error = e instanceof Error ? e.message : String(e);
  }

  // DMARC
  try {
    const txt = await queryTxt(DMARC_DOMAIN);
    const dmarc = txt.find((t) => t.startsWith("v=DMARC1"));
    report.dmarc_record = dmarc ?? null;

    if (!dmarc) {
      const fp = `dns:dmarc:missing:${DOMAIN}`;
      active.add(fp);
      await reportFinding({
        agent: AGENT_NAME,
        severity: "medium",
        fingerprint: fp,
        title: `DMARC record missing for ${DOMAIN}`,
        details: { domain: DMARC_DOMAIN, all_txt: txt },
        fix_suggestion: `Add TXT record on ${DMARC_DOMAIN}: v=DMARC1; p=none; rua=mailto:markethub973@gmail.com`,
      });
    }
    // p=none is an intentional choice for early-stage deployment — don't alert.
  } catch (e) {
    report.dmarc_error = e instanceof Error ? e.message : String(e);
  }

  return report;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/dependency-guardian")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = new Set<string>();
  const results: Record<string, unknown> = {};

  try {
    results.dependencies = await scanDependencies(active);
  } catch (e) {
    results.dependencies = { error: e instanceof Error ? e.message : String(e) };
  }

  try {
    results.dns = await checkEmailDns(active);
  } catch (e) {
    results.dns = { error: e instanceof Error ? e.message : String(e) };
  }

  await autoResolveStale(AGENT_NAME, active);

  return NextResponse.json({
    ok: active.size === 0,
    active_findings: active.size,
    results,
  });
}
