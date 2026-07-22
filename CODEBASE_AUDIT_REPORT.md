# OralIQ AI - Comprehensive Codebase Audit Report

**Audit Date**: July 14, 2026  
**Status**: Post-MVP (Beta Phase)  
**Primary Goal**: Complete end-to-end workflow analysis with implementation gaps

---

## Executive Summary

Your codebase has a **strong working core** (Whisper → GPT-4 grading pipeline) but is **missing critical persistence and integration layers**. The core technology works, but the application cannot yet save results, retrieve history, or maintain a complete audit trail.

| Component | Status | Notes |
|-----------|--------|-------|
| Classroom API Integration | ✅ Working | Endpoints functional, not connected to grader |
| Presentation Grader Flow | ✅ Working | Recording → Diarization → Grading fully functional |
| Speech Recognition | ✅ Ready | FastAPI service working, not integrated |
| Assessment Storage | ❌ Missing | No backend persistence layer |
| Results Storage | ❌ Missing | Critical blocker for production |
| Database Schema | ❌ Missing | Main app has no ORM or schema |
| End-to-End Workflow | ⚠️ Incomplete | Grading works, but results vanish |

---

## 1. CLASSROOM INTEGRATION

### ✅ What's Working

**[app/api/classroom/courses/route.ts](app/api/classroom/courses/route.ts)**
- Endpoint: `GET /api/classroom/courses`
- Authentication: NextAuth Google OAuth session
- Returns: Raw Google Classroom API response
- Status Code: ✅ Functional

```typescript
// Input
GET /api/classroom/courses
Headers: Authorization from NextAuth session

// Output
{
  "courses": [
    {
      "id": "123456",
      "name": "Grade 6 English",
      "section": "Period 1",
      "room": "Room 204",
      ...
    }
  ]
}
```

**[app/api/classroom/students/route.ts](app/api/classroom/students/route.ts)**
- Endpoint: `GET /api/classroom/students?courseId={id}`
- Returns: Student roster for a course
- Status Code: ✅ Functional

```typescript
// Input
GET /api/classroom/students?courseId=123456

// Output
{
  "students": [
    {
      "userId": "student-1",
      "profile": {
        "name": { "fullName": "Alice Johnson" },
        "emailAddress": "alice@school.edu"
      }
    }
  ]
}
```

### 🔗 UI Connection

**[app/classes/page.tsx](app/classes/page.tsx)**
- Shows available courses
- Shows imported students for selected course
- Stores in `localStorage` under `oraliq_classroom_data`
- Connected via [ClassroomProvider.tsx](components/ClassroomProvider.tsx)

### ❌ What's Missing

1. **No Linking to Assessments**
   - Classroom course data is loaded into memory but not connected to grading
   - [app/presentation-grader/page.tsx](app/presentation-grader/page.tsx) reads `classroomStudents` from context
   - Has button to `importClassroomRoster()` for quick student population
   - **PROBLEM**: No record of which course the assessment is for

2. **No Classroom API Storage**
   - Course data not cached in main database
   - Requires Google Classroom API call every time
   - No fallback if Google Classroom is unavailable

3. **No Student Linking**
   - Speaker enrollment (`/api/speaker/enroll`) doesn't link to classroom students
   - Can't query "get speaker profiles for classroom X"

---

## 2. ASSESSMENT PERSISTENCE

### Current State: Frontend Only

#### localStorage Usage

**[app/assessments/page.tsx](app/assessments/page.tsx)**
```typescript
// Saves to browser localStorage
localStorage.setItem("oraliq_assessments", JSON.stringify(updated))

// Structure
type Assessment = {
  id: string;                    // Date.now().toString()
  title: string;                 // "Grade 6 Debate"
  activityType: string;          // "Academic Debate"
  grade: string;                 // "Grade 6"
  duration: string;              // "5 Minutes"
  skillFocus: string;            // "Argument & Evidence"
  rubric: string;                // "Debate Rubric"
  presenterType: string;         // "Individual Student" | "Group"
}
```

