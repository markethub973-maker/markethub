/**
 * SIEM — Security Information and Event Management
 * Logs security events to Supabase and sends email alerts for HIGH/CRITICAL.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { after } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "markethub973@gmail.com";

export type SecurityEventType =
  | "brute_force_login"        // multiple failed logins from same IP
  | "brute_force_admin"        // multiple failed admin tunnel attempts
  | "rate_limit_exceeded"      // IP hit rate limit repeatedly
  | "suspicious_user_agent"    // bot/scanner user agent
  | "admin_login"              // successful admin login
  | "admin_login_failed"       // failed admin password
  | "api_key_invalid"          // bad API key used
  | "privilege_escalation"     // user tried to access higher plan route
  | "payload_too_large"        // oversized request body
  | "ssrf_attempt"             // private IP in external URL
  | "plan_bypass_attempt"      // tried to access gated route without plan
  | "new_user_signup"          // new user registration
  | "stripe_webhook_replay"    // duplicate Stripe event
  | "cron_unauthorized"        // cron endpoint hit without secret
  | "unusual_activity";        // generic suspicious pattern

export type Severity = "info" | "low" | "medium" | "high" | "critical";

// Default severities. Single-shot events get a LOW/MEDIUM baseline; the
// security-scan cron running at 06:00 UTC scans for brute-force patterns
// (5+ events from same IP in 24h) and emits a separate "unusual_activity"
// HIGH event per pattern. This keeps the critical/high noise floor low
// enough that a real critical alert is actually meaningful.
const SEVERITY_MAP: Record<SecurityEventType, Severity> = {
  brute_force_login:       "medium",
  brute_force_admin:       "medium", // pattern detector upgrades to high/critical
  rate_limit_exceeded:     "low",
  suspicious_user_agent:   "low",
  admin_login:             "info",
  admin_login_failed:      "medium",
  api_key_invalid:         "medium",
  privilege_escalation:    "high",
  payload_too_large:       "low",
  ssrf_attempt:            "high",
  plan_bypass_attempt:     "medium",
  new_user_signup:         "info",
  stripe_webhook_replay:   "low",
  cron_unauthorized:       "medium",
  unusual_activity:        "medium",
};

const ALERT_ON: Severity[] = ["high", "critical"];

export async function logSecurityEvent({
  event_type,
  ip,
  user_agent,
  user_id,
  path,
  details,
  severity: severityOverride,
}: {
  event_type: SecurityEventType;
  ip?: string;
  user_agent?: string;
  user_id?: string;
  path?: string;
  details?: Record<string, unknown>;
  severity?: Severity;
}): Promise<void> {
  const severity = severityOverride ?? SEVERITY_MAP[event_type] ?? "info";

  const supa = createServiceClient();
  const { data: event } = await supa.from("security_events").insert({
    event_type,
    severity,
    ip: ip ?? null,
    user_agent: user_agent ? user_agent.slice(0, 300) : null,
    user_id: user_id ?? null,
    path: path ?? null,
    details: details ?? {},
  }).select("id").single();

  // Reactive SIEM hook — fire for medium+ events so brute_force_admin (and
  // other low-grade-but-real attacks) reach the analyst. The analyst itself
  // filters false alarms with Haiku. Cost: ~$0.03/month.
  //
  // CRITICAL: on Vercel serverless, plain fire-and-forget fetches get
  // killed when the route handler returns (the isolate freezes). We use
  // Next.js's `after()` primitive which tells the runtime "keep this
  // function alive until the callback finishes". Added in Next 15+, works
  // in both Route Handlers and Proxy.
  if ((severity === "medium" || severity === "high" || severity === "critical") && event?.id) {
    const cronSecret = process.env.CRON_SECRET;
    const eventId = event.id;
    if (cronSecret) {
      try {
        after(async () => {
          try {
            await fetch("https://viralstat-dashboard.vercel.app/api/cockpit/reactive-siem", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cronSecret}`,
              },
              body: JSON.stringify({ event_id: eventId }),
            });
          } catch { /* swallow — best-effort */ }
        });
      } catch {
        // Some contexts (e.g. the reactive-siem route itself calling
        // reportFinding which logs its own event) don't support after().
        // Silently skip the hook there — it'd infinite-loop anyway.
      }
    }
  }

  // Send immediate email alert for HIGH/CRITICAL
  if (ALERT_ON.includes(severity)) {
    const severityEmoji = severity === "critical" ? "🚨" : "⚠️";
    await resend.emails.send({
      from: "MarketHub Pro Security <noreply@markethubpromo.com>",
      to: ADMIN_EMAIL,
      subject: `${severityEmoji} [${severity.toUpperCase()}] ${event_type} — MarketHub Pro`,
      html: `
        <div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;background:#1C1814;color:#F5D7A0">
          <h2 style="color:${severity === "critical" ? "#EF4444" : "#F59E0B"};margin:0 0 16px">
            ${severityEmoji} Security Alert — ${severity.toUpperCase()}
          </h2>
          <table style="width:100%;border-collapse:collapse">
            ${[
              ["Event", event_type],
              ["Severity", severity.toUpperCase()],
              ["IP", ip ?? "unknown"],
              ["Path", path ?? "—"],
              ["User", user_id ?? "unauthenticated"],
              ["Time", new Date().toISOString()],
              ["Event ID", event?.id ?? "—"],
            ].map(([k, v]) => `
              <tr>
                <td style="padding:6px 12px;color:#A8967E;width:120px">${k}</td>
                <td style="padding:6px 12px;color:#FFF8F0">${v}</td>
              </tr>
            `).join("")}
          </table>
          ${details && Object.keys(details).length > 0 ? `
            <div style="margin-top:16px;padding:12px;background:#292524;border-radius:8px">
              <p style="margin:0 0 8px;color:#A8967E;font-size:12px">DETAILS</p>
              <pre style="margin:0;color:#10B981;font-size:12px;white-space:pre-wrap">${JSON.stringify(details, null, 2)}</pre>
            </div>
          ` : ""}
          <p style="margin-top:24px;font-size:12px;color:#78614E">
            <a href="https://markethubpromo.com/markethub973?t=${process.env.ADMIN_TUNNEL_SECRET}" style="color:#F59E0B">
              Deschide Admin → Security Events
            </a>
          </p>
        </div>
      `,
    }).catch(() => {}); // non-fatal
  }
}
