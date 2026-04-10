/**
 * Daily security scan — runs at 06:00 UTC
 * Detects patterns in the last 24h and sends digest if anomalies found.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { logSecurityEvent } from "@/lib/siem";
import { timingSafeEqual } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "markethub973@gmail.com";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET ?? "";
  if (!secret || secret.length !== expected.length || !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Fetch last 24h events
  const { data: events } = await supa
    .from("security_events")
    .select("event_type, severity, ip, path, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (!events?.length) return NextResponse.json({ ok: true, events: 0 });

  const critical = events.filter(e => e.severity === "critical");
  const high = events.filter(e => e.severity === "high");
  const total = events.length;

  // Detect brute force IPs (same IP with 5+ events in 24h)
  const ipCounts = events.reduce((acc: Record<string, number>, e) => {
    if (e.ip) acc[e.ip] = (acc[e.ip] ?? 0) + 1;
    return acc;
  }, {});
  const bruteForceIPs = Object.entries(ipCounts).filter(([, c]) => c >= 5).map(([ip, c]) => `${ip} (${c} events)`);

  // Log brute force patterns detected
  if (bruteForceIPs.length > 0) {
    await logSecurityEvent({
      event_type: "unusual_activity",
      severity: "high",
      details: { brute_force_ips: bruteForceIPs, period: "24h" },
    });
  }

  // Send daily digest if there are HIGH/CRITICAL events
  if (critical.length > 0 || high.length > 0) {
    const rows = events.slice(0, 20).map(e =>
      `<tr style="border-bottom:1px solid #292524">
        <td style="padding:6px 10px;color:${e.severity === "critical" ? "#EF4444" : e.severity === "high" ? "#F59E0B" : "#A8967E"}">${e.severity.toUpperCase()}</td>
        <td style="padding:6px 10px;color:#FFF8F0;font-family:monospace">${e.event_type}</td>
        <td style="padding:6px 10px;color:#A8967E">${e.ip ?? "—"}</td>
        <td style="padding:6px 10px;color:#78614E">${new Date(e.created_at).toLocaleTimeString("en-GB")}</td>
      </tr>`
    ).join("");

    await resend.emails.send({
      from: "MarketHub Pro Security <noreply@markethubpromo.com>",
      to: ADMIN_EMAIL,
      subject: `🛡️ Daily Security Digest — ${critical.length} critical, ${high.length} high (${total} total)`,
      html: `
        <div style="font-family:monospace;max-width:650px;margin:0 auto;padding:24px;background:#1C1814;color:#F5D7A0">
          <h2 style="color:#F59E0B;margin:0 0 8px">🛡️ Daily Security Report</h2>
          <p style="color:#A8967E;margin:0 0 24px">${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
            ${[
              ["Total", total, "#F5D7A0"],
              ["Critical", critical.length, "#EF4444"],
              ["High", high.length, "#F59E0B"],
              ["Brute IPs", bruteForceIPs.length, bruteForceIPs.length > 0 ? "#EF4444" : "#10B981"],
            ].map(([l, v, c]) => `
              <div style="background:#292524;padding:12px;border-radius:8px;text-align:center">
                <div style="font-size:22px;font-weight:bold;color:${c}">${v}</div>
                <div style="font-size:11px;color:#78614E">${l}</div>
              </div>
            `).join("")}
          </div>

          ${bruteForceIPs.length > 0 ? `
            <div style="background:#292524;padding:12px;border-radius:8px;margin-bottom:16px;border-left:3px solid #EF4444">
              <p style="margin:0 0 8px;color:#EF4444;font-size:13px">⚡ Brute Force IPs Detected</p>
              ${bruteForceIPs.map(ip => `<p style="margin:2px 0;color:#F5D7A0;font-size:12px">${ip}</p>`).join("")}
            </div>
          ` : ""}

          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid #292524">
                <th style="text-align:left;padding:6px 10px;color:#78614E">SEV</th>
                <th style="text-align:left;padding:6px 10px;color:#78614E">EVENT</th>
                <th style="text-align:left;padding:6px 10px;color:#78614E">IP</th>
                <th style="text-align:left;padding:6px 10px;color:#78614E">TIME</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <p style="margin-top:24px;font-size:12px">
            <a href="https://markethubpromo.com/dashboard/admin" style="color:#F59E0B">
              → Deschide Security Dashboard
            </a>
          </p>
        </div>
      `,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, events: total, critical: critical.length, high: high.length });
}
