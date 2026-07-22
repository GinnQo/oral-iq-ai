# OralIQ AI - Architecture & Data Flow Diagram

## Current Data Flow (What Works Today)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Presentation Grader Page                                │   │
│  │  - Student info input ✅                                │   │
│  │  - Audio recording/upload ✅                            │   │
│  │  - Speaker confirmation UI ✅                           │   │
│  │  - Results display ✅                                   │   │
│  │  - Results saved: ❌ IN STATE ONLY                      │   │
│  └──────────────┬──────────────────────────────────────────┘   │
│                 │ FormData                                       │
│                 ▼                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Diarization Request (Multipart)                         │   │
│  │  - audio: Blob                                          │   │
│  │  - studentNames: ["Alice", "Bob"]                       │   │
│  │  - presentationType: "group"                            │   │
│  │  - grade, topic                                         │   │
│  └──────────────┬──────────────────────────────────────────┘   │
│                 │                                               │
└─────────────────┼───────────────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  /api/grade-        │
        │  presentation       │
        │  [route.ts]         │
        │                     │
        │  1. Validate ✅     │
        │  2. Call Whisper ✅ │
        │  3. Diarize ✅      │
        └─────────┬───────────┘
                  │
                  ▼ (Response: segments, speakers, stats)
        ┌─────────────────────┐
        │   OpenAI Whisper    │
        │   Model: whisper-1  │
        │                     │
        │   OUTPUT:           │
        │   - segments ✅     │
        │   - speakers ✅     │
        │   - transcript ✅   │
        └─────────────────────┘

                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                         │
│  - Display segments & speaker labels                            │
│  - Teacher confirms: Speaker 1 → Alice, Speaker 2 → Bob        │
│  - Create mappings                                              │
│  - POST JSON back to /api/grade-presentation                    │
└──────────────┬──────────────────────────────────────────────────┘
               │ JSON { action: "grade", speakerMappings: {...} }
               ▼
      ┌────────────────────────┐
      │ /api/grade-            │
      │ presentation           │
      │ [Grading Phase]        │
      │                        │
      │ 1. Create named        │
      │    transcript ✅       │
      │ 2. Calculate           │
      │    evidence ✅         │
      │ 3. Build GPT-4         │
      │    prompt ✅           │
      │ 4. Call GPT-4 ✅       │
      │ 5. Parse & return ✅   │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────────────┐
      │  OpenAI GPT-4-mini     │
      │                        │
      │  INPUT:                │
      │  - Named transcript    │
      │  - Rubric criteria     │
      │  - Evidence per        │
      │    student             │
      │  - Mappings            │
      │                        │
      │  OUTPUT:               │
      │  - Group score         │
      │  - Individual scores   │
      │  - Feedback            │
      │  - Evidence            │
      └────────────────────────┘
               │
               ▼
      ┌────────────────────────┐
      │ FinalGradingResult     │
      │  - groupAssessment ✅  │
      │  - individual[]  ✅    │
      │  - Full output ✅      │
      └────────┬───────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                          │
│ FinalAssessmentReport Component                                  │
│  - Display group & individual scores ✅                          │
│  - Show feedback & evidence ✅                                    │
│  - Teacher can override score ✅                                 │
│  - Teacher can add notes ✅                                       │
│  - PROBLEM: Close browser → Results gone ❌                       │
│  - PROBLEM: No save button ❌                                     │
│  - PROBLEM: No export ❌                                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Missing: Results Storage Flow ❌

```
                              🚫 MISSING 🚫

┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: FinalAssessmentReport                                 │
│  - [Save Results] button ❌ DOESN'T EXIST                        │
└──────────────┬──────────────────────────────────────────────────┘
               │ (IF IT EXISTED) JSON POST
               ▼
      ┌────────────────────────┐
      │ /api/results           │
      │ (NOT IMPLEMENTED) ❌   │
      │                        │
      │ Would receive:         │
      │ - teacher_id           │
      │ - course_id            │
      │ - finalGradingResult   │
      │ - timestamp            │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────────────┐
      │ PostgreSQL Database    │
      │ (NOT SET UP) ❌        │
      │                        │
      │ Would store in:        │
      │ grading_results        │
      │  - id (PK)             │
      │  - teacher_id (FK)     │
      │  - course_id (FK)      │
      │  - results (JSONB)     │
      │  - created_at          │
      └────────────────────────┘
               │
               ▼ (PERMANENT STORAGE)
         📦 RESULTS PRESERVED
         ✅ AUDIT TRAIL
         ✅ RETRIEVAL POSSIBLE
         ✅ COMPLIANCE
```

---

