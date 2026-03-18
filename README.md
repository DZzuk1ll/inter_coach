# InterviewCoach

AI-driven project interview coach. Input a code repository + resume + JD, get deep project interview simulation based on real code.

## Quick Start

```bash
# Start database
docker compose up -d

# Backend
cd backend
cp ../config.example.yaml ../config.yaml  # Edit with your settings
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# Frontend
cd frontend
pnpm install
pnpm dev
```

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + Alembic + OpenAI SDK + LangChain RAG
- **Frontend**: Next.js 14+ (App Router) + TypeScript + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL 16 + pgvector
- **Infra**: Docker Compose + Nginx
