# ORALIQ AI - COMPREHENSIVE ARCHITECTURAL AUDIT

**Generated:** July 14, 2026

---

## 1. PROJECT OVERVIEW

| Component | Details |
|-----------|---------|
| **Framework** | Next.js 16.2.10 (App Router) |
| **React Version** | 19.2.4 |
| **TypeScript** | Yes (strict mode enabled, ES2017 target) |
| **Styling** | Tailwind CSS v4 with @tailwindcss/postcss |
| **Authentication** | NextAuth v4.24.14 with Google OAuth |
| **Database** | PostgreSQL with pgvector (vector embeddings) |
| **ORM** | SQLAlchemy (for speaker service only) |
| **AI Services** | OpenAI API (GPT for grading/feedback) |
| **External APIs** | Google Classroom API, Google Drive API |
| **Backend Language** | Python 3.11 (FastAPI) |
| **Backend Framework** | FastAPI 0.95.2 + Uvicorn |
| **ML Model** | ECAPA-TDNN (SpeechBrain) for speaker embeddings |
| **Containerization** | Docker + Docker Compose |

### Folder Architecture

```
/app                          → Next.js app directory
  /api                        → API routes
    /ai                       → AI endpoints (feedback, grading, reports, rubric)
    /auth                     → NextAuth configuration
    /classroom                → Google Classroom integration
    /speech                   → Speech processing (transcribe, analyze)
    /speaker                  → Speaker recognition proxy
    /students                 → Student management
    /grade-presentation       → Presentation grading orchestrator
  /assessments               → Assessment Studio
  /classes                   → Classroom Management
  /students                  → Student Profiles
  /feedback                  → AI Feedback Page
  /reports                   → Reports Page
  /library                   → Library Page (placeholder)
  /settings                  → Settings Page (placeholder)
  /presentation-grader       → Live Presentation Grader
  
/components                   → React Components (Auth, Classroom, UI)
/services/speaker-recognition → FastAPI backend
  /app
    /main.py                 → FastAPI endpoints
    /embeddings.py           → ECAPA-TDNN model
    /models.py               → SQLAlchemy models
    /db.py                   → Database config
    /schemas.py              → (Placeholder)
  /pretrained_models         → Speech model weights
  /tests                     → pytest tests
  
/public                       → Static assets
```

---

## 2. CURRENT FEATURES

| Feature | Status | Notes |
|---------|--------|-------|
| **Login** | ✓ Complete | Google OAuth fully configured |
| **Google OAuth** | ✓ Complete | With Classroom, Roster, Drive scopes |
| **Dashboard** | ✓ Complete | With feature cards and user profile |
| **Assessment Builder** | ✓ Partial | Form UI complete, localStorage persistence only |
| **Google Classroom Integration** | ✓ Partial | Can load courses, student roster import UI built |
| **Student Management** | ✓ Partial | UI page exists, no backend persistence |
| **Presentation Grader** | ✓ Partial | Complex UI with speaker diarization logic, calls not wired |
| **AI Feedback** | ⚠ Needs Work | Page exists, endpoint returns 501 Not Implemented |
| **AI Grading** | ⚠ Needs Work | Has OpenAI integration in `/api/grade-presentation`, but disconnected from UI |
| **Reports** | ⚠ Needs Work | Page exists, data is mocked |
| **Speaker Recognition** | ✓ Partial | FastAPI service built with ECAPA-TDNN, not connected to frontend |
| **Audio Transcription** | ❌ Missing | Endpoint returns 501 |
| **Speech Analysis** | ❌ Missing | Endpoint returns 501 |
| **Rubric Management** | ✓ Partial | Can save/load rubrics via filesystem, Google Docs export works |
| **Library** | ⚠ Placeholder | "Coming soon" message |
| **Settings** | ⚠ Placeholder | Empty page |
| **Data Persistence** | ⚠ Limited | Using localStorage only (no backend DB) |
| **Deployment Automation** | ✓ Complete | CI/CD pipeline (GitHub Actions) configured |
| **Docker Support** | ✓ Complete | docker-compose.yml with postgres + fastapi |

---

## 3. DATABASE

### Current Models (Speaker Recognition Service)

```python
StudentVoiceProfile
  ├── id (UUID)
  ├── student_id (String)
  ├── name (String)
  ├── class_id (String, nullable)
  ├── embedding (Vector[192]) - pgvector
  └── created_at (DateTime)
```

