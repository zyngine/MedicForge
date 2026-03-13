-- ============================================
-- CE PLATFORM SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "CE admins can manage settings"
  ON ce_platform_settings FOR ALL
  USING (get_ce_user_role() = 'admin');

-- Public read (pricing needs to be visible to unauthenticated visitors)
CREATE POLICY "Anyone can read platform settings"
  ON ce_platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Defaults
INSERT INTO ce_platform_settings (key, value) VALUES
  ('annual_subscription_price', '99.00')
ON CONFLICT (key) DO NOTHING;
