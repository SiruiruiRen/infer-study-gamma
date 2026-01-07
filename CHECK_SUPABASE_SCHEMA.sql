-- ============================================================================
-- CHECK YOUR SUPABASE SCHEMA
-- ============================================================================
-- Run this to see what tables and columns you currently have
-- ============================================================================

-- 1. Check if all required tables exist
-- ============================================================================
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('participant_progress', 'reflections', 'binary_classifications', 'user_events') 
        THEN '✅ Required table exists'
        ELSE '⚠️ Optional table'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check participant_progress columns
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'participant_progress'
ORDER BY ordinal_position;

-- 3. Check if other required tables exist
-- ============================================================================
SELECT 
    'reflections' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'reflections'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'binary_classifications',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'binary_classifications'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'user_events',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_events'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- 4. Check RLS policies
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('participant_progress', 'reflections', 'binary_classifications', 'user_events')
ORDER BY tablename, policyname;
