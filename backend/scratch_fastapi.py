from fastapi import FastAPI, APIRouter, WebSocket
from fastapi.testclient import TestClient

app = FastAPI()

logs_router = APIRouter()
@logs_router.websocket("/ws")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Hello")
    await websocket.close()

admin_router = APIRouter()
admin_router.include_router(logs_router)

v1_router = APIRouter()
v1_router.include_router(admin_router, prefix="/admin")
v1_router.include_router(logs_router, prefix="/admin/logs")

app.include_router(v1_router, prefix="/api/v1")

client = TestClient(app)

print("Testing WS endpoint /api/v1/admin/logs/ws:")
try:
    with client.websocket_connect("/api/v1/admin/logs/ws") as websocket:
        print("WS connected:", websocket.receive_text())
except Exception as e:
    print("WS ERROR:", e)

print("\nTesting GET endpoint /api/v1/admin/logs/ws:")
response = client.get("/api/v1/admin/logs/ws")
print("GET status:", response.status_code)