## Current Architecture (What Exists)

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  app/                                                            │
│  ├── presentation-grader/page.tsx        ✅ Full workflow       │
│  ├── classes/page.tsx                   ✅ Import students     │
│  ├── assessments/page.tsx                ✅ Create templates    │
│  ├── reports/page.tsx                    ❌ Show results        │
│  ├── library/page.tsx                    ❌ Resource library    │
│  └── feedback/page.tsx                   ❌ Student feedback    │
│                                                                  │
│  components/                                                    │
│  ├── ClassroomProvider.tsx               ✅ State mgmt         │
│  ├── AuthProvider.tsx                   ✅ NextAuth wrapper   │
│  └── AudioRecorder.tsx (implied)        ✅ MediaRecorder     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Authentication:                                                │
│  ├── /api/auth/[...nextauth]             ✅ Google OAuth       │
│                                                                  │
│  Classroom Integration:                                         │
│  ├── /api/classroom/courses              ✅ List courses       │
│  ├── /api/classroom/students             ✅ List students      │
│                                                                  │
│  Grading (CORE FUNCTION):                                       │
│  ├── /api/grade-presentation             ✅ Diarize + Grade   │
│                                                                  │
│  Speaker Service Proxy:                                         │
│  ├── /api/speaker/[...path]              ✅ Proxy to FastAPI  │
│                                                                  │
│  Rubric Management:                                             │
│  ├── /api/ai/rubric                      ✅ Google Drive      │
│  ├── /api/ai/rubric/save                 ⚠️ File-based       │
│                                                                  │
│  NOT IMPLEMENTED:                                               │
│  ├── /api/results                        ❌ MISSING           │
│  ├── /api/speech/transcribe              ❌ Unused            │
│  ├── /api/speech/analyze                 ❌ Unused            │
│  ├── /api/ai/grading                     ❌ Unused            │
│  ├── /api/ai/reports                     ❌ Unused            │
│  ├── /api/ai/feedback                    ❌ Unused            │
│  ├── /api/students                       ❌ Empty directory   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OpenAI API:                                                    │
│  ├── Whisper (transcription)             ✅ WORKING           │
│  ├── GPT-4-mini (grading)                ✅ WORKING           │
│                                                                  │
│  Google APIs:                                                   │
│  ├── Classroom API                       ✅ WORKING           │
│  ├── Drive API (rubrics)                 ✅ WORKING           │
│  ├── OAuth 2.0                           ✅ WORKING           │
│                                                                  │
│  Speaker Recognition FastAPI:                                  │
│  ├── Enroll endpoint                     ✅ WORKING           │
│  ├── Identify endpoint                   ✅ WORKING (unused)  │
│  ├── Profiles endpoint                   ✅ WORKING (unused)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Storage Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser LocalStorage:                                          │
│  ├── oraliq_assessments                  ✅ Assessment templates│
│  ├── oraliq_classroom_data               ✅ Imported rosters  │
│                                                                  │
│  File System (Next.js server):                                  │
│  ├── data/saved_rubrics.json             ✅ Teacher rubrics   │
│                                                                  │
│  PostgreSQL (Speaker Service):                                  │
│  ├── student_voice_profile               ✅ Voice embeddings  │
│                                                                  │
│  Main App Database:                                             │
│  ├── PostgreSQL connection               ❌ NOT SET UP        │
│  ├── Prisma ORM                          ❌ NOT SET UP        │
│  ├── grading_results table               ❌ NOT DEFINED       │
│  ├── audit_log table                     ❌ NOT DEFINED       │
│  ├── teachers table                      ❌ NOT DEFINED       │
│  ├── courses table                       ❌ NOT DEFINED       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Happens When You Use It Today

```
START: Teacher opens https://oraliq.com
   │
   ├─ Login with Google ✅
   │    ├─ NextAuth creates session ✅
   │    └─ OAuth token stored ✅
   │
   ├─ Click "Google Classroom" ✅
   │    ├─ Fetch /api/classroom/courses ✅
   │    ├─ Store in localStorage ✅
   │    └─ Display courses ✅
   │
   ├─ Select course → Import students ✅
   │    ├─ Fetch /api/classroom/students?courseId=X ✅
   │    ├─ Store in localStorage ✅
   │    └─ Update context ✅
   │
   ├─ Go to "Presentation Grader" ✅
   │    ├─ Context shows students ✅
   │    └─ Import button pre-fills names ✅
   │
   ├─ Enter: students, grade, topic, rubric ✅
   │
   ├─ Record audio OR Upload file ✅
   │
   ├─ Click "Analyze Speakers" ✅
   │    ├─ POST /api/grade-presentation (FormData)
   │    ├─ Backend calls Whisper ✅
   │    ├─ Get diarization result ✅
   │    └─ Display segments & detected speakers ✅
   │
   ├─ Confirm speaker-to-student mapping ✅
   │    └─ Teacher confirms or corrects assignments ✅
   │
   ├─ Click "Grade Presentation" ✅
   │    ├─ POST /api/grade-presentation (JSON)
   │    ├─ Backend calls GPT-4 ✅
   │    ├─ Get final grading result ✅
   │    └─ Display results ✅
   │
   ├─ Teacher reviews scores & feedback ✅
   │    ├─ Can override score ✅
   │    ├─ Can add notes ✅
   │    └─ Looks complete! ✅
   │
   ├─ Close browser OR navigate away ❌
   │    ├─ Results still in React state ❌
   │    ├─ No save button ❌
   │    ├─ No backend storage ❌
   │    └─ **ALL RESULTS LOST** ❌
   │
   └─ Open app again
        └─ No results visible ❌
```

