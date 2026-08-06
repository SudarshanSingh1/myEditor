import urllib.request
import json

def execute_code(code_string):
    """Example script demonstrating how to programmatically use Hamara Editor's Execution API"""
    url = "http://localhost:8000/api/execute"
    data = json.dumps({"language": "python", "code": code_string}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print("Execution Result:")
        print(result.get("output", ""))

if __name__ == "__main__":
    execute_code("print('Hello from Hamara Editor API!')")
