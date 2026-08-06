# Architectural Diagrams

These diagrams provide a high-level visual understanding of Hamara Editor's core systems.

## 1. Repository Structure

```mermaid
graph TD
    Root[Hamara Editor Repository]
    Root --> App[app/ (React Frontend)]
    Root --> Backend[backend/ (FastAPI)]
    Root --> Docs[docs/ (Documentation)]
    Root --> Scripts[scripts/ & tools/]
    Root --> Examples[examples/]
    Root --> Github[.github/ (CI/CD)]
    
    Backend --> Alembic[alembic/ (Migrations)]
    Backend --> Exec[app/execution/ (Engine)]
```

## 2. Frontend Architecture

```mermaid
graph TD
    UI[React Components] --> Zustand[Zustand Stores (Local State)]
    UI --> RQ[React Query (Server State)]
    RQ --> API[Axios/Fetch Client]
    UI --> Monaco[Monaco Editor]
    UI --> Xterm[xterm.js Terminal]
```

## 3. Backend Architecture

```mermaid
graph TD
    Router[FastAPI Router] --> Val[Pydantic Validation]
    Val --> Service[Business Logic Service]
    Service --> Repo[SQLAlchemy Repository]
    Repo --> DB[(PostgreSQL)]
    Service --> Exec[Execution Engine]
```

## 4. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant OAuthProvider
    
    User->>Frontend: Click Login
    Frontend->>Backend: Redirect to /auth/login
    Backend->>OAuthProvider: Redirect
    OAuthProvider->>User: Authenticate
    User->>OAuthProvider: Approve
    OAuthProvider->>Backend: Return Code
    Backend->>Backend: Validate & Create Session
    Backend->>Frontend: Set HttpOnly Cookies (JWT)
```

## 5. Execution Engine Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant DockerDaemon
    participant EphemeralContainer
    
    Client->>FastAPI: POST /api/execute (Code + Language)
    FastAPI->>DockerDaemon: Create Container (Mem/CPU limits)
    DockerDaemon-->>FastAPI: Container ID
    FastAPI->>DockerDaemon: Start Container & Inject Code
    DockerDaemon->>EphemeralContainer: Run Code
    EphemeralContainer-->>DockerDaemon: stdout / stderr
    DockerDaemon-->>FastAPI: Stream Output
    FastAPI-->>Client: Stream via WebSocket
    FastAPI->>DockerDaemon: Force Remove Container
```

## 6. Docker & Deployment Topology

```mermaid
graph TD
    Internet((Internet)) --> Nginx[Nginx Proxy :8080]
    Nginx -->|/api/*| FastAPI[FastAPI Container :8000]
    Nginx -->|/*| Vite[React Container :3000]
    FastAPI --> DB[(PostgreSQL Container :5432)]
    FastAPI --> Daemon[Host Docker Socket]
```
