import asyncio
from app.execution.languages.python_runner import PythonRunner
from app.execution.languages.c_runner import CRunner
from app.execution.languages.cpp_runner import CppRunner
from app.execution.languages.rust_runner import RustRunner

def helper_test_runner(runner, filename, code):
    result = runner.run(filename, code, "")
    assert result['exit_code'] == 0, f"{runner.language_name} failed with exit code {result['exit_code']}. Output: {result['output']}"
    assert "Hello World" in result['output'], f"{runner.language_name} output missing Hello World. Output: {result['output']}"

import pytest

def test_all():
    try:
        # Python
        py = PythonRunner()
        helper_test_runner(py, "main.py", 'print("Hello World")')
        
        # C
        c = CRunner()
        c_code = """#include <stdio.h>
int main() { printf("Hello World\\n"); return 0; }"""
        helper_test_runner(c, "main.c", c_code)
        
        # C++
        cpp = CppRunner()
        cpp_code = """#include <iostream>
int main() { std::cout << "Hello World" << std::endl; return 0; }"""
        helper_test_runner(cpp, "main.cpp", cpp_code)
        
        # Rust
        rs = RustRunner()
        helper_test_runner(rs, "main.rs", 'fn main() { println!("Hello World"); }')
    except RuntimeError as e:
        if "Docker" in str(e):
            pytest.skip("Docker daemon is not running")
        raise

if __name__ == "__main__":
    test_all()
