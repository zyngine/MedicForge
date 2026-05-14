-- Richer plagiarism check schema for the orchestrated pipeline:
-- AI-generated content score, web search matches, parsed file metadata,
-- and bookkeeping for how many words were excluded as cited quotes.
ALTER TABLE plagiarism_checks
  ADD COLUMN IF NOT EXISTS ai_score numeric,
  ADD COLUMN IF NOT EXISTS ai_provider text,
  ADD COLUMN IF NOT EXISTS web_match_count integer,
  ADD COLUMN IF NOT EXISTS web_matches jsonb,
  ADD COLUMN IF NOT EXISTS parsed_files jsonb,
  ADD COLUMN IF NOT EXISTS citations_removed_words integer;
