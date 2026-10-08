import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Backend Entry Points (supports both package imports and direct execution from the backend directory)
if __package__:
    from .general import database
    from .general.bootstrap import ensure_bootstrap_developer
    from .route import routers
else:
    from general import database
    from general.bootstrap import ensure_bootstrap_developer
    from route import routers


app = FastAPI()

# Browser API Access (loads allowed frontend origins from the deployment configuration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if origin.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Registration (mounts the authentication, administration, document, and chat endpoints)
for router in routers:
    app.include_router(router)


# Startup Initialization (prepares database tables and the optional initial developer account)
@app.on_event("startup")
def create_tables() -> None:
    database.create_tables()
    ensure_bootstrap_developer()
