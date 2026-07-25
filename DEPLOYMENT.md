# 🌐 Production Deployment Guide

Hamara Editor is architected for secure, zero-downtime production deployment using **Docker Compose**, **Nginx Reverse Proxy (SSL/HTTPS)**, **PostgreSQL**, and automated **CI/CD via GitHub Actions**.

> **Note:** Our deployment documentation has been modularized and upgraded into our dedicated official documentation suite. Please follow the comprehensive guides below based on your deployment requirements:

---

## 📖 Official Documentation Suite

### 1. ⚡ [5-Minute Quick Start Guide](docs/QUICK_START.md)
*Best for local evaluations, development testing, and instant Docker Compose provisioning.*
- One-command startup (`docker compose up -d --build`)
- Automated database migrations & RBAC seeding
- Local development server setup (Vite + FastAPI + hot reload)

### 2. 🚀 [Self-Hosting & VPS Production Deployment Guide](docs/SELF_HOSTING.md)
*Best for System Administrators, DevOps Engineers, and Production Hosting (AWS, DigitalOcean, VPS).*
- Full production architecture diagram (Client ──> Nginx SSL ──> FastAPI ──> Docker Socket ──> Neon PostgreSQL)
- Nginx reverse proxy configuration with Let's Encrypt SSL certificates
- Production environment variables and security hardening
- Automated Continuous Deployment (CD) pipeline setup via GitHub Actions (`.github/workflows/deploy.yml`)
- Health check endpoints (`/api/v1/health/live`, `/api/v1/health/ready`) & PostgreSQL backup/restore workflows

### 3. 🔐 [Security Architecture & RBAC Guide](docs/SECURITY_AND_RBAC.md)
*Best for Security Reviewers, System Architects, and Enterprise Administrators.*
- Ephemeral Docker sandbox container isolation mechanics (cgroups, RAM caps, network disabling `--network none`)
- Read-only base filesystems with ephemeral `tmpfs` scratch volumes
- Granular Role-Based Access Control (RBAC) permission hierarchy (`GUEST`, `USER`, `MODERATOR`, `ADMIN`, `OWNER`)
- Real-time Security Dashboard, blocked IP tracking, and administrative audit logging

---

## ⚡ Quick Production Command Reference

If your VPS infrastructure and `.env` files are already configured, execute the following from the project root directory:

```bash
# Pull latest code from main branch
git pull origin main

# Rebuild and launch production containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# Verify container liveness and health status
docker compose -f docker-compose.prod.yml ps
```
*(If using the standard `docker-compose.yml`, omit the `-f docker-compose.prod.yml` flag).*
