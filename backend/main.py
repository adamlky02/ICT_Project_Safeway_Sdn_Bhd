import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Backend Entry Points (supports both package imports and direct execution from the backend directory)
if __package__:
    from .general import database
    from .login import auth
    from .login.bootstrap import ensure_bootstrap_developer
    from .route import routers
else:
    from general import database
    from login import auth
    from login.bootstrap import ensure_bootstrap_developer
    from route import routers


app = FastAPI()

# Browser API Access (loads allowed frontend origins from the deployment configuration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    expose_headers=["X-Session-Expired"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Registration (mounts the authentication, administration, document, and chat endpoints)
for router in routers:
    app.include_router(router)


# Startup Initialization (prepares database tables and the optional initial developer account)
@app.on_event("startup")
def create_tables() -> None:
    auth.validate_auth_configuration()
    database.create_tables()
    ensure_bootstrap_developer()


# Authentication Cache Policy (also protects validation and error responses that contain security workflow details).
@app.middleware("http")
async def security_cache_policy(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(("/api/login", "/api/logout", "/api/mfa", "/api/admin/authenticators", "/api/profile")):
        response.headers["Cache-Control"] = "no-store"
    return response


# Same-Origin Hosting (a built frontend can share the Render backend origin, avoiding third-party-cookie restrictions).
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (_frontend_dist / "index.html").is_file():
    if (_frontend_dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=_frontend_dist / "assets"), name="frontend-assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "API endpoint not found")
        candidate = (_frontend_dist / path).resolve()
        if candidate.is_relative_to(_frontend_dist) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_frontend_dist / "index.html", headers={"Cache-Control": "no-cache"})
