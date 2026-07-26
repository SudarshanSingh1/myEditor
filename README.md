<img width="1280" height="832" alt="image" src="https://github.com/user-attachments/assets/fec735d6-97d3-4a5f-ac98-44b5296c58a3" />
<img width="1137" height="415" alt="image" src="https://github.com/user-attachments/assets/5ad7d888-c560-4a09-aa24-eaf2436a2ea6" />
<img width="1139" height="409" alt="image" src="https://github.com/user-attachments/assets/43646981-0c98-48d7-92ec-41c5df19225f" />
<img width="1280" height="832" alt="image" src="https://github.com/user-attachments/assets/c292ca10-0eff-4455-b4a7-aa360e7d3bfc" />
<img width="1030" height="419" alt="image" src="https://github.com/user-attachments/assets/49247798-37f3-4365-96c8-f2a1d90d0d2f" />
<img width="1018" height="559" alt="image" src="https://github.com/user-attachments/assets/dd7f2c16-b4b5-47a3-a544-b51171871896" />
<img width="1026" height="653" alt="image" src="https://github.com/user-attachments/assets/dc6d28fe-9b17-4417-87ee-9196522b7793" />






# Hamara Editor — Self-Hosted Cloud IDE & Code Execution Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.13" />
  <img src="https://img.shields.io/badge/React-19.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Docker-Sandbox%20Isolated-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Isolated" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <b>An advanced, production-ready, self-hosted web IDE that safely executes untrusted code across multiple programming languages inside ephemeral Linux sandbox containers.</b>
</p>

---

## ✨ Why Hamara Editor?

Running untrusted code submitted by web users requires extreme security, low latency, and robust resource management. **Hamara Editor** combines the editing power of VS Code's **Monaco Editor**, real-time interactive **WebSockets terminals**, and **zero-trust Docker container isolation** to deliver a seamless, enterprise-grade development platform that you can self-host anywhere in minutes.

---

## 🌟 Key Features

- ⚡ **Multi-Language Execution Engine:** Native support for **Python 3.13, JavaScript (Node 20), TypeScript, C, C++, Java, Go, and Rust**.
- 🖥️ **Monaco IDE & Real-Time Terminal:** Full IntelliSense, syntax highlighting, multi-tab file management, and interactive xterm.js terminal streaming (stdin, stdout, stderr) via low-latency WebSockets.
- 🛡️ **Zero-Trust Sandbox Isolation:** Every code run spawns an ephemeral, unprivileged Linux container with **networking completely disabled (`--network none`)**, read-only root filesystems, hard RAM caps (`cgroups`), and strict execution timeouts.
- 🔐 **Granular RBAC Hierarchy:** Built-in Role-Based Access Control (`GUEST`, `USER`, `MODERATOR`, `ADMIN`, `OWNER`) protecting code workspaces, community moderation, and system settings.
- 📊 **Enterprise Admin & Security Dashboards:** Real-time audit logging, automated IP blocking (`blocked_ips`), report resolution, and container liveness telemetry.
- ☁️ **Cloud Native & Self-Hostable:** Built for automated deployment on VPS, AWS, or bare-metal servers using Docker Compose, Nginx SSL reverse proxy, and managed PostgreSQL (e.g., Neon DB) with automated GitHub Actions CI/CD.

---

## 📚 Official Documentation Suite

We have modularized our documentation into dedicated guides tailored to your role. Choose your path below:

