import asyncio
import json
from fastapi import WebSocket

class SafeWebSocket:
    """
    A thread-safe wrapper around FastAPI's WebSocket to prevent concurrent writes.
    Starlette WebSockets corrupt JSON frames if `send_text` or `send_json` 
    are called concurrently by different asyncio tasks.
    """
    def __init__(self, websocket: WebSocket):
        self._websocket = websocket
        self._send_lock = asyncio.Lock()
        
    async def send_json(self, data: dict):
        async with self._send_lock:
            await self._websocket.send_json(data)
            
    async def send_text(self, data: str):
        async with self._send_lock:
            await self._websocket.send_text(data)

    async def receive_text(self) -> str:
        # receive does not need to be locked against send
        return await self._websocket.receive_text()
        
    async def close(self, code: int = 1000):
        await self._websocket.close(code=code)
        
    @property
    def cookies(self):
        return self._websocket.cookies
