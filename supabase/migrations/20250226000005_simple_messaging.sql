-- Simple messaging system inspired by arems-transport
-- Replaces complex conversation-based system with direct messages

-- ============================================
-- 1. Create simple direct_messages table
-- ============================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_name TEXT NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_name TEXT,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- text, image, file
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_tenant ON direct_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_from ON direct_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_to ON direct_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(to_user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON direct_messages;

-- RLS Policies
CREATE POLICY "Users can view their messages" ON direct_messages
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY "Users can send messages" ON direct_messages
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can mark messages as read" ON direct_messages
  FOR UPDATE USING (
    to_user_id = auth.uid()
  ) WITH CHECK (
    to_user_id = auth.uid()
  );

-- ============================================
-- 2. Create helper function to get user conversations
-- ============================================
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
    SELECT DISTINCT ON (other_id)
      other_id,
      other_name,
      content,
      created_at,
      sent_by_me
    FROM user_messages
    ORDER BY other_id, created_at DESC
  ),
  unread_counts AS (
    SELECT
      from_user_id as sender_id,
      COUNT(*) as cnt
    FROM direct_messages
    WHERE to_user_id = p_user_id
      AND is_read = false
      AND is_deleted = false
    GROUP BY from_user_id
  )
  SELECT
    lpu.other_id as other_user_id,
    COALESCE(u.full_name, lpu.other_name) as other_user_name,
    u.email as other_user_email,
    u.avatar_url as other_user_avatar,
    lpu.content as last_message,
    lpu.created_at as last_message_at,
    COALESCE(uc.cnt, 0) as unread_count,
    lpu.sent_by_me as is_sender
  FROM latest_per_user lpu
  LEFT JOIN users u ON u.id = lpu.other_id
  LEFT JOIN unread_counts uc ON uc.sender_id = lpu.other_id
  ORDER BY lpu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Create function to send a message
-- ============================================
CREATE OR REPLACE FUNCTION send_direct_message(
  p_tenant_id UUID,
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_content TEXT,
  p_content_type TEXT DEFAULT 'text',
  p_file_url TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL
) RETURNS direct_messages AS $$
DECLARE
  v_from_name TEXT;
  v_to_name TEXT;
  v_message direct_messages;
BEGIN
  -- Get user names
  SELECT full_name INTO v_from_name FROM users WHERE id = p_from_user_id;
  SELECT full_name INTO v_to_name FROM users WHERE id = p_to_user_id;

  -- Insert the message
  INSERT INTO direct_messages (
    tenant_id,
    from_user_id,
    from_user_name,
    to_user_id,
    to_user_name,
    content,
    content_type,
    file_url,
    file_name,
    file_size
  ) VALUES (
    p_tenant_id,
    p_from_user_id,
    v_from_name,
    p_to_user_id,
    v_to_name,
    p_content,
    p_content_type,
    p_file_url,
    p_file_name,
    p_file_size
  ) RETURNING * INTO v_message;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Create function to get messages with a user
-- ============================================
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
  -- Mark messages as read
  UPDATE direct_messages
  SET is_read = true
  WHERE to_user_id = p_user_id
    AND from_user_id = p_other_user_id
    AND is_read = false;

  -- Return messages
  RETURN QUERY
  SELECT
    dm.id,
    dm.from_user_id,
    dm.from_user_name,
    dm.to_user_id,
    dm.to_user_name,
    dm.content,
    dm.content_type,
    dm.file_url,
    dm.file_name,
    dm.file_size,
    dm.is_read,
    dm.created_at,
    dm.from_user_id = p_user_id as is_mine
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
GRANT EXECUTE ON FUNCTION send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_user TO authenticated;
