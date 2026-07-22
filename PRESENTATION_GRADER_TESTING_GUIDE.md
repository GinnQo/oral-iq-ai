# Presentation Grader End-to-End Testing Guide

## Overview

This guide walks you through testing the complete OralIQ presentation grader pipeline from audio recording/upload through AI assessment generation.

## Prerequisites

### Environment Variables Required

Create a `.env.local` file in the project root with:

```env
# **REQUIRED** - OpenAI API
OPENAI_API_KEY=sk-...your-openai-api-key...

# Optional - Google Classroom Integration (not required for basic grader testing)
GOOGLE_CLIENT_ID=...your-google-client-id...
GOOGLE_CLIENT_SECRET=...your-google-client-secret...
NEXTAUTH_SECRET=...any-random-string-for-sessions...
NEXTAUTH_URL=http://localhost:3000

# Optional - Speaker Recognition Service (for advanced features)
SPEAKER_SERVICE_URL=http://localhost:8000
SR_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/speaker_recognition
```

### Services to Start

1. **Next.js Development Server** (Required)
   ```bash
   npm run dev
   # Runs on http://localhost:3000
   ```

2. **FastAPI Speaker Recognition Service** (Optional, for speaker identification)
   ```bash
   docker-compose up
   # Requires Docker and PostgreSQL running
   # Runs on http://localhost:8000
   ```

## Testing Workflow

### Step 1: Start the Application

```bash
# Terminal 1 - Frontend dev server
cd /workspaces/oral-iq-ai
npm run dev

# Terminal 2 (optional) - Speaker recognition backend
cd /workspaces/oral-iq-ai
docker-compose up
```

Navigate to **http://localhost:3000** in your browser.

### Step 2: Navigate to Presentation Grader

1. Click **"AI Presentation Grader"** on the dashboard
2. Or visit **http://localhost:3000/presentation-grader**

### Step 3: Test Individual Presentation

#### 3a. Set Up Presentation Information

1. **Presentation Type**: Select "👤 Individual Presentation"
2. **Student**: Enter a student name (e.g., "Alex")
3. **Grade Level**: Select any grade (e.g., "Grade 6")
4. **Rubric**: Keep default or customize
5. **Topic**: Enter a topic (e.g., "Book Review")

#### 3b. Record or Upload Audio

**Option A: Record Live**
- Click **"Start Presentation"**
- Speak for 30+ seconds (must be audible for Whisper to detect)
- Click **"Stop Presentation"**
- Review the audio playback

**Option B: Upload File**
- Click **"Upload Audio File"**
- Select an MP3, WAV, or WebM file (max 25MB)
- Audio must contain clear, audible speech

#### 3c. Analyze Speakers

1. Click **"Analyze Speakers"**
2. Wait for "Separating detected speakers..." (20-30 seconds)
3. **Expected output**:
   - Transcript showing detected speakers and text
   - Speaker statistics (time, word count, segments)
   - Any overlap warnings
   - Detected speakers (e.g., "Speaker 1")

**If no speakers detected**:
- Check browser console for errors (F12 → Console tab)
- Verify `OPENAI_API_KEY` is set and valid
- Ensure audio is at least 3 seconds and contains clear speech
- Try a different audio file with stronger audio signal

#### 3d. Confirm Speaker Assignments

1. For individual presentation, "Speaker 1" auto-assigns to "Alex"
2. Review the speaker-labeled transcript
3. Check participation statistics (should show 100% for solo speaker)
4. Click **"Confirm Speakers and Grade"**

#### 3e. Review AI Assessment

Wait for "Generating assessments..." (30-60 seconds).

**Expected output**:
- **Group Score**: 0-100 overall score
- **6 Category Scores** (Organization, Content, Clarity, Vocabulary, Fluency, Collaboration):
  - Score (0-20 each)
  - AI feedback
  - Evidence quotes from transcript
- **Individual Student Report** for "Alex":
  - Individual score (0-100)
  - Per-category breakdown
  - Strengths and next steps
  - Student-friendly and teacher-friendly feedback

#### 3f. Finalize & Download

1. Optionally override the group score
2. Add teacher review notes
3. Click **"Finalize Review"**
4. Click **"Download Final Report"** (saves JSON)

### Step 4: Test Group Presentation (Optional)

1. Go back to presentation grader or reload page
2. Select "👥 Group Presentation"
3. Add 2-3 students (e.g., "Alice", "Bob", "Charlie")
4. Use existing audio or record new audio with multiple speakers
5. After diarization, you'll see multiple detected speakers
6. Assign each detected speaker to the correct student
7. Grade and review results

## Debugging Common Issues

### Issue: "No speakers were detected"

**Causes**:
- Audio file is silent or too quiet
- Audio is less than 3 seconds
- Wrong `OPENAI_API_KEY`
- Network error calling OpenAI Whisper

**Solutions**:
1. Check browser console (F12 → Console)
2. Check terminal output for "[GradePresentation]" logs
3. Verify audio file plays in HTML audio player
4. Test with a different, higher-quality audio file
5. Run: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"` to verify API key

### Issue: "The grading report could not be parsed"

