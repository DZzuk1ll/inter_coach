from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.common import success_response
from app.services.knowledge_service import ingest_documents

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/knowledge/ingest")
async def ingest_knowledge_base():
    docs_dir = Path(__file__).resolve().parent.parent.parent / "knowledge_docs"
    if not docs_dir.exists():
        raise HTTPException(
            status_code=404,
            detail="knowledge_docs directory not found",
        )

    result = await ingest_documents(str(docs_dir))
    return success_response(result)
