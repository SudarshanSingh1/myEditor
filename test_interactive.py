import sys
import os
import asyncio

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.execution.docker.container_manager import DockerManager

class MockWebSocket:
    def __init__(self, inputs):
        self.inputs = inputs
        self.index = 0
        self.output = ""
    
    async def receive_text(self):
        if self.index < len(self.inputs):
            await asyncio.sleep(1)
            val = self.inputs[self.index]
            self.index += 1
            print(f"[MockWS] Sending input: {repr(val)}")
            return val
        await asyncio.sleep(999) # wait forever
        return ""
    
    async def send_text(self, text):
        print(f"[MockWS] Output received: {repr(text)}")
        self.output += text

async def main():
    import docker
    client = docker.from_env()
    client.images.pull("python:3.13-slim")
    
    ws = MockWebSocket(["John\r", "25\r"])
    
    code = """
import sys
print("Enter your name: ")
sys.stdout.flush()
name = sys.stdin.readline().strip()
print(f"Hello {name}")
sys.stdout.flush()

print("Enter your age: ")
sys.stdout.flush()
age = sys.stdin.readline().strip()
print(f"You are {age} years old")
sys.stdout.flush()
"""
    
    command = f"python3 -c '{code}'"
    exit_code = await DockerManager.run_container_interactive(
        image="python:3.13-slim",
        command=command,
        working_dir="/execution",
        binds={},
        websocket=ws,
        timeout=10 # Short timeout to see if it dies
    )
    print(f"Exit code: {exit_code}")

if __name__ == '__main__':
    asyncio.run(main())
