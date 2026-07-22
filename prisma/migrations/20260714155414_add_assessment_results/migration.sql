-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "presentationType" TEXT NOT NULL,
    "title" TEXT,
    "grade" TEXT,
    "rubric" TEXT,
    "topic" TEXT,
    "transcript" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "teacherFinalScore" DOUBLE PRECISION,
    "teacherReviewNote" TEXT,
    "studentNames" JSONB NOT NULL,
    "segments" JSONB NOT NULL,
    "detectedSpeakers" JSONB NOT NULL,
    "speakerMappings" JSONB NOT NULL,
    "speakerStatistics" JSONB NOT NULL,
    "overlapWarnings" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "groupAssessment" JSONB NOT NULL,
    "individualResults" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_results_userId_idx" ON "assessment_results"("userId");

-- CreateIndex
CREATE INDEX "assessment_results_assessmentId_idx" ON "assessment_results"("assessmentId");

-- CreateIndex
CREATE INDEX "assessment_results_createdAt_idx" ON "assessment_results"("createdAt");

-- CreateIndex
CREATE INDEX "assessment_results_teacherFinalScore_idx" ON "assessment_results"("teacherFinalScore");

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
