import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import threading
import time
import websockets

class DummyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        return await call_next(request)

app = FastAPI()
app.add_middleware(DummyMiddleware) # Maintenance
app.add_middleware(DummyMiddleware) # Logging
app.add_middleware(DummyMiddleware) # Security
app.add_middleware(DummyMiddleware) # Timing
app.add_middleware(DummyMiddleware) # RequestID
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.websocket("/api/v1/execution/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Hello")
    await websocket.close()

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8002, log_level="warning")

async def test_client():
    try:
        async with websockets.connect("ws://127.0.0.1:8002/api/v1/execution/ws") as ws:
            print("Received from WS:", await ws.recv())
    except Exception as e:
        print("WS Error:", e)

if __name__ == "__main__":
    threading.Thread(target=run_server, daemon=True).start()
    time.sleep(1)
    asyncio.run(test_client())
