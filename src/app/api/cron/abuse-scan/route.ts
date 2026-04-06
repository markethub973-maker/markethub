/**
 * GET /api/cron/abuse-scan
 * Daily cron: scans all free accounts for duplicate IPs, device fingerprints,
 * and normalized emails. Auto-flags accounts exceeding thresholds.
 *
 * Auth: CRON_SECRET header
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const flagged: string[] = [];

  // ── 1. Get all free-trial profiles ───────────────────────────────────────
  const { data: freeProfiles } = await supa
    .from("profiles")
    .select("id, email, registration_ip, normalized_email, device_fingerprint, is_blocked")
    .eq("subscription_plan", "free_test")
    .eq("is_blocked", false);

  if (!freeProfiles || freeProfiles.length === 0) {
    return NextResponse.json({ ok: true, flagged: 0, message: "No free profiles to scan" });
  }

  // ── 2. Group by IP ─────────────────────────────────────────────────────────
  const ipGroups: Record<string, string[]> = {};
  freeProfiles.forEach((p: any) => {
    if (p.registration_ip && p.registration_ip !== "unknown") {
      if (!ipGroups[p.registration_ip]) ipGroups[p.registration_ip] = [];
      ipGroups[p.registration_ip].push(p.id);
    }
  });

  // ── 3. Group by normalized email ───────────────────────────────────────────
  const emailGroups: Record<string, string[]> = {};
  freeProfiles.forEach((p: any) => {
    if (p.normalized_email) {
      if (!emailGroups[p.normalized_email]) emailGroups[p.normalized_email] = [];
      emailGroups[p.normalized_email].push(p.id);
    }
  });

  // ── 4. Group by device fingerprint ─────────────────────────────────────────
  const deviceGroups: Record<string, string[]> = {};
  freeProfiles.forEach((p: any) => {
    if (p.device_fingerprint) {
      if (!deviceGroups[p.device_fingerprint]) deviceGroups[p.device_fingerprint] = [];
      deviceGroups[p.device_fingerprint].push(p.id);
    }
  });

  // ── 5. Flag accounts ───────────────────────────────────────────────────────
  async function flagUser(userId: string, reason: string, severity: "low" | "medium" | "high") {
    if (flagged.includes(userId)) return;
    flagged.push(userId);
    await supa.from("abuse_flags").upsert(
      { user_id: userId, reason, severity, resolved: false },
      { onConflict: "user_id,reason" }
    ).catch(() => {});
  }

  // IP: 3+ free accounts from same IP → flag all except oldest
  for (const [ip, ids] of Object.entries(ipGroups)) {
    if (ids.length >= 3) {
      // flag all after the first (oldest)
      for (const id of ids.slice(1)) {
        await flagUser(id, `Duplicate free account — IP ${ip} has ${ids.length} free accounts`, "high");
      }
    } else if (ids.length === 2) {
      for (const id of ids.slice(1)) {
        await flagUser(id, `Possible duplicate — IP ${ip} has 2 free accounts`, "medium");
      }
    }
  }

  // Normalized email: any duplicate → flag all except oldest
  for (const [email, ids] of Object.entries(emailGroups)) {
    if (ids.length >= 2) {
      for (const id of ids.slice(1)) {
        await flagUser(id, `Duplicate normalized email: ${email}`, "high");
      }
    }
  }

  // Device fingerprint: any duplicate → flag
  for (const [fp, ids] of Object.entries(deviceGroups)) {
    if (ids.length >= 2) {
      for (const id of ids.slice(1)) {
        await flagUser(id, `Same device fingerprint: ${fp} (${ids.length} accounts)`, "high");
      }
    }
  }

  // ── 6. Log scan result ─────────────────────────────────────────────────────
  await supa.from("cron_logs").upsert({
    job: "abuse-scan",
    ran_at: new Date().toISOString(),
    result: {
      scanned: freeProfiles.length,
      flagged: flagged.length,
      ip_groups_with_dupes: Object.values(ipGroups).filter(ids => ids.length >= 2).length,
      email_dupes: Object.values(emailGroups).filter(ids => ids.length >= 2).length,
      device_dupes: Object.values(deviceGroups).filter(ids => ids.length >= 2).length,
    },
  }, { onConflict: "job" }).catch(() => {});

  return NextResponse.json({
    ok: true,
    scanned: freeProfiles.length,
    flagged: flagged.length,
    ip_duplicates: Object.values(ipGroups).filter(ids => ids.length >= 2).length,
    email_duplicates: Object.values(emailGroups).filter(ids => ids.length >= 2).length,
    device_duplicates: Object.values(deviceGroups).filter(ids => ids.length >= 2).length,
  });
}