**Causes**:
- GPT response was malformed JSON
- Rate limit exceeded
- Transcript too long (>100k chars)

**Solutions**:
1. Try grading again (rate limits are temporary)
2. Shorten the presentation or reduce rubric complexity
3. Check OpenAI API usage dashboard for rate limits
4. See browser console for the raw GPT response

### Issue: "Assessment could not be generated" (500 error)

**Causes**:
- `OPENAI_API_KEY` not set
- Network error calling OpenAI
- Speaker mappings invalid
- No students assigned to any speaker

**Solutions**:
1. Verify `.env.local` has `OPENAI_API_KEY`
2. Check terminal for "[GradePresentation]" error logs
3. Ensure every detected speaker is assigned to a student
4. Ensure at least one student has sufficient speaking evidence

### Issue: Upload button doesn't work

**Causes**:
- File type not supported
- File size > 25MB
- Browser issue

**Solutions**:
1. Use .mp3, .wav, .webm, .m4a, or .ogg
2. Compress audio to <25MB
3. Try a different browser (Chrome/Edge recommended)

## Monitoring Logs

### Browser Console (F12 → Console tab)

Look for `[PresentationGrader]` logs:
```
[PresentationGrader] Starting diarization analysis
[PresentationGrader] Sending diarization request to /api/grade-presentation
[PresentationGrader] Diarization response status: 200 {successful response}
[PresentationGrader] Diarization successful
[PresentationGrader] Starting grading analysis
[PresentationGrader] Grading response status: 200
[PresentationGrader] Grading successful
```

### Server Terminal Output

Look for `[GradePresentation]` logs:
```
[GradePresentation] Starting diarization
[GradePresentation] Whisper transcription complete
[GradePresentation] Starting grade analysis
[GradePresentation] Sending request to GPT for assessment
[GradePresentation] GPT assessment received
[GradePresentation] Grade analysis complete
```

## Success Criteria

✅ **Complete End-to-End Flow Works When**:

1. ✅ Audio records via microphone or uploads from file
2. ✅ Whisper transcription completes without errors
3. ✅ Speaker diarization detects 1+ speakers
4. ✅ Teacher confirms speaker assignments
5. ✅ GPT generates valid JSON assessment
6. ✅ UI displays all assessment results
7. ✅ Final report downloads as JSON
8. ✅ Console shows no critical errors

## Test Scenarios

### Scenario A: Perfect Case (Quick Test - 2 minutes)

**Audio**: 45-second recorded speech from 1 person speaking clearly about any topic

**Expected**: All pipeline steps succeed, group score 70+

### Scenario B: Multiple Speakers (5 minutes)

**Audio**: 2-3 people speaking alternately for 30+ seconds each

**Expected**: Diarization detects each speaker separately, teacher assigns correctly

### Scenario C: Unclear Audio (Failure Expected)

**Audio**: Whispered, very quiet, or background noise dominant

**Expected**: Diarization fails with "No speakers detected" - this is correct behavior

### Scenario D: Edge Case - Short Solo Speaker

**Audio**: 10-second mono-speaker presentation

**Expected**: Diarization succeeds, individual score generated

## Performance Expectations

| Step | Expected Duration | Notes |
|------|------------------|-------|
| Audio Recording | User-controlled | 30+ seconds recommended |
| Diarization (Whisper) | 15-30 seconds | Depends on audio length |
| Speaker Confirmation | User-controlled | <5 minutes |
| Grading (GPT-4) | 30-60 seconds | ~$0.01-0.05 per assessment |
| **Total Time** | **2-5 minutes** | Excludes user interaction |

## Cost Estimation

Per assessment (individual or group):
- Whisper transcription: ~$0.001-0.01
- GPT-4 grading: ~$0.01-0.05
- **Total per assessment**: ~$0.02-0.06

## API Rate Limits

- OpenAI Whisper: 50 requests/minute (usually OK)
- OpenAI GPT-4: Varies by plan (check your OpenAI account)
- Next.js server: No hard limits locally

## Next Steps

After successful end-to-end testing:

1. **Database Integration** (HIGH PRIORITY)
   - Save assessments to PostgreSQL
   - Persist student voice profiles
   - Track assessment history

2. **Speaker Identification** (MEDIUM)
   - Enroll student voice profiles during first assessment
   - Auto-identify speakers in group presentations
   - Reduce manual speaker mapping

3. **Multi-Assessment Tracking** (MEDIUM)
   - Build reports page with student progress
   - Compare assessments over time
   - Export aggregate feedback

4. **Classroom Integration** (MEDIUM)
   - Import students from Google Classroom
   - Export grades back to Classroom
   - Create class-wide reports

5. **Mobile Support** (LOW)
   - Test on iOS/Android browsers
   - Optimize UI for small screens

## Support

**Issues?** Check:
1. `.env.local` file exists with `OPENAI_API_KEY`
2. Browser console (F12 → Console) for error messages
3. Server terminal for `[GradePresentation]` logs
4. Audio file is clear and >3 seconds
5. OpenAI API account has available credits

---

**Document Last Updated**: July 14, 2026
**OralIQ AI Presentation Grader v1.0**