**Rubric Storage**
- **[app/api/ai/rubric/save/route.ts](app/api/ai/rubric/save/route.ts)** - ⚠️ File-based persistence
  - Saves to `data/saved_rubrics.json`
  - Not suitable for production (containerized environments don't have persistent filesystem)
  - Persists by teacher email

```typescript
// Stores per teacher
{
  "teacher@school.edu": {
    "name": "My Rubric",
    "content": "Organization: 0-20...",
    "updatedAt": "2026-07-14T10:30:00Z"
  }
}
```

### ❌ Critical Missing: Backend Persistence APIs

**No Endpoints Exist For:**
1. `/api/assessments/` (POST) - Create assessment template
2. `/api/assessments/` (GET) - List assessment templates
3. `/api/assessments/{id}` (GET) - Retrieve template
4. `/api/assessments/{id}` (PUT) - Update template
5. `/api/results/` (POST) - Save grading results ⚠️ MOST CRITICAL
6. `/api/results/` (GET) - List past results
7. `/api/results/{id}` (GET) - Retrieve specific result
8. `/api/results/{id}/export` (GET) - Export to PDF/CSV

**What Gets Lost When Page Closes:**
- Final grading results
- Student feedback and scores
- Evidence transcripts
- Teacher notes and overrides
- All assessment metadata

---

## 3. PRESENTATION GRADER - DETAILED FLOW

### File: [app/presentation-grader/page.tsx](app/presentation-grader/page.tsx)

### State Management
```typescript
// Input phase
presentationType: "individual" | "group"
studentNames: string[]
grade: string
rubric: string
topic: string

// Recording phase
audioBlob: Blob | null
audioUrl: string
status: RecorderStatus

// Diarization phase
diarizationResult: DiarizationResult | null
speakerMappings: Record<string, string>

// Final phase
finalResult: FinalGradingResult | null
teacherFinalScore: number | null
teacherReviewNote: string
```

### Workflow: Step-by-Step

#### Phase 1: Presentation Info Setup ✅
```typescript
// User enters:
1. Presentation type: Individual or Group
2. Student names: Manual entry or import from Classroom
3. Grade level: Dropdown (Grade K-12)
4. Topic: Free text
5. Rubric: Saved rubric or Google Drive file

// Validation
validatePresentationInformation() → checks:
  - No empty student names
  - No duplicate student names
  - Individual presentations have 1 student
  - Group presentations have 2-10 students
  - Topic is not empty
```

#### Phase 2: Recording ✅
```typescript
startRecording()
  → navigator.mediaDevices.getUserMedia({audio: {...}})
  → MediaRecorder with selected mimeType
  → On stop: creates audioBlob (Blob | null)

// OR

File upload via <input type="file" accept="audio/*">
  → reads file directly as Blob
```

#### Phase 3: Speaker Diarization ✅
```typescript
analyzeSpeakers()
  → POST /api/grade-presentation (FormData)
  
FormData:
  - action: "diarize"
  - audio: File (audio/webm)
  - studentNames: JSON.stringify([...])
  - presentationType: "individual" | "group"
  - grade: string
  - topic: string

Response (DiarizationResult):
{
  presentationType: "group",
  studentNames: ["Alice", "Bob"],
  grade: "Grade 6",
  topic: "Climate Change",
  duration: 245.5,
  transcript: "Speaker 1 [0:00-2:15]: Climate change...",
  segments: [
    {
      id: "segment-1",
      speaker: "Speaker 1",
      start: 0,
      end: 15.2,
      text: "Climate change is..."
    },
    {
      id: "segment-2",
      speaker: "Speaker 2",
      start: 15.3,
      end: 30.1,
      text: "It affects..."
    }
  ],
  detectedSpeakers: ["Speaker 1", "Speaker 2"],
  speakerStatistics: [
    {
      speaker: "Speaker 1",
      speakingSeconds: 120.3,
      speakingPercentage: 49.1,
      segmentCount: 8,
      wordCount: 342
    }
  ],
  overlapWarnings: [],
  warnings: [
    "Speaker diarization identifies different voices, but does not guarantee identity..."
  ]
}
```

#### Phase 4: Speaker Mapping ✅
```typescript
// UI Component: SpeakerConfirmationSection
// Teacher confirms which detected speaker is which student

// Initial mapping (auto-created)
createInitialMappings()
  → If individual: "Speaker 1" → "Alice"
  → If group: All speakers → "" (empty, requires confirmation)

// User updates via dropdown
speakerMappings = {
  "Speaker 1": "Alice",
  "Speaker 2": "Bob",
  // OR for extra detected voices:
  "Speaker 3": "__NON_STUDENT__"  // Teacher, audience, noise, etc.
}

// Validation
allSpeakersAssigned = true
duplicateStudentAssignments = []  // No student assigned to multiple speakers
```

#### Phase 5: AI Grading ✅
```typescript
gradeConfirmedSpeakers()
  → POST /api/grade-presentation (JSON)

Payload (GradeRequestBody):
{
  action: "grade",
  presentationType: "group",
  studentNames: ["Alice", "Bob"],
  grade: "Grade 6",
  rubric: "Presentation Rubric",
  rubricText: "Organization: 0-20...",  // Custom rubric if provided
  topic: "Climate Change",
  duration: 245.5,
  transcript: "Named transcript with student names...",
  segments: [...],  // Full segments array from diarization
  detectedSpeakers: ["Speaker 1", "Speaker 2"],
  speakerMappings: {
    "Speaker 1": "Alice",
    "Speaker 2": "Bob"
  },
  speakerStatistics: [...],
  overlapWarnings: [...],
  warnings: [...]
}

// Backend Processing
1. Validate all speakers are assigned
2. Create "named transcript" with student names
3. Calculate speaking evidence per student
4. Build GPT-4 prompt with:
   - Full transcript (with names)
   - Rubric criteria (0-20 points each)
   - Student participation evidence
   - Custom rubric if provided
   - Safety instructions (don't punish accents, don't invent evidence)
5. Call openai.chat.completions.create()
6. Parse JSON response
7. Normalize scores & feedback
8. Return FinalGradingResult

Response (FinalGradingResult):
{
  presentationType: "group",
  studentNames: ["Alice", "Bob"],
  grade: "Grade 6",
  topic: "Climate Change",
  duration: 245.5,
  namedTranscript: "Alice (Speaker 1) [0:00-2:15]: Climate change...",
  segments: [
    {
      ...segment,
      assignedStudent: "Alice" | null,
      displayName: "Alice" | "Unidentified or non-student voice"
    }
  ],
  groupAssessment: {
    overallScore: 78,
    organization: {
      score: 16,
      feedback: "Clear introduction with logical flow...",
      evidence: ["Climate change is the greatest challenge..."]
    },
    content: { score: 15, feedback: "...", evidence: [...] },
    clarity: { score: 16, feedback: "...", evidence: [...] },
    vocabulary: { score: 16, feedback: "...", evidence: [...] },
    fluency: { score: 15, feedback: "...", evidence: [...] },
    collaboration: { score: 14, feedback: "...", evidence: [...] },
    strengths: ["Strong opening", "Well-researched content"],
    improvements: ["Add more specific examples"],
    teacherSummary: "...",
    studentSummary: "..."
  },
  individualAssessments: [
    {
      studentName: "Alice",
      speakerLabels: ["Speaker 1"],
      speakingSeconds: 120.3,
      speakingPercentage: 49.1,
      wordCount: 342,
      participationStatus: "sufficient",
      score: 76,
      organization: { score: 15, feedback: "...", evidence: [...] },
      content: { score: 15, feedback: "...", evidence: [...] },
      clarity: { score: 16, feedback: "...", evidence: [...] },
      vocabulary: { score: 16, feedback: "...", evidence: [...] },
      fluency: { score: 14, feedback: "...", evidence: [...] },
      strengths: ["Clear articulation", "Strong arguments"],
      improvements: ["Speak more slowly"],
      feedback: "...",
      teacherNote: "..."
    },
    {
      studentName: "Bob",
      speakerLabels: ["Speaker 2"],
      score: 80,
      ...
    }
  ]
}
```

#### Phase 6: Results Display ✅
```typescript
// Component: FinalAssessmentReport
// Shows:
1. Group scores & feedback (if group presentation)
2. Individual scores & feedback for each student
3. Participation statistics
4. Evidence quotes from transcript
5. Teacher override score (optional)
6. Teacher review notes

// Teacher can:
- Override overall score
- Add notes
- Mark as "finalized"
- ❌ CANNOT SAVE (no save button!)
```

### ✅ Components Working
- Audio recording (MediaRecorder API)
- File upload (HTML file input)
- Speaker diarization (Whisper API integration)
- Speaker-to-student mapping (dropdown UI)
- Results display (comprehensive reporting)
- Error display (error messages shown)
- Rubric handling (custom rubric support)

### ❌ Components Missing
- **Results persistence** - No save endpoint
- **Error recovery** - If grading fails, data lost
- **Interim save** - No "save draft" functionality
- **Results export** - No PDF/CSV download
- **Audit trail** - No logging of who graded what when

---

## 4. GRADE PRESENTATION ENDPOINT

### File: [app/api/grade-presentation/route.ts](app/api/grade-presentation/route.ts)

### Runtime Settings
```typescript
export const runtime = "nodejs";
export const maxDuration = 300;  // 5 minutes max
```

### Requires
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Must have OPENAI_API_KEY set
if (!process.env.OPENAI_API_KEY) {
  return NextResponse.json(
    { error: "OPENAI_API_KEY is missing from .env.local." },
    { status: 500 }
  );
}
```

### Request Routing

#### 1. Diarization Request (multipart/form-data)
```typescript
if (contentType.includes("multipart/form-data")) {
  return await handleDiarization(request);
}
```

**Implementation**: `handleDiarization()`
1. Extract FormData fields
2. Validate audio file (not empty, < 25MB)
3. Validate student names (non-empty, appropriate for type)
4. Call `openai.audio.transcriptions.create()` with Whisper
5. Parse Whisper response (verbose JSON format with segments)
6. Normalize segments & create speaker labels
7. Calculate speaker statistics & warnings
8. Return DiarizationResult

**Error Handling**:
```typescript
try {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "verbose_json",
  });
  // Process segments...
} catch (error) {
  console.error("[GradePresentation] Diarization processing error:", error);
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}
```

**Validation Errors** (400):
- "No audio recording was received."
- "The audio recording is empty."
- "The recording is larger than 25 MB..."
- "No student names were provided."
- "An individual presentation must contain exactly one student."
- "A group presentation must contain at least two students."
- "The presentation topic is required."

**Processing Errors** (422):
- "No usable speech segments were detected..."

#### 2. Grading Request (application/json)
```typescript
if (contentType.includes("application/json")) {
  return await handleGrading(request);
}
```

**Implementation**: `handleGrading()`
1. Parse JSON request body
2. Validate all required fields
3. Create "named segments" (with student names instead of speaker labels)
4. Build "named transcript" (student name prefix for each segment)
5. Calculate speaking evidence per student
6. Build GPT-4 prompt with:
   - Presentation metadata (type, grade, topic)
   - Teacher-confirmed speaker mappings
   - Individual participation evidence
   - Full named transcript (first 100,000 chars)
   - Custom rubric text (if provided)
   - Assessment principles (safety instructions)
   - Expected JSON structure (schema)
7. Call `openai.chat.completions.create()` with gpt-4-mini
8. Parse and normalize JSON response
9. Match AI individual assessments to student evidence
10. Return FinalGradingResult

**GPT-4 Prompt Structure**:
```
CONTEXT:
- Presentation type, grade, students, duration
- Speaker-to-student mappings (teacher confirmed)
- Participation evidence per student
- Custom rubric details

