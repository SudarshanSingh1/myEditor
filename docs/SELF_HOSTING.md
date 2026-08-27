# 🌐 Self-Hosting & Production Deployment Guide

This guide covers how to deploy Hamara Editor to a production server (VPS, Cloud VM, or Dedicated Bare Metal) using **Docker Compose**, **Nginx with SSL**, **PostgreSQL / Neon DB**, and automated **CI/CD via GitHub Actions**.

---

## 🏗️ Production Architecture Overview

Hamara Editor is engineered for zero-downtime, secure multi-tenant production deployment:

```
[ Client Browser ]
        │  HTTPS (Port 443 / SSL)
        ▼
┌────────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy (Frontend & Gateway)              │
│  - Routes /         -> Static React 19 SPA (Vite)      │
│  - Routes /api/*    -> FastAPI Backend API             │
│  - Routes /ws/*     -> WebSocket Terminal Streams      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (Internal Docker Network)
                            ▼
┌────────────────────────────────────────────────────────┐
│  FastAPI Backend Server (Non-Root gosu Container)       │
│  - Orchestrates Ephemeral Sandbox Containers           │
│  - Manages Auth, RBAC, Projects, & File System Workspaces│
└───────────┬──────────────────────────────┬─────────────┘
            │                              │
            ▼                              ▼
┌───────────────────────┐      ┌─────────────────────────┐
│ PostgreSQL / Neon DB  │      │ Host Docker Socket      │
│ (Persistent Volume or │      │ (/var/run/docker.sock)  │
│ Managed Cloud DB)     │      │ (Spawns Sandbox Runners)│
└───────────────────────┘      └─────────────────────────┘
```

---

## 🖥️ 1. Server Prerequisites

You will need a Virtual Private Server (VPS) such as AWS EC2, DigitalOcean Droplet, Hetzner, or Linode:
- **Operating System:** Ubuntu 22.04 LTS / 24.04 LTS (or Debian 12)
- **Minimum Hardware:** 2 vCPUs, 4GB RAM, 20GB SSD Storage
- **Domain Name:** Configured with an 'A' record pointing to your server's public IP address (e.g., `editor.yourdomain.com`).
- **Software Installed:** Docker Engine and Docker Compose Plugin.

### Quick Docker Installation (Ubuntu)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## 🔑 2. Environment Configuration

On your production server, create the required directory and clone your repository:
```bash
sudo mkdir -p /opt/myEditor
sudo chown -R $USER:$USER /opt/myEditor
git clone https://github.com/sudarshankushwaha/myEditor.git /opt/myEditor
cd /opt/myEditor
```

Create your production environment file:
```bash
cp .env.production.example .env
cp backend/.env.example backend/.env
```

### Essential Production Variables (`backend/.env`)
Edit `backend/.env` with your editor (e.g., `nano backend/.env`) and set these secure parameters:

```ini
# Application Core
APP_ENV=production
DEBUG=False
SECRET_KEY=replace-this-with-a-64-char-random-alphanumeric-string
FRONTEND_URL=https://editor.yourdomain.com

# Database Connection (Can be local Docker DB or Managed Neon/AWS RDS PostgreSQL)
DATABASE_URL=postgresql+psycopg://username:password@your-db-host.com/dbname?sslmode=require

# Sandbox Execution Limits (Per User Container)
MAX_EXECUTION_TIME_SECONDS=5
MAX_EXECUTION_MEMORY_MB=128

# SMTP Email Configuration (For password resets & invitations)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM_NAME="Hamara Editor"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
```

---

## 🚀 3. Initializing & Starting the Stack

Start the production Docker stack:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
*(If you are using the standard `docker-compose.yml`, omit the `-f` flag).*

### Automated Startup Tasks
When the backend container starts in production:
1. **Automatic Database Migrations:** `entrypoint.sh` executes `gosu appuser alembic upgrade head`. This ensures your PostgreSQL database tables (including RBAC, Security Dashboards, and Audit Logs) are always synchronized with the latest release.
2. **Permission Seeding:** Automatically seeds system permissions and default role matrix (`USER`, `MODERATOR`, `ADMIN`, `OWNER`).