### Missing Models (No Prisma Schema Found)

- `User` - Teachers/Admins
- `School` - Organization level
- `Classroom` - Google Classroom sync
- `Student` - Student profiles
- `Assessment` - Assessment definitions
- `AssessmentResult` - Grading results
- `Speech` - Recording metadata
- `Rubric` - Assessment rubrics
- `Report` - Generated reports
- `Subscription` - SaaS billing (if applicable)
- `Grade` - Individual grades
- `Feedback` - AI-generated feedback

### Why Missing

- **No ORM integration** - The frontend uses localStorage; backend uses SQLAlchemy but only for speaker recognition
- **No unified data model** - Assessments, students, classroom data stored in browser memory
- **No persistence layer** - Teachers would lose data on logout

---

## 4. API ROUTES

### Next.js API Routes

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | ✓ Working | Google OAuth handler |
| `/api/classroom/courses` | GET | ✓ Working | Fetch user's Google Classroom courses |
| `/api/classroom/students` | GET | ✓ Working | Fetch roster for a course |
| `/api/ai/feedback` | GET | ❌ 501 | Generate AI feedback (not implemented) |
| `/api/ai/grading` | GET | ❌ 501 | Grade assessments (not implemented) |
| `/api/ai/reports` | GET | ❌ 501 | Generate reports (not implemented) |
| `/api/ai/rubric` | GET | ✓ Partial | Fetch saved rubrics from filesystem |
| `/api/ai/rubric/save` | POST | ✓ Partial | Save rubric to filesystem |
| `/api/speech/transcribe` | POST | ❌ 501 | Transcribe audio (not implemented) |
| `/api/speech/analyze` | POST | ❌ 501 | Analyze speech (not implemented) |
| `/api/speaker/[...path]` | GET/POST | ✓ Partial | Proxy to FastAPI `/enroll`, `/identify`, `/profiles` |
| `/api/grade-presentation` | POST | ✓ Partial | Uses OpenAI to grade presentation (real implementation exists) |

### FastAPI Backend Routes

- `POST /enroll` - Enroll student voice profile
- `POST /identify` - Identify speaker from audio
- `GET /profiles` - List all profiles
- `GET /health` - Health check

---

## 5. GOOGLE INTEGRATION

| Component | Status | Notes |
|-----------|--------|-------|
| **OAuth Setup** | ✓ Working | Configured with scopes for Classroom, Roster, Drive |
| **Token Persistence** | ✓ Working | Stored in NextAuth session |
| **Course Fetching** | ✓ Working | Can load active courses |
| **Student Roster** | ✓ Working | Can fetch student list per course |
| **Google Drive** | ✓ Partial | Can export Docs as text; no full Drive integration |
| **Environment Config** | ⚠ Needs Setup | `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` required |
| **Frontend Integration** | ✓ Working | ClassroomProvider context with localStorage fallback |

---

## 6. SPEAKER RECOGNITION

### Current Implementation

- **Model**: ECAPA-TDNN (SpeechBrain pretrained)
- **Embeddings**: 192-dimensional vectors, L2-normalized
- **Database**: PostgreSQL with pgvector
- **API**: FastAPI with `/enroll`, `/identify`, `/profiles`
- **Docker**: Ready (docker-compose.yml includes postgres + fastapi)

### Status

- ✓ Model weights downloaded and available
- ✓ Inference code functional
- ✓ Database schema defined
- ✓ API endpoints built
- ⚠ **Not connected to frontend** - Proxy exists but no UI calls to `/enroll` or `/identify`
- ✓ Can run locally with `docker-compose up`

### What's Missing

- Integration with presentation grader UI
- Audio upload handling in frontend
- Speaker enrollment workflow
- Speaker identification during grading

---

## 7. AI FEATURES

### OpenAI Integration

#### Implemented

- `/api/grade-presentation` - Full implementation exists:
  - Accepts audio file, presentation metadata
  - Uses OpenAI Whisper for transcription
  - Uses GPT to generate group & individual feedback
  - Supports speaker diarization confirmation
  - Returns structured JSON with scores, feedback, evidence

#### Not Implemented

- `/api/ai/feedback` - Placeholder (501)
- `/api/ai/grading` - Placeholder (501)
- `/api/ai/reports` - Placeholder (501)
- `/api/speech/transcribe` - Placeholder (501)

