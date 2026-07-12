import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.main import app
from fastapi.routing import APIRoute
from fastapi import routing
from starlette.routing import Route, WebSocketRoute, Mount

def print_routes(routes, prefix=""):
    for route in routes:
        if isinstance(route, APIRoute) or isinstance(route, Route):
            print(f"HTTP: {getattr(route, 'methods', 'GET')} {prefix}{route.path}")
        elif isinstance(route, routing.APIWebSocketRoute) or isinstance(route, WebSocketRoute):
            print(f"WS: {prefix}{route.path}")
        elif hasattr(route, "routes"):
            print_routes(route.routes, prefix + getattr(route, 'path', ''))

print_routes(app.routes)
