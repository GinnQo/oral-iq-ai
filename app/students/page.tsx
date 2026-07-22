import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    where: {
      active: true,
    },
    include: {
      enrollments: {
        include: {
          classroom: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-2xl shadow p-6 mb-8">
          <h1 className="text-4xl font-bold text-blue-900">
            Student Profiles
          </h1>

          <p className="text-gray-600 mt-2 text-lg">
            Manage students and track speaking development.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              All Students
            </h2>

            <button className="bg-blue-900 text-white px-5 py-2 rounded-lg">
              + Add Student
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-3">Student</th>
                <th className="p-3">Email</th>
                <th className="p-3">Classroom</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => {
                const classroomNames = student.enrollments
                  .map((enrollment) => enrollment.classroom.name)
                  .join(", ");

                return (
                  <tr key={student.id} className="border-b">
                    <td className="p-3 font-medium">
                      {student.name}
                    </td>

                    <td className="p-3">
                      {student.email || "No email"}
                    </td>

                    <td className="p-3">
                      {classroomNames || "Not assigned"}
                    </td>

                    <td className="p-3 text-green-600 font-semibold">
                      Active
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}