from typing import Tuple
import os
from app.execution.languages.base_runner import BaseRunner

class JavaRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "eclipse-temurin:21-jdk"

    @property
    def language_name(self) -> str:
        return "Java"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        command = f"javac {source_file}"
        return self._run_command(command, working_dir)

    def get_run_command(self, source_file: str) -> str:
        return f"java {os.path.splitext(source_file)[0]}"

    def get_interactive_command(self, source_file: str) -> str:
        return f"javac {source_file} && java {os.path.splitext(source_file)[0]}"