INSTRUCTIONS:
- Don't punish accents or language differences
- Don't invent evidence
- Use short transcript excerpts as evidence
- Students with minimal evidence get no individual score
- Return only valid JSON, no markdown

RESPONSE SCHEMA:
{
  "groupAssessment": {
    "overallScore": 0-100,
    "organization": { score, feedback, evidence[] },
    "content": { score, feedback, evidence[] },
    "clarity": { score, feedback, evidence[] },
    "vocabulary": { score, feedback, evidence[] },
    "fluency": { score, feedback, evidence[] },
    "collaboration": { score, feedback, evidence[] },
    "strengths": [],
    "improvements": [],
    "teacherSummary": "",
    "studentSummary": ""
  },
  "individualAssessments": [
    {
      "studentName": "",
      "score": 0-100 | null,
      "organization": {...},
      ...
    }
  ]
}
```

**Error Handling**:
```typescript
try {
  const response = await openai.chat.completions.create({
    model: "gpt-4-mini",
    messages: [{ role: "user", content: gradingPrompt }],
    temperature: 0.7,
  });
  // Parse and return...
} catch (error) {
  console.error("[GradePresentation] Grade analysis error:", error);
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}
```

### ✅ Status
- **Whisper Integration**: ✅ Fully working
- **Speaker Diarization**: ✅ Fully working  
- **GPT-4 Integration**: ✅ Fully working
- **Error Handling**: ✅ Comprehensive
- **Logging**: ✅ Detailed console logs

### ⚠️ Limitations
- **No caching**: Same audio processed twice = two API calls
- **No rate limiting**: Single user could max out quota
- **No persistence**: Results returned but not saved
- **No audit trail**: No record of grading history
- **Timeout risk**: 5-minute max could be exceeded with large batches

---

## 5. SPEAKER RECOGNITION SERVICE

### Location: [services/speaker-recognition/](services/speaker-recognition/)

### Architecture
```
FastAPI (Python) ↔ PostgreSQL + pgvector
                 ↕ (vectorized embeddings)
         ECAPA-TDNN Model
