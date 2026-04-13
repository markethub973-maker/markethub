#!/usr/bin/env bash
# MarketHub N8N — one-shot deploy script for Hetzner box
# Run AS root on the fresh Ubuntu 24.04 server.
# Uploaded via: scp infra/n8n/deploy.sh root@<IP>:/tmp/

set -euo pipefail

echo "=== [1/6] System update ==="
apt update
DEBIAN_FRONTEND=noninteractive apt upgrade -y
DEBIAN_FRONTEND=noninteractive apt install -y docker.io docker-compose-v2 ufw fail2ban curl
systemctl enable --now docker

echo "=== [2/6] Firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== [3/6] Non-root user n8nops ==="
if ! id n8nops &>/dev/null; then
  adduser n8nops --disabled-password --gecos ""
  usermod -aG docker n8nops
  mkdir -p /home/n8nops/.ssh
  cp /root/.ssh/authorized_keys /home/n8nops/.ssh/
  chown -R n8nops:n8nops /home/n8nops/.ssh
  chmod 700 /home/n8nops/.ssh
  chmod 600 /home/n8nops/.ssh/authorized_keys
fi

echo "=== [4/6] Prepare n8n dir ==="
mkdir -p /home/n8nops/n8n/workflows /home/n8nops/backups
chown -R n8nops:n8nops /home/n8nops/n8n /home/n8nops/backups

echo "=== [5/6] Daily backup cron ==="
cat > /etc/cron.d/n8n-backup <<'EOF'
0 3 * * * n8nops cd /home/n8nops/n8n && docker compose exec -T postgres pg_dump -U n8nadmin n8n | gzip > /home/n8nops/backups/n8n-$(date +\%F).sql.gz
0 4 * * * n8nops find /home/n8nops/backups -name 'n8n-*.sql.gz' -mtime +30 -delete
EOF
chmod 644 /etc/cron.d/n8n-backup

echo "=== [6/6] Fail2ban basic config ==="
systemctl enable --now fail2ban

echo ""
echo "✅ Server ready. Next from your Mac:"
echo "   scp infra/n8n/docker-compose.yml infra/n8n/Caddyfile infra/n8n/.env.prod infra/n8n/workflows/* n8nops@<IP>:/home/n8nops/n8n/"
echo "   ssh n8nops@<IP> 'cd n8n && mv .env.prod .env && docker compose up -d'"
