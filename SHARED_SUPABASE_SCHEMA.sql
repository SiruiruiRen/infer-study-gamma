-- ============================================================================
-- SHARED SUPABASE SCHEMA FOR INFER 3-GROUP STUDY
-- ============================================================================
-- This schema is shared by all 3 study versions:
--   - Alpha (Treatment Group 1): INFER + Tutorial
--   - Beta (Treatment Group 2): INFER Only
--   - Gamma (Control Group): Simple Feedback
-- ============================================================================

-- 1. PARTICIPANT PROGRESS TABLE
-- Tracks participant progress across videos and surveys
-- ============================================================================
CREATE TABLE IF NOT EXISTS participant_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_name TEXT NOT NULL UNIQUE,
    assigned_condition TEXT,  -- 'feedback_first' or 'reflection_first' (legacy)
    treatment_group TEXT,     -- 'treatment_1', 'treatment_2', or 'control'
    videos_completed TEXT[] DEFAULT '{}',
    pre_survey_completed BOOLEAN DEFAULT FALSE,
    post_survey_completed BOOLEAN DEFAULT FALSE,
    video_surveys JSONB DEFAULT '{}',
    tutorial_watched BOOLEAN DEFAULT FALSE,        -- For Treatment Group 1
    tutorial_watched_at TIMESTAMPTZ,               -- When tutorial was watched
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participant_progress_name ON participant_progress(participant_name);
CREATE INDEX IF NOT EXISTS idx_participant_progress_treatment ON participant_progress(treatment_group);

-- 2. REFLECTIONS TABLE
-- Stores all reflections and feedback (PV and simple)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    participant_name TEXT NOT NULL,
    video_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    language TEXT DEFAULT 'de',
    reflection_text TEXT NOT NULL,
    analysis_percentages JSONB,  -- PV scores (null for control group)
    weakest_component TEXT,      -- Weakest PV component (null for control)
    feedback_extended TEXT,      -- Academic/detailed feedback
    feedback_short TEXT,         -- User-friendly/brief feedback
    revision_number INTEGER DEFAULT 1,
    parent_reflection_id UUID,   -- For tracking revision chains
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (parent_reflection_id) REFERENCES reflections(id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reflections_session ON reflections(session_id);
CREATE INDEX IF NOT EXISTS idx_reflections_participant ON reflections(participant_name);
CREATE INDEX IF NOT EXISTS idx_reflections_video ON reflections(video_id);
CREATE INDEX IF NOT EXISTS idx_reflections_created ON reflections(created_at);

-- 3. BINARY CLASSIFICATIONS TABLE
-- Stores D/E/P scores for each text window (Treatment groups only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS binary_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    reflection_id UUID,
    participant_name TEXT NOT NULL,
    video_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    language TEXT DEFAULT 'de',
    window_index INTEGER,
    window_text TEXT,
    is_description BOOLEAN,
    is_explanation BOOLEAN,
    is_prediction BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (reflection_id) REFERENCES reflections(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_binary_session ON binary_classifications(session_id);
CREATE INDEX IF NOT EXISTS idx_binary_reflection ON binary_classifications(reflection_id);

-- 4. USER EVENTS TABLE
-- Tracks all user interactions for research analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    reflection_id UUID,
    participant_name TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    timestamp_utc TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient event querying
CREATE INDEX IF NOT EXISTS idx_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_participant ON user_events(participant_name);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON user_events(timestamp_utc);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE participant_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE binary_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for web app)
CREATE POLICY "Allow anonymous insert" ON participant_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON participant_progress FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON participant_progress FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous insert" ON reflections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON reflections FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON reflections FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous insert" ON binary_classifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON binary_classifications FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON user_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON user_events FOR SELECT USING (true);

-- ============================================================================
-- KEY EVENT TYPES TO TRACK
-- ============================================================================
-- participant_registered: When user registers
-- video_task_started: When user starts a video task
-- tutorial_page_shown: When tutorial page is displayed (Alpha only)
-- tutorial_video_opened: When user clicks to open tutorial video
-- tutorial_completed: When user confirms watching tutorial
-- reflection_submitted: When reflection is saved
-- feedback_generated: When AI feedback is generated
-- simple_feedback_generated: When simple feedback is generated (Gamma only)
-- view_feedback_start: When user starts viewing feedback
-- view_feedback_end: When user stops viewing feedback
-- select_feedback_style: When user switches between extended/short
-- copy_feedback: When user copies feedback text
-- concept_explanation_clicked: When user clicks to view concept explanations
-- final_submission: When user makes final submission for a video
-- survey_completed: When user completes a survey

-- ============================================================================
-- USEFUL RESEARCH QUERIES
-- ============================================================================

-- Query 1: Get all participants by treatment group
-- SELECT treatment_group, COUNT(*) as count 
-- FROM participant_progress 
-- GROUP BY treatment_group;

-- Query 2: Get reflection data with treatment info
-- SELECT r.*, p.treatment_group
-- FROM reflections r
-- JOIN participant_progress p ON r.participant_name = p.participant_name
-- WHERE r.created_at >= '2025-01-01';

-- Query 3: Compare PV scores by treatment group
-- SELECT 
--     p.treatment_group,
--     AVG((r.analysis_percentages->'priority'->>'professional_vision')::NUMERIC) as avg_pv
-- FROM reflections r
-- JOIN participant_progress p ON r.participant_name = p.participant_name
-- WHERE p.treatment_group IN ('treatment_1', 'treatment_2')
-- GROUP BY p.treatment_group;

-- Query 4: Tutorial completion rate (Alpha only)
-- SELECT 
--     COUNT(*) FILTER (WHERE tutorial_watched = true) as watched,
--     COUNT(*) as total,
--     ROUND(100.0 * COUNT(*) FILTER (WHERE tutorial_watched = true) / COUNT(*), 2) as pct
-- FROM participant_progress
-- WHERE treatment_group = 'treatment_1';

