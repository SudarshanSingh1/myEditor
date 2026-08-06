# Architecture

Hamara Editor follows a modern, scalable, three-tier architecture, augmented by a specialized Code Execution Engine.

For visual diagrams of these systems, see [docs/ARCHITECTURE/diagrams.md](docs/ARCHITECTURE/diagrams.md).

## 1. The Frontend (Client Layer)
Built with **React 19**, **React Router 7**, and **Vite**.
The frontend is a Single Page Application (SPA). It uses **Zustand** for local state management and **React Query** for server state. The core editor component is powered by **Monaco Editor**, and the interactive terminal is built with **xterm.js**.

## 2. The Reverse Proxy (Routing Layer)
An **Nginx** reverse proxy sits in front of the application.
- `/*` routes to the React frontend.
- `/api/*` routes to the backend API.
- Also handles WebSocket upgrades for real-time terminal streaming.

## 3. The Backend (API Layer)
A Python backend powered by **FastAPI**.
It is fully asynchronous and validates all inputs/outputs using Pydantic. It interacts with the PostgreSQL database using **SQLAlchemy** and manages migrations via **Alembic**.

## 4. The Database (Storage Layer)
**PostgreSQL 15** acts as the primary data store for users, projects, and execution history.

## 5. The Execution Engine (Compute Layer)
This is the standout feature of Hamara Editor. When a user requests to run code, the FastAPI backend does not execute the code directly. Instead, it securely communicates with the host machine's Docker daemon via the Docker API to spin up an ephemeral, heavily restricted Alpine Linux container containing the relevant language runtime (Python, Node, C++, etc.). Output is streamed back to the frontend in real-time, and the container is immediately destroyed.

---

For a detailed breakdown of the codebase folder structure, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
