# Claude Daemon on Contabo — Full Setup Guide

**Purpose**: Run a persistent Claude agent on the Contabo VPS (207.180.235.143) that listens for `ping-claude` messages 24/7 and responds without needing Eduard's Mac terminal. Removes the "wait for next CLI session" delay so Alex and the ops agents get replies within minutes.

**Prerequisites (done)**:
- Contabo VPS active, Docker installed, Caddy running (see `contabo_vps_active.md`)
- `brain_knowledge_base`, `brain_agent_activity`, `ops_incidents` tables live in Supabase
- `/api/brain/ping-claude` POST + GET deployed on Vercel
- Git repo publicly accessible: `github.com/markethub973-maker/markethub`

**Estimated setup time**: 2-3 hours (Eduard + Claude pairing)

---

## Architecture

```
                     Alex / Sofia / Telegram (@claude)
                              |  POST /api/brain/ping-claude
                              v
                      Vercel markethubpromo.com
                              |  writes to brain_agent_activity
                              v
                         Supabase Postgres
                              ^
                              |  GET /api/brain/ping-claude every 60s
                              |  (polling, persistent)
                              |
               [ Claude daemon on Contabo VPS ]
                              |  executes: read inbox → decide →
                              |    either (a) respond via dev-pulse
                              |    or (b) create PR via GitHub API
                              |    or (c) escalate to Eduard Telegram
                              v
                      Vercel /api/brain/dev-pulse
                              |
                              v
                     Alex (Telegram boardroom update)
```

The daemon is NOT Claude Code — that's this CLI tool for interactive pairing with Eduard. The daemon uses the **Anthropic Agent SDK** (Python or TypeScript), which is a supported Anthropic product for building always-on agents.

---

## Step 1 — Prepare Contabo environment

SSH in:
```bash
ssh -i ~/.ssh/id_mhp_brain mhp@207.180.235.143
```

Create daemon workspace:
```bash
sudo mkdir -p /opt/claude-daemon
sudo chown mhp:mhp /opt/claude-daemon
cd /opt/claude-daemon
```

Install Node 20 + tools:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

Verify:
```bash
node -v  # should be v20.x
npm -v
git --version
```

---

## Step 2 — Clone repo + install Agent SDK

```bash
cd /opt/claude-daemon
git clone https://github.com/markethub973-maker/markethub.git repo
cd repo
npm ci
```

Install Anthropic Agent SDK:
```bash
npm install @anthropic-ai/agent-sdk
```

