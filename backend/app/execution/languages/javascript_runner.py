from typing import Tuple

from app.execution.languages.base_runner import BaseRunner


class JsRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "node:20-alpine"

    @property
    def language_name(self) -> str:
        return "JavaScript"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        return True, "", 0.0

    def get_run_command(self, source_file: str) -> str:
        return f"node {source_file}"
