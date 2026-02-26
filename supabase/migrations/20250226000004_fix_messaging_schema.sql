-- Fix messaging tables to match the use-messaging.ts hook expectations
-- This migration adds missing columns and creates required RPC functions

-- ============================================
-- 1. Add is_group column to conversations
-- ============================================
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN is_group BOOLEAN DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Migrate existing 'type' values to is_group if type column exists
DO $$ BEGIN
  UPDATE conversations SET is_group = (type = 'group') WHERE type IS NOT NULL;
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- ============================================
-- 2. Add missing columns to messages table
-- ============================================
DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN file_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN file_name TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN file_size INTEGER;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);

-- ============================================
-- 3. Create send_message RPC function
-- ============================================
-- Drop existing function if exists (may have different signature)
DROP FUNCTION IF EXISTS send_message(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, UUID);
DROP FUNCTION IF EXISTS send_message(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS send_message;

CREATE OR REPLACE FUNCTION send_message(
  p_tenant_id UUID,
  p_conversation_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_content_type TEXT DEFAULT 'text',
  p_file_url TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_message_id UUID;
  v_message JSONB;
BEGIN
  -- Verify sender is a participant in the conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_sender_id
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  -- Insert the message
  INSERT INTO messages (
    tenant_id,
    conversation_id,
    sender_id,
    content,
    content_type,
    file_url,
    file_name,
    file_size,
    reply_to_id,
    created_at
  ) VALUES (
    p_tenant_id,
    p_conversation_id,
    p_sender_id,
    p_content,
    p_content_type,
    p_file_url,
    p_file_name,
    p_file_size,
    p_reply_to_id,
    NOW()
  ) RETURNING id INTO v_message_id;

  -- Update conversation's last_message_at
  UPDATE conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = p_conversation_id;

  -- Return the created message as JSON
  SELECT jsonb_build_object(
    'id', m.id,
    'tenant_id', m.tenant_id,
    'conversation_id', m.conversation_id,
    'sender_id', m.sender_id,
    'content', m.content,
    'content_type', m.content_type,
    'file_url', m.file_url,
    'file_name', m.file_name,
    'file_size', m.file_size,
    'reply_to_id', m.reply_to_id,
    'is_edited', m.is_edited,
    'is_deleted', m.is_deleted,
    'created_at', m.created_at
  ) INTO v_message
  FROM messages m
  WHERE m.id = v_message_id;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Create get_or_create_direct_conversation RPC function
-- ============================================
-- Drop existing function if exists (may have different signature)
DROP FUNCTION IF EXISTS get_or_create_direct_conversation(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS get_or_create_direct_conversation;

CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
  p_tenant_id UUID,
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_conversation_id UUID;
  v_conversation JSONB;
BEGIN
  -- Look for existing direct conversation between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.tenant_id = p_tenant_id
    AND c.is_group = false
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
    )
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = c.id
    ) = 2
  LIMIT 1;

  -- If no existing conversation, create one
  IF v_conversation_id IS NULL THEN
    -- Create the conversation
    INSERT INTO conversations (
      tenant_id,
      is_group,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      p_tenant_id,
      false,
      p_user1_id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at, last_read_at)
    VALUES
      (v_conversation_id, p_user1_id, 'member', NOW(), NOW()),
      (v_conversation_id, p_user2_id, 'member', NOW(), NOW());
  END IF;

  -- Return the conversation as JSON with participants
  SELECT jsonb_build_object(
    'id', c.id,
    'tenant_id', c.tenant_id,
    'title', c.title,
    'is_group', c.is_group,
    'created_by', c.created_by,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'last_message_at', c.last_message_at,
    'participants', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', cp.id,
        'conversation_id', cp.conversation_id,
        'user_id', cp.user_id,
        'role', cp.role,
        'joined_at', cp.joined_at,
        'last_read_at', cp.last_read_at,
        'is_muted', cp.is_muted,
        'user', jsonb_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email,
          'avatar_url', u.avatar_url
        )
      ))
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = c.id
    )
  ) INTO v_conversation
  FROM conversations c
  WHERE c.id = v_conversation_id;

  RETURN v_conversation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Grant execute permissions on the functions
-- ============================================
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation TO authenticated;

-- ============================================
-- 6. Update RLS policies to allow function access
-- ============================================
-- The functions use SECURITY DEFINER so they run with elevated privileges
-- This allows them to insert/update data regardless of RLS policies

-- Add policy for messages insert via function (already covered by existing policy)
DROP POLICY IF EXISTS "Users can send messages via function" ON messages;
CREATE POLICY "Users can send messages via function" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    OR sender_id IN (SELECT user_id FROM conversation_participants WHERE conversation_id = messages.conversation_id)
  );

-- Policy for conversation creation
DROP POLICY IF EXISTS "Users can create direct conversations" ON conversations;
CREATE POLICY "Users can create direct conversations" ON conversations
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- Policy for participant insertion
DROP POLICY IF EXISTS "System can add conversation participants" ON conversation_participants;
CREATE POLICY "System can add conversation participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );
