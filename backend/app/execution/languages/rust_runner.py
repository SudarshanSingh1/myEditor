from typing import Tuple

from app.execution.languages.base_runner import BaseRunner


class RustRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "rust:1.77-slim"

    @property
    def language_name(self) -> str:
        return "Rust"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        command = f"rustc {source_file} -o main"
        return self._run_command(command, working_dir)

    def get_run_command(self, source_file: str) -> str:
        return "./main"

    def get_interactive_command(self, source_file: str) -> str:
        return f"rustc {source_file} -o main && ./main"
