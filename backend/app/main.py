from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log = structlog.get_logger()
    await log.ainfo("starting", db_url=settings.database.url[:30] + "...")
    yield
    await engine.dispose()
    await log.ainfo("shutdown")


app = FastAPI(
    title="InterviewCoach API",
    version="0.1.0",
    lifespan=lifespan,
)

_settings = get_settings()
_cors_origins = _settings.app.cors_origins or ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and mount routers after app is created to avoid circular imports
from app.api.router import api_router  # noqa: E402

app.include_router(api_router)
