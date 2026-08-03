import asyncio
from fastapi import FastAPI, Request, WebSocket
from starlette.middleware.base import BaseHTTPMiddleware
from uvicorn import Config, Server
import threading
import httpx
import websockets

app = FastAPI()

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"MIDDLEWARE EXECUTED: {request.method} {request.url.path}")
        return await call_next(request)

app.add_middleware(LogMiddleware)

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Hello")
    await websocket.close()

def run_server():
    config = Config(app, host="127.0.0.1", port=8001, log_level="error")
    server = Server(config=config)
    server.run()

threading.Thread(target=run_server, daemon=True).start()
import time
time.sleep(1)

async def test():
    async with websockets.connect("ws://127.0.0.1:8001/ws") as websocket:
        msg = await websocket.recv()
        print(f"WS received: {msg}")

asyncio.run(test())
