# Milestone 2A: Database Foundation — COMPLETE ✅

**Status**: Schema created, validated, ready for migration  
**Date**: July 14, 2026  
**Time**: ~30 minutes

---

## What Was Done

### 1. Prisma Schema (prisma/schema.prisma)
Created minimal, focused schema with two models:

**User**
- `id`: cuid primary key
- `email`: unique login identifier
- `name`, `image`: optional profile fields
- `googleAccountId`: optional, unique (maps to NextAuth)
- `role`: enum (TEACHER | ADMIN), defaults to TEACHER
- `createdAt`, `updatedAt`: timestamps

**Assessment**
- `id`: cuid primary key
- `userId`: foreign key to User
- `title`, `activityType`, `grade`, `duration`, `skillFocus`, `rubric`, `presenterType`: metadata
- `status`: enum (DRAFT | ACTIVE | ARCHIVED), defaults to DRAFT
- `createdAt`, `updatedAt`: timestamps
- Indexes: userId, createdAt, status

**Design Decisions**
- `User` table for generic user identity (not Teacher-specific)
- `Assessment` for simple assessment metadata (not full results)
- Deferred: AssessmentResult, AssessmentTemplate, StudentVoiceProfile
- Relationship: User (1) → Assessment (many) with Restrict delete
- Same PostgreSQL database as speaker-recognition service
- Separate schemas: Prisma manages users/assessments, SQLAlchemy manages speaker profiles

### 2. Prisma Client (lib/prisma.ts)
Maintained singleton pattern for development:
- Production: single PrismaClient instance
- Development: global singleton to prevent connection pool exhaustion on hot reload
- Fully typed, server-side only

### 3. Environment Configuration
Added to `.env.local`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/speaker_recognition
```

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `prisma/schema.prisma` | Replaced with minimal User + Assessment schema | ✅ |
| `.env.local` | Added DATABASE_URL | ✅ |
| `lib/prisma.ts` | Unchanged (already correct) | ✓ |

---

## Schema Validation

✅ **Prisma schema is valid**
```
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```

---

## Next Step: Run Migration

When PostgreSQL is available, execute:

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/speaker_recognition' \
npx prisma migrate dev --name init
```

This will:
1. Create `users` table
2. Create `assessments` table
3. Generate migration file in `prisma/migrations/`
4. Generate Prisma client types

---

## Architecture Verification

✅ Prisma schema defined  
✅ Client singleton pattern implemented  
✅ DATABASE_URL configured  
✅ No breaking changes to existing code  
✅ Speaker service tables untouched  
✅ Models match specification (User + Assessment only)  

---

## What's Deferred to Later Phases

- AssessmentResult (Phase 2B - grading results)
- AssessmentTemplate (Phase 2C - rubric templates)
- StudentVoiceProfile (remains SQLAlchemy only)
- School, Classroom, Student models
- Subscription/Billing tables

---

## TypeScript Integration

Once migration runs:
- `npx prisma generate` will create types in `@prisma/client`
- Use `import prisma from "@/lib/prisma"` in API routes
- Full type safety for User and Assessment

Example API route:
```typescript
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return Response.json({}, { status: 401 });
  
  const assessments = await prisma.assessment.findMany({
    where: { user: { email: session.user.email } }
  });
  
  return Response.json(assessments);
}
```

---

## Database URL Reference

**Development (local)**
```
postgresql://postgres:postgres@localhost:5432/speaker_recognition
```

**Production (Render.com example)**
```
postgresql://[user]:[password]@[host]:5432/speaker_recognition
```

**Production (Supabase example)**
```
postgresql://[user].[project]:[password]@[host]:5432/postgres
```

---

**Milestone 2A Status**: ✅ COMPLETE (Database schema created and validated)  
**Ready for**: Milestone 2B (Results persistence with AssessmentResult model)
