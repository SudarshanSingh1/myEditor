# Project Structure

This document outlines the top-level repository structure of Hamara Editor.

```
editor/
├── app/                  # Frontend application code (React, Vite, Tailwind).
├── backend/              # API logic, database models, and Execution Engine (FastAPI).
├── docs/                 # Official documentation suite (Architecture, SOPs, Guides).
├── examples/             # Code execution examples in various languages (Python, TS, etc.).
├── scripts/              # Manual deployment, testing, and maintenance scripts.
├── tools/                # Utilities for benchmarking, profiling, and stress testing.
├── .github/              # GitHub templates and settings (Issue templates, CODEOWNERS).
├── docker-compose.yml    # Main Docker Compose configuration for running the stack.
├── README.md             # The main entrypoint describing the project.
└── LICENSE               # The MIT License file.
```

## Description of Folders

### `app/`
Contains the entire frontend monolith. It is built using React 19 and Vite. The codebase adheres to strict TypeScript rules. State is managed via Zustand, and API calls are handled by React Query.

### `backend/`
Contains the Python backend built with FastAPI. It handles API requests, OAuth authentication, database migrations (Alembic), and integrates directly with the Docker Engine API to spin up ephemeral code execution containers.

### `docs/`
The central hub for all technical and organizational documentation. It is sub-divided by domain (e.g., ARCHITECTURE, DATABASE, SECURITY) to make it easy for new contributors to locate information.

### `examples/`
Contains minimal execution examples for the supported languages in Hamara Editor. Useful for validating that the execution engine works correctly for a specific runtime.

### `scripts/`
Contains bash and python scripts used for manual operational tasks. This includes database migrations, manual deployment tasks, and developer utilities.

### `tools/`
Dedicated directory for heavy internal tools used for benchmarking system performance, stress testing the websocket execution layer, and profiling memory usage.

### `.github/`
Houses repository configuration standardizing how issues and pull requests should be submitted.
