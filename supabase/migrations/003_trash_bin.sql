-- Trash bin for saved notes: soft-delete instead of hard-delete.
-- A non-null deleted_at means the note is in the trash; the underlying storage
-- file is preserved until the note is permanently removed (manually or after 7 days).

ALTER TABLE saved_notes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_saved_notes_deleted_at ON saved_notes(deleted_at);
