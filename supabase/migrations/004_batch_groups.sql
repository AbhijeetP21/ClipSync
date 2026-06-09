-- Batch groups: files uploaded together in one action share a group_id so the
-- UI can render them as a single batched card while each item stays its own row.
-- The column is nullable; existing rows (and single uploads) simply have no group.

ALTER TABLE clips ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE saved_notes ADD COLUMN IF NOT EXISTS group_id uuid;

CREATE INDEX IF NOT EXISTS idx_clips_group_id ON clips(group_id);
CREATE INDEX IF NOT EXISTS idx_saved_notes_group_id ON saved_notes(group_id);
