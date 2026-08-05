from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
import os
import tempfile

from app.execution.docker.container_manager import DockerManager


class BaseRunner(ABC):
    @property
    @abstractmethod
    def image_name(self) -> str:
        """The Docker image to use."""
        pass

    @property
    @abstractmethod
    def language_name(self) -> str:
        """Name of the language."""
        pass

    @abstractmethod
    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        """
        Compiles the code if needed.
        Returns: (success_boolean, output_str, compile_time_seconds)
        """
        pass

    @abstractmethod
    def get_run_command(self, source_file: str) -> str:
        """Returns the execution command."""
        pass

    def get_interactive_command(self, source_file: str) -> str:
        """
        Returns a combined compilation (if applicable) and execution command for interactive runs.
        Defaults to get_run_command for interpreted languages.
        Compiled languages should override this to 'compile && run'.
        """
        return self.get_run_command(source_file)

    def run(
        self,
        filename: str,
        code: str,
        user_input: str,
        timeout: int = 15,
        max_memory_mb: int = 256,
    ) -> Dict[str, Any]:
        """
        Main execution workflow (Synchronous):
        """
        from app.execution.docker.runtime_manager import RuntimeManager
        
        source_file = self.get_source_file_name(filename)
        files = {source_file: code, "input.txt": user_input if user_input else ""}

        # Combine compile (if applicable) and run
        raw_cmd = self.get_interactive_command(source_file)
        run_cmd = f"sh -c '{raw_cmd} < input.txt'"

        exit_code, run_output, run_time = RuntimeManager.get_instance().execute_sync(
            language=self.language_name,
            image=self.image_name,
            command=run_cmd,
            files=files,
            timeout=timeout,
            mem_limit=f"{max_memory_mb}m",
        )

        status = "Completed"
        if exit_code == 124:
            status = "Time Limit Exceeded"
        elif exit_code == 137:  # OOM Killer
            status = "Memory Limit Exceeded"
        elif exit_code != 0:
            status = "Runtime Error"

        return {
            "language": self.language_name,
            "compile_time_ms": 0,
            "execution_time_ms": int(run_time * 1000),
            "memory_used_kb": 0,
            "exit_code": exit_code,
            "output": run_output,
            "status": status,
        }

    @abstractmethod
    def get_source_file_name(self, filename: str) -> str:
        pass
