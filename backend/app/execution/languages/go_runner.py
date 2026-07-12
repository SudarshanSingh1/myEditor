from typing import Tuple

from app.execution.languages.base_runner import BaseRunner

class GoRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "golang:1.22-alpine"

    @property
    def language_name(self) -> str:
        return "Go"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        return True, "", 0.0

    def get_run_command(self, source_file: str) -> str:
        return f"go run {source_file}"
