-- Fix messaging functions with proper type casting and column disambiguation

-- Drop and recreate get_user_conversations with proper types
DROP FUNCTION IF EXISTS get_user_conversations(UUID);

CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID)
RETURNS TABLE (
  other_user_id UUID,
  other_user_name TEXT,
  other_user_email TEXT,
  other_user_avatar TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_messages AS (
    SELECT
      dm.*,
      CASE
        WHEN dm.from_user_id = p_user_id THEN dm.to_user_id
        ELSE dm.from_user_id
      END as other_id,
      CASE
        WHEN dm.from_user_id = p_user_id THEN dm.to_user_name
        ELSE dm.from_user_name
      END as other_name,
      dm.from_user_id = p_user_id as sent_by_me
    FROM direct_messages dm
    WHERE (dm.from_user_id = p_user_id OR dm.to_user_id = p_user_id)
      AND dm.is_deleted = false
  ),
  latest_per_user AS (
    SELECT DISTINCT ON (um.other_id)
      um.other_id,
      um.other_name,
      um.content,
      um.created_at,
      um.sent_by_me
    FROM user_messages um
    ORDER BY um.other_id, um.created_at DESC
  ),
  unread_counts AS (
    SELECT
      dm.from_user_id as sender_id,
      COUNT(*) as cnt
    FROM direct_messages dm
    WHERE dm.to_user_id = p_user_id
      AND dm.is_read = false
      AND dm.is_deleted = false
    GROUP BY dm.from_user_id
  )
  SELECT
    lpu.other_id as other_user_id,
    COALESCE(u.full_name, lpu.other_name)::TEXT as other_user_name,
    u.email::TEXT as other_user_email,
    u.avatar_url::TEXT as other_user_avatar,
    lpu.content::TEXT as last_message,
    lpu.created_at as last_message_at,
    COALESCE(uc.cnt, 0)::BIGINT as unread_count,
    lpu.sent_by_me as is_sender
  FROM latest_per_user lpu
  LEFT JOIN users u ON u.id = lpu.other_id
  LEFT JOIN unread_counts uc ON uc.sender_id = lpu.other_id
  ORDER BY lpu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_messages_with_user with disambiguated columns
DROP FUNCTION IF EXISTS get_messages_with_user(UUID, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_messages_with_user(
  p_user_id UUID,
  p_other_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  from_user_id UUID,
  from_user_name TEXT,
  to_user_id UUID,
  to_user_name TEXT,
  content TEXT,
  content_type TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  is_mine BOOLEAN
) AS $$
BEGIN
  -- Mark messages as read (use dm. prefix to disambiguate)
  UPDATE direct_messages dm
  SET is_read = true
  WHERE dm.to_user_id = p_user_id
    AND dm.from_user_id = p_other_user_id
    AND dm.is_read = false;

  -- Return messages (use dm. prefix for all column references)
  RETURN QUERY
  SELECT
    dm.id,
    dm.from_user_id,
    dm.from_user_name::TEXT,
    dm.to_user_id,
    dm.to_user_name::TEXT,
    dm.content::TEXT,
    dm.content_type::TEXT,
    dm.file_url::TEXT,
    dm.file_name::TEXT,
    dm.file_size,
    dm.is_read,
    dm.created_at,
    (dm.from_user_id = p_user_id) as is_mine
  FROM direct_messages dm
  WHERE ((dm.from_user_id = p_user_id AND dm.to_user_id = p_other_user_id)
      OR (dm.from_user_id = p_other_user_id AND dm.to_user_id = p_user_id))
    AND dm.is_deleted = false
  ORDER BY dm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_user TO authenticated;
