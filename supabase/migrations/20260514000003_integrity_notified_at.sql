-- Track when integrity flag notifications have been fanned out so we only
-- fire them once per flag, not on every batch flush after auto-flag.
ALTER TABLE quiz_integrity_summary ADD COLUMN IF NOT EXISTS notified_at timestamptz;
