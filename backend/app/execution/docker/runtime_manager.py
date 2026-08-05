import docker
import io
import tarfile
import time
import uuid
import asyncio
import logging
import threading
from typing import Dict, Any, Tuple
from .container_pool import ContainerPoolManager
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class RuntimeManager:
    _instance = None

    def __init__(self):
        self.pool_manager = ContainerPoolManager.get_instance()
        self.client = docker.from_env()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _create_tar_stream(self, files: Dict[str, str]) -> io.BytesIO:
        """Creates a tar stream in memory for the given files."""
        tar_stream = io.BytesIO()
        with tarfile.open(fileobj=tar_stream, mode="w") as tar:
            for filename, content in files.items():
                encoded_content = content.encode("utf-8")
                tarinfo = tarfile.TarInfo(name=filename)
                tarinfo.size = len(encoded_content)
                tarinfo.mtime = int(time.time())
                tarinfo.mode = 0o666
                tar.addfile(tarinfo, io.BytesIO(encoded_content))
        tar_stream.seek(0)
        return tar_stream

    async def execute_interactive(
        self,
        language: str,
        image: str,
        command: str,
        files: Dict[str, str],
        websocket: WebSocket,
        mem_limit: str = "256m"
    ) -> int:
        """
        Executes code using a warm container from the pool.
        """
        # Ensure pool is initialized
        self.pool_manager.initialize_pool(language, image, mem_limit)

        container = await self.pool_manager.get_container(language)
        if not container:
            # Fallback to creating one immediately
            container = await asyncio.to_thread(self.pool_manager._create_warm_container, image, mem_limit)
            if not container:
                return -1

        exec_dir = f"/tmp/exec_{uuid.uuid4().hex}"
        
        try:
            # Create execution directory
            await asyncio.to_thread(
                container.exec_run, f"mkdir -p {exec_dir}"
            )
            await asyncio.to_thread(
                container.exec_run, f"chmod 777 {exec_dir}"
            )

            # Inject files
            tar_stream = await asyncio.to_thread(self._create_tar_stream, files)
            await asyncio.to_thread(
                self.client.api.put_archive, container.id, exec_dir, tar_stream
            )

            # Create exec instance
            # Wrap command in sh to CD to directory
            full_command = f"sh -c 'cd {exec_dir} && {command}'"
            
            exec_id = await asyncio.to_thread(
                self.client.api.exec_create,
                container.id,
                full_command,
                stdout=True,
                stderr=True,
                stdin=True,
                tty=True
            )

            # Start exec session and get socket
            sock = await asyncio.to_thread(
                self.client.api.exec_start,
                exec_id["Id"],
                socket=True,
                tty=True
            )
            
            raw_sock = sock._sock if hasattr(sock, "_sock") else sock
            raw_sock.setblocking(False)
            
            loop = asyncio.get_running_loop()

            async def read_from_exec():
                import json
                while True:
                    try:
                        data = await loop.sock_recv(raw_sock, 4096)
                        if not data:
                            break
                        decoded = data.decode("utf-8", errors="replace")
                        await websocket.send_text(json.dumps({"type": "stdout", "data": decoded}))
                    except Exception as e:
                        break

            async def write_to_exec():
                import json
                while True:
                    try:
                        text = await websocket.receive_text()
                        try:
                            data = json.loads(text)
                            msg_type = data.get("type")
                            
                            if msg_type == "stdin":
                                stdin_data = data.get("data", "")
                                await loop.sock_sendall(raw_sock, stdin_data.encode("utf-8"))
                            elif msg_type == "signal" and data.get("signal") == "SIGINT":
                                await loop.sock_sendall(raw_sock, b"\x03")
                            elif msg_type == "signal" and data.get("signal") == "SIGKILL":
                                # To SIGKILL we must kill the process inside the container
                                # exec_inspect gives the PID
                                try:
                                    info = await asyncio.to_thread(self.client.api.exec_inspect, exec_id["Id"])
                                    pid = info.get("Pid")
                                    if pid:
                                        await asyncio.to_thread(container.exec_run, f"kill -9 {pid}")
                                except Exception:
                                    pass
                        except Exception:
                            await loop.sock_sendall(raw_sock, text.encode("utf-8"))
                    except Exception:
                        break

            task_read = asyncio.create_task(read_from_exec())
            task_write = asyncio.create_task(write_to_exec())

            # Interactive execution timeout
            interactive_timeout = 1800
            
            # We must wait for the exec process to finish.
            # exec_start socket doesn't close perfectly always, so we poll exec_inspect
            async def wait_for_exec():
                start_time = time.time()
                while time.time() - start_time < interactive_timeout:
                    info = await asyncio.to_thread(self.client.api.exec_inspect, exec_id["Id"])
                    if not info.get("Running"):
                        return info.get("ExitCode", 0)
                    await asyncio.sleep(0.5)
                # Timeout
                return 124

            wait_task = asyncio.create_task(wait_for_exec())
            
            done, pending = await asyncio.wait(
                [wait_task, task_write], return_when=asyncio.FIRST_COMPLETED
            )

            if wait_task in done:
                exit_code = wait_task.result()
            else:
                logger.info("WebSocket disconnected. Killing exec process.")
                try:
                    info = await asyncio.to_thread(self.client.api.exec_inspect, exec_id["Id"])
                    pid = info.get("Pid")
                    if pid:
                        await asyncio.to_thread(container.exec_run, f"kill -9 {pid}")
                except Exception:
                    pass
                exit_code = -1

            try:
                await asyncio.wait_for(task_read, timeout=2.0)
            except Exception:
                pass

            task_write.cancel()
            wait_task.cancel()

            return exit_code
            
        except Exception as e:
            logger.error(f"Error in runtime manager execution: {e}")
            return -1
        finally:
            # Return container back to pool and clean up
            await self.pool_manager.return_container(language, container, exec_dir)

    async def execute_shell(
        self,
        language: str,
        image: str,
        files: Dict[str, str],
        websocket: WebSocket,
        terminal_prompt: str = None
    ) -> int:
        """
        Executes a bash shell in a warm container.
        """
        self.pool_manager.initialize_pool(language, image)
        container = await self.pool_manager.get_container(language)
        if not container:
            container = await asyncio.to_thread(self.pool_manager._create_warm_container, image, "256m")
            if not container:
                return -1

        exec_dir = f"/tmp/shell_{uuid.uuid4().hex}"
        
        try:
            await asyncio.to_thread(container.exec_run, f"mkdir -p {exec_dir}")
            await asyncio.to_thread(container.exec_run, f"chmod 777 {exec_dir}")

            tar_stream = await asyncio.to_thread(self._create_tar_stream, files)
            await asyncio.to_thread(self.client.api.put_archive, container.id, exec_dir, tar_stream)

            # Build bash invocation
            bash_cmd = f"bash --rcfile {exec_dir}/.bashrc"
            full_command = f"sh -c 'cd {exec_dir} && {bash_cmd}'"
            
            exec_id = await asyncio.to_thread(
                self.client.api.exec_create,
                container.id,
                full_command,
                stdout=True,
                stderr=True,
                stdin=True,
                tty=True
            )

            sock = await asyncio.to_thread(
                self.client.api.exec_start,
                exec_id["Id"],
                socket=True,
                tty=True
            )
            
            raw_sock = sock._sock if hasattr(sock, "_sock") else sock
            raw_sock.setblocking(False)
            loop = asyncio.get_running_loop()

            async def read_from_exec():
                import json
                while True:
                    try:
                        data = await loop.sock_recv(raw_sock, 4096)
                        if not data:
                            break
                        decoded = data.decode("utf-8", errors="replace")
                        await websocket.send_text(json.dumps({"type": "stdout", "data": decoded}))
                    except Exception:
                        break

            async def write_to_exec():
                import json
                while True:
                    try:
                        text = await websocket.receive_text()
                        try:
                            data = json.loads(text)
                            msg_type = data.get("type")
                            if msg_type == "stdin":
                                stdin_data = data.get("data", "")
                                await loop.sock_sendall(raw_sock, stdin_data.encode("utf-8"))
                            elif msg_type == "signal" and data.get("signal") == "SIGINT":
                                await loop.sock_sendall(raw_sock, b"\x03")
                            elif msg_type == "signal" and data.get("signal") == "SIGKILL":
                                try:
                                    info = await asyncio.to_thread(self.client.api.exec_inspect, exec_id["Id"])
                                    pid = info.get("Pid")
                                    if pid:
                                        await asyncio.to_thread(container.exec_run, f"kill -9 {pid}")
                                except Exception:
                                    pass
                        except Exception:
                            await loop.sock_sendall(raw_sock, text.encode("utf-8"))
                    except Exception:
                        break

            task_read = asyncio.create_task(read_from_exec())
            task_write = asyncio.create_task(write_to_exec())

            async def wait_for_exec():
                while True:
                    info = await asyncio.to_thread(self.client.api.exec_inspect, exec_id["Id"])
                    if not info.get("Running"):
                        return info.get("ExitCode", 0)
                    await asyncio.sleep(0.5)

            wait_task = asyncio.create_task(wait_for_exec())
            
            done, pending = await asyncio.wait(
                [wait_task, task_write], return_when=asyncio.FIRST_COMPLETED
            )

            if wait_task in done:
                exit_code = wait_task.result()
            else:
                try:
                    info = await asyncio.to_thread(self.client.api.exec_inspect, exec_id["Id"])
                    pid = info.get("Pid")
                    if pid:
                        await asyncio.to_thread(container.exec_run, f"kill -9 {pid}")
                except Exception:
                    pass
                exit_code = -1

            try:
                await asyncio.wait_for(task_read, timeout=2.0)
            except Exception:
                pass

            task_write.cancel()
            wait_task.cancel()
            return exit_code

        except Exception as e:
            logger.error(f"Error in runtime manager shell: {e}")
            return -1
        finally:
            await self.pool_manager.return_container(language, container, exec_dir)

    def execute_sync(
        self,
        language: str,
        image: str,
        command: str,
        files: Dict[str, str],
        timeout: int = 15,
        mem_limit: str = "256m"
    ) -> Tuple[int, str, float]:
        """
        Synchronous execution using the warm pool (for non-interactive runs).
        """
        self.pool_manager.initialize_pool(language, image, mem_limit)
        
        # Get container synchronously using asyncio loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        container = loop.run_until_complete(self.pool_manager.get_container(language))
        
        if not container:
            container = self.pool_manager._create_warm_container(image, mem_limit)
            if not container:
                return -1, "Failed to create container", 0.0

        exec_dir = f"/tmp/exec_{uuid.uuid4().hex}"
        start_time = time.time()
        
        try:
            container.exec_run(f"mkdir -p {exec_dir}")
            container.exec_run(f"chmod 777 {exec_dir}")

            tar_stream = self._create_tar_stream(files)
            self.client.api.put_archive(container.id, exec_dir, tar_stream)

            full_command = f"sh -c 'cd {exec_dir} && {command}'"
            
            # Note: exec_run is blocking and handles timeout if we implement it, but docker-py exec_run doesn't natively support timeout
            # We'll use a thread with timeout
            result_dict = {}
            
            def run_command():
                try:
                    exit_code, output = container.exec_run(
                        full_command,
                        stdout=True,
                        stderr=True
                    )
                    result_dict["exit_code"] = exit_code
                    result_dict["output"] = output.decode("utf-8", errors="replace")
                except Exception as e:
                    result_dict["error"] = str(e)

            thread = threading.Thread(target=run_command)
            thread.start()
            thread.join(timeout)
            
            exec_time = time.time() - start_time
            
            if thread.is_alive():
                # Timeout
                return 124, f"Execution timed out after {timeout} seconds", exec_time
                
            if "error" in result_dict:
                return -1, result_dict["error"], exec_time
                
            return result_dict.get("exit_code", -1), result_dict.get("output", ""), exec_time
            
        except Exception as e:
            return -1, str(e), time.time() - start_time
        finally:
            loop.run_until_complete(self.pool_manager.return_container(language, container, exec_dir))

