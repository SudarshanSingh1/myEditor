import os

data = {
    "c_runner.py": {
        "image": "gcc:13-slim",
        "lang": "C",
        "run": 'return "./main"'
    },
    "cpp_runner.py": {
        "image": "gcc:13-slim",
        "lang": "C++",
        "run": 'return "./main"'
    },
    "go_runner.py": {
        "image": "golang:1.22-alpine",
        "lang": "Go",
        "run": 'return f"go run {source_file}"'
    },
    "java_runner.py": {
        "image": "openjdk:21-slim",
        "lang": "Java",
        "run": 'return f"java {os.path.splitext(source_file)[0]}"'
    },
    "js_runner.py": {
        "image": "node:20-alpine",
        "lang": "JavaScript",
        "run": 'return f"node {source_file}"'
    },
    "python_runner.py": {
        "image": "python:3.13-slim",
        "lang": "Python",
        "run": 'return f"python3 {source_file}"'
    },
    "rust_runner.py": {
        "image": "rust:1.77-slim",
        "lang": "Rust",
        "run": 'return "./main"'
    },
    "ts_runner.py": {
        "image": "node:20-alpine",
        "lang": "TypeScript",
        "run": 'return f"npx ts-node {source_file}"'
    }
}

template = """from typing import Tuple
{import_os}
from app.execution.languages.base_runner import BaseRunner

class {class_name}(BaseRunner):
    @property
    def image_name(self) -> str:
        return "{image}"

    @property
    def language_name(self) -> str:
        return "{lang}"

    def get_source_file_name(self, filename: str) -> str:
        return filename

    def compile(self, working_dir: str, source_file: str) -> Tuple[bool, str, float]:
{compile_body}

    def get_run_command(self, source_file: str) -> str:
        {run}
"""

compiles = {
    "c_runner.py": '        command = f"gcc {source_file} -o main"\n        return self._run_command(command, working_dir)',
    "cpp_runner.py": '        command = f"g++ {source_file} -o main"\n        return self._run_command(command, working_dir)',
    "go_runner.py": '        return True, "", 0.0',
    "java_runner.py": '        command = f"javac {source_file}"\n        from app.execution.docker.container_manager import DockerManager\n        exit_code, output, exec_time = DockerManager.run_container(\n            image=self.image_name,\n            command=command,\n            working_dir="/execution",\n            binds={working_dir: {"bind": "/execution", "mode": "rw"}},\n            timeout=10\n        )\n        return (exit_code == 0, output, exec_time)',
    "js_runner.py": '        return True, "", 0.0',
    "python_runner.py": '        return True, "", 0.0',
    "rust_runner.py": '        command = f"rustc {source_file} -o main"\n        return self._run_command(command, working_dir)',
    "ts_runner.py": '        return True, "", 0.0',
}

class_names = {
    "c_runner.py": "CRunner",
    "cpp_runner.py": "CppRunner",
    "go_runner.py": "GoRunner",
    "java_runner.py": "JavaRunner",
    "js_runner.py": "JsRunner",
    "python_runner.py": "PythonRunner",
    "rust_runner.py": "RustRunner",
    "ts_runner.py": "TsRunner"
}

dir_path = "backend/app/execution/languages"
for file in data:
    path = os.path.join(dir_path, file)
    import_os = "import os" if file == "java_runner.py" else ""
    content = template.format(
        import_os=import_os,
        class_name=class_names[file],
        image=data[file]["image"],
        lang=data[file]["lang"],
        compile_body=compiles[file],
        run=data[file]["run"]
    )
    with open(path, "w") as f:
        f.write(content)

