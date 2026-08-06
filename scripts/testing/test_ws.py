import asyncio
import websockets

async def test():
    uri = "ws://127.0.0.1:8000/api/v1/admin/logs/ws"
    # Provide a fake token to see if it even reaches the DB validation
    headers = {"Cookie": "access_token=faketoken123;"}
    try:
        async with websockets.connect(uri, extra_headers=headers) as ws:
            msg = await ws.recv()
            print("Received:", msg)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