```

### Dependencies
```
PyTorch 2.11.0 (CPU)
SpeechBrain 1.1.0 (speaker embedding model)
FastAPI 0.95.2
SQLAlchemy 2.0.22
psycopg2 (PostgreSQL adapter)
pgvector 0.5.0 (vector similarity)
```

### Database Schema

**Table: student_voice_profile**
```sql
id              VARCHAR (PK) - UUID
student_id      VARCHAR (NOT NULL) - linked to classroom student
name            VARCHAR (NOT NULL) - display name
class_id        VARCHAR (NULLABLE) - classroom course ID
embedding       pgvector (dimension 192) - voice fingerprint
created_at      TIMESTAMP - auto-generated
```

### API Endpoints

#### 1. POST /enroll
**Purpose**: Create voice profile for a student

```python
Input:
  - audio: File (WAV, MP3, WebM, etc.)
  - student_id: str (e.g., "student-123")
  - name: str (e.g., "Alice Johnson")
  - class_id: str (optional, e.g., "classroom-456")

Output:
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "student-123",
    "success": true
  }

Error (500):
  {
    "detail": "Error message from embeddings extraction"
  }
```

**Process**:
1. Extract audio file from request
2. Load pre-trained ECAPA-TDNN model
3. Convert audio to mel-spectrogram
4. Extract 192-dimensional embedding vector
5. Store in PostgreSQL with pgvector
6. Return profile ID and student_id

#### 2. POST /identify
**Purpose**: Identify speaker from audio file

```python
Input:
  - audio: File
  - top_k: int (default 5, max results to return)

