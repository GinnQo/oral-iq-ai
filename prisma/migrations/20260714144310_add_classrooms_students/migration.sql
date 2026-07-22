-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleCourseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT,
    "room" TEXT,
    "description" TEXT,
    "courseState" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleStudentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_students" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classroom_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "classrooms_userId_idx" ON "classrooms"("userId");

-- CreateIndex
CREATE INDEX "classrooms_googleCourseId_idx" ON "classrooms"("googleCourseId");

-- CreateIndex
CREATE INDEX "classrooms_active_idx" ON "classrooms"("active");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_userId_googleCourseId_key" ON "classrooms"("userId", "googleCourseId");

-- CreateIndex
CREATE INDEX "students_userId_idx" ON "students"("userId");

-- CreateIndex
CREATE INDEX "students_googleStudentId_idx" ON "students"("googleStudentId");

-- CreateIndex
CREATE INDEX "students_email_idx" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_active_idx" ON "students"("active");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_googleStudentId_key" ON "students"("userId", "googleStudentId");

-- CreateIndex
CREATE INDEX "classroom_students_classroomId_idx" ON "classroom_students"("classroomId");

-- CreateIndex
CREATE INDEX "classroom_students_studentId_idx" ON "classroom_students"("studentId");

-- CreateIndex
CREATE INDEX "classroom_students_status_idx" ON "classroom_students"("status");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_students_classroomId_studentId_key" ON "classroom_students"("classroomId", "studentId");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