| Documentation Guide | Audience & Contents |
| :--- | :--- |
| 🚀 **[Quick Start Guide](docs/QUICK_START.md)** | **For New Users:** Spin up the complete stack locally in 5 minutes via Docker Compose or set up local dev servers without Docker. |
| 🌐 **[Self-Hosting & VPS Guide](docs/SELF_HOSTING.md)** | **For System Admins & DevOps:** Deploy on Ubuntu VPS with Nginx SSL (Let's Encrypt), Neon PostgreSQL, and automated GitHub Actions CD pipeline. |
| 💻 **[Developer & Contributor Guide](docs/DEVELOPING.md)** | **For Developers:** Set up Vite + FastAPI hot-reload environments, run Pytest/Ruff/ESLint test suites, and understand core codebase architecture. |
| 🔐 **[Security & RBAC Guide](docs/SECURITY_AND_RBAC.md)** | **For Security Reviewers:** Deep-dive into Docker container isolation mechanics, memory limits, network disabling, and RBAC permission matrices. |
| 🤝 **[Contributing Guidelines](CONTRIBUTING.md)** | **For Contributors:** Learn our git branching workflow, coding style standards, commit naming conventions, and PR submission process. |

---

## ⚡ 5-Minute Quick Start (Docker Compose)

The fastest way to experience Hamara Editor is using Docker Compose. Ensure Docker Engine and Docker Compose are installed and your user has access to `/var/run/docker.sock`.

### 1. Clone & Configure
```bash
git clone https://github.com/sudarshankushwaha/myEditor.git
cd myEditor

# Copy default environment files
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. Launch the Stack
```bash
docker compose up -d --build
```
On startup, Docker Compose will automatically build the React 19 Frontend and Python 3.13 Backend, initialize PostgreSQL 15, and run all database migrations (`alembic upgrade head`) automatically.

### 3. Open Your IDE
Open your browser and navigate to:
```text
http://localhost:8080   (or http://localhost depending on your port configuration)
```
*(For detailed local development instructions without Docker Compose, check out our **[Quick Start Guide](docs/QUICK_START.md)**).*

---

## 🏗️ System Architecture

```text
                        ┌────────────────────────────┐
                        │      Client Browser        │
                        │ HTTPS • WebSockets • Auth │
                        └─────────────┬──────────────┘
                                      │
                                      ▼
                      ┌─────────────────────────────────┐
                      │       Nginx Reverse Proxy       │
                      │ SSL • Routing • Load Balancing  │
                      └─────────────┬───────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
      ┌─────────────────────┐              ┌──────────────────────┐
      │ React 19 Frontend   │              │ FastAPI Backend      │
      │ Monaco • xterm.js   │              │ REST • WebSockets    │
      └──────────┬──────────┘              └──────────┬───────────┘
                 │                                    │
                 ▼                                    ▼
      ┌─────────────────────┐              ┌──────────────────────┐
      │ PostgreSQL / Neon   │              │ Docker Engine        │
      │ Users • Projects    │              │ Container Manager    │
      └─────────────────────┘              └──────────┬───────────┘
                                                      ▼
                                         ┌────────────────────────┐
                                         │ Ephemeral Sandboxes    │
                                         │ CPU • RAM • Network    │
                                         │ Isolated Execution     │
                                         └────────────────────────┘
```

---

## 🧪 Testing & Quality Assurance

Hamara Editor maintains strict automated test suites across both frontend and backend services. You can run tests directly on your local machine or inside isolated Docker containers.

### 🐳 Running Tests Inside Docker (Recommended)
When running via Docker Compose, you can execute the test suite directly inside the live containers without installing local Python or Node dependencies:

```bash
# 1. Run Backend API Pytest Test Suite inside Docker
docker compose exec api pytest tests/ -v

# 2. Run specific Security Dashboard & RBAC permission tests in Docker
docker compose exec api pytest tests/api/test_admin.py -k security -v

# 3. Check database migration consistency inside Docker
docker compose exec api python3 scripts/check_migrations.py
```

### 🛡️ Testing & Verifying Docker Sandbox Isolation
Hamara Editor executes untrusted user code inside ephemeral Docker containers with networking disabled (`--network none`) and strict memory caps. To verify that your host Docker daemon is ready to spawn sandbox runners:

```bash
# Test Python 3.13 isolated sandbox runner (No Network / Read-Only Test)
docker run --rm --network none -i python:3.13-slim python3 -c 'print("🐳 Python Sandbox OK!")'

# Test Node.js 20 isolated sandbox runner
docker run --rm --network none -i node:20-alpine node -e 'console.log("🐳 Node Sandbox OK!")'

# Monitor ephemeral sandbox containers spawning in real-time during code execution
docker ps --filter "status=running"
```

### 💻 Running Tests Locally (Without Docker)

```bash
# Run Backend Pytest Test Suite (in /backend directory with venv active)
cd backend && source venv/bin/activate && pytest tests/api/ -v

# Run Backend Python Linting & Formatting Check
ruff check .

# Run Frontend TypeScript Verification (in project root)
npm run typecheck && npm run lint
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Built with ❤️ by Sudarshan for his brother — and coders everywhere.</b> <a href="CONTRIBUTING.md">Join us!</a>
</p>

