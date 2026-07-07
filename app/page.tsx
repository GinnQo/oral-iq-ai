export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="bg-white rounded-2xl shadow p-6 mb-8">
          <h1 className="text-4xl font-bold text-blue-900">
            OralIQ AI
          </h1>

          <p className="text-gray-600 mt-2 text-lg">
            AI-Powered Speaking & Communication Assessment Platform
          </p>
        </header>


        {/* Navigation */}
        <nav className="bg-white rounded-xl shadow p-4 mb-8 flex gap-6 text-blue-800 font-semibold">

  <a href="/">
    Dashboard
  </a>

  <a href="/students">
    Students
  </a>

  <a href="/assessments">
    Assessments
  </a>

  <a href="/reports">
    Reports
  </a>

  <a href="/feedback">
    AI Feedback
  </a>

</nav>


        {/* Welcome */}
        <section className="bg-blue-900 text-white rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold">
            Welcome back, Teacher! 👋
          </h2>

          <p className="mt-3 text-lg">
            Your AI Communication Assessment Center
          </p>
        </section>


        {/* Dashboard Cards */}
        <section className="grid md:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-2xl font-bold">
              🎤 Speaking Assessments
            </h3>

            <p className="text-gray-600 mt-3">
              24 Completed Assessments
            </p>
          </div>


          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-2xl font-bold">
              👩‍🎓 Student Profiles
            </h3>

            <p className="text-gray-600 mt-3">
              86 Active Learners
            </p>
          </div>


          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-2xl font-bold">
              📊 Progress Reports
            </h3>

            <p className="text-gray-600 mt-3">
              Track communication growth
            </p>
          </div>


          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-2xl font-bold">
              🤖 AI Feedback
            </h3>

            <p className="text-gray-600 mt-3">
              243 Feedback Reports Generated
            </p>
          </div>

        </section>


        {/* Recent Assessments */}
        <section className="bg-white rounded-2xl shadow p-6 mt-8">

          <h2 className="text-2xl font-bold mb-4">
            Recent Assessments
          </h2>


          <table className="w-full text-left">

            <thead>
              <tr className="border-b">
                <th className="p-3">Student</th>
                <th className="p-3">Speaking Score</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>


            <tbody>

              <tr className="border-b">
                <td className="p-3">Maria</td>
                <td className="p-3">92%</td>
                <td className="p-3">Complete</td>
              </tr>


              <tr className="border-b">
                <td className="p-3">David</td>
                <td className="p-3">78%</td>
                <td className="p-3">Review</td>
              </tr>


              <tr>
                <td className="p-3">Ana</td>
                <td className="p-3">88%</td>
                <td className="p-3">Complete</td>
              </tr>

            </tbody>

          </table>

        </section>


        <footer className="text-center text-gray-500 mt-10">
          OralIQ AI | Powered by Grammar Galaxy
        </footer>

      </div>
    </main>
  );
}