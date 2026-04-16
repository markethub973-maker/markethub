#!/bin/bash
# session-dump.sh — generate a session_YYYY_MM_DD.md scaffold for Claude's memory
#
# Usage:
#   bash scripts/session-dump.sh [title]
#
# Collects today's git commits + running task list + recent incidents and
# writes a pre-filled template into ~/.claude/projects/-Users-edyvanmix/memory/
# session_YYYY_MM_DD.md. Claude then fills in the "Decizii" and "Threads
# deschise" sections (what the mechanical dump can't infer) before pushing.
#
# When Claude should invoke: per memory rule `feedback_auto_session_dump.md`
# at end of long sessions (>1h, ≥3 commits, or architectural change),
# or when Eduard signals wrap ("ma opresc", "pe maine", "gata").

set -e

TITLE="${1:-autonomous session}"
FORCE="${2:-}" # pass --force to overwrite; default protects existing content

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)
MEMORY_DIR="/Users/edyvanmix/.claude/projects/-Users-edyvanmix/memory"
FILE="$MEMORY_DIR/session_${DATE//-/_}.md"

# Protect existing hand-authored content — never overwrite without --force
if [ -f "$FILE" ] && [ "$FORCE" != "--force" ]; then
  echo "⚠ $FILE already exists."
  echo "  To overwrite: bash scripts/session-dump.sh \"$TITLE\" --force"
  echo "  To append as continuation: scaffold saved to ${FILE%.md}_cont_$(date +%H%M).md"
  FILE="${FILE%.md}_cont_$(date +%H%M).md"
fi

# Collect today's commits (since midnight local)
COMMITS=$(git log --oneline --since="$DATE 00:00" --until="$DATE 23:59" 2>/dev/null | head -40)
COMMIT_COUNT=$(echo "$COMMITS" | grep -c . || echo 0)
HEAD_SHA=$(git rev-parse --short HEAD)

# Recent incidents (last 24h) if we can reach Supabase
INCIDENTS_SNIPPET=""
if [ -f .env.local ] && grep -q SUPABASE_SERVICE_ROLE_KEY .env.local; then
  SK=$(grep ^SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2- | tr -d '"')
  SUPA_URL=$(grep ^NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2- | tr -d '"')
  SINCE=$(date -u -v-1d '+%Y-%m-%dT%H:%M' 2>/dev/null || date -u -d '-1 day' '+%Y-%m-%dT%H:%M' 2>/dev/null)
  INCIDENTS_SNIPPET=$(curl -sS "$SUPA_URL/rest/v1/ops_incidents?created_at=gte.$SINCE&order=created_at.desc&limit=5&select=severity,subject,resolved_at" \
    -H "apikey: $SK" -H "Authorization: Bearer $SK" --max-time 10 2>/dev/null \
    | python3 -c "
import json,sys
try:
    rows = json.load(sys.stdin)
    for r in rows:
        res = '✓ rezolvat' if r.get('resolved_at') else '⚠ deschis'
        print(f\"- [{r['severity']}] {res} · {r['subject'][:80]}\")
except: pass
" 2>/dev/null)
fi

# Write scaffold (Claude will append / refine Decizii + Threads sections)
cat > "$FILE" << EOF
---
name: Session $DATE — $TITLE
description: TODO — 1-line hook of biggest shipped items
type: project
---

# Sesiunea $DATE ($TIME snapshot)

## Ce a fost livrat (HEAD $HEAD_SHA, $COMMIT_COUNT commits azi)

\`\`\`
$COMMITS
\`\`\`

## Decizii importante
<!-- Claude: completează aici decizii non-triviale luate, cu rationale -->
- TODO

## Probleme descoperite + status
$INCIDENTS_SNIPPET

## Threads deschise pentru Eduard
<!-- Claude: ce așteaptă pe el (secrets, decizii, paliere) -->
- TODO

## Memorii noi scrise (dacă sunt)
<!-- Claude: listă fișiere feedback_*.md / project_*.md create azi -->

## Starting context pentru sesiune următoare / daemon Contabo
- Branch: main, HEAD $HEAD_SHA
- Primul lucru de verificat: \`GET /api/brain/ping-claude\` (inbox)
- Apoi: \`GET /api/brain/advisor?state_only=1\` (snapshot stare)
EOF

echo "✓ Scaffold scris: $FILE"
echo ""
echo "Claude: completează secțiunile Decizii / Threads / Memorii noi înainte să închizi sesiunea."
echo ""
# Offer to also update MEMORY.md index
if ! grep -q "session_${DATE//-/_}.md" "$MEMORY_DIR/MEMORY.md" 2>/dev/null; then
  echo "⚠ MEMORY.md nu conține încă această sesiune. Adaugă o linie la index:"
  echo "  - [session_${DATE//-/_}.md](session_${DATE//-/_}.md) — <hook scurt>"
fi
