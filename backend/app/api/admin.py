from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import LLMConfig, get_llm_config
from app.schemas.common import success_response
from app.services.knowledge_service import ingest_documents
from app.services.llm_client import LLMClient

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/knowledge/ingest")
async def ingest_knowledge_base(
    llm_config: LLMConfig = Depends(get_llm_config),
):
    docs_dir = Path(__file__).resolve().parent.parent.parent / "knowledge_docs"
    if not docs_dir.exists():
        raise HTTPException(
            status_code=404,
            detail="knowledge_docs directory not found",
        )

    llm_client = LLMClient(llm_config)
    result = await ingest_documents(str(docs_dir), llm_client=llm_client)
    return success_response(result)
