import asyncio
from fastapi import FastAPI, WebSocket, Request
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import threading
import time
import websockets


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"HTTP GET logged: {request.url.path}")
        return await call_next(request)


app = FastAPI()
app.add_middleware(LoggingMiddleware)


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Hello")
    await websocket.close()


def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8003, log_level="warning")


async def test_client():
    try:
        async with websockets.connect("ws://127.0.0.1:8003/ws") as ws:
            print("Received from WS:", await ws.recv())
    except Exception as e:
        print("WS Error:", e)


if __name__ == "__main__":
    threading.Thread(target=run_server, daemon=True).start()
    time.sleep(1)
    asyncio.run(test_client())
