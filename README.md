# Hamara Editor

Hamara Editor is an advanced, self-hosted web-based Integrated Development Environment (IDE).
It supports execution for multiple programming languages using isolated Docker containers, guaranteeing secure, reproducible environments for every code run.

## Features

- **Multi-Language Support**: Run C, C++, Python, Java, JavaScript, TypeScript, Go, and Rust.
- **Docker-Isolated Execution**: Code is executed in secure, resource-limited Docker containers with temporary filesystems and disabled networking.
- **Real-Time Terminal**: Full xterm.js integration providing interactive stdin, stdout, and stderr streaming via WebSockets.
- **Robust File Explorer**: Nested folder structures, drag-and-drop support, context menus, and file state persistence.
- **Monaco Editor**: Powerful editor with syntax highlighting, language intelligence, and tab management.

## Production Deployment (Docker Compose)

Hamara Editor is ready for production deployment using Docker Compose. The stack consists of:
1. **Frontend**: A React SPA built with Vite and served via Nginx.
2. **Backend**: A FastAPI application managing workspaces, users, and Docker container orchestration.
3. **Database**: PostgreSQL for persistent storage of users, projects, and file contents.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.
- Ensure the Docker daemon is running, as the backend API needs to mount `/var/run/docker.sock` to orchestrate execution containers.

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd myEditor
   ```

2. **Configure Environment Variables**:
   Copy the example environment files and adjust if necessary (e.g., set a secure `SECRET_KEY`).
   ```bash
   cp backend/.env.example backend/.env
   cp .env.example .env
   ```

3. **Start the Stack**:
   Run the following command in the root directory:
   ```bash
   docker-compose up -d --build
   ```

4. **Access the Application**:
   Open your browser and navigate to `http://localhost`.

### Security Considerations

- **Docker Socket**: The backend mounts the host's Docker socket to spawn containers. Ensure the host is secured.
- **Container Limits**: The execution containers are strictly limited (e.g. 128MB RAM, 5 seconds execution timeout, no network, read-only base images).
- **CORS & Cookies**: In production, ensure `FRONTEND_URL` is set correctly and the backend environment variables are tuned to enforce `secure` cookies over HTTPS.

## Development

For local development without Docker Compose, refer to the frontend and backend `README` or run:
- Frontend: `npm run dev`
- Backend: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload`
