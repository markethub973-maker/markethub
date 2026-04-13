# N8N Automation Engine — Runbook (M10 Sprint 1)

Self-hosted N8N for MarketHub Pro workflow automation. Target spec: Hetzner
CX21 (2 vCPU / 4 GB / 40 GB / €5.50 mo). Handles ~200 workflow executions/day
comfortably; scale to CX31 if needed.

---

## 1. Provision server (Hetzner)

1. Create account at console.hetzner.cloud
2. New project → `markethub-automations`
3. Add server:
   - Location: **Nuremberg** (nbg1) or **Helsinki** (hel1)
   - Image: **Ubuntu 24.04**
   - Type: **CX21** (shared vCPU, 4 GB, €5.50/mo)
   - SSH key: upload your public key
   - Name: `n8n-prod-01`
4. Copy public IPv4 and IPv6.

## 2. Point DNS

In the domain registrar for `markethubpromo.com`:

```
automations.markethubpromo.com  A    <IPv4>
automations.markethubpromo.com  AAAA <IPv6>
```

TTL 300. Wait ~5 min for propagation, verify with
`dig +short automations.markethubpromo.com`.

## 3. Prepare server

```bash
ssh root@<IP>
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 ufw fail2ban
systemctl enable --now docker

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Non-root user
adduser n8nops --disabled-password --gecos ""
usermod -aG docker n8nops
mkdir -p /home/n8nops/.ssh
cp /root/.ssh/authorized_keys /home/n8nops/.ssh/
chown -R n8nops:n8nops /home/n8nops/.ssh
chmod 700 /home/n8nops/.ssh
chmod 600 /home/n8nops/.ssh/authorized_keys
```

## 4. Deploy the stack

```bash
su - n8nops
mkdir -p ~/n8n && cd ~/n8n

# Copy infra/n8n/* from this repo (docker-compose.yml, Caddyfile, .env.n8n.example, workflows/)
scp -r infra/n8n/* n8nops@<IP>:~/n8n/

cp .env.n8n.example .env
# edit .env and fill every secret with `openssl rand -hex 32` output
vi .env

docker compose up -d
docker compose ps    # n8n, n8n-worker, postgres, redis, caddy all healthy
docker compose logs caddy | grep "certificate obtained"  # TLS issued
```

## 5. First-time n8n setup

1. Visit `https://automations.markethubpromo.com`
2. Basic-auth prompt → enter `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`
3. Create owner account (first account = admin)
4. Import workflows from `~/n8n/workflows/*.json` (Settings → Import)
5. For each imported workflow, open and click **Activate** (top-right toggle)
6. Copy the webhook URL of each — these go into `automation_templates.n8n_workflow_id`
   in Supabase (already seeded with correct slugs; just update the IDs).

## 6. Point MarketHub app at n8n

In Vercel env vars (production + preview + development):

```
N8N_BASE_URL=https://automations.markethubpromo.com
N8N_WEBHOOK_SECRET=<same value as MARKETHUB_WEBHOOK_SECRET in .env>
```

Redeploy. The `/dashboard/automations` page will light up.

## 7. Test end-to-end

```bash
# From your laptop
curl -X POST https://markethubpromo.com/api/n8n/trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: <your auth cookie>" \
  -d '{"template_slug":"social-cross-post","inputs":{"caption":"Hello world","platforms":["linkedin"]}}'

# Expect: {"ok":true,"run_id":"...","status":"queued"}
# Check `/dashboard/automations` → run history
```

## 8. Backup (daily)

Add to crontab on the Hetzner box:

```cron
0 3 * * * cd /home/n8nops/n8n && docker compose exec -T postgres pg_dump -U n8nadmin n8n | gzip > /home/n8nops/backups/n8n-$(date +\%F).sql.gz
# Rotate: keep 30 days
0 4 * * * find /home/n8nops/backups -name 'n8n-*.sql.gz' -mtime +30 -delete
```

Mirror to Cloudflare R2 (already used for MarketHub backups — add n8n bucket).

## 9. Monitoring

The MarketHub security health-check (M6) already tracks a stub
`n8n-webhook-ping` job. After deploy, the `/api/n8n/trigger` endpoint logs
a `cron_logs` heartbeat on each run. If no run in 7 days + templates marked
active → M6 alert fires.

## 10. Cost & scaling

| Metric        | CX21 headroom | When to upgrade                   |
|---------------|---------------|-----------------------------------|
| CPU           | ~150 exec/hr  | >500 exec/hr sustained → CX31     |
| RAM           | 4 GB          | OOM in docker logs → CX31         |
| Disk          | 40 GB         | >30 GB used → add volume          |
| Executions    | queue keeps stable even at burst — worker scales horizontally |

Cost today: €5.50/mo (CX21) + €0 DNS + €0 TLS + minor R2 egress.
Telegram/email alerts already included from M3 Cost Monitor.
