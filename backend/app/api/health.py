from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"success": True, "data": {"status": "ok", "version": "0.1.0"}}
