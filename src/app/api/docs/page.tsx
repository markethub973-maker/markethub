import type { Metadata } from "next";
import Link from "next/link";
import { Code, Key, Lock, Zap, ArrowLeft, Copy } from "lucide-react";
import DocsCopyBlock from "./DocsCopyBlock";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "Programmatic access to MarketHub Pro data — authentication, endpoints, examples. Pro plan or higher.",
  alternates: { canonical: "https://markethubpromo.com/api/docs" },
};

interface Endpoint {
  method: "GET" | "POST" | "DELETE";
  path: string;
  title: string;
  description: string;
  params?: { name: string; required: boolean; type: string; desc: string }[];
  example_curl: string;
  example_response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/me",
    title: "Current user",
    description:
      "Returns the authenticated user's profile. Useful as a 'hello world' to verify your token is working.",
    example_curl: `curl -H "Authorization: Bearer mkt_live_YOUR_TOKEN" \\
  https://markethubpromo.com/api/v1/me`,
    example_response: `{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "you@example.com",
    "name": "Alex",
    "plan": "pro",
    "created_at": "2026-04-01T10:23:45.000Z"
  },
  "auth": {
    "token_id": "uuid",
    "scopes": ["read"]
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/automations",
    title: "List automation runs",
    description:
      "Paginated list of your automation run history, newest first. Filter by status or template.",
    params: [
      { name: "limit", required: false, type: "number", desc: "1-100, default 20" },
      {
        name: "status",
        required: false,
        type: "string",
        desc: "queued | running | succeeded | failed",
      },
      {
        name: "template_slug",
        required: false,
        type: "string",
        desc: 'e.g. "social-cross-post"',
      },
    ],
    example_curl: `curl -H "Authorization: Bearer mkt_live_YOUR_TOKEN" \\
  "https://markethubpromo.com/api/v1/automations?status=succeeded&limit=5"`,
    example_response: `{
  "ok": true,
  "runs": [
    {
      "id": "uuid",
      "template_slug": "social-cross-post",
      "status": "succeeded",
      "error": null,
      "started_at": "2026-04-14T09:00:00Z",
      "finished_at": "2026-04-14T09:00:14Z",
      "duration_ms": 14120
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/posts",
    title: "List scheduled posts",
    description:
      "Paginated list of your scheduled + published posts across all platforms. Filter by status or date range.",
    params: [
      { name: "limit", required: false, type: "number", desc: "1-100, default 20" },
      {
        name: "status",
        required: false,
        type: "string",
        desc: "scheduled | published | draft | failed",
      },
      { name: "from", required: false, type: "YYYY-MM-DD", desc: "Lower bound on scheduled_for" },
      { name: "to", required: false, type: "YYYY-MM-DD", desc: "Upper bound on scheduled_for" },
    ],
    example_curl: `curl -H "Authorization: Bearer mkt_live_YOUR_TOKEN" \\
  "https://markethubpromo.com/api/v1/posts?status=scheduled&limit=10"`,
    example_response: `{
  "ok": true,
  "posts": [
    {
      "id": "uuid",
      "title": "Monday kickoff",
      "caption": "Let's go 🚀",
      "platforms": ["instagram", "linkedin"],
      "media_urls": ["https://..."],
      "status": "scheduled",
      "scheduled_for": "2026-04-15T09:00:00Z",
      "published_at": null,
      "created_at": "2026-04-14T07:00:00Z"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/leads",
    title: "List CRM leads",
    description:
      "Paginated leads (CRM + Lead Finder) belonging to the authenticated user.",
    params: [
      { name: "limit", required: false, type: "number", desc: "1-100, default 20" },
      {
        name: "pipeline_status",
        required: false,
        type: "string",
        desc: "new | qualified | contacted | won | lost",
      },
      { name: "source", required: false, type: "string", desc: "e.g. google_maps, facebook_groups, reddit" },
      { name: "contacted", required: false, type: "boolean", desc: "true / false" },
    ],
    example_curl: `curl -H "Authorization: Bearer mkt_live_YOUR_TOKEN" \\
  "https://markethubpromo.com/api/v1/leads?pipeline_status=qualified"`,
    example_response: `{
  "ok": true,
  "leads": [
    {
      "id": "uuid",
      "name": "Acme Cafe",
      "category": "Restaurant",
      "city": "Bucharest",
      "phone": "+40...",
      "website": "acmecafe.ro",
      "email": "hello@acmecafe.ro",
      "rating": 4.6,
      "source": "google_maps",
      "pipeline_status": "qualified",
      "contacted": false,
      "estimated_value": 1200,
      "created_at": "..."
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/v1/alt-text",
    title: "Generate image alt-text",
    description:
      "Accessibility alt-text (<=150 chars) for any public image URL. Powered by Claude Haiku vision. Pro+.",
    params: [
      { name: "image_url", required: true, type: "string", desc: "Public https URL of the image" },
      { name: "context", required: false, type: "string", desc: "Optional caption or post intent (<=300 chars) to guide tone" },
    ],
    example_curl: `curl -X POST -H "Authorization: Bearer mkt_live_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"image_url":"https://cdn.example.com/photo.jpg","context":"launch announcement"}' \\
  https://markethubpromo.com/api/v1/alt-text`,
    example_response: `{
  "ok": true,
  "alt_text": "Team of four engineers celebrating a product launch in a bright office, confetti mid-air"
}`,
  },
  {
    method: "GET",
    path: "/api/health",
    title: "Health check",
    description:
      "Uptime probe. No authentication needed. 200 if app + DB are reachable, 503 otherwise.",
    example_curl: `curl https://markethubpromo.com/api/health`,
    example_response: `{
  "status": "ok",
  "version": "abc12345",
  "region": "fra1",
  "total_ms": 87,
  "checks": { "database": { "ok": true, "latency_ms": 76 } },
  "timestamp": "2026-04-14T07:00:00.000Z"
}`,
  },
  {
    method: "GET",
    path: "/api/status",
    title: "Subsystem status",
    description:
      "Real-time health of every major subsystem (web, DB, cron jobs). Feeds the /status page. No auth.",
    example_curl: `curl https://markethubpromo.com/api/status`,
    example_response: `{
  "overall": "operational",
  "subsystems": [
    { "name": "Web App", "status": "operational", "last_check": "..." },
    { "name": "Database", "status": "operational", "last_check": "..." },
    { "name": "Auto-Post Engine", "status": "operational", "last_check": "..." }
  ],
  "generated_at": "...",
  "generated_in_ms": 43
}`,
  },
];

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET: { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  POST: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  DELETE: { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <header
        className="border-b sticky top-0 z-10"
        style={{
          borderColor: "rgba(245,215,160,0.3)",
          backgroundColor: "rgba(255,252,247,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold"
            style={{ color: "#292524" }}
          >
            <Code className="w-5 h-5" style={{ color: "#F59E0B" }} />
            MarketHub Pro API
          </Link>
          <Link
            href="/promo"
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: "#78614E" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "#292524" }}>
          API Documentation
        </h1>
        <p className="text-base mb-8" style={{ color: "#78614E" }}>
          Programmatic access to your MarketHub Pro data. Build integrations,
          internal dashboards, or automations beyond what the UI offers.
        </p>

        {/* Authentication */}
        <section className="mb-10">
          <h2
            className="text-xl font-bold mb-3 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Key className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Authentication
          </h2>
          <p className="text-sm mb-4" style={{ color: "#292524" }}>
            Every /api/v1/* endpoint requires a token via the{" "}
            <code
              className="px-1 py-0.5 rounded text-xs"
              style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#292524" }}
            >
              Authorization: Bearer mkt_live_...
            </code>{" "}
            header. /api/health and /api/status are public.
          </p>

          <div
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: "rgba(139,92,246,0.06)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <p className="text-sm font-bold mb-2" style={{ color: "#6D28D9" }}>
              Creating your first token
            </p>
            <ol
              className="text-sm space-y-1 list-decimal pl-5"
              style={{ color: "#292524" }}
            >
              <li>
                Sign in to your account and open{" "}
                <Link href="/settings" className="underline" style={{ color: "#8B5CF6" }}>
                  Settings
                </Link>
                .
              </li>
              <li>Scroll to the API section and click &quot;New token&quot;.</li>
              <li>Copy the plaintext token. It is shown only once.</li>
            </ol>
            <p className="text-xs mt-3" style={{ color: "#78614E" }}>
              Requires Pro plan or higher. Max 10 active tokens per user. You
              can set an optional expiry (1-1825 days).
            </p>
          </div>

          <DocsCopyBlock
            label="Example — verify your token works"
            code={`curl -H "Authorization: Bearer mkt_live_YOUR_TOKEN" \\
  https://markethubpromo.com/api/v1/me`}
          />
        </section>

        {/* Rate limits */}
        <section className="mb-10">
          <h2
            className="text-xl font-bold mb-3 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Zap className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Rate limits
          </h2>
          <div
            className="rounded-xl p-4 text-sm"
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "#292524",
            }}
          >
            <ul className="space-y-2">
              <li>
                <strong>General API</strong>: 120 requests / minute / IP
              </li>
              <li>
                <strong>AI endpoints</strong> (consultant chat, support
                tickets): 20 requests / minute / IP
              </li>
              <li>
                <strong>Auth endpoints</strong>: 10 requests / minute / IP
              </li>
            </ul>
            <p className="text-xs mt-3" style={{ color: "#78614E" }}>
              Exceeded requests return HTTP 429 with a{" "}
              <code className="text-[11px]">Retry-After</code> header. Our
              Cloudflare edge adds a second, looser layer before the app-level
              limit.
            </p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-10">
          <h2
            className="text-xl font-bold mb-4 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Code className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Endpoints
          </h2>

          <div className="space-y-6">
            {ENDPOINTS.map((ep) => {
              const mc = METHOD_COLORS[ep.method];
              return (
                <article
                  key={ep.path}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <header
                    className="px-5 py-3 border-b flex items-center gap-3"
                    style={{ borderColor: "rgba(0,0,0,0.06)" }}
                  >
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded-md"
                      style={{ backgroundColor: mc.bg, color: mc.color }}
                    >
                      {ep.method}
                    </span>
                    <code
                      className="text-sm font-mono"
                      style={{ color: "#292524" }}
                    >
                      {ep.path}
                    </code>
                  </header>
                  <div className="p-5">
                    <h3
                      className="text-base font-bold mb-1"
                      style={{ color: "#292524" }}
                    >
                      {ep.title}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#78614E" }}>
                      {ep.description}
                    </p>

                    {ep.params && ep.params.length > 0 && (
                      <div className="mb-4">
                        <p
                          className="text-[10px] font-bold uppercase tracking-wider mb-2"
                          style={{ color: "#78614E" }}
                        >
                          Query parameters
                        </p>
                        <table className="w-full text-xs">
                          <tbody>
                            {ep.params.map((p) => (
                              <tr
                                key={p.name}
                                className="border-b"
                                style={{ borderColor: "rgba(0,0,0,0.04)" }}
                              >
                                <td className="py-2 pr-3">
                                  <code
                                    className="font-mono"
                                    style={{ color: "#D97706" }}
                                  >
                                    {p.name}
                                  </code>
                                  {p.required && (
                                    <span
                                      className="text-[10px] ml-1"
                                      style={{ color: "#EF4444" }}
                                    >
                                      required
                                    </span>
                                  )}
                                </td>
                                <td
                                  className="py-2 pr-3 font-mono text-[11px]"
                                  style={{ color: "#78614E" }}
                                >
                                  {p.type}
                                </td>
                                <td
                                  className="py-2 text-xs"
                                  style={{ color: "#292524" }}
                                >
                                  {p.desc}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <DocsCopyBlock label="Request" code={ep.example_curl} />
                    <div className="mt-3">
                      <DocsCopyBlock
                        label="Response (200)"
                        code={ep.example_response}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Errors */}
        <section className="mb-10">
          <h2
            className="text-xl font-bold mb-3 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Lock className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Errors
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["400", "Bad request — missing/invalid params"],
                  ["401", "Missing or invalid token"],
                  ["403", "Plan does not allow this (e.g., below Pro)"],
                  ["404", "Resource not found"],
                  ["422", "Validation failed — see response.issues[]"],
                  ["429", "Rate limit — check Retry-After header"],
                  ["500", "Server error — reported to Sentry"],
                  ["503", "Dependency down — check /status"],
                ].map(([code, desc]) => (
                  <tr
                    key={code}
                    className="border-b"
                    style={{
                      borderColor: "rgba(0,0,0,0.04)",
                      backgroundColor: "white",
                    }}
                  >
                    <td className="px-4 py-3">
                      <code
                        className="font-mono font-bold"
                        style={{ color: "#292524" }}
                      >
                        {code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#292524" }}>
                      {desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Webhooks */}
        <section className="mb-10">
          <h2
            className="text-xl font-bold mb-3 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.43-2.22-.26-3.07A4 4 0 0 1 17 4.5"/><path d="m12 7.5-3.92 6.83"/></svg>
            Webhooks
          </h2>
          <p className="text-sm mb-4" style={{ color: "#292524" }}>
            Get notified at your URL when events happen. Each delivery is signed with HMAC-SHA256 using your webhook secret.
            Configure webhooks at <Link href="/settings" className="underline" style={{ color: "#D97706" }}>Settings → Webhooks</Link>.
          </p>

          <div
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#78614E" }}>
              Available events (10)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {[
                ["post.scheduled", "When a post is created via API"],
                ["post.published", "When auto-post cron publishes successfully"],
                ["post.failed", "When auto-post fails on a platform"],
                ["lead.created", "When a lead is created via API"],
                ["lead.status_changed", "When pipeline_status updates"],
                ["automation.completed", "When an n8n workflow finishes"],
                ["automation.failed", "When an n8n workflow errors"],
                ["image.generated", "When AI image gen succeeds"],
                ["video.generated", "When AI video gen succeeds"],
                ["audio.generated", "When AI audio gen succeeds"],
              ].map(([ev, desc]) => (
                <div key={ev} className="flex items-baseline gap-2">
                  <code style={{ color: "#D97706" }}>{ev}</code>
                  <span style={{ color: "#78614E" }}>— {desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#78614E" }}>
            HMAC verification (Node.js)
          </p>
          <DocsCopyBlock
            label="server.js"
            code={`import crypto from "node:crypto";

app.post("/webhooks/markethub", express.raw({ type: "application/json" }), (req, res) => {
  const secret = process.env.MKT_WEBHOOK_SECRET;
  const sig = req.headers["x-markethub-signature"]; // "sha256=<hex>"
  const expected = "sha256=" + crypto.createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  // Constant-time compare
  if (sig.length !== expected.length || !crypto.timingSafeEqual(
    Buffer.from(sig), Buffer.from(expected)
  )) {
    return res.status(401).end();
  }

  const event = req.headers["x-markethub-event"];
  const payload = JSON.parse(req.body);
  console.log("Got event:", event, payload.data);
  res.status(200).end();
});`}
          />

          <p className="text-xs font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: "#78614E" }}>
            HMAC verification (Python)
          </p>
          <DocsCopyBlock
            label="webhook_receiver.py"
            code={`import hmac, hashlib, os, json
from flask import Flask, request

app = Flask(__name__)
SECRET = os.environ["MKT_WEBHOOK_SECRET"].encode()

@app.route("/webhooks/markethub", methods=["POST"])
def receive():
    raw = request.get_data()  # raw bytes — DON'T parse JSON first
    sig = request.headers.get("X-MarketHub-Signature", "")
    expected = "sha256=" + hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return "", 401
    event = request.headers.get("X-MarketHub-Event")
    payload = json.loads(raw)
    print(f"Got {event}:", payload["data"])
    return "", 200`}
          />
        </section>

        {/* Integration recipes */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3" style={{ color: "#292524" }}>
            Quick recipes
          </h2>
          <div className="space-y-3">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#292524" }}>
                Slack notification on every published post
              </p>
              <p className="text-xs mb-2" style={{ color: "#78614E" }}>
                1. Create a Slack incoming webhook URL.
                2. In MarketHub /settings → Webhooks → New, paste the Slack URL,
                subscribe to <code>post.published</code>.
                3. Slack receives a POST per published post — write a tiny
                middleware to format the payload into a Slack message.
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#292524" }}>
                Sync new leads into your CRM via Zapier
              </p>
              <p className="text-xs mb-2" style={{ color: "#78614E" }}>
                1. Zap Trigger: <em>Webhooks by Zapier · Catch Hook</em>.
                2. Copy the Zap webhook URL.
                3. In MarketHub: New webhook → paste URL, subscribe to
                <code>lead.created</code>.
                4. Add a Zap action: <em>HubSpot · Create Contact</em> mapping
                fields from <code>data.name</code>, <code>data.email</code>, etc.
                Now every API-created lead lands in HubSpot automatically.
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#292524" }}>
                Push every AI image into Notion
              </p>
              <p className="text-xs mb-2" style={{ color: "#78614E" }}>
                1. In Make.com, create a scenario with HTTP Webhook trigger.
                2. Subscribe to <code>image.generated</code>.
                3. Add Notion module: Create page in your Assets database with
                <code>data.image_url</code>, <code>data.prompt</code>,
                <code>data.cost_usd</code>. Done — every AI image is archived.
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-sm font-bold mb-2" style={{ color: "#292524" }}>
                Auto-fill alt-text on every uploaded image (WordPress)
              </p>
              <p className="text-xs mb-2" style={{ color: "#78614E" }}>
                1. In your WordPress plugin or cron script, hook into{" "}
                <code>wp_handle_upload</code> (or listen for new Media
                Library entries).
                2. POST the new image URL to <code>/api/v1/alt-text</code>
                with your Bearer token — optionally pass the post title
                as <code>context</code>.
                3. Save the returned <code>alt_text</code> into the
                attachment&apos;s <code>_wp_attachment_image_alt</code>{" "}
                meta. Result: every uploaded image is accessibility-ready
                and SEO-indexed within seconds, no manual work.
              </p>
              <p className="text-[11px]" style={{ color: "#A8967E" }}>
                Same pattern works for Shopify (Admin API{" "}
                <code>image.alt</code>), Webflow, or any headless CMS.
              </p>
            </div>
          </div>
        </section>

        <div
          className="rounded-xl p-5 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p className="text-sm font-bold mb-2" style={{ color: "#292524" }}>
            More endpoints coming soon
          </p>
          <p className="text-xs mb-4" style={{ color: "#78614E" }}>
            Posts, analytics, CRM contacts, lead search. Meanwhile, need
            something specific? Email
            {" "}
            <a
              href="mailto:support@markethubpromo.com"
              className="font-bold underline"
              style={{ color: "#D97706" }}
            >
              support@markethubpromo.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
