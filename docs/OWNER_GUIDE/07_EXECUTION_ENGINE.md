# Execution Engine

The Execution Engine is the core component that allows users to write and run code safely within myEditor. It is located in `backend/app/execution/`.

## Execution Pipeline

1. **Request**: Frontend sends source code and language spec to `/api/execute`.
2. **Validation**: Backend checks user limits (rate limits, guest vs authenticated).
3. **Queueing (Optional)**: If the system is under heavy load, the request is placed in an asynchronous queue.
4. **Provisioning**: The `DockerService` connects to the host Docker daemon via `/var/run/docker.sock`.
5. **Execution**: A lightweight, isolated container is started with the specified language runtime.
6. **Streaming**: Outputs (stdout, stderr) are streamed back to the client via WebSockets or returned as a single JSON response upon completion.
7. **Cleanup**: The container is forcefully removed.

## Containers

Executions do not happen on the host machine. Every execution runs in a disposable Docker container.
- These containers have no network access (or heavily restricted network access).
- They have no mount points linking to the host's sensitive data.
- They run as a non-root user internally.

## Queue

Heavy concurrent executions can crash the server. We utilize an in-memory queue (or Redis-backed Celery task queue if scaled) to limit concurrent container creations.

## Cancellation

If a user hits "Stop", the frontend sends a cancellation signal to the backend (or closes the WebSocket).
The backend catches this and issues a `docker kill <container_id>` command to forcefully terminate the execution.

## Timeout

Every execution has a strict timeout (e.g., 10 seconds).
The engine uses a monitor thread or native Docker APIs to kill containers that exceed this limit to prevent infinite loops (e.g., `while True: pass`).

## Cleanup

It is imperative that containers are removed. The engine guarantees cleanup using `try...finally` blocks.
A background task runs periodically to sweep and `docker rm -f` any orphaned execution containers.

## Resource Limits

Containers are launched with strict limits:
- `--memory="128m"`
- `--cpus="0.5"`
- `--pids-limit=50`
This prevents a fork bomb or memory leak from taking down the main server.

## Language Support

Currently supported languages are defined in `backend/app/execution/languages/`.
Each language has a configuration specifying:
- The Docker image to use (e.g., `python:3.10-alpine`, `node:20-alpine`).
- The run command.
- File extensions.

## Adding New Languages

1. Create a new definition in `backend/app/execution/languages/`.
2. Ensure the base Docker image exists and is lightweight (alpine preferred).
3. Update the frontend UI to include the new language in the dropdown.

## Debugging Executions

If code execution is failing system-wide:
1. Check if the `api` container has access to `/var/run/docker.sock`.
2. Check `docker ps -a` for stuck runner containers.
3. Check `backend` logs for Docker API permission denied errors.

## Performance Optimization

- **Pre-pulled Images**: Ensure all runner images are pre-pulled on the host machine.
- **Warm Pools**: (Advanced) Maintain a pool of running, idle containers to eliminate Docker startup latency. Currently, containers are spun up on-demand.
