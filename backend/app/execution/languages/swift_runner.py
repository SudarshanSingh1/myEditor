from typing import Tuple
from app.execution.languages.base_runner import BaseRunner

class SwiftRunner(BaseRunner):
    @property
    def image_name(self) -> str:
        return "swift:5.9"

    @property
    def language_name(self) -> str:
        return "Swift"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
        command = f"swiftc {source_file} -o main"
        return self._run_command(command, working_dir)

    def get_run_command(self, source_file: str) -> str:
        return "./main"

    def get_interactive_command(self, source_file: str) -> str:
        return f"swiftc {source_file} -o main && ./main"
