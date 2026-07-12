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

    def run(self, filename: str, code: str, user_input: str, timeout: int = 15, max_memory_mb: int = 256) -> Dict[str, Any]:
        """
        Main execution workflow:
        1. Write code and input to a temporary directory
        2. Compile (if applicable)
        3. Run inside container
        4. Capture results and cleanup
        """
        # Create a temporary directory that will be mounted to the container
        with tempfile.TemporaryDirectory() as temp_dir:
            # FIX: Set permissions so container user can access the directory
            os.chmod(temp_dir, 0o777)
            
            # Determine source file name based on language
            source_file = self.get_source_file_name(filename)
            source_path = os.path.join(temp_dir, source_file)
            
            # Write source code
            with open(source_path, 'w', encoding='utf-8') as f:
                f.write(code)
            # FIX: Set permissions so container user can read it
            os.chmod(source_path, 0o666)
                
            # Write standard input
            input_path = os.path.join(temp_dir, 'input.txt')
            with open(input_path, 'w', encoding='utf-8') as f:
                f.write(user_input if user_input else "")
            # FIX: Set permissions so container user can read it
            os.chmod(input_path, 0o666)

            # 1. Compilation phase
            compile_success, compile_output, compile_time = self.compile(temp_dir, source_file)
            
            if not compile_success:
                return {
                    "language": self.language_name,
                    "compile_time_ms": int(compile_time * 1000),
                    "execution_time_ms": 0,
                    "memory_used_kb": 0, # Difficult to extract from exact container stats without a background thread, returning 0 for now
                    "exit_code": 1,
                    "output": compile_output,
                    "status": "Compilation Failed"
                }

            # 2. Execution phase
            binds = {
                temp_dir: {
                    "bind": "/execution",
                    "mode": "rw" # Some runners need to write compiled binaries
                }
            }
            
            # Wrap command to read from input.txt
            raw_cmd = self.get_run_command(source_file)
            run_cmd = f"sh -c '{raw_cmd} < input.txt'"
            
            exit_code, run_output, run_time = DockerManager.run_container(
                image=self.image_name,
                command=run_cmd,
                working_dir="/execution",
                binds=binds,
                timeout=timeout,
                mem_limit=f"{max_memory_mb}m"
            )

            status = "Completed"
            if exit_code == 124:
                status = "Time Limit Exceeded"
            elif exit_code == 137: # OOM Killer
                status = "Memory Limit Exceeded"
            elif exit_code != 0:
                status = "Runtime Error"

            return {
                "language": self.language_name,
                "compile_time_ms": int(compile_time * 1000),
                "execution_time_ms": int(run_time * 1000),
                "memory_used_kb": 0,
                "exit_code": exit_code,
                "output": run_output,
                "status": status
            }

    @abstractmethod
    def get_source_file_name(self, filename: str) -> str:
        pass

    def _run_command(self, command: str, working_dir: str) -> Tuple[bool, str, float]:
        """Helper to run a command (usually for compilation) in the container."""
        binds = {
            working_dir: {
                "bind": "/execution",
                "mode": "rw"
            }
        }
        
        exit_code, output, exec_time = DockerManager.run_container(
            image=self.image_name,
            command=command,
            working_dir="/execution",
            binds=binds,
            timeout=15
        )
        
        return (exit_code == 0, output, exec_time)