### Issues

- `OPENAI_API_KEY` required but not wired to UI
- Grade presentation endpoint disconnected from presentation grader page
- UI has state management for diarization but doesn't call backend

---

## 8. UI PAGES

| Page | Purpose | Status | Missing |
|------|---------|--------|---------|
| `/` (Dashboard) | Platform overview, feature cards | ✓ Complete | Real data integration |
| `/assessments` | Create & manage assessments | ✓ Partial | Backend persistence, AI rubric generation |
| `/presentation-grader` | Live recording & grading | ✓ Partial | Audio recording, speaker identification, API calls |
| `/classes` | Google Classroom integration | ✓ Partial | Actual student import functionality |
| `/students` | Student profiles & progress | ✓ Partial | Student data persistence, analytics |
| `/feedback` | View AI feedback reports | ✓ Partial | Backend integration, real feedback data |
| `/reports` | Speaking progress reports | ✓ Partial | Backend queries, data visualization |
| `/library` | Content library | ❌ Stub | Not started ("Coming soon") |
| `/settings` | App configuration | ❌ Stub | Not started (empty page) |

---

## 9. PRODUCTION READINESS SCORECARD

| Category | Score | Comments |
|----------|-------|----------|
| **Architecture** | 5/10 | Frontend UI complete but disconnected; no unified data model; frontend-backend separation unclear |
| **Security** | 4/10 | OAuth secure but no CSRF protection; no rate limiting; file storage insecure; no audit logging |
| **Database** | 2/10 | Speaker service only; no main app database; no schema versioning; no backup strategy |
| **Authentication** | 7/10 | NextAuth/Google OAuth solid; lacks session management, permission checks, token refresh |
| **Scalability** | 3/10 | No caching; synchronous API calls; no load balancing; localStorage limits; speaker service single-instance |
| **Code Quality** | 6/10 | TypeScript strict; eslint configured; but no tests for Next.js; minimal error handling; inconsistent patterns |
| **Deployment Readiness** | 5/10 | CI/CD pipeline exists; Docker support present; but no staging environment; secrets management not clear |
| **SaaS Readiness** | 2/10 | No multi-tenancy; no billing/subscription; no usage tracking; no audit logs; no compliance framework |

**Overall Production Readiness: 4/10 — Prototype/MVP Stage**

---

## 10. PRIORITY ROADMAP

### 🔴 HIGH PRIORITY (Weeks 1-2)

#### Backend Data Layer (3-4 days)
- Create Prisma schema with User, Teacher, Classroom, Student, Assessment, Report models
- Set up PostgreSQL database (separate from speaker-recognition)
- Implement database migrations

#### Connect Frontend to Backend (2-3 days)
- Implement `/api/classroom/import` to persist imported students
- Implement `/api/assessments` CRUD endpoints
- Replace localStorage with API calls

#### Audio Recording & Processing (3-4 days)
- Implement `/api/speech/transcribe` (OpenAI Whisper)
- Implement `/api/speech/analyze` (duration, tone, pace)
- Add audio upload handler to presentation-grader UI

### 🟠 MEDIUM PRIORITY (Weeks 3-4)

#### Speaker Recognition Integration (3-4 days)
- Connect speaker service endpoints to grader UI
- Implement `/enroll` workflow in assessments
- Integrate speaker identification into grading

#### AI Grading Pipeline (2-3 days)
- Wire presentation-grader UI to `/api/grade-presentation`
- Implement `/api/ai/grading` for non-presentation assessments
- Implement `/api/ai/feedback` endpoint

#### Reports & Analytics (2-3 days)
- Query backend to populate `/reports` page
- Build progress charts and visualizations
- Implement `/api/ai/reports` endpoint

### 🟡 LOWER PRIORITY (Weeks 5+)

#### Security Hardening (2-3 days)
- Add rate limiting
- Add CSRF protection
- Encrypt sensitive data
- Implement audit logging

#### Multi-Tenancy (3-4 days)
- Add organization/school model
- Implement role-based access control (RBAC)
- Add permission checks to all endpoints

#### Settings & Configuration (1-2 days)
- Implement `/settings` page
- Add user preferences, API key management
- Add notification preferences

#### Library & Content (2-3 days)
- Build rubric library
- Add assessment templates
- Add teaching resources

