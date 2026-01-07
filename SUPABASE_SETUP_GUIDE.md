# Supabase Setup Guide for INFER 3-Group Study

## Overview

**YES, use ONE Supabase database for all three sites (Alpha, Beta, Gamma).** This allows:
- Unified participant tracking across all treatment groups
- Cross-group analysis and comparison
- Shared schema structure
- Easier data management

## Current Setup

All three apps already use the **same Supabase database**:
- **URL**: `https://cvmzsljalmkrehfkqjtc.supabase.co`
- **Key**: (stored in each app's `app.js`)

## Treatment Group Assignment

Each site automatically sets `treatment_group` based on which URL participants access:

| Site | URL Pattern | STUDY_CONDITION | treatment_group |
|------|-------------|-----------------|-----------------|
| **Alpha** | `infer-study-alpha.onrender.com` | `'treatment_1'` | `'treatment_1'` |
| **Beta** | `infer-study-beta.onrender.com` | `'treatment_2'` | `'treatment_2'` |
| **Gamma** | `infer-study-gamma.onrender.com` | `'control'` | `'control'` |

### How It Works

Each app has these constants at the top of `app.js`:

```javascript
// Alpha (app.js line 17)
const STUDY_CONDITION = 'treatment_1';
const STUDY_VERSION = 'alpha';

// Beta (app.js line 16)
const STUDY_CONDITION = 'treatment_2';
const STUDY_VERSION = 'beta';

// Gamma (app.js line 17)
const STUDY_CONDITION = 'control';
const STUDY_VERSION = 'gamma';
```

When a participant logs in, the app automatically:
1. Sets `treatment_group = STUDY_CONDITION` in the database
2. Logs events with `treatment_group` and `study_version`
3. Tracks progress with the correct group identifier

## Database Schema

The shared schema (`SHARED_SUPABASE_SCHEMA.sql`) supports all three groups:

### Key Tables

1. **`participant_progress`**
   - `treatment_group`: Automatically set based on which site they access
   - `videos_completed`: Array of completed video/task IDs
   - `tutorial_watched`: Only used by Alpha (Treatment 1)
   - Works for all three groups

2. **`reflections`**
   - `video_id`: Can be actual video ID (Alpha) or task identifier (Beta/Gamma)
   - `analysis_percentages`: PV scores (null for Gamma/control)
   - `feedback_extended`/`feedback_short`: Used by all groups
   - `weakest_component`: Only for treatment groups (null for control)

3. **`binary_classifications`**
   - Only used by Alpha and Beta (treatment groups)
   - Gamma (control) doesn't generate PV analysis, so this table stays empty for them

4. **`user_events`**
   - Tracks all interactions across all groups
   - `event_data` JSONB field stores group-specific data

## Handling Different Features

### Alpha (Treatment 1): Has Videos + Tutorial
- Uses `video_id` for actual video tasks
- `tutorial_watched` field is used
- Generates PV analysis (binary_classifications populated)
- Uses INFER prompt with PV analysis

### Beta (Treatment 2): Has Videos, No Tutorial
- Uses `video_id` for actual video tasks
- `tutorial_watched` stays FALSE (not applicable)
- Generates PV analysis (binary_classifications populated)
- Uses INFER prompt with PV analysis (same as Alpha, but no tutorial)

### Gamma (Control): May Not Have Videos
- If using videos: `video_id` = actual video ID
- If using text tasks: `video_id` = task identifier (e.g., "task1", "task2")
- `tutorial_watched` stays FALSE (not applicable)
- NO PV analysis (binary_classifications empty, analysis_percentages null)
- Uses simple feedback prompt (different LLM prompt)

## Schema Updates Needed

If Beta/Gamma don't use videos but use text-based tasks instead, the schema already supports this:

```sql
-- video_id can be any identifier
-- Examples:
-- Alpha: video_id = 'video1', 'video2', etc.
-- Beta/Gamma (text tasks): video_id = 'task1', 'task2', etc.
```

The `reflections` table's `video_id` column is `TEXT NOT NULL`, so it can store:
- Video IDs: `'video1'`, `'video2'`, etc.
- Task IDs: `'task1'`, `'task2'`, `'reflection_task_1'`, etc.

## Setting Up Supabase

### Step 1: Run the Schema

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire `SHARED_SUPABASE_SCHEMA.sql` file
4. Click **Run** to execute

This creates all tables, indexes, and RLS policies.

### Step 2: Verify Tables

Check that these tables exist:
- `participant_progress`
- `reflections`
- `binary_classifications`
- `user_events`

### Step 3: Test Each Site

1. **Alpha Site**: Login with a test code → Check `participant_progress` table → `treatment_group` should be `'treatment_1'`
2. **Beta Site**: Login with a test code → Check `participant_progress` table → `treatment_group` should be `'treatment_2'`
3. **Gamma Site**: Login with a test code → Check `participant_progress` table → `treatment_group` should be `'control'`

## Handling Different LLM Prompts

The three groups use different prompts:

### Alpha & Beta (Treatment Groups)
- Use INFER prompt with PV (Professional Vision) analysis
- Generate `analysis_percentages` JSONB
- Store `binary_classifications` for D/E/P scores
- Prompt includes PV component analysis

### Gamma (Control)
- Use simple feedback prompt (no PV analysis)
- `analysis_percentages` = null
- `weakest_component` = null
- No `binary_classifications` entries
- Prompt is general feedback only

**Implementation**: The prompt difference is handled in each app's `app.js` file in the feedback generation functions. The database schema doesn't need to change - it just stores what each app generates.

## Data Analysis Queries

### Count Participants by Group
```sql
SELECT treatment_group, COUNT(*) as count 
FROM participant_progress 
GROUP BY treatment_group;
```

### Get All Reflections with Treatment Info
```sql
SELECT r.*, p.treatment_group, p.study_version
FROM reflections r
JOIN participant_progress p ON r.participant_name = p.participant_name
ORDER BY r.created_at DESC;
```

### Compare PV Scores (Alpha & Beta only)
```sql
SELECT 
    p.treatment_group,
    AVG((r.analysis_percentages->'priority'->>'professional_vision')::NUMERIC) as avg_pv
FROM reflections r
JOIN participant_progress p ON r.participant_name = p.participant_name
WHERE p.treatment_group IN ('treatment_1', 'treatment_2')
  AND r.analysis_percentages IS NOT NULL
GROUP BY p.treatment_group;
```

### Tutorial Completion (Alpha only)
```sql
SELECT 
    COUNT(*) FILTER (WHERE tutorial_watched = true) as watched,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE tutorial_watched = true) / COUNT(*), 2) as pct
FROM participant_progress
WHERE treatment_group = 'treatment_1';
```

## Troubleshooting

### Error: "Could not find the 'treatment_group' column"
**Solution**: Run the `SHARED_SUPABASE_SCHEMA.sql` file in your Supabase SQL Editor to create/update the schema.

### Participants Not Remembering Progress
**Check**:
1. `participant_progress` table has the participant's record
2. `treatment_group` is set correctly
3. `videos_completed` array is being updated
4. App is using the correct Supabase URL and key

### Different Prompts Not Working
**Check**:
- Alpha/Beta: Look for `USE_SIMPLE_FEEDBACK = false` or no flag
- Gamma: Look for `USE_SIMPLE_FEEDBACK = true` in `app.js`
- Verify the prompt generation functions are different between groups

## Next Steps

1. ✅ All three apps already use the same Supabase database
2. ✅ Schema supports all three groups
3. ✅ Treatment group is automatically set based on site URL
4. ⚠️ **Action Required**: Run `SHARED_SUPABASE_SCHEMA.sql` in Supabase SQL Editor if you haven't already
5. ⚠️ **Action Required**: Verify `treatment_group` column exists (if you got the error earlier, run the schema)
6. ✅ Test each site to ensure `treatment_group` is set correctly

## Summary

- **One database for all three sites**: ✅ Already configured
- **Automatic treatment group assignment**: ✅ Based on site URL
- **Schema supports all features**: ✅ Videos, tasks, tutorials, PV analysis
- **Different prompts**: ✅ Handled in app code, not database
- **Cross-group analysis**: ✅ Easy with unified database