Output:
  {
    "matches": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "student_id": "student-123",
        "name": "Alice Johnson",
        "class_id": "classroom-456",
        "distance": 0.45  // lower = better match (0 = perfect, 1 = completely different)
      },
      {
        "id": "...",
        "student_id": "...",
        "name": "...",
        "distance": 0.62
      }
    ]
  }
```

**Process**:
1. Extract audio file
2. Generate embedding vector
3. Use pgvector cosine similarity (`<#>` operator)
4. Return top K matches sorted by distance (closest first)
5. Optionally filter by class_id

#### 3. GET /profiles
**Purpose**: List all enrolled speaker profiles

```python
Input:
  - limit: int (default 100)

Output:
  [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "student_id": "student-123",
      "name": "Alice Johnson"
    },
    {
      "id": "...",
      "student_id": "...",
      "name": "..."
    }
  ]
```

#### 4. GET /health
**Purpose**: Health check for monitoring

```
Output: { "status": "ok" }
```

### Next.js Proxy

**File**: [app/api/speaker/[...path]/route.ts](app/api/speaker/[...path]/route.ts)

```typescript
// Routes all requests to FastAPI service
// /api/speaker/* → $SPEAKER_SERVICE_URL/*

function getTargetUrl(req: NextRequest): string {
  const path = req.nextUrl.pathname.replace(/^\/api\/speaker/, "");
  const url = new URL(path, SPEAKER_SERVICE_URL);
  url.search = req.nextUrl.search;
  return url.toString();
}

async function proxy(req: NextRequest) {
  const targetUrl = getTargetUrl(req);
  const requestInit: RequestInit = {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" 
      ? await req.arrayBuffer() 
      : undefined,
  };
  const response = await fetch(targetUrl, requestInit);
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
```

### Requires
```
Environment Variables:
- SPEAKER_SERVICE_URL (e.g., http://localhost:8000 or Render URL)
- SR_DATABASE_URL (PostgreSQL connection string)
```

### ✅ Status
- **Service Implementation**: ✅ Complete and tested
- **Model Loading**: ✅ ECAPA-TDNN ready
- **Database**: ✅ PostgreSQL + pgvector configured
- **API Proxy**: ✅ Working
- **Python Tests**: ✅ Passing

### ❌ Missing Integration
- **NOT called during diarization** - Could pre-fill speaker mappings
- **NOT used for speaker identification** - Currently manual only
- **NO speaker confidence scoring** - Can't know if match is reliable
- **NO enrollment UI in main app** - No way for teachers to enroll students
- **Separate database** - Not linked to main app database

### Usage in Presentation Grader
```typescript
// Currently in [app/presentation-grader/page.tsx]
async function enrollSpeaker(speaker: string) {
  const form = new FormData();
  form.append("audio", new File([audioBlob], `enroll-${Date.now()}.webm`));
  form.append("student_id", studentId || name);
  form.append("name", name);
  
  const res = await fetch(`/api/speaker/enroll`, { 
    method: "POST", 
    body: form 
  });
  
  if (!res.ok) throw new Error("Enroll failed");
  alert(`Enrolled: ${data.student_id}`);
}

// NOT USED: identify endpoint could be called here to pre-fill mappings
```

---

## 6. DATABASE & SCHEMA

### Main Next.js App: ❌ NO DATABASE

**Missing:**
- ORM (Prisma, TypeORM, Sequelize, etc.)
- Database schema (migrations)
- Connection pooling
- Query layer

