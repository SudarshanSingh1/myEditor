<div align="center">

# ⟨/⟩ Hamara Editor

### The Open-Source, Enterprise-Grade Cloud Code Editor

[![Build Status](https://img.shields.io/github/actions/workflow/status/hamara/editor/ci.yml?style=for-the-badge&logo=github&label=CI)](https://github.com/hamara/editor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)

**Write, execute, and collaborate on code — entirely in the browser.**

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Documentation](#-documentation) · [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Code Execution Flow](#-code-execution-flow)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## 🔍 Overview

Hamara Editor is a high-performance, containerized cloud IDE built for modern teams and educators. It combines a **React 19** interface with a secure, highly scalable **FastAPI** backend and a **Docker-based** code execution engine. Users can write, run, and debug code in isolated containers — all from the browser.

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| ⚡ **Blazing Fast UI** | Built with React 19, Vite, and Zustand for instant interactions |
| 🔒 **Secure Execution** | Code runs in ephemeral, resource-limited Docker containers |
| 🔑 **Enterprise Auth** | Full OAuth 2.0 + RBAC with secure HTTP-only cookie sessions |
| 📝 **Monaco Editor** | VS Code's editing engine with IntelliSense and syntax highlighting |
| 📡 **Real-time Terminal** | Live execution output streamed via WebSockets using xterm.js |
| 🎨 **Dark & Light Modes** | Beautiful themes for every preference |
| 📊 **Admin Dashboard** | Role-based dashboards for owners, admins, and users |

---

## 📸 Screenshots

<details>
<summary><b>Click to expand screenshots</b></summary>
<br>

| Dark Mode | Light Mode |
| :---: | :---: |
| ![Landing Dark](docs/images/landing-dark.jpg) | ![Landing Light](docs/images/landing-light.jpg) |
| ![Editor Dark](docs/images/editor-dark.jpg) | ![Editor Light](docs/images/editor-light.jpg) |
| ![Workspace](docs/images/workspace.jpg) | ![Terminal](docs/images/terminal.jpg) |
| ![Dashboard](docs/images/dashboard.jpg) | ![Admin Panel](docs/images/admin.jpg) |
| ![Owner Dashboard](docs/images/owner.jpg) | ![Authentication](docs/images/auth.jpg) |

</details>

---

## 🏗 Architecture

Hamara Editor follows a strictly typed, three-tier architecture with a dedicated compute layer.

### System Overview

```mermaid
flowchart LR
    subgraph Client["🖥️ Client Layer"]
        Browser["Browser"]
    end

    subgraph Proxy["🔀 Routing Layer"]
        Nginx["Nginx :8080"]
    end

    subgraph Frontend["⚛️ Frontend"]
        React["React 19 SPA"]
        Monaco["Monaco Editor"]
        Xterm["xterm.js Terminal"]
    end

    subgraph Backend["⚙️ API Layer"]
        FastAPI["FastAPI Server"]
        Auth["OAuth + RBAC"]
        ExecEngine["Execution Engine"]
    end

    subgraph Storage["💾 Storage Layer"]
        DB[("PostgreSQL 15")]
    end

    subgraph Compute["🐳 Compute Layer"]
        DockerDaemon["Docker Daemon"]
        Container1["🟢 Python"]
        Container2["🟡 Node.js"]
        Container3["🔵 C++"]
    end

    Browser --> Nginx
    Nginx -->|"/* routes"| React
    Nginx -->|"/api/* routes"| FastAPI
    React --- Monaco
    React --- Xterm
    FastAPI --> Auth
    FastAPI --> ExecEngine
    FastAPI --> DB
    ExecEngine --> DockerDaemon
    DockerDaemon --> Container1
    DockerDaemon --> Container2
    DockerDaemon --> Container3
```

### Request Decision Flowchart

```mermaid
flowchart TD
    A["📨 Incoming Request"] --> B{"Route Type?"}

    B -->|"/* (Static)"| C["Serve React SPA"]
    B -->|"/api/*"| D{"Authenticated?"}
    B -->|"WebSocket"| E["Upgrade Connection"]

    D -->|"❌ No"| F["Return 401 Unauthorized"]
    D -->|"✅ Yes"| G{"Request Type?"}

    G -->|"CRUD Operation"| H["Service Layer → Repository → DB"]
    G -->|"Code Execution"| I{"Valid Language?"}

    I -->|"❌ No"| J["Return 400 Bad Request"]
    I -->|"✅ Yes"| K["Create Ephemeral Container"]

    K --> L["Inject Code & Run"]
    L --> M["Stream Output via WebSocket"]
    M --> N["Destroy Container"]

    E --> M

    style A fill:#4F46E5,color:#fff
    style C fill:#10B981,color:#fff
    style F fill:#EF4444,color:#fff
    style J fill:#EF4444,color:#fff
    style K fill:#3B82F6,color:#fff
    style N fill:#6366F1,color:#fff
```

---

## 🐳 Code Execution Flow

This is the standout feature of Hamara Editor. User code never runs on the host — it's executed inside isolated, ephemeral Docker containers with strict resource limits.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant API as FastAPI Backend
    participant Docker as Docker Daemon
    participant Container as Ephemeral Container

    User->>Frontend: Write code & click "Run"
    Frontend->>API: POST /api/execute {code, language}
    
    API->>API: Validate input & check permissions
    API->>Docker: Create container (CPU/Memory limits)
    Docker-->>API: Container ID
    
    API->>Docker: Start container & inject code
    Docker->>Container: Execute code in sandbox
    
    loop Stream Output
        Container-->>Docker: stdout / stderr chunks
        Docker-->>API: Forward output stream
        API-->>Frontend: Stream via WebSocket
        Frontend-->>User: Display in terminal
    end

    API->>Docker: Force remove container
    Docker-->>API: Cleanup confirmed
```

---

## 🛠 Tech Stack

<table>
<tr>
<td valign="top" width="50%">

### Frontend
| Technology | Purpose |
| :--- | :--- |
| React 19 | UI framework |
| React Router 7 | Client-side routing |
| Tailwind CSS 4 | Utility-first styling |
| Zustand | Local state management |
| React Query | Server state & caching |
| Monaco Editor | Code editing engine |
| xterm.js | Terminal emulator |
| Framer Motion | Animations |

</td>
<td valign="top" width="50%">

### Backend
| Technology | Purpose |
| :--- | :--- |
| FastAPI | Async Python API framework |
| PostgreSQL 15 | Primary database |
| SQLAlchemy | ORM & query builder |
| Alembic | Database migrations |
| Pydantic | Data validation |
| Docker Engine API | Container orchestration |
| Nginx | Reverse proxy |

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

**1. Clone the repository**

```bash
git clone https://github.com/hamara/editor.git
cd editor
```

**2. Configure environment variables**

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

**3. Start the application**

```bash
docker compose up --build
```

**4. Open in your browser**

```
http://localhost:8080
```

> [!TIP]
> For detailed setup instructions including manual (non-Docker) installation, see the [Quick Start Guide](docs/QUICK_START.md).

---

## 📁 Project Structure

```
hamara-editor/
├── app/                  # React frontend (Vite, Tailwind, TypeScript)
├── backend/              # FastAPI backend (Auth, API, Execution Engine)
│   ├── app/              # Application code
│   │   └── execution/    # Docker-based code execution engine
│   └── alembic/          # Database migration scripts
├── docs/                 # Documentation suite
│   ├── ARCHITECTURE/     # System diagrams & design decisions
│   ├── DEPLOYMENT/       # Hosting & CI/CD guides
│   └── OWNER_GUIDE/      # Engineering handbook
├── examples/             # Code execution examples (Python, TS, etc.)
├── scripts/              # Deployment & maintenance scripts
├── tools/                # Benchmarking & stress testing utilities
├── .github/              # CI/CD workflows & issue templates
├── docker-compose.yml    # Development stack configuration
└── nginx.conf            # Reverse proxy configuration
```

> For a comprehensive breakdown, see the [Project Structure Guide](PROJECT_STRUCTURE.md).

---

## 📚 Documentation

| Document | Description |
| :--- | :--- |
| [📖 Documentation Index](docs/README.md) | Central hub for all documentation |
| [🏗 Architecture Diagrams](docs/ARCHITECTURE/diagrams.md) | Visual system design references |
| [⚙️ Configuration Reference](docs/CONFIGURATION.md) | Environment variables & config options |
| [🚀 Quick Start Guide](docs/QUICK_START.md) | Detailed setup walkthrough |
| [🔒 Security & RBAC](docs/SECURITY_AND_RBAC.md) | Auth, roles, and security policies |
| [🏠 Self-Hosting Guide](docs/SELF_HOSTING.md) | Deploy on your own infrastructure |
| [🛠 Developer Guide](docs/DEVELOPING.md) | Local development workflow |

---

## 🗺 Roadmap

| Version | Features |
| :--- | :--- |
| **v2** | LSP integration · Multi-file workspaces · Custom env variables · Java/C++ support |
| **v3** | Real-time collaboration (CRDTs) · Project sharing · Ephemeral SQLite per session |
| **Future** | AI copilot · AI-driven debugging · Voice/video chat · Classroom mode for educators |

> See the full [Roadmap](ROADMAP.md) for details.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feat/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feat/amazing-feature`)
5. **Open** a Pull Request

> [!IMPORTANT]
> Before contributing, please read the [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 🔒 Security

If you discover a security vulnerability, please report it responsibly. **Do not open a public issue.** Instead, refer to our [Security Policy](SECURITY.md) for instructions.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the Hamara Editor team**

⭐ Star this repo if you find it useful!

</div>
