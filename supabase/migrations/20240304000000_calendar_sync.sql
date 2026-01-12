-- Calendar Sync Schema
-- Stores calendar tokens for webcal subscription URLs

-- Calendar tokens table
CREATE TABLE calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT 'My Calendar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  -- Each user can have multiple calendar tokens for different purposes
  UNIQUE(user_id, name)
);

-- Index for token lookups
CREATE INDEX idx_calendar_tokens_token ON calendar_tokens(token);
CREATE INDEX idx_calendar_tokens_user ON calendar_tokens(user_id);

-- Function to generate a unique calendar token
CREATE OR REPLACE FUNCTION generate_calendar_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  token TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    token := token || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate token on insert
CREATE OR REPLACE FUNCTION calendar_tokens_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    -- Generate unique token
    LOOP
      NEW.token := generate_calendar_token();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM calendar_tokens WHERE token = NEW.token
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_tokens_before_insert_trigger
  BEFORE INSERT ON calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION calendar_tokens_before_insert();

-- RLS Policies
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar tokens"
  ON calendar_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own calendar tokens"
  ON calendar_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar tokens"
  ON calendar_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar tokens"
  ON calendar_tokens FOR DELETE
  USING (user_id = auth.uid());
