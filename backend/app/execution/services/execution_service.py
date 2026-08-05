from typing import Dict, Type
import logging
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import WebSocket
import tempfile
import os
import time

from app.execution.schemas.execution import ExecutionRequest, ExecutionResponse
from app.execution.languages.base_runner import BaseRunner
from app.execution.languages.python_runner import PythonRunner
from app.execution.languages.cpp_runner import CppRunner
from app.execution.languages.java_runner import JavaRunner
from app.execution.languages.c_runner import CRunner
from app.execution.languages.javascript_runner import JsRunner
from app.execution.languages.typescript_runner import TsRunner
from app.execution.languages.go_runner import GoRunner
from app.execution.languages.rust_runner import RustRunner
from app.execution.languages.php_runner import PhpRunner
from app.execution.languages.kotlin_runner import KotlinRunner
from app.execution.languages.swift_runner import SwiftRunner
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.project_repository import ProjectRepository
from app.models.system_settings import SystemSettings

logger = logging.getLogger(__name__)


class ExecutionService:
    """
    Service layer for coordinating code execution within Docker containers.
    
    This service maps file extensions to language runners, handles WebSocket-based 
    interactive I/O sessions, and manages temporary volumes for secure, isolated 
    code execution environments.
    """
    def __init__(self, db: Session):
        self.db = db
        self.workspace_repo = WorkspaceRepository
        self.project_repo = ProjectRepository(db)

        # Registry of runners
        self.runners: Dict[str, Type[BaseRunner]] = {
            "python": PythonRunner,
            "c++": CppRunner,
            "cpp": CppRunner,
            "java": JavaRunner,
            "c": CRunner,
            "javascript": JsRunner,
            "typescript": TsRunner,
            "go": GoRunner,
            "rust": RustRunner,
            "php": PhpRunner,
            "kotlin": KotlinRunner,
            "swift": SwiftRunner,
            "html/css": JsRunner,  # Can't truly 'run' HTML/CSS securely in backend out-of-box without a server, but this avoids crashes
        }

    def run_code(self, request: ExecutionRequest, user_id: UUID) -> ExecutionResponse:
        """
        Orchestrates the execution of a file.
        1. Validates project and file ownership
        2. Selects the appropriate language runner
        3. Executes the code and returns the response
        """
        # Validate project access — use correct repository method and compare UUID types
        project = self.project_repo.get_by_id(request.project_id)
        if not project or str(project.owner_id) != str(user_id):
            raise ValueError("Project not found or access denied")

        # Get file contents — use correct repository method (get_file, not get_file_by_id)
        file = self.workspace_repo.get_file(self.db, request.file_id)
        if not file or file.project_id != request.project_id:
            raise ValueError("File not found")

        if not file.content or file.content.strip() == "":
            raise ValueError("File is empty")

        # Get runner
        runner_class = self.runners.get(request.language.lower())
        if not runner_class:
            raise ValueError(f"Language '{request.language}' is not supported")

        runner = runner_class()

        # Get limits
        settings = self.db.query(SystemSettings).first()
        timeout = settings.max_execution_time_seconds if settings else 15
        max_mem = settings.max_memory_mb if settings else 256

        try:
            result = runner.run(
                file.name,
                file.content,
                request.input,
                timeout=timeout,
                max_memory_mb=max_mem,
            )
            return ExecutionResponse(**result)
        except Exception as e:
            logger.error(f"Execution service failed: {e}")
            raise RuntimeError(
                "Execution failed. Please check your code and try again."
            )

    def stop_execution(self, container_id: str, user_id: UUID):
        # We don't have a reliable way to map internal container_id back to user via the stateless API in this simple implementation
        # A more complex system would use Redis to track container_id <-> user_id
        # For now, this is a placeholder or we just allow killing by container ID if provided.
        # But wait, our `run` method is synchronous. If it's synchronous, we can't easily cancel it from another request.
        # To truly support cancellation in a simple async FastAPI app without a message queue:
        raise NotImplementedError(
            "Stopping synchronous execution is currently unsupported."
        )

    async def run_code_interactive(
        self, websocket: WebSocket, project_id: str, file_id: str, user_id: UUID
    ) -> None:
        """
        Interactive execution via WebSockets.
        """
        try:
            logger.info(
                f"Starting run_code_interactive for file: {file_id}, project: {project_id}"
            )
            # 1. Fetch File
            try:
                import uuid

                file_uuid = uuid.UUID(file_id)
                project_uuid = uuid.UUID(project_id)
            except ValueError as e:
                logger.error(f"Invalid UUID: {e}")
                await websocket.send_json(
                    {"type": "error", "message": f"Invalid ID format: {e}"}
                )
                return

            file = self.workspace_repo.get_file(self.db, file_uuid)
            if not file or str(file.project_id) != project_id:
                logger.error("File not found or project mismatch")
                await websocket.send_json(
                    {"type": "error", "message": "File not found"}
                )
                return
            if not file.content or file.content.strip() == "":
                logger.error("File is empty")
                await websocket.send_json({"type": "error", "message": "File is empty"})
                return

            logger.info("File loaded successfully")

            # Determine language runner based on file extension
            import os

            _, ext = os.path.splitext(file.name)
            ext = ext.lower()

            ext_to_runner = {
                ".py": PythonRunner,
                ".cpp": CppRunner,
                ".cxx": CppRunner,
                ".cc": CppRunner,
                ".c": CRunner,
                ".java": JavaRunner,
                ".js": JsRunner,
                ".ts": TsRunner,
                ".go": GoRunner,
                ".rs": RustRunner,
            }

            runner_class = ext_to_runner.get(ext)
            if not runner_class:
                logger.info(
                    f"No direct runner for {ext}, falling back to project language"
                )
                # fallback to project language
                project = self.project_repo.get_by_id(project_uuid)
                if project:
                    runner_class = self.runners.get(
                        project.language.lower() if project.language else ""
                    )

            if not runner_class:
                logger.error(f"Language not supported for {file.name}")
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": f"Language not supported for {file.name}",
                    }
                )
                return

            runner = runner_class()
            logger.info(f"Language detected: {runner.__class__.__name__}")

            # 3. Compile & Run via RuntimeManager Warm Pool
            source_file = file.name
            files = {source_file: file.content}
            raw_cmd = runner.get_interactive_command(source_file)
            
            from app.execution.docker.runtime_manager import RuntimeManager
            
            logger.info(f"Using raw command: {raw_cmd} on warm container pool")
            
            start_time = time.time()
            
            exit_code = await RuntimeManager.get_instance().execute_interactive(
                language=runner.language_name,
                image=runner.image_name,
                command=raw_cmd,
                files=files,
                websocket=websocket,
            )

            end_time = time.time()
            runtime_ms = int((end_time - start_time) * 1000)

            logger.info(
                f"Container execution finished with exit code: {exit_code} in {runtime_ms}ms"
            )

            import json
            if exit_code == 0:
                msg = f"\r\n\x1b[38;5;2m✓ Program finished in {runtime_ms}ms\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "execution_finished", "exitCode": 0, "runtimeMs": runtime_ms, "message": msg}))
                await websocket.send_text(json.dumps({"type": "stdout", "data": msg}))
            else:
                msg = f"\r\n\x1b[38;5;1m[Runtime Error] Exited with code {exit_code}\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "error", "message": msg, "exitCode": exit_code}))
                await websocket.send_text(json.dumps({"type": "stderr", "data": msg}))

            # Record ExecutionLog
            try:
                from app.models.execution_log import ExecutionLog, ExecutionStatus

                status_enum = (
                    ExecutionStatus.SUCCESS
                    if exit_code == 0
                    else ExecutionStatus.RUNTIME_ERROR
                )
                # Note: we use self.db for the session
                el = ExecutionLog(
                    project_id=project_uuid,
                    user_id=user_id,
                    language=ext.replace(".", "") if ext else "unknown",
                    status=status_enum,
                    execution_time_ms=runtime_ms,
                )
                self.db.add(el)
                self.db.commit()
                logger.info("Recorded ExecutionLog in database")
            except Exception as e:
                logger.error(f"Failed to record ExecutionLog: {e}")

            logger.info("Sent final execution status to websocket")

        except Exception as e:
            logger.exception(f"Interactive execution failed: {e}")
            try:
                import json
                msg = "\r\n\x1b[38;5;1m[System] Execution error. Please try again.\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "stdout", "data": msg}))
                await websocket.send_text(json.dumps({"type": "error", "message": "Execution error"}))
            except Exception as ws_e:
                logger.debug(f"Failed to send error to websocket: {ws_e}")

    async def run_shell_interactive(
        self,
        websocket: WebSocket,
        project_id: str,
        user_id: UUID,
        terminal_prompt: str = None,
    ) -> None:
        """
        Interactive Shell session via WebSockets.
        """
        try:
            # 1. Validate Project
            project = self.project_repo.get_by_id(UUID(project_id))
            if not project or str(project.owner_id) != str(user_id):
                await websocket.send_json(
                    {"type": "error", "message": "Project not found or access denied"}
                )
                return

            # 2. Get Project Files and setup a temp directory to simulate the workspace
            from app.models.user import User

            user = self.db.query(User).filter(User.id == user_id).first()
            first_name = user.first_name.lower() if user and user.first_name else "user"

            files = self.workspace_repo.get_project_files(self.db, project.id)

            files_dict = {}
            if terminal_prompt:
                files_dict[".bashrc"] = f'export PS1="{terminal_prompt}"\n'
            else:
                files_dict[".bashrc"] = f'export PS1="@{first_name} ~$ "\n'

            for file_summary in files:
                file = self.workspace_repo.get_file(self.db, file_summary.id)
                if file and file.content:
                    files_dict[file.name] = file.content

            from app.execution.docker.runtime_manager import RuntimeManager
            
            exit_code = await RuntimeManager.get_instance().execute_shell(
                language="shell",
                image="debian:bullseye-slim",
                files=files_dict,
                websocket=websocket,
                terminal_prompt=terminal_prompt
            )

        except Exception as e:
            logger.error(f"Interactive shell failed: {e}")
            try:
                import json
                msg = f"\r\n\x1b[38;5;1m[System] Shell Error: {e}\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "stdout", "data": msg}))
                await websocket.send_text(json.dumps({"type": "error", "message": f"Shell Error: {e}"}))
            except Exception:
                pass

    async def run_guest_code_interactive(
        self, websocket: WebSocket, content: str, language: str
    ) -> None:
        """
        Interactive execution for guest sessions without DB files.
        """
        try:
            runner_class = self.runners.get(language.lower())
            if not runner_class:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": f"Language '{language}' is not supported",
                    }
                )
                return

            runner = runner_class()

            ext_map = {
                "python": ".py",
                "cpp": ".cpp",
                "c++": ".cpp",
                "java": ".java",
                "c": ".c",
                "javascript": ".js",
                "typescript": ".ts",
                "go": ".go",
                "rust": ".rs",
            }
            ext = ext_map.get(language.lower(), ".txt")
            source_file = f"main{ext}"

            if language.lower() == "java":
                source_file = "Main.java"

            files = {source_file: content}
            raw_cmd = runner.get_interactive_command(source_file)
            
            from app.execution.docker.runtime_manager import RuntimeManager
            
            exit_code = await RuntimeManager.get_instance().execute_interactive(
                language=runner.language_name,
                image=runner.image_name,
                command=raw_cmd,
                files=files,
                websocket=websocket,
            )

            import json
            if exit_code == 0:
                msg = "\r\n\x1b[38;5;2m✓ Program finished (0)\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "execution_finished", "exitCode": 0, "message": msg}))
                await websocket.send_text(json.dumps({"type": "stdout", "data": msg}))
            else:
                msg = f"\r\n\x1b[38;5;1m[Runtime Error] Exited with code {exit_code}\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "execution_finished", "exitCode": exit_code, "message": msg}))
                await websocket.send_text(json.dumps({"type": "stdout", "data": msg}))

        except Exception as e:
            logger.exception(f"Guest interactive execution failed: {e}")
            try:
                import json
                msg = "\r\n\x1b[38;5;1m[System] Execution error. Please try again.\x1b[0m\r\n"
                await websocket.send_text(json.dumps({"type": "stdout", "data": msg}))
                await websocket.send_text(json.dumps({"type": "error", "message": "Execution error"}))
            except Exception:
                pass
