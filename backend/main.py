import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

if __package__:
    from .general import database
    from .general.bootstrap import ensure_bootstrap_developer
    from .route import routers
else:
    from general import database
    from general.bootstrap import ensure_bootstrap_developer
    from route import routers


app = FastAPI()

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

for router in routers:
    app.include_router(router)


@app.on_event("startup")
def create_tables() -> None:
    database.Base.metadata.create_all(bind=database.engine)
    ensure_bootstrap_developer()
