# Hamara Editor

The Open-Source, Enterprise-Grade Cloud Code Editor

<img width="1271" height="798" alt="image" src="https://github.com/user-attachments/assets/25e96b94-7a15-4b27-826a-4dde998f93c5" />

<img width="1280" height="832" alt="image" src="https://github.com/user-attachments/assets/87efb628-4793-42be-8559-7f6c1eaecf9d" />
<img width="1280" height="832" alt="image" src="https://github.com/user-attachments/assets/c0d126c1-6292-47fd-ae76-902ffee7ce78" />

<img width="1280" height="832" alt="image" src="https://github.com/user-attachments/assets/2db33c83-3e65-4d8f-af3e-00c78dc5a361" />

<img width="1280" height="832" alt="image" src="https://github.com/user-attachments/assets/567d1922-5270-4497-b1f7-2fcbc46d34cb" />

<p>
  <a href="https://github.com/hamara/editor/actions"><img src="https://img.shields.io/github/actions/workflow/status/hamara/editor/ci.yml" alt="Build Status"></a>
  <a href="https://github.com/hamara/editor/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/React-19-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-15-blue.svg" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Enabled-blue.svg" alt="Docker">
</p>

---

![Hamara Editor Hero](docs/images/landing-light.jpg)

## Project Overview

Hamara Editor is a high-performance, containerized cloud IDE built for modern teams and educators. It combines a React-based interface with a secure, highly scalable FastAPI and Docker execution engine. Write, execute, and collaborate on code entirely in the browser.

## Features

- **Fast UI**: Built with React 19, Vite, and Zustand.
- **Secure Execution Engine**: Code runs isolated in ephemeral Docker containers.
- **Enterprise Auth**: Full OAuth and RBAC using secure HTTP-only cookies.
- **Monaco Editor**: Integrated with standard VS Code engine.
- **Real-time Terminal**: Streams execution output via WebSockets.

## Screenshots

<details>
<summary>View Screenshots</summary>

| Dark Mode | Light Mode |
| :---: | :---: |
| ![Landing Dark](docs/images/landing-dark.jpg) | ![Landing Light](docs/images/landing-light.jpg) |
| ![Editor Dark](docs/images/editor-dark.jpg) | ![Editor Light](docs/images/editor-light.jpg) |
| ![Workspace](docs/images/workspace.jpg) | ![Terminal](docs/images/terminal.jpg) |
| ![Dashboard](docs/images/dashboard.jpg) | ![Admin Panel](docs/images/admin.jpg) |
| ![Owner Dashboard](docs/images/owner.jpg) | ![Authentication](docs/images/auth.jpg) |

</details>

## Architecture

Hamara Editor follows a strictly typed, three-tier architecture. 
For detailed diagrams, visit the [Architecture Reference](docs/ARCHITECTURE/diagrams.md).

## Tech Stack

### Frontend
- **Framework:** React 19, React Router 7
- **Styling:** Tailwind CSS 4
- **State:** Zustand, React Query
- **Editor:** Monaco Editor, xterm.js

### Backend
- **Framework:** FastAPI
- **Database:** PostgreSQL 15 (SQLAlchemy ORM)
- **Migrations:** Alembic
- **Compute:** Docker Engine API

## Getting Started

### Prerequisites
- Docker & Docker Compose

### Running the Stack

1. **Clone the repository**
   ```bash
   git clone https://github.com/hamara/editor.git
   cd editor
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

3. **Start the application**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   Navigate to `http://localhost:8080`.

## Project Structure

Read the detailed [Project Structure Guide](PROJECT_STRUCTURE.md) for information on where code belongs.

## Documentation

Comprehensive documentation is available in the `docs/` directory:
- [Central Documentation Index](docs/README.md)
- [Project Overview](docs/OWNER_GUIDE/00_PROJECT_OVERVIEW.md)
- [Configuration Reference](docs/CONFIGURATION.md)

## Roadmap

See [ROADMAP.md](ROADMAP.md) for upcoming features.

## Contributing

Please see the [Contributing Guidelines](CONTRIBUTING.md) to get started. Before opening a PR, read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you need help or have found a security vulnerability, refer to [SECURITY.md](SECURITY.md) or open an issue in the issue tracker.
