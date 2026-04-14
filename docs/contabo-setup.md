# Contabo VPS 10 — Setup pentru CEO Brain Orchestrator (M10)

## Pas 1 — Comandă VPS-ul (ETA: 5-10 min)

1. Mergi la **https://contabo.com/en/vps/**
2. Alege **VPS 10 SSD** (€4.50/lună anual sau €4.99 monthly)
3. La configurare:
   - **Storage Type**: SSD (default e NVMe, mai rapid)
   - **Location**: `European Union (Germany — Nuremberg)` (cel mai aproape de useri UE)
   - **Image**: `Ubuntu 24.04 LTS`
   - **Password**: generează unul puternic, salvează-l într-un password manager
   - **SSH key** (opțional dar recomandat): adaugă public key-ul tău. Dacă nu ai, Contabo acceptă doar parolă la început și adaugi SSH key după.
   - **Hostname**: `mhp-brain` (sau ce vrei)
   - **User data / cloud-init**: lasă gol, nu ai nevoie
4. La plată:
   - Contact info: date reale (Mellamusic Production)
   - Payment: card sau PayPal — acceptă ambele
   - NU e nevoie de KYC suplimentar ca la Hetzner
5. Click **Order**

## Pas 2 — Așteaptă provisionarea (5-30 min)

Contabo îți trimite email cu:
- IP public (ex: `185.xxx.yyy.zzz`)
- Root password (dacă nu ai pus SSH key)
- Panou de management: https://my.contabo.com

## Pas 3 — Primul login SSH

```bash
ssh root@<IP_VPS>
# introdu parola primită pe email
```

**Securitate imediată** (fă astea ÎNAINTE de orice altceva):

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Creează user non-root
adduser mhp
usermod -aG sudo mhp

# 3. Copiază SSH key-ul tău pentru user (dacă ai adăugat unul în Contabo panel)
mkdir -p /home/mhp/.ssh
cp /root/.ssh/authorized_keys /home/mhp/.ssh/
chown -R mhp:mhp /home/mhp/.ssh
chmod 700 /home/mhp/.ssh
chmod 600 /home/mhp/.ssh/authorized_keys

# 4. Dezactivează SSH root login (edit /etc/ssh/sshd_config)
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 5. Firewall basic
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. Fail2ban pentru protecție brute-force
apt install -y fail2ban
systemctl enable fail2ban
```

De acum încolo te conectezi doar ca `mhp`:
```bash
ssh mhp@<IP_VPS>
```

## Pas 4 — Instalează Docker + Caddy + n8n

Script-ul de deploy (din Sprint 1 — salvat deja în repo):

```bash
# Clonează repo-ul (sau copiază docker-compose.yml)
cd ~
# Instalează Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker mhp
newgrp docker  # reload group

# Docker compose plugin
sudo apt install -y docker-compose-plugin

# Test
docker ps
```

Apoi pune fișierul `docker-compose.yml` cu n8n + Caddy (îl am gata în `.claude/skills/` sau îl generez când îmi spui IP-ul).

## Pas 5 — Pointează DNS

Din panoul tău DNS (Cloudflare, GoDaddy, etc. unde e `markethubpromo.com`):

```
Type   Name       Content            Proxy
A      n8n        <IP_VPS_Contabo>   OFF (DNS only)
A      brain      <IP_VPS_Contabo>   OFF (DNS only)  ← Phase 3 subdomain
```

Propagare DNS: 5-30 min.

## Pas 6 — Dă-mi IP-ul

După ce VPS-ul e live și DNS-ul e setat, îmi dai:
- **IP**: `185.xxx.yyy.zzz`
- **User**: `mhp`
- **SSH method**: password / SSH key

Și rulez deploy-ul M10 N8N complet de la mine (toate secretele + docker-compose).

## Costuri totale

| Item | Cost |
|------|------|
| Contabo VPS 10 SSD (anual) | €54 / an = €4.50/lună |
| Domeniul `n8n.markethubpromo.com` | €0 (deja plătit) |
| Domeniul `brain.markethubpromo.com` | €0 (deja plătit) |
| **TOTAL extra** | **€4.50/lună** |

Pentru brain.* + n8n + eventual Postgres replica DR = tot pe aceeași VM.
