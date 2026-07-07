export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-5xl mx-auto">
        
        <h1 className="text-5xl font-bold text-blue-900">
          OralIQ AI
        </h1>

        <p className="text-xl mt-3 text-gray-700">
          AI-Powered Speaking & Communication Assessment Platform
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-10">

          <div className="bg-white p-6 rounded-xl shadow">
            🎤
            <h2 className="text-2xl font-bold">
              Speaking Assessments
            </h2>
            <p>
              Create and evaluate student speaking activities.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            👩‍🎓
            <h2 className="text-2xl font-bold">
              Student Profiles
            </h2>
            <p>
              Track student progress and improvement.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            📊
            <h2 className="text-2xl font-bold">
              Reports
            </h2>
            <p>
              View assessment results and analytics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            🤖
            <h2 className="text-2xl font-bold">
              AI Feedback
            </h2>
            <p>
              Generate communication feedback.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}