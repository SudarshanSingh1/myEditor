import asyncio
from app.main import app

def print_routes(routes, prefix=""):
    for route in routes:
        if type(route).__name__ == "APIRoute":
            print(f"HTTP: {prefix}{route.path} {route.methods}")
        elif type(route).__name__ == "APIWebSocketRoute":
            print(f"WS: {prefix}{route.path}")
        elif type(route).__name__ == "Mount":
            print(f"MOUNT: {prefix}{route.path}")
        elif type(route).__name__ == "_IncludedRouter":
            inc_prefix = getattr(route.include_context, "prefix", "")
            print_routes(route.original_router.routes, prefix + inc_prefix)
        else:
            print(f"OTHER: {type(route).__name__} {getattr(route, 'path', repr(route))}")

print("=== FASTAPI REGISTERED ROUTES ===")
print_routes(app.routes)
