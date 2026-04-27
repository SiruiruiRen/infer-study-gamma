# INFER Study Gamma — Control Group

## Study Condition: General feedback (single-shot prompt, no chain, no tutorial)

This is the **Control** version of the INFER 4-video experiment.
Participants receive simple, single-shot AI feedback on Videos 2 & 3, with no Description / Explanation / Prediction classification and no INFER chain prompt. No tutorial video.

### Video Configuration

| Video | Tutorial | AI Feedback | Notes |
|-------|----------|-------------|-------|
| Video 1 | ❌ | ❌ | Reflection only (baseline) |
| Video 2 | ❌ | ✅ general | Single-shot general feedback |
| Video 3 | ❌ | ✅ general | Single-shot general feedback |
| Video 4 | ❌ | ❌ | Reflection only (post-test) |

### Study Flow

```
Welcome/Consent → Login → Pre-Survey (mandatory)
    ↓
Video 1: Watch → Reflect → Submit → Post-V1 Survey
    ↓
Video 2: Watch → Reflect → General feedback → Revise → Submit → Post-V2 Survey
    ↓
Video 3: Watch → Reflect → General feedback → Revise → Submit → Post-V3 Survey
    ↓
Video 4: Watch → Reflect → Submit → Post-V4 Survey
    ↓
Post-Survey (mandatory) → Thank You
```

### Difference from Alpha and Beta

- **vs Alpha (Treatment 1)** and **vs Beta (Treatment 2)**: Gamma uses a general single-shot prompt instead of the INFER chain prompt. Differences:
  - No binary classification of reflection windows into Description / Explanation / Prediction
  - No weighted feedback construction over analysis results
  - No `non_relevant_reflection_detected` validation (participants can write anything in their reflection)
  - Smaller token budget (250–400 vs 2000 for chain)
- Same model (`gpt-4o`) and same temperature (`0.0`) as Alpha/Beta.

### Deployment

Static site on Render. URL: `infer-study-gamma.onrender.com`
Data: shared Supabase project (distinguished by `treatment_group = 'control'`).
