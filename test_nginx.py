import asyncio
import websockets
import urllib.request
import json
import time

async def test_ws_via_nginx():
    # Make a normal GET request first to ensure Nginx is up
    try:
        response = urllib.request.urlopen("http://localhost:8080/api/health")
        print("HTTP Health:", json.loads(response.read()))
    except Exception as e:
        print("HTTP Error:", e)

    # Now test WS
    uri = "ws://localhost:8080/api/v1/execution/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully via Nginx!")
            await websocket.send('{"mode":"shell"}')
            reply = await websocket.recv()
            print("Received:", reply)
    except Exception as e:
        print("WS Error via Nginx:", type(e), e)

asyncio.run(test_ws_via_nginx())
