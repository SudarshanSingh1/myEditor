import asyncio
from app.execution.languages.python_runner import PythonRunner
from app.execution.languages.c_runner import CRunner
from app.execution.languages.cpp_runner import CppRunner
from app.execution.languages.rust_runner import RustRunner

def test_runner(runner, filename, code):
    print(f"\n--- Testing {runner.language_name} ---")
    result = runner.run(filename, code, "")
    print(f"Exit Code: {result['exit_code']}")
    print(f"Output:\n{result['output']}")
    if result['exit_code'] == 0 and "Hello World" in result['output']:
        print("✓ SUCCESS")
    else:
        print("✗ FAILED")

def test_all():
    print("Testing Language Runners Locally...")
    
    # Python
    py = PythonRunner()
    test_runner(py, "main.py", 'print("Hello World")')
    
    # C
    c = CRunner()
    test_runner(c, "main.c", '#include <stdio.h>\nint main() { printf("Hello World\\n"); return 0; }')
    
    # C++
    cpp = CppRunner()
    test_runner(cpp, "main.cpp", '#include <iostream>\nint main() { std::cout << "Hello World" << std::endl; return 0; }')
    
    # Rust
    rs = RustRunner()
    test_runner(rs, "main.rs", 'fn main() { println!("Hello World"); }')

if __name__ == "__main__":
    test_all()
