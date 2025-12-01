# INFER Study Gamma - Control Group

## Study Condition: Simple Feedback (No PV Analysis)

This is the **Control Group** version of the INFER 4-video experiment.

### Key Difference

The Control Group uses the **same interface** as the treatment groups, but provides **simple, general feedback** instead of the INFER Professional Vision (PV) analysis.

**Simple Feedback:**
- No binary classification (D/E/P)
- No PV percentages or scores
- Just general constructive feedback on the reflection
- Same two styles: academic (extended) and user-friendly (short)

### Video Configuration

| Video | AI Feedback | Type |
|-------|-------------|------|
| Video 1 | No | Reflection only (baseline) |
| Video 2 | Yes | Simple feedback (no PV) |
| Video 3 | Yes | Simple feedback (no PV) |
| Video 4 | No | Reflection only (post-test) |

### Configuration Required

1. Update SUPABASE_URL and SUPABASE_KEY in app.js
2. Update VIDEOS array with actual video links
3. Update QUALTRICS_SURVEYS with survey links

### Deployment

Deploy to Render.com as a static site.

URL Pattern: infer-study-gamma.onrender.com

