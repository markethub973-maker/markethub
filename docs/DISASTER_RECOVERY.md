# Disaster Recovery Runbook

Complete recovery procedure for MarketHub Pro in case of major incident.

## Threat model

Scenarios this runbook covers:
- **Supabase row-level corruption** — bad migration, runaway update, dropped table
- **Supabase full project loss** — project deleted, provider outage, account compromised
- **Vercel deployment rollback failure** — all deploys red, can't ship a fix
- **Credential compromise** — attacker rotated Stripe / Anthropic / admin keys
- **Ransomware / malicious insider** — someone with service_role access encrypts / deletes data

NOT covered:
- Cloudflare DNS zone loss (restore from DNS provider records)
- Git history tampering (restore from GitHub)
- Personal laptop loss (re-auth from a different machine)

## Recovery assets

All of these must be preserved OUT-OF-BAND from the primary platform:

| Asset | Where | Required to recover? |
|---|---|---|
| `BACKUP_ENCRYPTION_KEY` | Vercel env + `/tmp/BACKUP_ENCRYPTION_KEY.txt` + your password manager | **YES** — without it the backups are unreadable |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env + Supabase dashboard | YES (to read bucket + restore) |
| `VERCEL_TOKEN` | Vercel account → Settings → Tokens (regenerate if lost) | YES (to redeploy) |
| `CRON_SECRET` | Vercel env | NO (just regenerate) |
| `ADMIN_PASSWORD` | Password manager | NO (just regenerate) |
| Git repo | `github.com/markethub973-maker/markethub` | YES (source of truth for code) |
| Encrypted backups | Supabase bucket `cockpit-backups` + optional R2 mirror | YES (data state) |

**CRITICAL**: If you lose `BACKUP_ENCRYPTION_KEY`, every backup becomes unrecoverable.
Keep it in at least TWO independent places (1Password / Bitwarden / Apple Keychain + written copy).

## Backup schedule + retention

- **Frequency**: daily at 04:00 UTC via GitHub Actions workflow `cockpit-backup.yml`
- **Location**: Supabase Storage bucket `cockpit-backups` (isolated by RLS — only service_role)
- **Optional secondary**: Cloudflare R2 if `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` env vars are set in Vercel
- **Retention**: currently no auto-prune — manually review bucket monthly and delete backups older than 90 days
- **Format**: AES-256-GCM encrypted JSON dump of 14 critical tables
- **Tested**: run `npx tsx scripts/restore-backup.ts --filename=... --dry-run` weekly to verify backups are recoverable

## Tables included in backup

See `src/lib/backup.ts` → `BACKUP_TABLES`:

```
profiles
plan_limits
admin_platform_config
stripe_webhook_events
ai_credits
usage_tracking
scheduled_posts
instagram_connections
team_members
api_keys
security_events
maintenance_findings
cron_logs
health_checks
```

NOT included (by design):
- `auth.users` — owned by Supabase Auth, restore via Supabase dashboard
- `storage.objects` — file blobs are in Supabase Storage, restore separately
- Realtime subscriptions — ephemeral, don't need backup

## Dry-run verification (run WEEKLY)

```bash
export BACKUP_ENCRYPTION_KEY="..." # from password manager
export SUPABASE_SERVICE_ROLE_KEY="..." # from Vercel env

# List recent backups
curl -s "https://kashohhwsxyhyhhppvik.supabase.co/rest/v1/cron_logs?job=eq.cockpit-backup&order=ran_at.desc&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.[].result.filename'

# Pick the latest, dry-run verify
npx tsx scripts/restore-backup.ts \
  --filename=2026-04-11T17-06-26-537Z.enc \
  --dry-run
```

Expected output:
- "ok — N bytes encrypted" (download)
- "ok — N bytes plaintext" (decrypt)
- Row counts per table
- SHA-256 of plaintext
- "✅ DRY RUN COMPLETE — backup is recoverable."

If ANY step fails, the backup is corrupt. Investigate immediately:
1. Was BACKUP_ENCRYPTION_KEY rotated? (GCM tag mismatch)
2. Did someone modify the blob? (tamper detected)
3. Is the isolated bucket accessible? (RLS / quota)

## Recovery scenarios

### Scenario 1 — Partial data corruption (< 10 tables affected)

