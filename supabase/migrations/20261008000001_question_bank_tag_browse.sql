-- =============================================================================
-- Migration: 20261008000001_question_bank_tag_browse.sql
-- Description: Let instructors find the tags on their question bank.
--
-- question_bank.tags is a text[] and 3,724 questions carry tags, but nothing
-- ever read the column back: the browser never displayed a question's tags and
-- the search box only ever matched question_text. So a tag could be added and
-- then never found again, which is what was reported.
--
-- Matching a tag exactly is not enough on its own. The tags in use look like
-- "AEMT Bank 3 Chapter 7" — an instructor types "Chapter 7" and an exact match
-- returns nothing. Substring matching across an array column is awkward to
-- express through PostgREST, so it lives here instead, where it can be indexed
-- and tested.
--
-- Returns tags with how many questions carry each, so the UI can show the
-- common ones first rather than an undifferentiated list of hundreds.
-- =============================================================================

-- Makes the tag scan an index lookup rather than a sequential read.
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN (tags);

CREATE OR REPLACE FUNCTION get_question_bank_tags(
    p_search TEXT DEFAULT NULL,
    p_limit  INT  DEFAULT 50
)
RETURNS TABLE (tag TEXT, question_count BIGINT) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := get_user_tenant_id();
    IF v_tenant_id IS NULL THEN
        RETURN;
    END IF;

    p_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);

    RETURN QUERY
    SELECT t::TEXT, count(*)::BIGINT
    FROM question_bank q, LATERAL unnest(q.tags) AS t
    WHERE q.is_active = true
      -- Shared bank rows (tenant_id IS NULL) are visible to everyone, matching
      -- what the question list itself selects.
      AND (q.tenant_id = v_tenant_id OR q.tenant_id IS NULL)
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR t ILIKE '%' || btrim(p_search) || '%'
      )
    GROUP BY t
    ORDER BY count(*) DESC, t
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_question_bank_tags(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_question_bank_tags(TEXT, INT) TO authenticated;
