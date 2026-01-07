# Treatment Group Assignment - How It Works

## ✅ Yes, Treatment Group is Automatically Set Based on the Link

**Each student gets 1 link based on their assigned group, and the app automatically sets their `treatment_group` in Supabase.**

## How It Works

### 1. **Pre-Assignment**
- You assign each student to a group (Alpha, Beta, or Gamma)
- You give them the corresponding link:
  - **Alpha students** → `infer-study-alpha.onrender.com`
  - **Beta students** → `infer-study-beta.onrender.com`
  - **Gamma students** → `infer-study-gamma.onrender.com`

### 2. **First Login (New Participant)**
When a student logs in for the first time:

1. Student enters their participant code
2. App checks: "Is this a new participant?" → Yes
3. App automatically sets `treatment_group` based on which site they're on:
   - If on Alpha site → `treatment_group = 'treatment_1'`
   - If on Beta site → `treatment_group = 'treatment_2'`
   - If on Gamma site → `treatment_group = 'control'`
4. This is saved to Supabase `participant_progress` table

**Code location**: `app.js` line 952: `treatment_group: STUDY_CONDITION`

### 3. **Returning Login (Existing Participant)**
When a student returns later:

1. Student enters their participant code
2. App checks: "Is this a returning participant?" → Yes
3. App loads their existing progress from Supabase
4. **Verification**: App checks if their `treatment_group` matches the current site
   - ✅ **If matches**: Continue normally
   - ⚠️ **If doesn't match**: Show warning, but keep their original group (don't change it)
   - 🔧 **If missing**: Auto-set it based on current site

**Code location**: `app.js` lines 819-834

## Protection Against Group Switching

The app now includes safeguards:

1. **Verification**: Checks if returning participant's group matches current site
2. **Warning**: Shows alert if they're on wrong site
3. **Protection**: Keeps their original `treatment_group` - doesn't overwrite it

This prevents accidental group switching if someone uses the wrong link.

## Example Flow

### Student A (Assigned to Alpha)
1. Gets link: `infer-study-alpha.onrender.com`
2. First login → `treatment_group = 'treatment_1'` ✅
3. Returns later on same link → `treatment_group` stays `'treatment_1'` ✅
4. If somehow uses Beta link → Warning shown, but group stays `'treatment_1'` ✅

### Student B (Assigned to Beta)
1. Gets link: `infer-study-beta.onrender.com`
2. First login → `treatment_group = 'treatment_2'` ✅
3. Returns later → `treatment_group` stays `'treatment_2'` ✅

## Database View

After students log in, you can verify in Supabase:

```sql
SELECT participant_name, treatment_group, created_at
FROM participant_progress
ORDER BY created_at DESC;
```

You should see:
- Alpha students: `treatment_group = 'treatment_1'`
- Beta students: `treatment_group = 'treatment_2'`
- Gamma students: `treatment_group = 'control'`

## Summary

✅ **Treatment group is automatically set** based on which link students use  
✅ **No manual assignment needed** - handled by the app code  
✅ **Protected against switching** - verification prevents accidental group changes  
✅ **One link per student** - give them the link for their assigned group  

## Technical Details

- **Alpha app** (`app.js` line 17): `const STUDY_CONDITION = 'treatment_1';`
- **Beta app**: `const STUDY_CONDITION = 'treatment_2';`
- **Gamma app**: `const STUDY_CONDITION = 'control';`

When creating progress, the app uses: `treatment_group: STUDY_CONDITION`

This means the group is determined by **which app/site they access**, not by any database logic.
