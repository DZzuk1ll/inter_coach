from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.health import router as health_router
from app.api.interviews import router as interviews_router
from app.api.projects import router as projects_router
from app.api.users import router as users_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router, tags=["system"])
api_router.include_router(users_router)
api_router.include_router(projects_router)
api_router.include_router(interviews_router)
api_router.include_router(admin_router)
