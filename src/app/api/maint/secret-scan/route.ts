/**
 * Maintenance Agent 4 — Secret / Config Leakage Scanner
 *
 * Walks the tracked source tree looking for hardcoded credentials that
 * might have slipped into the repo: Stripe live keys, Anthropic keys,
 * GitHub PATs, AWS access keys, and generic `password = "..."` patterns.
 *
 * Runs inside the Vercel build output directory, so it scans the code
 * that's actually been deployed — if a secret makes it into prod, we
 * catch it within one agent run.
 *
 * Any hit becomes a CRITICAL finding because a leaked key is immediate
 * blast radius. Fingerprint: `secret:${relativeFile}:${patternId}:${lineNo}`
 * so rotating a key → editing the file → next run auto-resolves the
 * finding via autoResolveStale.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "secret-scan";

// Directories to walk. Keep it tight — the agent should not scan node_modules
// or .next because (a) they're huge and (b) they won't be the origin of
// committed leaks.
const SCAN_ROOTS = ["src", "scripts", "supabase", ".github"];

// Extensions we'll read. Everything else is skipped.
const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".sql",
  ".sh",
  ".env",
]);

interface Pattern {
  id: string;
  label: string;
  regex: RegExp;
  severity: "critical" | "high";
  // Optional filter: only flag if matched text contains this substring.
  requires?: string;
  // Optional filter: skip if matched line contains any of these.
  falsePositiveMarkers?: string[];
}

// Each pattern uses a capture group so we can extract the secret for logging
// (truncated) and so the regex doesn't accidentally match the whole line.
const PATTERNS: Pattern[] = [
  {
    id: "stripe-live",
    label: "Stripe live secret key (sk_live_...)",
    regex: /\b(sk_live_[A-Za-z0-9]{24,})\b/g,
    severity: "critical",
  },
  {
    id: "stripe-restricted",
    label: "Stripe restricted key (rk_live_...)",
    regex: /\b(rk_live_[A-Za-z0-9]{24,})\b/g,
    severity: "critical",
  },
  {
    id: "anthropic-key",
    label: "Anthropic API key (sk-ant-...)",
    regex: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/g,
    severity: "critical",
  },
  {
    id: "openai-key",
    label: "OpenAI API key (sk-...)",
    // OpenAI classic keys are sk-<48 chars>. Be strict on length so we don't
    // collide with Anthropic (already handled above) or variable names.
    regex: /\b(sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{48})\b/g,
    severity: "critical",
    falsePositiveMarkers: ["sk-ant-"], // Anthropic keys handled separately
  },
  {
    id: "github-pat-classic",
    label: "GitHub classic PAT (ghp_...)",
    regex: /\b(ghp_[A-Za-z0-9]{36,})\b/g,
    severity: "critical",
  },
  {
    id: "github-pat-fine",
    label: "GitHub fine-grained PAT (github_pat_...)",
    regex: /\b(github_pat_[A-Za-z0-9_]{22,})\b/g,
    severity: "critical",
  },
  {
    id: "aws-access-key",
    label: "AWS access key ID (AKIA...)",
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    severity: "critical",
  },
  {
    id: "aws-secret",
    label: "AWS secret assignment",
    // Matches `aws_secret_access_key = "..."` or `AWS_SECRET_ACCESS_KEY="..."`
    regex: /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*["']([A-Za-z0-9/+=]{40})["']/gi,
    severity: "critical",
  },
  {
    id: "google-api-key",
    label: "Google API key (AIza...)",
    regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g,
    severity: "high",
  },
  {
    id: "resend-key",
    label: "Resend API key (re_...)",
    regex: /\b(re_[A-Za-z0-9]{20,})\b/g,
    severity: "critical",
  },
  {
    id: "supabase-service-role",
    label: "Supabase service_role JWT hardcoded",
    // Supabase JWTs always contain `"role":"service_role"` when base64-decoded.
    // Matching on the raw JWT is too noisy (anon keys are JWTs too and are
    // NEXT_PUBLIC_*). We look for a JWT string literal preceded by something
    // like `service_role` in the same line.
    regex: /(service_role|SERVICE_ROLE)[^\n]*["'`](eyJ[A-Za-z0-9._-]{60,})["'`]/g,
    severity: "critical",
  },
  {
    id: "generic-password-literal",
    label: "Hardcoded password literal",
    regex: /(password|passwd|pwd)\s*[:=]\s*["']([^"'\s]{8,})["']/gi,
    severity: "high",
    falsePositiveMarkers: [
      "process.env",
      "${",
      "placeholder",
      "example",
      "your-password",
      "changeme",
      "password-here",
      "password123", // obviously test
      "'password'", // column name in SQL select
      '"password"',
    ],
  },
];

interface Hit {
  file: string;
  line: number;
  patternId: string;
  label: string;
  severity: Pattern["severity"];
  snippet: string;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (
      name === "node_modules" ||
      name === ".next" ||
      name === "dist" ||
      name === ".vercel" ||
      name === ".turbo"
    ) {
      continue;
    }
    // Never scan .env.local etc — they're .gitignored and will always contain
    // real secrets by design. The agent cares about what's committed.
    if (name.startsWith(".env") && name !== ".env.example") continue;

    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    // Only read files with a scannable extension (or .env.example as a named file)
    const ext = name.slice(name.lastIndexOf("."));
    if (SCAN_EXTENSIONS.has(ext) || name === ".env.example") {
      out.push(full);
    }
  }
  return out;
}

function scanFile(file: string, rel: string): Hit[] {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  // Skip huge files outright — they're rarely source, often fixtures/bundles.
  if (text.length > 1_000_000) return [];

  const lines = text.split("\n");
  const hits: Hit[] = [];
  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.regex.exec(text)) !== null) {
      // Find the line number of the match (count \n before match index)
      const upToMatch = text.slice(0, m.index);
      const lineNo = upToMatch.split("\n").length;
      const lineText = lines[lineNo - 1] ?? "";

      // False positive checks
      if (pattern.falsePositiveMarkers?.some((marker) => lineText.toLowerCase().includes(marker.toLowerCase()))) {
        continue;
      }
      if (pattern.requires && !m[0].includes(pattern.requires)) {
        continue;
      }

      // Capture the first non-empty group for the snippet (truncate to 24 chars)
      const captured = m[1] ?? m[0];
      const snippet = captured.length > 24 ? `${captured.slice(0, 6)}…${captured.slice(-4)}` : captured;

      hits.push({
        file: rel,
        line: lineNo,
        patternId: pattern.id,
        label: pattern.label,
        severity: pattern.severity,
        snippet,
      });
    }
  }
  return hits;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/secret-scan")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const root = process.cwd();
  const files: string[] = [];
  for (const relDir of SCAN_ROOTS) {
    const dir = join(root, relDir);
    walk(dir, files);
  }
  // Also scan a few explicit top-level files
  for (const topFile of ["package.json", ".env.example", "README.md"]) {
    try {
      const full = join(root, topFile);
      if (statSync(full).isFile()) files.push(full);
    } catch {
      /* ignore */
    }
  }

  const allHits: Hit[] = [];
  for (const file of files) {
    const rel = file.replace(root + "/", "");
    allHits.push(...scanFile(file, rel));
  }

  const active = new Set<string>();
  for (const h of allHits) {
    const fp = `secret:${h.patternId}:${h.file}:${h.line}`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: h.severity,
      fingerprint: fp,
      title: `${h.label} hardcoded in ${h.file}:${h.line}`,
      details: {
        file: h.file,
        line: h.line,
        pattern_id: h.patternId,
        snippet: h.snippet,
      },
      fix_suggestion: `1. Rotate the exposed secret IMMEDIATELY in its provider console.\n2. Move the value to an environment variable (process.env.X) and read it from Vercel env.\n3. Remove the literal from ${h.file}:${h.line}.\n4. Purge from git history if the commit has been pushed (git filter-repo or BFG).`,
    });
  }

  await autoResolveStale(AGENT_NAME, active);

  return NextResponse.json({
    ok: allHits.length === 0,
    scanned_files: files.length,
    hits: allHits.length,
    by_pattern: allHits.reduce((acc: Record<string, number>, h) => {
      acc[h.patternId] = (acc[h.patternId] ?? 0) + 1;
      return acc;
    }, {}),
    findings: allHits.map((h) => ({
      file: h.file,
      line: h.line,
      pattern: h.patternId,
      severity: h.severity,
      snippet: h.snippet,
    })),
  });
}
