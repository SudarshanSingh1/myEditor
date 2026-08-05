from typing import Tuple

from app.execution.languages.base_runner import BaseRunner


class TsRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "node:22-alpine"

    @property
    def language_name(self) -> str:
        return "TypeScript"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        return True, "", 0.0

    def get_run_command(self, source_file: str) -> str:
        return f"node --experimental-strip-types {source_file}"
