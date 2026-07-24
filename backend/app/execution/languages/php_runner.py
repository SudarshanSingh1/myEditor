from typing import Tuple
from app.execution.languages.base_runner import BaseRunner

class PhpRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "php:8.2-cli"

    @property
    def language_name(self) -> str:
        return "PHP"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        return True, "", 0.0

    def get_run_command(self, source_file: str) -> str:
        return f"php {source_file}"

    def get_interactive_command(self, source_file: str) -> str:
        return f"php {source_file}"