**What's Currently Stored:**
- Session data (NextAuth JWT in cookie)
- Classroom data (localStorage)
- Assessment templates (localStorage & file system)
- Rubric settings (file system: `data/saved_rubrics.json`)

**What Gets Lost:**
- Grading results (all assessment work)
- Student feedback
- Teacher notes
- Audit trail
- Revision history

### Speaker Recognition Service: ✅ PostgreSQL + pgvector

**Database Setup**:
```python
# [services/speaker-recognition/app/db.py]
DATABASE_URL = os.environ.get(
    "SR_DATABASE_URL", 
    "postgresql://postgres:postgres@db:5432/speaker_recognition"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    from . import models
    models.Base.metadata.create_all(bind=engine)
```

**Table**:
```sql
student_voice_profile (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  class_id VARCHAR,
  embedding pgvector(192) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
)

-- Automatically indexes pgvector for fast cosine similarity
```

### Recommended Schema for Main App

```sql
-- Teachers
teachers (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  google_id VARCHAR,
  created_at TIMESTAMP DEFAULT now()
)

-- Cached classroom courses
courses (
  id VARCHAR PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  google_classroom_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  section VARCHAR,
  room VARCHAR,
  cached_at TIMESTAMP DEFAULT now()
)

-- Cached classroom students
classroom_students (
  id VARCHAR PRIMARY KEY,
  course_id VARCHAR REFERENCES courses(id),
  google_student_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  email VARCHAR,
  cached_at TIMESTAMP DEFAULT now()
)

-- Assessment templates (created by teacher)
assessment_templates (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  title VARCHAR NOT NULL,
  activity_type VARCHAR,
  grade VARCHAR,
  duration VARCHAR,
  skill_focus VARCHAR,
  rubric VARCHAR,
  presenter_type VARCHAR,
  created_at TIMESTAMP DEFAULT now()
)

-- Grading results (the critical missing piece)
grading_results (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  course_id VARCHAR REFERENCES courses(id),
  template_id INTEGER REFERENCES assessment_templates(id),
  presentation_type VARCHAR,
  student_names TEXT[],
  grade VARCHAR,
  topic VARCHAR,
  duration FLOAT,
  
  -- Raw AI output
  group_assessment JSONB,
  individual_assessments JSONB[],
  
  -- Full transcript & segments
  transcript TEXT,
  named_transcript TEXT,
  segments JSONB,
  speaker_mappings JSONB,
  
  -- Teacher overrides
  teacher_final_score FLOAT,
  teacher_notes TEXT,
  is_finalized BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)

-- Audit trail
audit_log (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES teachers(id),
  result_id INTEGER REFERENCES grading_results(id),
  action VARCHAR,  -- "created", "updated", "finalized", "exported"
  details JSONB,
  timestamp TIMESTAMP DEFAULT now()
)
```

---

## 7. CRITICAL MISSING PIECES

### 🔴 BLOCKING: No Results Storage

**Current Situation**:
- User grades presentation → Gets results on screen
- Closes browser or navigates away → All results lost forever
- No way to retrieve or recall the grading

**Required Implementation**:

```typescript
// POST /api/results - Save grading results
export async function POST(request: Request) {
  const session = await getServerSession();
  const body = await request.json();
  
  // Save to database:
  // - teacher_id, course_id, all grading results
  // - timestamp, audit trail entry
  
  return Response.json({ id: resultId });
}

// GET /api/results - List results for teacher
export async function GET(request: Request) {
  const session = await getServerSession();
  const courseId = url.searchParams.get("courseId");
  
  // Query database for results filtered by teacher & optionally course
  // Return paginated list with metadata
  
  return Response.json({ results: [...], total, page });
}

// GET /api/results/{id} - Retrieve specific result
export async function GET(request: Request) {
  const id = params.id;
  const session = await getServerSession();
  
  // Load full result from database
  // Verify teacher owns it
  
  return Response.json(result);
}
```

### 🔴 BLOCKING: No Database Connection

**Current Situation**:
- Main app has zero database persistence
- Classroom data stored in localStorage
- Rubrics stored in filesystem
- Results not stored anywhere

**Required Implementation**:

1. Choose ORM: Prisma (recommended) or TypeORM
2. Set up PostgreSQL or Supabase
3. Create schema (see above)
4. Create migration system
5. Add environment variables:
   ```
   DATABASE_URL=postgresql://...
   ```

### 🟡 HIGH: Speaker Integration Not Wired

**Current Situation**:
- Speaker service fully functional and deployed
- Never called during grading workflow
- Every presentation requires manual speaker confirmation
- Teachers can't pre-enroll student voices

**Required Implementation**:

