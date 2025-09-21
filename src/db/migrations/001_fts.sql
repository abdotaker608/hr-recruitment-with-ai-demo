-- virtual FTS table for RAG (content-only)
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  owner_type,      -- 'job' | 'candidate' | 'question'
  owner_id,        -- id of the source
  content,         -- text content
  tokenize = "porter"
);

-- convenience view to compute score (bm25)
-- (Some libsql builds don’t expose bm25() as function name; if you get errors, fall back to rank via snippets length.)
