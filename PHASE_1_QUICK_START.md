# Quick Start: Production Workflow Testing

**Estimated Time**: 10-15 minutes  
**Difficulty**: Intermediate (requires PostgreSQL setup)

---

## 1. Prerequisites ✅

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 13+ installed OR Docker installed
- [ ] Google OAuth credentials set up (already done in `.env.local`)
- [ ] OpenAI API key in `.env.local`

---

## 2. Set Up PostgreSQL (Choose One)

### Option A: Docker (Easiest, 2 minutes)

```bash
# Start PostgreSQL container
docker run --name oraliq-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=oraliq_main \
  -p 5432:5432 \
  -d postgres:16

# Verify it's running
docker ps
```

### Option B: Homebrew (Mac, 3 minutes)

```bash
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb -U postgres oraliq_main
```

### Option C: Manual Install (All platforms)

Download from: https://www.postgresql.org/download/

Then create database:
```bash
createdb -U postgres -h localhost oraliq_main
```

---

## 3. Configure Environment

Add to `.env.local`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oraliq_main"
```

Already has:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY`

---

## 4. Set Up Database Schema

```bash
# Install dependencies
npm install

# Create schema and run migrations
npx prisma migrate dev --name init

# Opens Prisma Studio (GUI) at http://localhost:5555
# Just close it (Ctrl+C) or leave it open
```

Output should show:
```
✓ Your database has been created at postgresql://...
✓ Prisma schema has been created at prisma/schema.prisma
✓ Migrations created at prisma/migrations/...
```

---

## 5. Start Development Server

```bash
npm run dev
```

Should see:
```
> ready - started server on http://localhost:3000
```

---

## 6. Complete the Workflow (10 minutes)

1. **Open** http://localhost:3000
2. **Sign in** with Google
3. **Go to** /presentation-grader
4. **Upload audio** (30+ seconds of speech)
5. **Wait for diarization** (20-30 seconds)
6. **Confirm speakers**
7. **Wait for grading** (30-60 seconds)
8. **Click "💾 Save Results"** ⭐ (NEW)
9. **Verify success message** appears

---

## 7. Verify Results Saved (Advanced)

### Option A: Check Browser Console
```javascript
// F12 → Console → Run:
fetch('/api/results').then(r => r.json()).then(console.log)

// Should show array with at least 1 result
```

### Option B: Use Prisma Studio
```bash
npx prisma studio
```

- Opens GUI at http://localhost:5555
- Go to "assessment_results" table
- Should see your saved grading

### Option C: Use psql
```bash
psql -U postgres -d oraliq_main

# In psql prompt:
SELECT id, "presentationType", "studentNames", "createdAt" 
FROM "assessment_results" 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

---

## 8. Troubleshooting

### "Error: connect ECONNREFUSED 127.0.0.1:5432"
PostgreSQL not running:
```bash
# Docker:
docker start oraliq-postgres

# Homebrew (Mac):
brew services start postgresql@16

# Or manually installed: restart PostgreSQL service
```

### "Prisma schema not found"
```bash
# Already created, but verify:
ls prisma/schema.prisma

# If missing, reinstall:
npm install
```

### "Relation 'teachers' does not exist"
Schema not created:
```bash
npx prisma migrate dev --name init
```

### "Save Results button does nothing"
1. Open browser console (F12)
2. Click "Save Results" again
3. Look for error messages
4. Check server terminal for logs
5. Verify `DATABASE_URL` is set

---

## 9. Next Steps

- [ ] Follow full testing checklist in [PHASE_1_IMPLEMENTATION_REPORT.md](PHASE_1_IMPLEMENTATION_REPORT.md)
- [ ] Test 3-5 different presentations
- [ ] Verify results persist after page reload
- [ ] Check results in Prisma Studio

---

## Files You Need to Know

- `.env.local` - Environment variables
- `prisma/schema.prisma` - Database schema
- `lib/prisma.ts` - Database client
- `app/presentation-grader/page.tsx` - UI with Save button
- `app/api/results/route.ts` - Save/list API
- `app/api/results/[id]/route.ts` - Get/delete API

---

## Quick Commands

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev --name init

# Start dev server
npm run dev

# Check TypeScript
npx tsc --noEmit

# Build production
npm run build

# Open database GUI
npx prisma studio

# Reset database (WARNING: deletes data!)
npx prisma migrate reset
```

---

**Status**: ✅ Ready for testing  
**Questions?** Check PHASE_1_IMPLEMENTATION_REPORT.md for detailed docs