```typescript
// During diarization phase, after detecting speakers:
async function identifySpeakers(audioBlob: Blob, courseId?: string) {
  const formData = new FormData();
  formData.append("audio", new File([audioBlob], "audio.wav"));
  formData.append("top_k", "5");
  
  const response = await fetch("/api/speaker/identify", {
    method: "POST",
    body: formData
  });
  
  const { matches } = await response.json();
  
  // matches[0] has highest confidence
  // Pre-fill speaker mappings if confidence > threshold
  
  return matches;
}

// In SpeakerConfirmationSection:
// Show top 3 candidate students for each speaker
// Let teacher confirm or override
```

### 🟡 HIGH: Error Recovery Missing

**Current Situation**:
- If grading fails halfway through, all work is lost
- No draft saving
- No resume capability
- No error logging

**Required Implementation**:

```typescript
// Auto-save draft results after each phase
function autoDraft(phase: string, data: any) {
  localStorage.setItem(`draft_${phase}`, JSON.stringify(data));
}

// On error, show recovery UI
if (status === "error") {
  return (
    <ErrorRecovery 
      draftPhase={lastSuccessfulPhase}
      onResume={() => resumeFromDraft()}
    />
  );
}
```

### 🟡 HIGH: No Rate Limiting

**Current Situation**:
- Any user can call API endpoints unlimited times
- Could accidentally trigger 1000s of API calls to OpenAI
- No protection against quota exhaustion

**Required Implementation**:

```typescript
// Middleware for rate limiting
import { rateLimit } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, {
    requests: 10,           // 10 requests
    window: "1h",          // per hour
    key: session.user.email // per user
  });
  
  if (limited.isLimited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }
}
```

### 🟡 HIGH: No Audit Trail

**Current Situation**:
- No record of who graded what presentation when
- Can't dispute assessment scores
- No accountability
- FERPA compliance risk

**Required Implementation**:

```typescript
// Log all significant actions
function auditLog(
  action: string,
  teacher: string,
  resultId: string,
  details: any
) {
  db.auditLog.create({
    teacher_id,
    result_id: resultId,
    action,
    details,
    timestamp: new Date()
  });
}

// Track: created, updated, finalized, exported, deleted
```

---

## 8. MISSING ENDPOINTS DETAIL

### Not Implemented (Will Return 501)

| Endpoint | Purpose | Currently |
|----------|---------|-----------|
| `/api/speech/transcribe` | Standalone transcription | ❌ Returns 501 |
| `/api/speech/analyze` | Speech analysis | ❌ Returns 501 |
| `/api/ai/grading` | Unused grading endpoint | ❌ Returns 501 |
| `/api/ai/reports` | Report generation | ❌ Returns 501 |
| `/api/ai/feedback` | Feedback generation | ❌ Returns 501 |
| `/api/results` | **CRITICAL** - Results storage | ❌ **MISSING** |
| `/api/students` | Directory empty | ❌ **EMPTY** |

### Actually Used

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/auth/[...nextauth]` | ✅ Working | Google OAuth |
| `/api/classroom/courses` | ✅ Working | List courses |
| `/api/classroom/students` | ✅ Working | List students in course |
| `/api/grade-presentation` | ✅ Working | Both diarize & grade |
| `/api/speaker/enroll` | ✅ Working | Enroll voice profile |
| `/api/speaker/identify` | ✅ Working | Identify speaker |
| `/api/speaker/profiles` | ✅ Working | List profiles |
| `/api/ai/rubric` | ✅ Working | List Google Drive rubrics |
| `/api/ai/rubric/save` | ⚠️ File-based | Save rubric (not production-ready) |

---

## 9. ENVIRONMENT VARIABLES REQUIRED

### Required for Core Functionality

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...  # Random 32+ char string

# NextAuth (for OAuth callback)
NEXTAUTH_URL=http://localhost:3000  # or production domain

# Speaker Service (if deployed separately)
SPEAKER_SERVICE_URL=http://localhost:8000  # or Render URL
SR_DATABASE_URL=postgresql://...
```

### Not Currently Used (But Required for Production)

```bash
# Database (needed after implementing results storage)
DATABASE_URL=postgresql://...

# Monitoring & Analytics
SENTRY_DSN=...
POSTHOG_API_KEY=...

# Email (for notifications)
SMTP_SERVER=...
SMTP_USER=...
SMTP_PASS=...
```

---

## 10. RECOMMENDATIONS BY PRIORITY

### 🔴 Phase 1: CRITICAL (Blocks Production)

**1.1 Implement Results Storage**
- Create `/api/results/` POST, GET, GET/{id}
- Add database schema for `grading_results` table
- Save all grading output to database
- **Effort**: 4-6 hours
- **Impact**: HIGH (enables result retrieval)

