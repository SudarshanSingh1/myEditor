import sys
import os
import asyncio
import time

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.execution.docker.container_manager import DockerManager

class MockWebSocket:
    def __init__(self, inputs):
        self.inputs = inputs
        self.index = 0
        self.output = ""
        self.start_time = time.time()
    
    async def receive_text(self):
        if self.index < len(self.inputs):
            # Wait 16 seconds before sending the SECOND input, 
            # to verify it survives the 15-second timeout!
            if self.index == 1:
                print(f"[MockWS] Waiting 16 seconds to simulate slow user typing...")
                await asyncio.sleep(16)
            else:
                await asyncio.sleep(1)
            val = self.inputs[self.index]
            self.index += 1
            print(f"[MockWS] Sending input at {time.time() - self.start_time:.1f}s: {repr(val)}")
            return val
        await asyncio.sleep(999) # wait forever
        return ""
    
    async def send_text(self, text):
        print(f"[MockWS] Output received at {time.time() - self.start_time:.1f}s: {repr(text)}")
        self.output += text

async def main():
    import docker
    
    ws = MockWebSocket(["Alice\r", "30\r"])
    
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
    print("Starting container...")
    exit_code = await DockerManager.run_container_interactive(
        image="python:3.13-slim",
        command=command,
        working_dir="/execution",
        binds={},
        websocket=ws,
        timeout=15 # Passed to the function but overridden internally to 3600 now
    )
    print(f"Exit code: {exit_code}")

if __name__ == '__main__':
    asyncio.run(main())
