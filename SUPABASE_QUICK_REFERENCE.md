# Supabase Quick Reference - INFER 3-Group Study

## ✅ Current Status

**All three sites (Alpha, Beta, Gamma) already use the SAME Supabase database.**

- **Database URL**: `https://cvmzsljalmkrehfkqjtc.supabase.co`
- **Same API key** in all three apps
- **Treatment group is automatically set** based on which site participants access

## 🎯 Treatment Group Assignment

| Site | treatment_group | Set Automatically? |
|------|----------------|-------------------|
| Alpha (infer-study-alpha.onrender.com) | `'treatment_1'` | ✅ Yes |
| Beta (infer-study-beta.onrender.com) | `'treatment_2'` | ✅ Yes |
| Gamma (infer-study-gamma.onrender.com) | `'control'` | ✅ Yes |

## 🔧 What You Need to Do

### Step 1: Fix the Database Schema (If Getting Errors)

If you're getting `"Could not find the 'treatment_group' column"` error:

1. Go to Supabase Dashboard → SQL Editor
2. Run **ONE** of these:
   - **Option A (Full Schema)**: Copy and paste `SHARED_SUPABASE_SCHEMA.sql` → Run
   - **Option B (Migration Only)**: Copy and paste `MIGRATE_SUPABASE_SCHEMA.sql` → Run

### Step 2: Verify It Works

1. Test Alpha site: Login → Check database → `treatment_group` should be `'treatment_1'`
2. Test Beta site: Login → Check database → `treatment_group` should be `'treatment_2'`
3. Test Gamma site: Login → Check database → `treatment_group` should be `'control'`

## 📊 Database Structure

### One Database, Three Groups

All data goes into the same tables, distinguished by `treatment_group`:

```
participant_progress
├── treatment_group: 'treatment_1' (Alpha)
├── treatment_group: 'treatment_2' (Beta)
└── treatment_group: 'control' (Gamma)

reflections
├── (All groups store reflections here)
└── video_id can be: 'video1', 'video2', 'task1', 'task2', etc.

binary_classifications
├── (Only Alpha & Beta populate this)
└── (Gamma/control leaves this empty)
```

## 🔍 Key Differences Between Groups

| Feature | Alpha | Beta | Gamma |
|---------|-------|------|-------|
| **treatment_group** | `'treatment_1'` | `'treatment_2'` | `'control'` |
| **Tutorial Video** | ✅ Yes | ❌ No | ❌ No |
| **PV Analysis** | ✅ Yes | ✅ Yes | ❌ No |
| **LLM Prompt** | INFER (PV) | INFER (PV) | Simple feedback |
| **binary_classifications** | ✅ Populated | ✅ Populated | ❌ Empty |
| **analysis_percentages** | ✅ Has data | ✅ Has data | ❌ null |

## 🐛 Troubleshooting

### Error: "treatment_group column not found"
**Fix**: Run `MIGRATE_SUPABASE_SCHEMA.sql` in Supabase SQL Editor

### Progress not remembered
**Check**:
1. Database has the participant record
2. `treatment_group` is set correctly
3. App is using correct Supabase URL/key

### Wrong treatment_group assigned
**Check**: Each app's `app.js` has:
- Alpha: `const STUDY_CONDITION = 'treatment_1';`
- Beta: `const STUDY_CONDITION = 'treatment_2';`
- Gamma: `const STUDY_CONDITION = 'control';`

## 📝 Important Notes

1. **One Database**: ✅ All three sites share the same database (already configured)
2. **Auto Assignment**: ✅ Treatment group is set automatically based on site URL
3. **Schema Support**: ✅ Schema handles videos (Alpha) and tasks (Beta/Gamma)
4. **Different Prompts**: ✅ Handled in app code, not database
5. **Cross-Group Analysis**: ✅ Easy with unified database

## 🚀 Next Steps

1. ✅ Run migration script if needed (`MIGRATE_SUPABASE_SCHEMA.sql`)
2. ✅ Test each site to verify `treatment_group` is set correctly
3. ✅ Verify progress is remembered when participants return
4. ✅ Ready to collect data from all three groups!
