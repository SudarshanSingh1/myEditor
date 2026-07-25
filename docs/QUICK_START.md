# 🚀 Hamara Editor — Quick Start Guide

Welcome to the **Hamara Editor Quick Start Guide**. Whether you want to spin up a fully isolated multi-language code execution IDE on your local machine in minutes or evaluate the platform for self-hosting, this guide has you covered.

---

## ⚡ Option 1: 5-Minute Docker Compose Setup (Recommended)

The easiest and most reliable way to run Hamara Editor is via Docker Compose. This automatically provisions the React Frontend (served via Nginx), the FastAPI Backend, and the PostgreSQL database with zero dependency configuration.

### Prerequisites
- **Docker Engine** (v24.0+ recommended)
- **Docker Compose** (v2.20+ recommended)
- *Note for Linux/macOS users:* Ensure the user running Docker has permissions to access `/var/run/docker.sock` (or run with `sudo`), as the backend orchestrates ephemeral execution containers via the Docker socket.

### Step 1: Clone the Repository
```bash
git clone https://github.com/sudarshankushwaha/myEditor.git
cd myEditor
```

### Step 2: Configure Environment Variables
Copy the provided example environment files for both the root project and the backend:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```
> **Tip:** For local testing, the default values in `.env.example` are ready out of the box. For production or remote server testing, make sure to update `SECRET_KEY`, `DATABASE_URL`, and `FRONTEND_URL`.

### Step 3: Launch the Stack
Run the automated build and startup command:
```bash
docker compose up -d --build
```

#### What happens during startup?
1. **Frontend Builder:** Compiles TypeScript & React 19 assets using Vite and packages them into a lightweight Nginx container.
2. **Backend Builder:** Pre-builds Python 3.13 dependencies in a clean builder stage and deploys them to a minimal runtime image.
3. **Database Initialization:** Spins up PostgreSQL 15 and automatically executes Alembic database migrations (`alembic upgrade head`) and RBAC permission seeding via `entrypoint.sh`.

### Step 4: Access the IDE
Open your web browser and navigate to:
```text
http://localhost:8080   (or http://localhost depending on your port configuration)
```

To stop the application at any time:
```bash
docker compose down
```
To shut down and wipe persistent database volumes (clean slate):
```bash
docker compose down -v
```

---

## 💻 Option 2: Local Development Setup (Without Docker Compose)

If you are developing new features or debugging components locally, you can run the Frontend and Backend services independently on your host machine while using Docker solely for code execution containers.

### 1. Database Setup
Start a local PostgreSQL instance (or spin one up quickly via Docker):
```bash
docker run --name hamara-postgres -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=hamara_editor -p 5432:5432 -d postgres:15-alpine
```

### 2. Backend Setup (FastAPI + Python 3.13)
Open a terminal in the `backend/` directory:
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Ensure DATABASE_URL in .env points to postgresql+psycopg://user:password@localhost:5432/hamara_editor

# Run database migrations and seed initial roles
alembic upgrade head
python scripts/seed_rbac.py

# Start the API server with live reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The Backend API & Swagger UI will now be available at `http://localhost:8000/docs`.

### 3. Frontend Setup (React 19 + TypeScript + Vite)
Open a new terminal in the project root directory:
```bash
# Install Node.js dependencies (Node 20+ required)
npm install

# Start the Vite development server
npm run dev
```
The Frontend UI will now be accessible at `http://localhost:5173` (or the port specified in your console).

---

## 🛠️ Verification & Troubleshooting

### Check Container Health
To verify that all services are running smoothly:
```bash
docker compose ps
```
All containers (`api`, `frontend`, `proxy`, `db`) should report a status of **Up / Healthy**.

### Testing Code Execution
1. Log into the web interface or continue as a Guest.
2. Create a new Workspace (e.g., Python or TypeScript).
3. Type a simple code snippet in the Monaco Editor:
   ```python
   import sys
   print("Hello from Hamara Editor Sandbox!")
   print(f"Python Version: {sys.version}")
   ```
4. Click **Run Code**. You should see interactive terminal output stream instantly via WebSockets!

---

## 📖 Next Steps
- 🌐 **[Self-Hosting & Production Deployment](SELF_HOSTING.md)**: Learn how to deploy on a remote VPS with Nginx SSL, Neon PostgreSQL, and automated CI/CD GitHub Actions.
- 🔐 **[Security & RBAC Guide](SECURITY_AND_RBAC.md)**: Explore how Docker cgroups, memory limits, network isolation, and granular role permissions protect the platform.
- 🤝 **[Contributing Guide](../CONTRIBUTING.md)**: Join the developer community and contribute new language runners or UI enhancements!