#### SaaS Features (4-5 days)
- Implement subscription/billing (Stripe integration)
- Usage tracking and analytics
- Admin dashboard

---

## 11. MISSING FILES

### Critical Missing Files

| File | Purpose | Impact |
|------|---------|--------|
| `prisma/schema.prisma` | Data model definition | HIGH - No unified database |
| `lib/openai.ts` | OpenAI client wrapper | MEDIUM - Duplicated in routes |
| `lib/auth.ts` | Auth utilities | MEDIUM - Shared auth logic |
| `lib/db.ts` | Database utilities | MEDIUM - No abstraction |
| `middleware.ts` | Next.js middleware | MEDIUM - No auth guards on routes |
| `app/api/assessments/route.ts` | Assessment CRUD | HIGH - Only localStorage |
| `app/api/reports/route.ts` | Report generation | HIGH - Not implemented |
| `app/api/feedback/route.ts` | Feedback generation | HIGH - Not implemented |
| `components/AudioRecorder.tsx` | Audio recording UI | HIGH - Needed for grader |
| `components/SpeakerIdentifier.tsx` | Speaker enrollment UI | MEDIUM - Needed for enrollment |
| `services/speaker-recognition/app/schemas.py` | Pydantic schemas | LOW - Already in routes |
| `.env.local` | Environment setup | HIGH - Secrets needed |
| `jest.config.ts` | Jest configuration | MEDIUM - No frontend tests |
| `services/speaker-recognition/pytest.ini` | Pytest config | LOW - Exists |

---

## 12. FINAL RECOMMENDATION

### If This Were My SaaS Startup, I Would Build Next:

#### Phase 1: MVP (2-3 weeks) → Minimum Viable Product

1. **Stabilize the data layer** - Get a real database with Prisma
2. **Connect the dots** - Link UI to backend (assessments, students, classroom import)
3. **Implement audio flow** - Recording → Transcription → Grading
4. **Deploy a working demo** - Vercel + Render with real functionality

#### Phase 2: Core Features (3-4 weeks) → Proof of Concept

1. **Speaker recognition** - Make `/enroll` and `/identify` work end-to-end
2. **AI grading** - Wire presentation grader to OpenAI
3. **Reports** - Basic analytics for teacher dashboard
4. **Testing** - Add pytest for backend, Jest for frontend

#### Phase 3: Market Readiness (2-3 weeks) → Pre-Launch

1. **Security audit** - OWASP top 10, rate limiting, auth guards
2. **Performance** - Add caching, optimize queries, profile frontend
3. **UX polish** - Error handling, loading states, mobile responsive
4. **Documentation** - API docs, user guide, developer guide

#### Phase 4: Go-to-Market (1-2 weeks)

1. **Multi-tenancy** - Support multiple schools/organizations
2. **Billing** - Stripe integration for recurring payments
3. **Admin panel** - School management, usage analytics
4. **Email/notifications** - Send reports, alerts, digests

### Key Decisions

#### What to Fix First

1. **Database** - Currently no persistent backend data storage
2. **Integration** - UI and backend are disconnected
3. **Audio** - No recording or processing in frontend

#### What's Actually Working Well

- Google OAuth/Classroom integration
- Speaker recognition model (ECAPA-TDNN)
- Presentation grader UI logic
- Assessment creation form
- Deployment pipeline

#### What to Sunset/Replace

- localStorage usage → Replace with API/database
- File-based rubric storage → Move to PostgreSQL
- Disconnected endpoints → Wire UI to backend

#### Go/No-Go Decision

- ✅ **GO** - The architecture is sound, most pieces are there
- ✅ **GO** - Speaker recognition model is production-ready
- ⚠️ **PROCEED CAUTIOUSLY** - Data layer is missing; quick 1-week sprint to add Prisma/database would unblock everything else

---

## APPENDIX: ENVIRONMENT VARIABLES REQUIRED

```
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-vercel-domain.vercel.app

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Speaker Recognition Service
SR_DATABASE_URL=postgresql://postgres:postgres@your-db-host:5432/speaker_recognition
SPEAKER_SERVICE_URL=http://localhost:8000 (for local) or https://your-render-service.onrender.com (for production)
```

---

**END OF AUDIT**

*This document was generated on July 14, 2026 as a comprehensive review of the OralIQ AI platform architecture, feature completeness, and production readiness.*