**1.2 Set Up Main Database**
- Choose: Prisma + PostgreSQL (recommended)
- Create migration system
- Deploy to production (Supabase or Render)
- **Effort**: 2-3 hours
- **Impact**: HIGH (enables all persistence)

**1.3 Create Audit Trail**
- Add audit_log table
- Log all grading actions
- Create compliance report endpoint
- **Effort**: 2-3 hours
- **Impact**: MEDIUM (FERPA compliance)

### 🟡 Phase 2: HIGH (Required for Beta)

**2.1 Wire Speaker Integration**
- Call `/api/speaker/identify` during diarization
- Pre-fill speaker mappings with confidence scores
- Add threshold toggle (high confidence vs manual)
- **Effort**: 3-4 hours
- **Impact**: HIGH (improves UX)

**2.2 Build Results History Page**
- Create `/results` page showing past assessments
- Add filtering by course, date, student
- Add search functionality
- **Effort**: 3-4 hours
- **Impact**: HIGH (enables workflow)

**2.3 Add Error Recovery**
- Implement draft auto-save
- Add resume-from-draft UI
- Add error logging
- **Effort**: 2-3 hours
- **Impact**: MEDIUM (improves reliability)

**2.4 Implement Rate Limiting**
- Add per-user request throttling
- Add quota tracking
- Add warning before limit hit
- **Effort**: 2-3 hours
- **Impact**: MEDIUM (prevents accidents)

### 🟢 Phase 3: NICE-TO-HAVE (Post-MVP)

**3.1 Results Export**
- PDF generation (Puppeteer or similar)
- CSV export for bulk analysis
- Email delivery option
- **Effort**: 4-5 hours
- **Impact**: LOW (nice feature)

**3.2 Results Sharing**
- Generate shareable links
- Student feedback view
- Parent/guardian access
- **Effort**: 3-4 hours
- **Impact**: LOW (nice feature)

**3.3 Analytics Dashboard**
- Teacher performance metrics
- Student progress tracking
- Rubric effectiveness analysis
- **Effort**: 6-8 hours
- **Impact**: LOW (business intelligence)

**3.4 Batch Grading**
- Upload multiple audio files
- Grade all at once
- Bulk export results
- **Effort**: 4-5 hours
- **Impact**: LOW (convenience)

---

## 11. IMPLEMENTATION ROADMAP

```
Week 1: Database & Results Storage (Phase 1.1-1.2)
  ├─ Day 1-2: Set up Prisma + PostgreSQL
  ├─ Day 3: Create schema & migrations
  ├─ Day 4-5: Implement /api/results endpoints
  └─ Day 5: Test end-to-end with UI

Week 2: Audit Trail & Speaker Integration (Phase 1.3 + 2.1)
  ├─ Day 1: Add audit_log table & logging
  ├─ Day 2-3: Wire speaker service identify()
  ├─ Day 4: Add confidence scoring to UI
  └─ Day 5: Test speaker pre-filling

Week 3: Results History & Error Recovery (Phase 2.2-2.3)
  ├─ Day 1-2: Build /results page UI
  ├─ Day 3: Add search & filtering
  ├─ Day 4: Implement draft auto-save
  └─ Day 5: Add error recovery UI

Week 4: Rate Limiting & Polish (Phase 2.4)
  ├─ Day 1-2: Implement rate limiter middleware
  ├─ Day 3: Add quota warning UI
  ├─ Day 4-5: Testing & optimization
  └─ Day 5: Documentation & deployment

Total: ~4 weeks for production-ready MVP
```

---

## 12. CONCLUSION

### What's Working ✅
- Classroom API integration (endpoints functional)
- Audio recording and upload
- Speaker diarization (Whisper)
- Speaker embedding & identification service
- AI grading (GPT-4)
- Results display

### What's Missing ❌
- **Results persistence** (CRITICAL)
- **Database connection** (CRITICAL)
- **Audit trail** (HIGH)
- **Speaker integration** (HIGH)
- **History retrieval** (HIGH)
- **Error recovery** (MEDIUM)
- **Rate limiting** (MEDIUM)

### Go-to-Market Readiness: 3/10 → Could be 7/10 with Phase 1-2 completion

The codebase has a strong technical foundation. Completing Phases 1-2 (4-6 weeks) would result in a production-ready MVP capable of:
- Saving all grading results
- Retrieving past assessments
- Maintaining audit trail
- Pre-filling speaker mappings
- Recovering from errors

This would be sufficient for a beta launch with 50-100 teachers and ~1000 students.

