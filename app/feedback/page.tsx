export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">


        <header className="bg-white rounded-2xl shadow p-6 mb-8">

          <h1 className="text-4xl font-bold text-blue-900">
            AI Speaking Feedback
          </h1>

          <p className="text-gray-600 mt-2 text-lg">
            Generate communication feedback using AI analysis.
          </p>

        </header>



        <section className="bg-white rounded-2xl shadow p-8 mb-8">

          <h2 className="text-2xl font-bold mb-6">
            Student Speech Analysis
          </h2>


          <div className="grid md:grid-cols-2 gap-6">


            <div className="border rounded-xl p-6">

              <h3 className="text-xl font-bold">
                Student
              </h3>

              <p className="mt-3">
                Maria Rodriguez
              </p>


            </div>


            <div className="border rounded-xl p-6">

              <h3 className="text-xl font-bold">
                Assessment
              </h3>

              <p className="mt-3">
                Academic Debate
              </p>


            </div>


          </div>

        </section>




        <section className="bg-white rounded-2xl shadow p-8">

          <h2 className="text-2xl font-bold mb-6">
            AI Evaluation Results
          </h2>



          <div className="space-y-5">


            <div>
              <h3 className="font-bold">
                🎤 Fluency
              </h3>

              <p>
                Excellent pacing and confident delivery.
              </p>

              <strong>
                Score: 94%
              </strong>

            </div>



            <div>
              <h3 className="font-bold">
                📝 Grammar Accuracy
              </h3>

              <p>
                Strong sentence structure with minor errors.
              </p>

              <strong>
                Score: 89%
              </strong>

            </div>



            <div>
              <h3 className="font-bold">
                📚 Vocabulary
              </h3>

              <p>
                Uses effective academic vocabulary.
              </p>

              <strong>
                Score: 92%
              </strong>

            </div>



            <div>
              <h3 className="font-bold">
                🔊 Pronunciation
              </h3>

              <p>
                Clear speech with strong pronunciation.
              </p>

              <strong>
                Score: 91%
              </strong>

            </div>


          </div>

        </section>




        <section className="bg-blue-900 text-white rounded-2xl shadow p-8 mt-8">

          <h2 className="text-2xl font-bold mb-4">
            🤖 AI Teacher Recommendation
          </h2>


          <p className="text-lg">

            Maria demonstrates strong communication skills.
            Continue developing advanced vocabulary and
            supporting arguments with more detailed evidence.

          </p>


        </section>


      </div>
    </main>
  );
}