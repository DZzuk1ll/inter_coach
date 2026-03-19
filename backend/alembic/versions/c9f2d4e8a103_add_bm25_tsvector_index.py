"""add bm25 tsvector index for hybrid search

Revision ID: c9f2d4e8a103
Revises: b7a6e380ab31
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9f2d4e8a103"
down_revision: Union[str, Sequence[str], None] = "b7a6e380ab31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add tsvector column to langchain_pg_embedding table
    # This table is created by LangChain PGVector, so it may not exist yet
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'langchain_pg_embedding'
            ) THEN
                -- Add tsvector column if not exists
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'langchain_pg_embedding'
                    AND column_name = 'tsv'
                ) THEN
                    ALTER TABLE langchain_pg_embedding
                    ADD COLUMN tsv tsvector;
                END IF;

                -- Populate tsvector from document content
                UPDATE langchain_pg_embedding
                SET tsv = to_tsvector('simple', COALESCE(document, ''));

                -- Create GIN index for fast full-text search
                CREATE INDEX IF NOT EXISTS idx_langchain_embedding_tsv
                ON langchain_pg_embedding USING GIN (tsv);

                -- Create trigger to auto-update tsvector on insert/update
                CREATE OR REPLACE FUNCTION langchain_embedding_tsv_trigger()
                RETURNS trigger AS $func$
                BEGIN
                    NEW.tsv := to_tsvector('simple', COALESCE(NEW.document, ''));
                    RETURN NEW;
                END
                $func$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_langchain_embedding_tsv
                ON langchain_pg_embedding;

                CREATE TRIGGER trg_langchain_embedding_tsv
                BEFORE INSERT OR UPDATE OF document
                ON langchain_pg_embedding
                FOR EACH ROW
                EXECUTE FUNCTION langchain_embedding_tsv_trigger();
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'langchain_pg_embedding'
            ) THEN
                DROP TRIGGER IF EXISTS trg_langchain_embedding_tsv
                ON langchain_pg_embedding;

                DROP FUNCTION IF EXISTS langchain_embedding_tsv_trigger();

                DROP INDEX IF EXISTS idx_langchain_embedding_tsv;

                ALTER TABLE langchain_pg_embedding
                DROP COLUMN IF EXISTS tsv;
            END IF;
        END $$;
    """)
