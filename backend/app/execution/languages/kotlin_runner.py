from typing import Tuple
from app.execution.languages.base_runner import BaseRunner

class KotlinRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "zenika/kotlin:1.9"

    @property
    def language_name(self) -> str:
        return "Kotlin"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        command = f"kotlinc {source_file} -include-runtime -d Main.jar"
        return self._run_command(command, working_dir)

    def get_run_command(self, source_file: str) -> str:
        return "java -jar Main.jar"

    def get_interactive_command(self, source_file: str) -> str:
        return f"kotlinc {source_file} -include-runtime -d Main.jar && java -jar Main.jar"
