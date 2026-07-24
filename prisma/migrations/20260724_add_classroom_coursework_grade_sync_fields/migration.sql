ALTER TABLE "assessments"
ADD COLUMN "classroomCourseId" TEXT,
ADD COLUMN "classroomCourseWorkId" TEXT,
ADD COLUMN "classroomCourseWorkTitle" TEXT,
ADD COLUMN "classroomAlternateLink" TEXT,
ADD COLUMN "classroomMaxPoints" DOUBLE PRECISION,
ADD COLUMN "classroomAssociationStatus" TEXT,
ADD COLUMN "classroomLinkedAt" TIMESTAMP(3);

ALTER TABLE "assessment_results"
ADD COLUMN "classroomSubmissionId" TEXT,
ADD COLUMN "classroomUserId" TEXT,
ADD COLUMN "classroomDraftGrade" DOUBLE PRECISION,
ADD COLUMN "classroomAssignedGrade" DOUBLE PRECISION,
ADD COLUMN "classroomSyncStatus" TEXT,
ADD COLUMN "classroomSyncedAt" TIMESTAMP(3),
ADD COLUMN "classroomSyncError" TEXT;

CREATE INDEX "assessments_userId_classroomCourseId_classroomCourseWorkId_idx"
ON "assessments"("userId", "classroomCourseId", "classroomCourseWorkId");

CREATE INDEX "assessment_results_assessmentId_classroomUserId_idx"
ON "assessment_results"("assessmentId", "classroomUserId");

CREATE INDEX "assessment_results_classroomSubmissionId_idx"
ON "assessment_results"("classroomSubmissionId");

CREATE INDEX "assessment_results_classroomSyncStatus_idx"
ON "assessment_results"("classroomSyncStatus");
