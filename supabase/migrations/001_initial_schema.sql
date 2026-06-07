-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users config table (single user lock)
CREATE TABLE config (
  key text PRIMARY KEY,
  value text
);

-- Clipboard entries (7-day auto-expiry)
CREATE TABLE clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'code', 'image', 'pdf')),
  content text,           -- for text/code
  file_path text,         -- for image/pdf (Supabase storage path)
  file_name text,
  language text,          -- for code snippets (e.g. 'javascript')
  collapsed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  date_bucket date DEFAULT current_date  -- for date-wise grouping
);

-- Saved pages (never auto-deleted)
CREATE TABLE saved_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '📄',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Saved notes within pages
CREATE TABLE saved_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id uuid REFERENCES saved_pages(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'code', 'image', 'pdf')),
  content text,
  file_path text,
  file_name text,
  language text,
  collapsed boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for config table
CREATE POLICY "Users can read config" ON config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert config" ON config FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update config" ON config FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete config" ON config FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for clips table
CREATE POLICY "Users can read their own clips" ON clips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clips" ON clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clips" ON clips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clips" ON clips FOR DELETE USING (auth.uid() = user_id);

-- Create policies for saved_pages table
CREATE POLICY "Users can read their own saved pages" ON saved_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved pages" ON saved_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own saved pages" ON saved_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved pages" ON saved_pages FOR DELETE USING (auth.uid() = user_id);

-- Create policies for saved_notes table
CREATE POLICY "Users can read their own saved notes" ON saved_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved notes" ON saved_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own saved notes" ON saved_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved notes" ON saved_notes FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_clips_user_id ON clips(user_id);
CREATE INDEX idx_clips_created_at ON clips(created_at);
CREATE INDEX idx_clips_date_bucket ON clips(date_bucket);
CREATE INDEX idx_saved_pages_user_id ON saved_pages(user_id);
CREATE INDEX idx_saved_pages_position ON saved_pages(position);
CREATE INDEX idx_saved_notes_user_id ON saved_notes(user_id);
CREATE INDEX idx_saved_notes_page_id ON saved_notes(page_id);
CREATE INDEX idx_saved_notes_position ON saved_notes(position);