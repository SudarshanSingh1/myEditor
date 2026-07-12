import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.execution.languages.cpp_runner import CppRunner
from app.execution.languages.java_runner import JavaRunner
from app.execution.languages.python_runner import PythonRunner
from app.execution.languages.rust_runner import RustRunner
from app.execution.languages.c_runner import CRunner
from app.execution.languages.js_runner import JsRunner

# Test instantiation
cpp = CppRunner()
java = JavaRunner()
py = PythonRunner()
rs = RustRunner()
c = CRunner()
js = JsRunner()

print("Runners instantiated.")

# Test Python
res_py = py.run("test.py", "print('Hello Python')", "")
print("Python result:", res_py['status'], res_py['output'])

# Test C++
cpp_code = """
#include <iostream>
int main() { std::cout << "Hello C++"; return 0; }
"""
res_cpp = cpp.run("main.cpp", cpp_code, "")
print("C++ result:", res_cpp['status'], res_cpp['output'])

# Test Java
java_code = """
public class Main {
    public static void main(String[] args) {
        System.out.print("Hello Java");
    }
}
"""
res_java = java.run("Main.java", java_code, "")
print("Java result:", res_java['status'], res_java['output'])

# Test Rust
rust_code = """
fn main() {
    print!("Hello Rust");
}
"""
res_rust = rs.run("main.rs", rust_code, "")
print("Rust result:", res_rust['status'], res_rust['output'])

# Test C
c_code = """
#include <stdio.h>
int main() {
    printf("Hello C");
    return 0;
}
"""
res_c = c.run("main.c", c_code, "")
print("C result:", res_c['status'], res_c['output'])

# Test JS
res_js = js.run("app.js", "console.log('Hello JS')", "")
print("JS result:", res_js['status'], res_js['output'])

