import asyncio
from fastapi import FastAPI, WebSocket
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.requests import Request
import uvicorn
import threading
import time
import websockets


class MockMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"Middleware intercepted: {request.url.path}")
        return await call_next(request)


app = FastAPI()
app.add_middleware(MockMiddleware)


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Hello")
    await websocket.close()


@app.get("/ws")
async def ws_get():
    return {"message": "this is get"}


def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")


async def test_client():
    try:
        async with websockets.connect("ws://127.0.0.1:8001/ws") as ws:
            print("Received from WS:", await ws.recv())
    except Exception as e:
        print("WS Error:", e)


if __name__ == "__main__":
    threading.Thread(target=run_server, daemon=True).start()
    time.sleep(1)
    asyncio.run(test_client())