---

## 🔒 4. Nginx Reverse Proxy & SSL Setup

To serve traffic securely over HTTPS, configure Nginx with Let's Encrypt certificates.

### Step 1: Install Nginx & Certbot on Host
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Configure Nginx Virtual Host
Create `/etc/nginx/sites-available/myeditor`:
```nginx
server {
    server_name editor.yourdomain.com;

    # Serve static frontend or route to Proxy container
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for interactive terminal
    location /api/v1/workspaces/ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

Enable the site and obtain SSL certificates:
```bash
sudo ln -s /etc/nginx/sites-available/myeditor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d editor.yourdomain.com
```

---

## 🔄 5. Automated CI/CD (GitHub Actions CD Pipeline)

Hamara Editor includes an official, fully automated Continuous Deployment pipeline (`.github/workflows/deploy.yml`). Whenever you push code to the `main` branch on GitHub, your production server will automatically upgrade itself!

### Configuring GitHub Repository Secrets
Navigate to your GitHub Repository ──> **Settings** ──> **Secrets and variables** ──> **Actions** and add the following repository secrets:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `VPS_HOST` | Public IP or domain name of your VPS | `198.51.100.24` |
| `VPS_PORT` | SSH port on your VPS (Optional, defaults to 22) | `22` (or `2222`) |
| `VPS_USERNAME` | SSH username on your VPS | `root` (or `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH Key (`$HOME/.ssh/id_ed25519`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

*(Optional Repository Variable: Add `VPS_PROJECT_PATH` under Actions Variables if your project is located somewhere other than `/opt/myEditor`).*

### Adding the SSH Key to the VPS
If you receive a `Permission denied (publickey,password)` error, your SSH public key is not authorized on the VPS. 
You must perform the following manual step on the VPS console:

1. Display your local public key:
   ```bash
   cat $HOME/.ssh/id_ed25519.pub
   ```
2. Log in to your VPS console (e.g., via your hosting provider's web console).
3. Append the public key output from step 1 into the `authorized_keys` file for the deployment user (e.g., `root`):
   ```bash
   mkdir -p /root/.ssh
   echo "YOUR_PUBLIC_KEY_CONTENT_HERE" >> /root/.ssh/authorized_keys
   chmod 600 /root/.ssh/authorized_keys
   ```

### How the CD Pipeline Works
1. **Automated Verification:** Runs linting, type-checking, and unit test suites first. If any test fails, deployment is aborted immediately to protect production.
2. **SSH Connection:** Securely connects to your VPS using `appleboy/ssh-action`.
3. **Git Pull & Docker Rebuild:** Pulls the latest commit from `main`, rebuilds modified containers (`docker compose up --build -d`), and prunes old images (`docker image prune -af`).
4. **Zero-Touch Database Upgrade:** The restarted backend container automatically applies any new Alembic migrations on startup.

---

## 🛠️ Maintenance & Diagnostics

### View Production Logs
```bash
# Follow real-time backend API logs
docker compose logs -f api

# Follow real-time Nginx web server logs
docker compose logs -f proxy
```

### Health Check Endpoints
Your load balancers and uptime monitoring tools can poll these automated health endpoints:
- **Liveness Probe:** `GET https://editor.yourdomain.com/api/v1/health/live`
- **Readiness Probe:** `GET https://editor.yourdomain.com/api/v1/health/ready`
- **Full Diagnostics:** `GET https://editor.yourdomain.com/api/v1/health/health`

### Manual Backup & Restore (PostgreSQL)
If hosting PostgreSQL locally via Docker:
```bash
# Create database backup dump
docker exec -t myeditor-db-1 pg_dumpall -c -U hamara_user > backup_$(date +%Y%m%d).sql

# Restore database from backup dump
cat backup_YYYYMMDD.sql | docker exec -i myeditor-db-1 psql -U hamara_user -d hamara_db
```
