"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useClassroom } from "@/components/ClassroomProvider";

type CourseWorkItem = {
  id: string;
  title: string;
  description: string | null;
  alternateLink: string | null;
  maxPoints: number | null;
  state: string;
  creationTime: string | null;
  updateTime: string | null;
};

type LinkedAssessment = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  classroomCourseId: string | null;
  classroomCourseName?: string | null;
  classroomCourseWorkId: string | null;
  classroomCourseWorkTitle: string | null;
  classroomMaxPoints: number | null;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default function ClassroomAssignmentsPage() {
  const { courses, loadCourses, importStatus, errorMessage: classroomError } =
    useClassroom();

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignments, setAssignments] = useState<CourseWorkItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingLinkedAssessments, setLoadingLinkedAssessments] =
    useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [linkedAssessments, setLinkedAssessments] = useState<LinkedAssessment[]>(
    []
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  async function loadLinkedAssessments() {
    try {
      setLoadingLinkedAssessments(true);
      setErrorMessage(null);

      const response = await fetch("/api/assessments", {
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Unable to load linked assessments."
        );
      }

      const data = (await response.json()) as LinkedAssessment[];
      const linked = Array.isArray(data)
        ? data.filter(
            (assessment) =>
              Boolean(assessment.classroomCourseId) &&
              Boolean(assessment.classroomCourseWorkId)
          )
        : [];

      setLinkedAssessments(linked);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load linked assessments."
      );
      setLinkedAssessments([]);
    } finally {
      setLoadingLinkedAssessments(false);
    }
  }

  async function loadCourseWork(courseId: string) {
    if (!courseId) {
      setAssignments([]);
      setSelectedAssignmentId("");
      return;
    }

    try {
      setLoadingAssignments(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(
        `/api/classroom/coursework?courseId=${encodeURIComponent(courseId)}`,
        {
          cache: "no-store",
        }
      );

      const data = (await response.json()) as {
        assignments?: CourseWorkItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load Classroom assignments.");
      }

      const normalizedAssignments = Array.isArray(data.assignments)
        ? data.assignments
        : [];

      setAssignments(normalizedAssignments);
      setSelectedAssignmentId("");

      if (normalizedAssignments.length === 0) {
        setSuccessMessage("No active Classroom assignments were found for this course.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Classroom assignments."
      );
      setAssignments([]);
      setSelectedAssignmentId("");
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function createLinkedAssessment() {
    if (!selectedCourse || !selectedAssignment) {
      setErrorMessage("Select both a course and assignment.");
      return;
    }

    try {
      setCreating(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: selectedAssignment.title,
          classroomCourseId: selectedCourse.id,
          classroomCourseWorkId: selectedAssignment.id,
          classroomCourseWorkTitle: selectedAssignment.title,
          classroomAlternateLink: selectedAssignment.alternateLink,
          classroomMaxPoints: selectedAssignment.maxPoints,
          classroomAssociationStatus: "LINKED",
          activityType: "Classroom Assignment",
          presenterType: "Individual Student",
        }),
      });

      const data = (await response.json()) as LinkedAssessment | { error?: string };

      if (!response.ok) {
        const payload = data as { error?: string };
        throw new Error(payload.error || "Unable to create linked assessment.");
      }

      if (response.status === 200) {
        setSuccessMessage("This Classroom assignment is already linked. Existing assessment returned.");
      } else {
        setSuccessMessage("Linked OralIQ assessment created successfully.");
      }

      await loadLinkedAssessments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create linked assessment."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteAssessment(id: string) {
    try {
      setDeletingId(id);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/assessments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Unable to delete assessment."
        );
      }

      setSuccessMessage("Assessment deleted.");
      await loadLinkedAssessments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete assessment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void loadCourses();
    void Promise.resolve().then(async () => {
      await loadLinkedAssessments();
    });
  }, [loadCourses]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-blue-900">Classroom Assignment Links</h1>
          <p className="mt-2 text-sm text-slate-600">
            Select a Classroom course and assignment, then create a linked OralIQ assessment.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Choose Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(event) => {
                  const nextCourseId = event.target.value;
                  setSelectedCourseId(nextCourseId);
                  void loadCourseWork(nextCourseId);
                }}
                disabled={importStatus === "loading"}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select a Classroom course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                    {course.section ? ` - ${course.section}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadCourses()}
                disabled={importStatus === "loading"}
                className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800 disabled:opacity-50"
              >
                {importStatus === "loading" ? "Loading..." : "Refresh Courses"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Choose Assignment
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(event) => setSelectedAssignmentId(event.target.value)}
              disabled={!selectedCourseId || loadingAssignments || assignments.length === 0}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">Select a Classroom assignment</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                  {typeof assignment.maxPoints === "number"
                    ? ` (${assignment.maxPoints} pts)`
                    : ""}
                </option>
              ))}
            </select>

            {selectedAssignment ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  <strong>Title:</strong> {selectedAssignment.title}
                </p>
                <p className="mt-1">
                  <strong>Max Points:</strong>{" "}
                  {typeof selectedAssignment.maxPoints === "number"
                    ? selectedAssignment.maxPoints
                    : "-"}
                </p>
                <p className="mt-1">
                  <strong>State:</strong> {selectedAssignment.state}
                </p>
                <p className="mt-1">
                  <strong>Created:</strong> {formatDate(selectedAssignment.creationTime)}
                </p>
                <p className="mt-1">
                  <strong>Updated:</strong> {formatDate(selectedAssignment.updateTime)}
                </p>
                {selectedAssignment.alternateLink ? (
                  <p className="mt-1">
                    <a
                      href={selectedAssignment.alternateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-700 hover:underline"
                    >
                      Open in Classroom
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => void createLinkedAssessment()}
              disabled={!selectedCourse || !selectedAssignment || creating}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create OralIQ Assessment"}
            </button>
          </div>

          {classroomError ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {classroomError}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {successMessage}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-blue-900">Linked Assessments</h2>
              <p className="mt-2 text-sm text-slate-600">
                Existing OralIQ assessments linked to Google Classroom assignments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadLinkedAssessments()}
              disabled={loadingLinkedAssessments}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingLinkedAssessments ? "Loading..." : "Refresh Linked Assessments"}
            </button>
          </div>

          {loadingLinkedAssessments ? (
            <p className="mt-6 text-sm text-slate-600">Loading linked assessments...</p>
          ) : linkedAssessments.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">No linked assessments yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 pr-3">Assessment Name</th>
                    <th className="py-3 pr-3">Google Classroom Course</th>
                    <th className="py-3 pr-3">Google Assignment</th>
                    <th className="py-3 pr-3">Max Points</th>
                    <th className="py-3 pr-3">Created</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedAssessments.map((assessment) => (
                    <tr key={assessment.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-medium">{assessment.title}</td>
                      <td className="py-3 pr-3">
                        {assessment.classroomCourseName || assessment.classroomCourseId || "-"}
                      </td>
                      <td className="py-3 pr-3">{assessment.classroomCourseWorkTitle || "-"}</td>
                      <td className="py-3 pr-3">
                        {typeof assessment.classroomMaxPoints === "number"
                          ? assessment.classroomMaxPoints
                          : "-"}
                      </td>
                      <td className="py-3 pr-3">{formatDate(assessment.createdAt)}</td>
                      <td className="py-3 pr-3">{assessment.status}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href="/assessments"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => void deleteAssessment(assessment.id)}
                            disabled={deletingId === assessment.id}
                            className="rounded-lg border border-red-300 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === assessment.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
