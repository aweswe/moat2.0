-- Migration 003: Trace Management & Audit Trail
-- Adds soft delete, ownership attribution, and auto-updated timestamps

-- 1. Add management columns
ALTER TABLE traces
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT NULL;

-- 2. Index for fast trash queries
CREATE INDEX IF NOT EXISTS idx_traces_deleted ON traces(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traces_active ON traces(org_id, deleted_at) WHERE deleted_at IS NULL;

-- 3. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_traces_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS traces_updated_at ON traces;
CREATE TRIGGER traces_updated_at
  BEFORE UPDATE ON traces
  FOR EACH ROW
  EXECUTE FUNCTION update_traces_timestamp();
