# 🔐 Security Architecture & RBAC Guide

Hamara Editor is built from the ground up with **defense-in-depth security** to safely execute untrusted user code in multi-tenant environments. This document outlines our container isolation mechanics, Role-Based Access Control (RBAC) permission matrix, and automated audit logging systems.

---

## 🛡️ Sandbox Code Execution Isolation

Executing arbitrary code submitted by web users presents inherent security challenges. Hamara Editor mitigates these risks by executing all code inside **ephemeral, heavily restricted Docker containers**.

```
[ User Code Submission ]
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Execution Orchestrator                         │
│  - Validates language & input length                    │
│  - Generates ephemeral Docker container via Socket      │
└─────────┬───────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  Isolated Linux Sandbox Container (Ephemeral)           │
│  🚫 No Internet / Network Access (network_mode: none)   │
│  💾 Read-Only Base Filesystem (tmpfs for /tmp scratch)  │
│  🧠 Hard RAM Cap (e.g., 128MB via cgroups)              │
│  ⏱️ Strict Execution Timeout (e.g., 5 seconds max)     │
│  👤 Non-Root Unprivileged Execution User                │
└─────────────────────────────────────────────────────────┘
```

### 1. Network Isolation (`network: none`)
Every execution container is spawned with networking completely disabled (`--network none`). Untrusted user scripts cannot make HTTP requests, scan internal subnets, access AWS metadata endpoints, or communicate with the PostgreSQL database.

### 2. Memory & CPU Resource Limits (cgroups)
To prevent Denial of Service (DoS) attacks and fork bombs:
- **Memory Limit:** Containers are strictly capped at `128MB` (configurable via `MAX_EXECUTION_MEMORY_MB`).
- **CPU Quota:** CPU execution cycles are throttled to prevent a single loop from starving the host server.
- **Process Limit:** PIDs are restricted to prevent fork bombs (`--pids-limit 64`).

### 3. Read-Only Filesystem & Ephemeral Storage
- Base language execution images are mounted as **Read-Only** (`--read-only`).
- A temporary, in-memory `tmpfs` volume is mounted exclusively at `/tmp` or the workspace execution directory, allowing compilers (like `gcc` or `rustc`) to write intermediate binaries without persisting artifacts or modifying system binaries.
- The container is destroyed automatically the moment execution terminates or times out.

### 4. Hard Timeout Enforcement
To guard against infinite loops (`while True: pass`), the backend execution orchestrator enforces a strict real-time wall-clock timeout (default: `5 seconds`, configurable via `MAX_EXECUTION_TIME_SECONDS`). If a container exceeds this duration, the backend issues a `SIGKILL` and terminates the container immediately.

---

## 👥 Role-Based Access Control (RBAC) Architecture

Hamara Editor implements a granular, hierarchical RBAC permission model. Permissions are assigned to roles, and roles are assigned to users.

### The Role Hierarchy

| Role | Access Level | Description & Capabilities |
| :--- | :--- | :--- |
| **`GUEST`** | Read / Execute (Ephemeral) | Can run code in temporary scratch workspaces. Cannot save permanent projects or access admin features. |
| **`USER`** | Standard Member | Can create, edit, and delete their own projects and workspaces. Can view standard public community assets. |
| **`MODERATOR`** | Community Moderation | All `USER` permissions. Plus: can review user reports, flag/suspend abusive accounts, and delete public spam projects. |
| **`ADMIN`** | System Administration | All `MODERATOR` permissions. Plus: access to Admin Analytics, Security Dashboard, Deployment Logs, and User Management. |
| **`OWNER`** | Full Superuser | All `ADMIN` permissions. Plus: manage billing, rotate system secrets, toggle maintenance mode, and trigger database backups. |

---

### Granular Permission Matrix

Below is the official permission node mapping defined in `backend/scripts/seed_rbac.py` and enforced via backend API dependency injection:

#### Projects & Workspaces
- `projects.create`: Create new code workspaces and projects.
- `projects.edit.self`: Modify and save files in owned workspaces.
- `projects.delete.any`: Delete any project across the platform (Moderators/Admins).

#### User Management & Moderation
- `users.read.basic`: Read standard user profiles and public badges.
- `users.suspend`: Suspend user accounts from running code or logging in.
- `users.flag`: Mark user accounts for security review.
- `users.delete`: Permanently purge user accounts and associated storage.
- `reports.review` & `reports.resolve`: Manage community violation reports.

#### System, Security, & Administration
- `system.containers.restart`: Restart stuck or orphaned Docker execution runners.
- `system.storage.view`: Monitor disk volume consumption and database growth.
- `system.maintenance.toggle`: Enable/disable platform maintenance mode.
- `system.secrets.manage`: View and rotate OAuth API keys and SMTP credentials (Owner only).
- `database.backup` & `database.restore`: Initiate database snapshots and restores (Owner only).

---

## 📊 Audit Logging & Security Dashboards

To ensure full accountability and traceability, Hamara Editor automatically records administrative and security-sensitive actions in the `admin_audit_logs` and `execution_logs` tables.

### What is Logged?
1. **Admin Actions:** Any privilege escalation, user suspension, role modification, or system setting change is logged with:
   - Administrator Username & ID
   - Target Resource & Action Node
   - Timestamp & IP Address
   - Before/After State payload
2. **Security Events:** Repeated failed login attempts, blocked IP addresses (`blocked_ips`), and suspicious code execution patterns are flagged and presented in real-time on the **Security Dashboard** (`/app/admin/security`).

### Reviewing Logs in Production
Administrators can inspect logs directly through the web UI under **Admin Panel ──> Security Dashboard / Audit Logs**, or via database queries:

```sql
-- View latest 10 administrative actions
SELECT created_at, admin_username, action, details 
FROM admin_audit_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check currently blocked IP addresses
SELECT ip_address, reason, blocked_at 
FROM blocked_ips 
WHERE is_active = true;
```