(SDK docs: https://docs.anthropic.com/en/api/agent-sdk)

---

## Step 3 — Create daemon source

Create `/opt/claude-daemon/daemon.ts`:

```typescript
/**
 * Claude Daemon — polls /api/brain/ping-claude every 60s.
 * For each pending ping, uses Anthropic Agent SDK to produce a response,
 * then either:
 *   - replies via dev-pulse for informational requests
 *   - creates a GitHub PR if the request needs a code change
 *   - escalates to Eduard Telegram if unclear or high-risk
 */

import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
// import { Agent } from "@anthropic-ai/agent-sdk";

const BRAIN_CRON_SECRET = process.env.BRAIN_CRON_SECRET!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const BASE = "https://markethubpromo.com";

// Read memory files and agent knowledge brief at startup — this is the
// daemon's inherited context from prior CLI sessions.
const memory = readFileSync("/opt/claude-daemon/memory/MEMORY.md", "utf8");
const brief = readFileSync(
  "/opt/claude-daemon/repo/src/lib/alex-knowledge.ts",
  "utf8",
);

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function pollPings() {
  const res = await fetch(`${BASE}/api/brain/ping-claude?mark_read=true`, {
    headers: { "x-brain-cron-secret": BRAIN_CRON_SECRET },
  });
  const data = await res.json() as { pings?: Array<{
    id: string; at: string; from: string; urgency: string; message: string;
  }> };
  return data.pings ?? [];
}

async function respond(ping: { id: string; from: string; message: string }) {
  const reply = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    system: `You are Claude, Eduard's technical colleague. Your predecessor (Claude Code CLI) has been pairing with Eduard interactively. You inherit all prior context from the memory files and codebase. Respond to Alex's pings with concrete next actions — either an informational reply (via dev-pulse), a PR plan (which Eduard must approve), or an escalation to Eduard.

MEMORY:
${memory.slice(0, 8000)}

CODEBASE BRIEF (alex-knowledge.ts excerpt):
${brief.slice(0, 6000)}`,
    messages: [{ role: "user", content: `Ping from ${ping.from}: ${ping.message}` }],
  });
  const replyText = reply.content[0]?.type === "text" ? reply.content[0].text : "";

  // Always write back to dev-pulse so Alex sees the response
  await fetch(`${BASE}/api/brain/dev-pulse`, {
    method: "POST",
    headers: {
      "x-brain-cron-secret": BRAIN_CRON_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: `[reply-to-ping-${ping.id}] ${replyText.slice(0, 400)}`,
      kind: "note",
      payload: { ping_id: ping.id, full_reply: replyText },
    }),
  });
}

async function loop() {
  while (true) {
    try {
      const pings = await pollPings();
      for (const ping of pings) {
        console.log(`[${new Date().toISOString()}] handling ping ${ping.id}`);
        await respond(ping);
      }
    } catch (e) {
      console.error("loop error", e);
    }
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

loop();
```

---

## Step 4 — Transfer memory files

From Eduard's Mac:
```bash
scp -i ~/.ssh/id_mhp_brain -r /Users/edyvanmix/.claude/projects/-Users-edyvanmix/memory mhp@207.180.235.143:/opt/claude-daemon/memory
```

This gives the daemon the same context base I have right now — 50+ memory files covering project history, session notes, user preferences, validated rules.

Going forward: a cron (Mac-side or Contabo-side) can sync memory nightly with `rsync`.

---

## Step 5 — Env secrets

Create `/opt/claude-daemon/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
BRAIN_CRON_SECRET=<from Vercel prod env>
```

Load in daemon via `dotenv` or `set -a; source .env; set +a`.

---

## Step 6 — Systemd service

`/etc/systemd/system/claude-daemon.service`:
```
[Unit]
Description=Claude Daemon — ping-claude listener
After=network.target

[Service]
Type=simple
User=mhp
WorkingDirectory=/opt/claude-daemon
EnvironmentFile=/opt/claude-daemon/.env
ExecStart=/usr/bin/node --loader ts-node/esm /opt/claude-daemon/daemon.ts
Restart=always
RestartSec=30
StandardOutput=append:/var/log/claude-daemon.log
StandardError=append:/var/log/claude-daemon.log

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-daemon
sudo systemctl start claude-daemon
sudo systemctl status claude-daemon  # should be "active (running)"
```

Watch logs live:
```bash
tail -f /var/log/claude-daemon.log
```

---

## Step 7 — Observability

Add a heartbeat ping every 60s to confirm daemon is alive:
```typescript
// in the main loop
await fetch(`${BASE}/api/brain/dev-pulse`, {
  method: "POST",
  headers: { "x-brain-cron-secret": BRAIN_CRON_SECRET, "Content-Type": "application/json" },
  body: JSON.stringify({ description: "[heartbeat] daemon alive", kind: "ops" }),
}).catch(() => {});
```

If heartbeat stops appearing in dev-pulse for >5 min, Alex's boardroom alerts (already monitors for daemon silence). Can also trigger a Telegram alert.

---

## Step 8 — Test procedure

1. From Eduard's Mac, trigger a test ping:
   ```bash
   curl -X POST https://markethubpromo.com/api/brain/ping-claude \
     -H "x-brain-cron-secret: $BCS" \
     -H "Content-Type: application/json" \
     -d '{"from":"alex","message":"Test — ești online?","urgency":"low"}'
   ```
2. Within ~60s the daemon should respond via dev-pulse.
3. Check Boardroom feed — should see `[reply-to-ping-...]` event.
4. Also test via Telegram: send `@claude salut`. Should get acknowledgement, then within 60s a reply via dev-pulse routed back.

---

## Step 9 — Code-change decisions (higher trust tier)

Initially the daemon only REPLIES (informational). It does NOT push commits.

After 48h of stable operation, enable code changes:
- Add a `GITHUB_PAT` env var with `repo` + `workflow` scope
- Extend the daemon to: when a ping requests a small fix, create a new branch + commit + PR + Telegram notify Eduard with link
- Eduard reviews + merges. Daemon does NOT self-merge.

This is the "autonomous code change" tier — keep Eduard in the loop on review until 2 weeks of clean operation.

---

## Cost estimate

- Contabo: already paid €37.80/6mo
- Anthropic Opus 4.6 usage: ~10-30 pings/day × 3k tokens each ≈ $4-8/day = **$120-240/month**
- Alternative: use Haiku 4.5 for simple pings (~10× cheaper, $12-24/month). Opus only for code-change requests.

Recommend Haiku default + Opus escalation path.

---

## Rollback

If the daemon misbehaves:
```bash
sudo systemctl stop claude-daemon
sudo systemctl disable claude-daemon
```

Pings pile up in Supabase — pick them up manually at next CLI session.

---

## What stays out of scope (v1)

- The daemon does NOT deploy to Vercel. Only commits + opens PRs.
- The daemon does NOT modify Stripe, payments, or Eduard's private accounts.
- The daemon does NOT send external communications (client emails, LinkedIn posts). Those stay with Alex + Eduard.

Rule of thumb: the daemon is **Claude's junior colleague** — can do code research, draft fixes, reply to Alex. For anything user-facing or financial, escalate.
