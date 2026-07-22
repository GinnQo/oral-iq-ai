"use client";

import { useMemo } from "react";
import { useClassroom } from "@/components/ClassroomProvider";

export default function ClassesPage() {
  const {
    courses,
    students,
    selectedCourse,
    importStatus,
    errorMessage,
    loadCourses,
    loadCourseStudents,
    clearImportedStudents,
  } = useClassroom();

  const importedStudentCount = useMemo(
    () => students.length,
    [students.length]
  );

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="bg-white rounded-2xl p-8 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">
                Google Classroom
              </h1>

              <p className="mt-2 text-gray-600">
                Load your active Classroom courses and import student rosters into OralIQ AI.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCourses}
              disabled={importStatus === "loading"}
              className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importStatus === "loading" ? "Loading courses..." : "Load Classroom Courses"}
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-900">Available Courses</h2>

              {courses.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No courses loaded. Click the button above to fetch your active Google Classroom courses.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{course.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {course.section || course.room
                              ? `${course.section ?? ""}${course.section && course.room ? " • " : ""}${course.room ?? ""}`
                              : "No section or room provided"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => loadCourseStudents(course)}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                        >
                          Import Students
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Imported Students</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedCourse
                      ? `Selected course: ${selectedCourse.name}`
                      : "No course selected."}
                  </p>
                </div>

                {selectedCourse ? (
                  <button
                    type="button"
                    onClick={clearImportedStudents}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear Imported Students
                  </button>
                ) : null}
              </div>

              {students.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Import a course to use Classroom student names in the presentation grader.
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-3">#</th>
                        <th className="py-3">Name</th>
                        <th className="py-3">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student.id} className="border-b border-slate-100">
                          <td className="py-3">{index + 1}</td>
                          <td className="py-3">{student.name}</td>
                          <td className="py-3">{student.email ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