1. Identify the corrupted table(s) from cockpit findings or manual inspection
2. Find the most recent clean backup (one whose timestamp predates the corruption)
3. Dry-run that backup to verify it decrypts
4. Restore ONLY the affected tables:
   ```bash
   # Edit scripts/restore-backup.ts to filter tables, OR use Supabase SQL
   # editor to re-insert from the decrypted JSON
   ```
5. Verify data integrity: run cockpit schema-drift + consistency agents
6. Resume operations

### Scenario 2 — Full Supabase project loss

1. Create NEW Supabase project via dashboard
2. Update `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel env
3. Apply ALL migrations from `supabase/migrations/` to the new project
4. Recreate the `cockpit-backups` bucket (it'll be empty — that's fine; we still
   have the backups locally or in R2 if configured)
5. Download the last known-good encrypted backup (from R2 secondary or local
   copy) and run `scripts/restore-backup.ts --restore --force --target=https://NEW-PROJECT.supabase.co`
6. Redeploy Vercel (`vercel --prod` or trigger via API)
7. Verify via cockpit state endpoint
8. Re-invite users — Supabase Auth rows DON'T come back unless exported
   separately; users will need to re-register. Send a mass email explaining
   the incident + offer account recovery support.

### Scenario 3 — Credential compromise

1. IMMEDIATELY rotate:
   - Supabase service_role key (Supabase dashboard → Settings → API)
   - Vercel deployment token (Vercel account → Tokens)
   - Anthropic API keys (console.anthropic.com)
   - Stripe keys (Stripe dashboard → Developers → API keys)
   - CRON_SECRET (regenerate + update Vercel env + GitHub Actions secret)
   - ADMIN_PASSWORD + ADMIN_TUNNEL_SECRET
   - BACKUP_ENCRYPTION_KEY (NEW one — old backups become unreadable but
     can still be recovered with the old key)
2. Redeploy all services to pick up new keys
3. Run full SIEM analyst + security-scan on the last 30 days to identify
   the compromise window
4. Check Stripe activity for unauthorized charges
5. Check Supabase audit log for data reads during the compromise window
6. If sensitive data was accessed, disclose per GDPR Art 33 (72h notification)

### Scenario 4 — Ransomware / malicious insider

1. IMMEDIATELY revoke all service_role + admin access
2. Snapshot everything still readable
3. Pull the most recent encrypted backup from R2 (secondary — harder for
   attacker to reach if isolation is real)
4. Follow Scenario 2 recovery to a fresh Supabase project
5. File a police report if the attacker is identifiable
6. Post-incident review: how did they get access?

## Manual on-demand backup

You can trigger a backup anytime via the admin dashboard or directly:

```bash
curl --max-time 120 \
  -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"note":"pre-deploy-backup-YYYY-MM-DD"}' \
  https://viralstat-dashboard.vercel.app/api/cockpit/backup
```

Or from the Cockpit assistant chat: "Rulează backup acum cu label 'pre-migration'".

## Enabling R2 secondary store (optional, recommended)

For true cross-provider isolation, add a Cloudflare R2 bucket:

1. Cloudflare Dashboard → R2 → Create bucket `markethub-backups`
2. R2 → Manage API Tokens → Create token with Object Read & Write permission
3. In Vercel env, add:
   - `R2_ACCOUNT_ID` = your Cloudflare account ID
   - `R2_ACCESS_KEY_ID` = token ID
   - `R2_SECRET_ACCESS_KEY` = token secret
   - `R2_BUCKET` = `markethub-backups`
4. Redeploy Vercel
5. Next backup run will push to BOTH Supabase bucket + R2

If Supabase is compromised, R2 is untouched. Manual download + restore flow is the same.

## Recovery time objective (RTO) + recovery point objective (RPO)

- **RPO**: 24 hours (daily backups) — any data created between the last
  backup and the incident is LOST. For tighter RPO, schedule backups more
  frequently (e.g. every 6h) in `cockpit-backup.yml`.
- **RTO**: ~1 hour for Scenario 1, ~4 hours for Scenario 2 (assuming you
  have all credentials in password manager and can focus on recovery)

## Runbook maintenance

- Update this doc when tables are added to `BACKUP_TABLES` or when a
  recovery scenario actually plays out (post-mortem notes).
- Re-run the dry-run verification every week as a cron of your own.
- Review backup retention every month.
