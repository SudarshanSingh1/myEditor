#include <iostream>
// Pseudocode for calling the API via C++
// In a real project, use libcurl or cpr (C++ Requests)

int main() {
    std::cout << "To execute C++ via the Hamara Editor API, send a POST request:\n";
    std::cout << "POST http://localhost:8000/api/execute\n";
    std::cout << "{\n";
    std::cout << "  \"language\": \"cpp\",\n";
    std::cout << "  \"code\": \"#include <iostream>\\nint main() { std::cout << \\\"Hello\\\"; return 0; }\"\n";
    std::cout << "}\n";
    return 0;
}
