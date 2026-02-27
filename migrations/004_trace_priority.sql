-- Migration 004: Add priority flag to traces
-- Allows user-set priority: 'red', 'yellow', 'green', or NULL (none)
ALTER TABLE traces
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL;

-- Constrain to valid values
ALTER TABLE traces
  ADD CONSTRAINT traces_priority_check
  CHECK (priority IS NULL OR priority IN ('red', 'yellow', 'green'));
