import os

images = {
    "c_runner.py": "gcc:13-slim",
    "cpp_runner.py": "gcc:13-slim",
    "go_runner.py": "golang:1.22-alpine",
    "java_runner.py": "openjdk:21-slim",
    "js_runner.py": "node:20-alpine",
    "python_runner.py": "python:3.13-slim",
    "rust_runner.py": "rust:1.77-slim",
    "ts_runner.py": "node:20-alpine"
}

langs = {
    "c_runner.py": "C",
    "cpp_runner.py": "C++",
    "go_runner.py": "Go",
    "java_runner.py": "Java",
    "js_runner.py": "JavaScript",
    "python_runner.py": "Python",
    "rust_runner.py": "Rust",
    "ts_runner.py": "TypeScript"
}

dir_path = "backend/app/execution/languages"
for file in os.listdir(dir_path):
    if file in images:
        path = os.path.join(dir_path, file)
        with open(path, "r") as f:
            content = f.read()
        
        # We need to replace the first `return filename` with `return "IMAGE"`
        # and the second `return filename` with `return "LANG"`
        # and the third one leave it as `return filename`
        
        parts = content.split("return filename")
        if len(parts) >= 4:
            new_content = parts[0] + f'return "{images[file]}"' + parts[1] + f'return "{langs[file]}"' + parts[2] + "return filename" + "return filename".join(parts[3:])
            with open(path, "w") as f:
                f.write(new_content)

