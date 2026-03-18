from pathlib import Path

import structlog
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings

log = structlog.get_logger()

COLLECTION_NAME = "interview_methodology"


def _get_embeddings() -> OpenAIEmbeddings:
    settings = get_settings()
    return OpenAIEmbeddings(
        openai_api_base=settings.embedding.base_url,
        openai_api_key=settings.embedding.api_key,
        model=settings.embedding.model,
    )


def _get_connection_string() -> str:
    settings = get_settings()
    # PGVector needs psycopg2-style URL
    return settings.database.url.replace("+asyncpg", "+psycopg2")


def _get_vector_store() -> PGVector:
    return PGVector(
        connection_string=_get_connection_string(),
        embedding_function=_get_embeddings(),
        collection_name=COLLECTION_NAME,
    )


async def ingest_documents(docs_dir: str) -> dict:
    """Ingest markdown documents from the knowledge_docs directory into pgvector."""
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        raise ValueError(f"Directory not found: {docs_dir}")

    # Read all markdown files
    documents = []
    for md_file in sorted(docs_path.glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        documents.append({"content": content, "source": md_file.name})

    if not documents:
        return {"documents": 0, "chunks": 0}

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )

    texts = []
    metadatas = []
    for doc in documents:
        chunks = splitter.split_text(doc["content"])
        for chunk in chunks:
            texts.append(chunk)
            metadatas.append({"source": doc["source"]})

    await log.ainfo(
        "ingesting_documents",
        documents=len(documents),
        chunks=len(texts),
    )

    # Store in pgvector
    vector_store = PGVector.from_texts(
        texts=texts,
        metadatas=metadatas,
        embedding=_get_embeddings(),
        collection_name=COLLECTION_NAME,
        connection_string=_get_connection_string(),
        pre_delete_collection=True,  # Replace existing data
    )

    await log.ainfo("ingestion_complete", chunks=len(texts))
    return {"documents": len(documents), "chunks": len(texts)}


async def search(query: str, k: int = 3) -> list[str]:
    """Search the knowledge base for relevant methodology fragments."""
    vector_store = _get_vector_store()
    docs = vector_store.similarity_search(query, k=k)
    return [doc.page_content for doc in docs]


async def search_for_questioning(phase: int, context: str) -> list[str]:
    """Search for questioning methodology relevant to the current interview phase."""
    phase_queries = {
        1: "项目概述 开放式问题 STAR 情境",
        2: "技术深挖 分层提问 追问细节 代码实现",
        3: "设计决策 技术选型 tradeoff 对比追问",
        4: "压力追问 质疑 延伸能力 挑战",
    }
    query = phase_queries.get(phase, "面试提问技巧")
    query += f" {context}"
    return await search(query, k=3)


async def search_for_evaluation(answer: str) -> list[str]:
    """Search for evaluation criteria relevant to assessing the candidate's answer."""
    query = f"评估维度 回答质量 {answer[:100]}"
    return await search(query, k=2)