---

## What SHOULD Happen (After Phase 1 Fix)

```
(Everything above, then...)

├─ Click "Save Results" button ✅ (NEW)
│    ├─ POST /api/results ✅ (NEW)
│    │    ├─ Validate teacher owns result
│    │    ├─ Save to PostgreSQL
│    │    ├─ Create audit log entry
│    │    └─ Return result ID
│    │
│    ├─ Show "Saved successfully" ✅
│    └─ Enable "View Results" link ✅
│
├─ Close browser
│    └─ Results persisted in database ✅
│
├─ Open app again
│    ├─ Go to "Results" page ✅ (NEW)
│    ├─ Query /api/results ✅ (NEW)
│    ├─ See list of past assessments ✅
│    ├─ Click to view specific result ✅
│    ├─ Export to PDF ✅ (PHASE 3)
│    └─ Share with students ✅ (PHASE 3)
│
└─ Audit trail shows:
    ├─ Who: teacher@school.edu
    ├─ What: Graded "Climate Change" presentation
    ├─ When: 2026-07-14 10:30:00
    ├─ Students: Alice, Bob, Charlie
    ├─ Result ID: grading_result_12345
    └─ Status: Finalized

```

---

## Dependency Graph

```
Frontend
  ├── Requires: NextAuth + Google OAuth ✅
  ├── Requires: Classroom API ✅
  ├── Requires: /api/grade-presentation ✅
  ├── Requires: /api/results (MISSING) ❌
  ├── Requires: Speaker service identify (UNUSED) ⚠️
  └── Uses: localStorage ✅

/api/grade-presentation
  ├── Requires: OPENAI_API_KEY ✅
  ├── Requires: Whisper API ✅
  ├── Requires: GPT-4 API ✅
  └── Requires: Response parsing ✅

/api/results (MISSING)
  ├── Requires: Database connection ❌
  ├── Requires: Teacher auth ✅
  ├── Requires: Audit logging ❌
  └── Requires: Timestamp/versioning ❌

Database
  ├── Requires: PostgreSQL ❌
  ├── Requires: Prisma migration system ❌
  ├── Requires: Schema definition ❌
  └── Requires: Connection pooling ❌

Speaker Service
  ├── Requires: FastAPI ✅
  ├── Requires: ECAPA-TDNN model ✅
  ├── Requires: PostgreSQL ✅
  ├── Requires: pgvector ✅
  ├── Requires: Proxy endpoint ✅
  ├── Requires: Integration into grading (MISSING) ❌
  └── Requires: Enrollment UI (MISSING) ❌
```

---

## Summary Table

| Component | Built | Working | Integrated | Persistent | Production-Ready |
|-----------|-------|---------|-----------|------------|------------------|
| **Classroom API** | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| **Audio Recording** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Diarization** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Speaker Mapping** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **AI Grading** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Results Display** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Results Storage** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Results Retrieval** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Speaker Service** | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| **Database** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit Logging** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Rate Limiting** | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Production Readiness Timeline

```
TODAY (July 14):
├─ Technology ✅ 60% (core works, missing persistence)
├─ User Experience ⚠️ 30% (workflow incomplete)
├─ Reliability ❌ 10% (no error recovery)
└─ Commercial 0% (no contracts/sales)
    └─ READINESS: 3/10 (Alpha)

After Phase 1 (Week 1):
├─ Technology ✅ 85% (persistent, working)
├─ User Experience ✅ 50% (can save & retrieve)
├─ Reliability ✅ 40% (audit trail, basic recovery)
└─ Commercial 0% (still)
    └─ READINESS: 4/10 (Late Alpha)

After Phase 2 (Week 2-3):
├─ Technology ✅ 90% (smart mapping, redundancy)
├─ User Experience ✅ 75% (full workflow, history)
├─ Reliability ✅ 65% (error recovery, logging)
└─ Commercial 0% (still)
    └─ READINESS: 6/10 (Beta-Ready)

After Phase 3 (Week 4):
├─ Technology ✅ 95% (production-hardened)
├─ User Experience ✅ 85% (polish, exports)
├─ Reliability ✅ 80% (monitoring, alerts)
└─ Commercial 20% (pricing, ToS)
    └─ READINESS: 7/10 (Ready for Beta Launch)

Full Production (Month 2):
├─ Technology ✅ 98%
├─ User Experience ✅ 95%
├─ Reliability ✅ 90%
├─ Commercial ✅ 70% (pricing, SOCs)
└─ READINESS: 8-9/10 (Early Prod)
```

