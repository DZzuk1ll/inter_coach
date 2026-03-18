import pymupdf
import structlog

from app.prompts.resume_parsing import RESUME_PARSE_PROMPT
from app.services.llm_client import LLMClient

log = structlog.get_logger()


async def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


async def parse_resume(resume_text: str, llm_client: LLMClient) -> dict:
    messages = [
        {"role": "system", "content": RESUME_PARSE_PROMPT},
        {"role": "user", "content": resume_text},
    ]
    result = await llm_client.chat_json(messages, temperature=0.3)
    await log.ainfo("resume_parsed", projects=len(result.get("projects", [])))
    return result
