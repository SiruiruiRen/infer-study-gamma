-- ============================================================================
-- MIGRATION SCRIPT FOR INFER 3-GROUP STUDY SUPABASE DATABASE
-- ============================================================================
-- Run this if you're getting "treatment_group column not found" errors
-- This script safely adds missing columns without breaking existing data
-- ============================================================================

-- 1. Add treatment_group column if it doesn't exist
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participant_progress' 
        AND column_name = 'treatment_group'
    ) THEN
        ALTER TABLE participant_progress 
        ADD COLUMN treatment_group TEXT;
        
        -- Create index for the new column
        CREATE INDEX IF NOT EXISTS idx_participant_progress_treatment 
        ON participant_progress(treatment_group);
        
        RAISE NOTICE 'Added treatment_group column to participant_progress';
    ELSE
        RAISE NOTICE 'treatment_group column already exists';
    END IF;
END $$;

-- 2. Add tutorial_watched column if it doesn't exist (for Alpha/Treatment 1)
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participant_progress' 
        AND column_name = 'tutorial_watched'
    ) THEN
        ALTER TABLE participant_progress 
        ADD COLUMN tutorial_watched BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added tutorial_watched column to participant_progress';
    ELSE
        RAISE NOTICE 'tutorial_watched column already exists';
    END IF;
END $$;

-- 3. Add tutorial_watched_at column if it doesn't exist
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participant_progress' 
        AND column_name = 'tutorial_watched_at'
    ) THEN
        ALTER TABLE participant_progress 
        ADD COLUMN tutorial_watched_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added tutorial_watched_at column to participant_progress';
    ELSE
        RAISE NOTICE 'tutorial_watched_at column already exists';
    END IF;
END $$;

-- 4. Ensure all required indexes exist
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_participant_progress_name 
ON participant_progress(participant_name);

CREATE INDEX IF NOT EXISTS idx_participant_progress_treatment 
ON participant_progress(treatment_group);

-- 5. Verify schema
-- ============================================================================
-- Run this query to check your schema:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'participant_progress'
-- ORDER BY ordinal_position;
