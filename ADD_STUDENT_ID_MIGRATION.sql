-- ============================================================================
-- MIGRATION: Add student_id and anonymous_id columns to participant_progress
-- ============================================================================
-- This migration adds fields to store both student ID and anonymous ID
-- for participant identification

-- Add student_id column (actual student ID)
ALTER TABLE participant_progress 
ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Add anonymous_id column (already stored as participant_name, but adding for clarity)
-- Note: participant_name already serves as the anonymous_id
-- This column is optional and can be used if you want to separate them
ALTER TABLE participant_progress 
ADD COLUMN IF NOT EXISTS anonymous_id TEXT;

-- Create index for student_id lookups (if needed)
CREATE INDEX IF NOT EXISTS idx_participant_progress_student_id 
ON participant_progress(student_id);

-- Create index for anonymous_id lookups (if needed)
CREATE INDEX IF NOT EXISTS idx_participant_progress_anonymous_id 
ON participant_progress(anonymous_id);

-- ============================================================================
-- NOTES:
-- - student_id: The actual student ID (e.g., "12345678")
-- - anonymous_id: The generated anonymous code (e.g., "ER04LF09")
--   Currently stored in participant_name, but can be moved to anonymous_id
--   if you want to separate them in the future
-- ============================================================================
