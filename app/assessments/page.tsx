export default function AssessmentsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <header className="bg-white rounded-2xl shadow p-6 mb-8">

          <h1 className="text-4xl font-bold text-blue-900">
            Speaking Assessments
          </h1>

          <p className="text-gray-600 mt-2 text-lg">
            Create and manage AI-powered speaking evaluations.
          </p>

        </header>


        <section className="bg-white rounded-2xl shadow p-8">

          <h2 className="text-2xl font-bold mb-6">
            Create Speaking Assessment
          </h2>


          <div className="space-y-5">


            <div>
              <label className="font-semibold">
                Assessment Title
              </label>

              <input
                className="w-full border rounded-lg p-3 mt-2"
                placeholder="Example: My Favorite Book"
              />

            </div>



            <div>
              <label className="font-semibold">
                Grade Level
              </label>

             <select className="w-full border rounded-lg p-3 mt-2">

  <option>Grade 6</option>
  <option>Grade 7</option>
  <option>Grade 8</option>
  <option>Grade 9</option>

</select>

            </div>



            <div>
              <label className="font-semibold">
                Speaking Time
              </label>

             <select className="w-full border rounded-lg p-3 mt-2">

  <option>1 Minute</option>
  <option>2 Minutes</option>
  <option>3 Minutes</option>
  <option>4 Minutes</option>
  <option>5 Minutes</option>
  <option>6 Minutes</option>
  <option>7 Minutes</option>
  <option>8 Minutes</option>
  <option>9 Minutes</option>
  <option>10 Minutes</option>

</select>

            </div>



            <div>

              <h3 className="font-semibold mb-3">
                Skills Evaluated
              </h3>


              <div className="space-y-2">

                <label>
                  <input type="checkbox" /> Fluency
                </label>

                <br />

                <label>
                  <input type="checkbox" /> Grammar
                </label>

                <br />

                <label>
                  <input type="checkbox" /> Vocabulary
                </label>

                <br />

                <label>
                  <input type="checkbox" /> Pronunciation
                </label>

              </div>

            </div>



            <button className="bg-blue-900 text-white px-6 py-3 rounded-lg">

              Create Speaking Assessment

            </button>


          </div>

        </section>

      </div>
    </main>
  );
}