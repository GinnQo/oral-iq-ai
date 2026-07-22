"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Assessment = {
  id: string;
  title: string;
  activityType: string | null;
  grade: string | null;
  duration: string | null;
  skillFocus: string | null;
  rubric: string | null;
  presenterType: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function AssessmentsPage() {
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] =
    useState("Academic Debate");
  const [grade, setGrade] =
    useState("Grade 8");
  const [duration, setDuration] =
    useState("5 Minutes");
  const [skillFocus, setSkillFocus] =
    useState("Argument & Evidence");
  const [rubric, setRubric] =
    useState("Debate Rubric");
  const [presenterType, setPresenterType] =
    useState("Individual Student");
  const [generated, setGenerated] =
    useState(false);
  const [saved, setSaved] =
    useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load assessments on mount
  useEffect(() => {
    async function loadAssessments() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/assessments");
        
        if (!response.ok) {
          if (response.status === 401) {
            setError("Not signed in. Please sign in first.");
          } else {
            setError("Failed to load assessments");
          }
          setSaved([]);
          return;
        }

        const assessments = await response.json();
        setSaved(assessments);
      } catch (err) {
        console.error("[LoadAssessments]", err);
        setError("Failed to load assessments");
        setSaved([]);
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, []);

  async function saveAssessment() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled Assessment",
          activityType,
          grade,
          duration,
          skillFocus,
          rubric,
          presenterType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to save assessment");
        return;
      }

      const created = await response.json();
      setSaved([created, ...saved]);
      
      // Reset form
      setTitle("");
      setActivityType("Academic Debate");
      setGrade("Grade 8");
      setDuration("5 Minutes");
      setSkillFocus("Argument & Evidence");
      setRubric("Debate Rubric");
      setPresenterType("Individual Student");
      setGenerated(false);
    } catch (err) {
      console.error("[SaveAssessment]", err);
      setError("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  }

  async function removeAssessment(id: string) {
    try {
      setDeleting(id);
      setError(null);

      const response = await fetch(`/api/assessments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("You cannot delete this assessment");
        } else if (response.status === 404) {
          setError("Assessment not found");
        } else {
          setError("Failed to delete assessment");
        }
        return;
      }

      setSaved(saved.filter((a) => a.id !== id));
    } catch (err) {
      console.error("[DeleteAssessment]", err);
      setError("Failed to delete assessment");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="space-y-8">
      <section className="rounded-2xl bg-white p-8 shadow">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">
              Assessment Studio
            </h1>

            <p className="mt-2 text-gray-600">
              Create and save AI speaking
              assessments.
            </p>
          </div>

          <Link
            href="/presentation-grader"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white transition hover:bg-indigo-800"
          >
            🎤 AI Presentation Grader
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">
                Live Assessment Tool
              </p>

              <h2 className="mt-2 text-2xl font-bold text-indigo-950">
                AI Presentation Grader
              </h2>

              <p className="mt-2 max-w-3xl leading-7 text-indigo-900">
                Record an individual or group
                presentation, separate detected
                speakers, confirm student names, and
                generate group and individual
                feedback.
              </p>
            </div>

            <Link
              href="/presentation-grader"
              className="shrink-0 rounded-xl bg-indigo-700 px-6 py-3 text-center font-bold text-white transition hover:bg-indigo-800"
            >
              Open Grader
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border p-3"
            placeholder="Assessment Title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
          />

          <select
            className="rounded-lg border p-3"
            value={activityType}
            onChange={(event) =>
              setActivityType(
                event.target.value
              )
            }
          >
            <option>Academic Debate</option>
            <option>
              Persuasive Speech
            </option>
            <option>Storytelling</option>
            <option>Interview</option>
            <option>Discussion</option>
          </select>

          <select
            className="rounded-lg border p-3"
            value={grade}
            onChange={(event) =>
              setGrade(event.target.value)
            }
          >
            <option>Grade 6</option>
            <option>Grade 7</option>
            <option>Grade 8</option>
            <option>Grade 9</option>
          </select>

          <select
            className="rounded-lg border p-3"
            value={duration}
            onChange={(event) =>
              setDuration(
                event.target.value
              )
            }
          >
            <option>1 Minute</option>
            <option>3 Minutes</option>
            <option>5 Minutes</option>
            <option>10 Minutes</option>
          </select>

          <select
            className="rounded-lg border p-3"
            value={rubric}
            onChange={(event) =>
              setRubric(event.target.value)
            }
          >
            <option>Debate Rubric</option>
            <option>
              Presentation Rubric
            </option>
            <option>
              Public Speaking Rubric
            </option>
            <option>
              Oral Reading Rubric
            </option>
            <option>
              Group Presentation Rubric
            </option>
          </select>

          <select
            className="rounded-lg border p-3"
            value={presenterType}
            onChange={(event) =>
              setPresenterType(
                event.target.value
              )
            }
          >
            <option>
              Individual Student
            </option>
            <option>
              Group Presentation
            </option>
          </select>

          <select
            className="rounded-lg border p-3 md:col-span-2"
            value={skillFocus}
            onChange={(event) =>
              setSkillFocus(
                event.target.value
              )
            }
          >
            <option>
              Argument & Evidence
            </option>
            <option>
              Critical Thinking
            </option>
            <option>
              Narrative Speaking
            </option>
            <option>
              Informative Speaking
            </option>
            <option>
              Voice, Eye Contact & Confidence
            </option>
          </select>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setGenerated(true)
            }
            className="rounded-lg bg-blue-900 px-5 py-3 text-white transition hover:bg-blue-800"
          >
            🤖 Generate
          </button>

          <button
            type="button"
            onClick={saveAssessment}
            disabled={saving}
            className="rounded-lg bg-green-700 px-5 py-3 text-white transition hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "💾 Saving..." : "💾 Save Assessment"}
          </button>
        </div>

        {generated && (
          <div className="mt-8 rounded-xl bg-blue-50 p-6">
            <h2 className="mb-3 text-2xl font-bold">
              AI Preview
            </h2>

            <div className="space-y-1">
              <p>
                <strong>Title:</strong>{" "}
                {title.trim() ||
                  "Untitled Assessment"}
              </p>

              <p>
                <strong>Type:</strong>{" "}
                {activityType}
              </p>

              <p>
                <strong>Grade:</strong>{" "}
                {grade}
              </p>

              <p>
                <strong>Duration:</strong>{" "}
                {duration}
              </p>

              <p>
                <strong>Rubric:</strong>{" "}
                {rubric}
              </p>

              <p>
                <strong>Presenter:</strong>{" "}
                {presenterType}
              </p>

              <p>
                <strong>Skill:</strong>{" "}
                {skillFocus}
              </p>
            </div>

            <div className="mt-4">
              <strong>Prompt</strong>

              <p className="mt-1 leading-7">
                Create a well-structured{" "}
                {activityType.toLowerCase()} for
                a{" "}
                {presenterType.toLowerCase()}{" "}
                using the{" "}
                {rubric.toLowerCase()}. The
                main speaking skill focus is{" "}
                {skillFocus.toLowerCase()}.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-8 shadow">
        <h2 className="mb-4 text-2xl font-bold">
          Saved Assessments
        </h2>

        {loading && (
          <p className="text-gray-600">Loading assessments...</p>
        )}

        {!loading && error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && saved.length === 0 && (
          <p className="text-gray-600">
            No assessments yet.
          </p>
        )}

        {!loading && !error && saved.length > 0 && (
          <div className="space-y-3">
            {saved.map((assessment) => (
              <div
                key={assessment.id}
                className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <div className="font-semibold">
                    {assessment.title}
                  </div>

                  <div className="text-sm text-gray-600">
                    {assessment.grade} •{" "}
                    {assessment.activityType} •{" "}
                    {assessment.duration}
                  </div>

                  <div className="text-sm text-gray-500">
                    {assessment.presenterType} •{" "}
                    {assessment.rubric}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeAssessment(
                      assessment.id
                    )
                  }
                  disabled={deleting === assessment.id}
                  className="self-start font-medium text-red-600 hover:text-red-800 sm:self-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting === assessment.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}