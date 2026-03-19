from pathlib import Path

import structlog
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import text

from app.config import get_settings
from app.database import async_session_factory

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


async def _generate_contextual_prefix(
    chunk: str,
    source: str,
    doc_summary: str,
    llm_client: "LLMClient | None" = None,
) -> str:
    """Generate a contextual prefix for a chunk using LLM."""
    if not llm_client:
        return ""

    from app.prompts.contextual_retrieval import CONTEXTUAL_PREFIX_PROMPT

    prompt = CONTEXTUAL_PREFIX_PROMPT.format(
        source=source,
        doc_summary=doc_summary[:500],
        chunk=chunk,
    )

    try:
        prefix = await llm_client.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150,
        )
        return prefix.strip()
    except Exception as e:
        await log.awarning("contextual_prefix_failed", error=str(e))
        return ""


async def ingest_documents(docs_dir: str, llm_client: "LLMClient | None" = None) -> dict:
    """Ingest markdown documents from the knowledge_docs directory into pgvector.

    If llm_client is provided, generates contextual prefixes for each chunk
    (Contextual Retrieval). Otherwise falls back to plain chunking.
    """
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        raise ValueError(f"Directory not found: {docs_dir}")

    # Read all markdown files
    documents = []
    for md_file in sorted(docs_path.glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        # Generate a brief summary of the full document for context
        summary = content[:300]
        documents.append({"content": content, "source": md_file.name, "summary": summary})

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
            # Contextual Retrieval: prepend LLM-generated context
            if llm_client:
                prefix = await _generate_contextual_prefix(
                    chunk, doc["source"], doc["summary"], llm_client
                )
                enriched = f"{prefix}\n\n{chunk}" if prefix else chunk
            else:
                enriched = chunk

            texts.append(enriched)
            metadatas.append({"source": doc["source"], "original_chunk": chunk})

    await log.ainfo(
        "ingesting_documents",
        documents=len(documents),
        chunks=len(texts),
        contextual=llm_client is not None,
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


async def _bm25_search(query: str, k: int = 3) -> list[tuple[str, float]]:
    """Keyword search using PostgreSQL full-text search (tsvector).

    Returns list of (content, rank_score) tuples.
    Falls back gracefully if tsvector column doesn't exist.
    """
    try:
        async with async_session_factory() as db:
            # Use plainto_tsquery for robust query parsing
            result = await db.execute(
                text("""
                    SELECT document, ts_rank(tsv, plainto_tsquery('simple', :query)) AS rank
                    FROM langchain_pg_embedding
                    WHERE collection_id = (
                        SELECT uuid FROM langchain_pg_collection
                        WHERE name = :collection
                    )
                    AND tsv @@ plainto_tsquery('simple', :query)
                    ORDER BY rank DESC
                    LIMIT :k
                """),
                {"query": query, "collection": COLLECTION_NAME, "k": k},
            )
            return [(row[0], row[1]) for row in result.fetchall()]
    except Exception as e:
        await log.adebug("bm25_search_unavailable", error=str(e))
        return []


def _rrf_merge(
    semantic_results: list[str],
    bm25_results: list[tuple[str, float]],
    k: int = 3,
    rrf_k: int = 60,
) -> list[str]:
    """Reciprocal Rank Fusion to merge semantic and keyword search results."""
    scores: dict[str, float] = {}

    # Score semantic results by rank position
    for rank, doc in enumerate(semantic_results):
        scores[doc] = scores.get(doc, 0) + 1.0 / (rrf_k + rank + 1)

    # Score BM25 results by rank position
    for rank, (doc, _) in enumerate(bm25_results):
        scores[doc] = scores.get(doc, 0) + 1.0 / (rrf_k + rank + 1)

    # Sort by combined score and return top k
    sorted_docs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in sorted_docs[:k]]


async def search(query: str, k: int = 3) -> list[str]:
    """Hybrid search: combines semantic (vector) and keyword (BM25) results using RRF."""
    vector_store = _get_vector_store()

    # Semantic search
    semantic_docs = vector_store.similarity_search(query, k=k)
    semantic_results = [doc.page_content for doc in semantic_docs]

    # BM25 keyword search
    bm25_results = await _bm25_search(query, k=k)

    # If BM25 returned results, merge with RRF
    if bm25_results:
        return _rrf_merge(semantic_results, bm25_results, k=k)

    # Fallback to semantic only
    return semantic_results


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
