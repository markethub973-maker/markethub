-- 2026-04-16 (follow-up) — Add embedding column to brain_knowledge_base.
--
-- Context: /api/brain/embed-client computes a client profile text +
-- OpenAI 1536-dim embedding and wants to store both in the same row as
-- the human-readable rule metadata. brain_knowledge_base currently lacks
-- an embedding column — embeddings live in brain_global_prospects and
-- brain_demand_signals only. This migration brings KB parity so client
-- similarity queries work the same way prospect similarity already does.
--
-- Safe to run: column addition is non-destructive, NULL default, existing
-- rows unaffected. Rollback = DROP COLUMN embedding.
--
-- Requires the pgvector extension (already enabled — prospects + demand
-- signals use it).

BEGIN;

ALTER TABLE brain_knowledge_base
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Approximate-nearest-neighbor index for fast semantic search. lists = 100
-- is appropriate for tables up to ~10k rows; bump to 500-1000 when KB
-- grows beyond that.
CREATE INDEX IF NOT EXISTS brain_knowledge_base_embedding_idx
  ON brain_knowledge_base
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMIT;

-- After this migration:
--   - /api/brain/embed-client writes embedding directly into
--     brain_knowledge_base (no more "column does not exist" error)
--   - Future: add a semantic-search endpoint for clients similar to
--     /api/brain/global-prospects/semantic-search
