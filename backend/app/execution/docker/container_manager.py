import docker
from docker.errors import DockerException, ContainerError, ImageNotFound
from typing import Dict, Tuple
import time
import logging
import asyncio
from fastapi import WebSocket

from app.execution.docker.container_security import get_secure_container_config, MAX_EXECUTION_TIME, MAX_OUTPUT_SIZE

logger = logging.getLogger(__name__)

class DockerManager:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            try:
                cls._client = docker.from_env()
            except DockerException as e:
                logger.error(f"Failed to connect to Docker daemon: {e}")
                raise RuntimeError("Docker daemon is not available. Execution engine cannot start.")
        return cls._client

    @classmethod
    def pull_image_if_not_exists(cls, image_name: str) -> None:
        client = cls.get_client()
        try:
            client.images.get(image_name)
        except ImageNotFound:
            logger.info(f"Pulling Docker image {image_name}...")
            client.images.pull(image_name)

    @classmethod
    def run_container(cls, image: str, command: str, working_dir: str, binds: Dict[str, Dict[str, str]], timeout: int = MAX_EXECUTION_TIME, mem_limit: str = None) -> Tuple[int, str, float]:
        """
        Runs a command in a secure Docker container.
        Returns: (exit_code, output_str, execution_time_seconds)
        """
        client = cls.get_client()
        cls.pull_image_if_not_exists(image)
        
        config = get_secure_container_config(image, command, working_dir, binds, mem_limit)
        
        container = None
        start_time = time.time()
        exit_code = -1  # Initialize with a safe default

        try:
            # Create and start the container
            container = client.containers.run(**config)

            # Wait for container to finish or timeout
            try:
                result = container.wait(timeout=timeout)
                exit_code = result['StatusCode']
            except docker.errors.APIError as e:
                # Docker API-level error (daemon issue, etc.) – treat as system error
                logger.error(f"Docker API error while waiting for container: {e}")
                if container:
                    container.kill()
                return (-1, f"Execution Error: Docker API failure ({type(e).__name__})", time.time() - start_time)
            except Exception:
                # requests.exceptions.ReadTimeout or similar – treat as time limit exceeded
                if container:
                    container.kill()
                return (124, "Execution Error: Time Limit Exceeded", time.time() - start_time)

            # Get logs (mix stdout and stderr for simple viewing)
            logs = container.logs(stdout=True, stderr=True).decode('utf-8', errors='replace')

            # Truncate if too large
            if len(logs) > MAX_OUTPUT_SIZE:
                logs = logs[:MAX_OUTPUT_SIZE] + "\n...[Output truncated due to size limit]..."

            exec_time = time.time() - start_time
            return (exit_code, logs, exec_time)

        except ContainerError as e:
            return (e.exit_status, e.stderr.decode('utf-8', errors='replace') if e.stderr else "", time.time() - start_time)
        except DockerException as e:
            # Docker daemon may have restarted — reset the singleton client so
            # the next request re-initializes the connection instead of failing forever.
            logger.error(f"Docker daemon error during execution (resetting client): {e}")
            cls._client = None
            return (-1, "Execution Error: Docker daemon unavailable. Please try again.", time.time() - start_time)
        except Exception as e:
            logger.error(f"Docker execution failed: {e}")
            return (-1, "Internal System Error. Check server logs for details.", time.time() - start_time)
        finally:
            # Ensure container is ALWAYS destroyed
            if container:
                try:
                    container.remove(force=True)
                except Exception as remove_err:
                    logger.error(f"Failed to remove container {container.id}: {remove_err}")

    @classmethod
    async def run_container_interactive(cls, image: str, command: str, working_dir: str, binds: Dict[str, Dict[str, str]], websocket: WebSocket, timeout: int = MAX_EXECUTION_TIME, mem_limit: str = None, user: str = None) -> int:
        client = cls.get_client()
        cls.pull_image_if_not_exists(image)
        
        config = get_secure_container_config(image, command, working_dir, binds, mem_limit)
        config["tty"] = True
        config["stdin_open"] = True
        # Allow caller to override the container user (e.g. "nobody" for shell sessions)
        if user is not None:
            config["user"] = user
        
        container = None
        try:
            container = client.containers.create(**config)
            sock = container.attach_socket(params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1})
            raw_sock = sock._sock
            raw_sock.setblocking(False)
            
            container.start()
            
            loop = asyncio.get_running_loop()
            
            async def read_from_docker():
                while True:
                    try:
                        data = await loop.sock_recv(raw_sock, 4096)
                        if not data:
                            break
                        await websocket.send_text(data.decode('utf-8', errors='replace'))
                    except Exception:
                        break
            
            async def write_to_docker():
                while True:
                    try:
                        text = await websocket.receive_text()
                        
                        # Check if it's a JSON command (like SIGINT)
                        if text.startswith('{') and text.endswith('}'):
                            try:
                                import json
                                data = json.loads(text)
                                if data.get('type') == 'signal' and data.get('signal') == 'SIGINT':
                                    # Send Ctrl+C (\x03) to the PTY
                                    await loop.sock_sendall(raw_sock, b'\x03')
                                    continue
                            except Exception:
                                pass # Not a valid JSON, fall through to raw
                        
                        await loop.sock_sendall(raw_sock, text.encode('utf-8'))
                    except Exception:
                        break
                        
            task_read = asyncio.create_task(read_from_docker())
            task_write = asyncio.create_task(write_to_docker())
            
            # Limit interactive sessions to 30 minutes max to prevent resource exhaustion
            interactive_timeout = 1800
            
            wait_task = asyncio.create_task(asyncio.to_thread(container.wait, timeout=interactive_timeout))
            
            # Wait for either the container to finish or the websocket to disconnect
            done, pending = await asyncio.wait(
                [wait_task, task_write],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            if wait_task in done:
                # Container exited naturally or hit the 1-hour timeout
                try:
                    result = wait_task.result()
                    exit_code = result.get('StatusCode', -1)
                except Exception as e:
                    logger.error(f"Container wait exception: {e}")
                    exit_code = -1
            else:
                # WebSocket disconnected before container finished
                logger.info("WebSocket disconnected. Killing interactive container.")
                exit_code = -1
                
            # Allow read task to finish consuming logs
            try:
                await asyncio.wait_for(task_read, timeout=2.0)
            except Exception:
                pass
                
            task_write.cancel()
            wait_task.cancel()
            
            return exit_code
        except Exception as e:
            logger.error(f"Error in interactive execution: {e}")
            return -1
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass
