export default function StudentsPage() {
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
                <th className="p-3">Grade</th>
                <th className="p-3">Level</th>
                <th className="p-3">Progress</th>
              </tr>
            </thead>


            <tbody>

              <tr className="border-b">
                <td className="p-3">Maria</td>
                <td className="p-3">8</td>
                <td className="p-3">Advanced</td>
                <td className="p-3">92%</td>
              </tr>


              <tr className="border-b">
                <td className="p-3">David</td>
                <td className="p-3">7</td>
                <td className="p-3">Developing</td>
                <td className="p-3">78%</td>
              </tr>


              <tr>
                <td className="p-3">Ana</td>
                <td className="p-3">9</td>
                <td className="p-3">Advanced</td>
                <td className="p-3">88%</td>
              </tr>


            </tbody>

          </table>

        </section>

      </div>
    </main>
  );
}