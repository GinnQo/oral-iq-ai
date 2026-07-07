export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <header className="bg-white rounded-2xl shadow p-6 mb-8">

          <h1 className="text-4xl font-bold text-blue-900">
            Speaking Reports
          </h1>

          <p className="text-gray-600 mt-2 text-lg">
            Analyze student communication growth and AI feedback.
          </p>

        </header>


        <section className="bg-white rounded-2xl shadow p-8 mb-8">

          <h2 className="text-2xl font-bold mb-6">
            Student Performance Report
          </h2>


          <div className="grid md:grid-cols-2 gap-6">


            <div className="bg-blue-50 rounded-xl p-6">

              <h3 className="text-xl font-bold">
                Maria
              </h3>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                92%
              </p>

              <p>
                Overall Speaking Score
              </p>

            </div>


            <div className="bg-blue-50 rounded-xl p-6">

              <h3 className="text-xl font-bold">
                Assessment
              </h3>

              <p className="mt-3">
                Academic Debate
              </p>

              <p>
                Grade 8
              </p>

            </div>


          </div>

        </section>



        <section className="bg-white rounded-2xl shadow p-8">

          <h2 className="text-2xl font-bold mb-6">
            Skill Analysis
          </h2>


          <div className="space-y-4">


            <div>
              <p className="font-semibold">
                Fluency
              </p>

              <div className="bg-gray-200 rounded-full h-4">

                <div className="bg-blue-900 h-4 rounded-full w-[95%]">
                </div>

              </div>

              <p>95%</p>

            </div>



            <div>
              <p className="font-semibold">
                Grammar Accuracy
              </p>

              <div className="bg-gray-200 rounded-full h-4">

                <div className="bg-blue-900 h-4 rounded-full w-[90%]">
                </div>

              </div>

              <p>90%</p>

            </div>



            <div>
              <p className="font-semibold">
                Vocabulary
              </p>

              <div className="bg-gray-200 rounded-full h-4">

                <div className="bg-blue-900 h-4 rounded-full w-[93%]">
                </div>

              </div>

              <p>93%</p>

            </div>



            <div>
              <p className="font-semibold">
                Pronunciation
              </p>

              <div className="bg-gray-200 rounded-full h-4">

                <div className="bg-blue-900 h-4 rounded-full w-[91%]">
                </div>

              </div>

              <p>91%</p>

            </div>


          </div>


        </section>



        <section className="bg-white rounded-2xl shadow p-8 mt-8">


          <h2 className="text-2xl font-bold mb-4">
            🤖 AI Feedback
          </h2>


          <p className="text-gray-700 text-lg">

            Maria speaks confidently and demonstrates strong vocabulary.
            Continue practicing complex sentence structures and expanding
            academic language.

          </p>


        </section>


      </div>
    </main>
  );
}