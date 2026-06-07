-- Create function to cleanup old clips (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_clips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM clips 
  WHERE created_at < (NOW() - INTERVAL '7 days');
END;
$$;

-- Create function to cleanup old files from storage
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_record RECORD;
BEGIN
  -- Get files that are older than 7 days and not referenced by any clip
  FOR file_record IN 
    SELECT DISTINCT file_path 
    FROM clips 
    WHERE created_at < (NOW() - INTERVAL '7 days') 
    AND file_path IS NOT NULL
  LOOP
    -- Delete file from storage
    PERFORM storage.delete('clips-files', file_record.file_path);
  END LOOP;
  
  -- Clean up old clips
  PERFORM cleanup_old_clips();
END;
$$;