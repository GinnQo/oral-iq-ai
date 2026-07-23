"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CRITERION_LABELS,
  CRITERION_ORDER,
  type CriterionFeedback,
  type CriterionKey,
  type PracticeAttempt,
  type PracticeFeedbackErrorResponse,
  type PracticeFeedback,
  type PracticeFeedbackResponse,
  type PracticeMode,
} from "@/app/types/practice";

const randomTopics = [
  "Describe a place you would like to visit.",
  "Should students have homework every night?",
  "Explain how technology helps people learn.",
  "Describe a person who inspires you.",
  "What makes someone a good leader?",
  "Should school uniforms be required?",
  "Describe your favorite tradition.",
  "How can young people help the environment?",
  "What is one important lesson you have learned?",
  "Explain why teamwork is important.",
];

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getInitials(name?: string | null) {
  if (!name) return "S";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getAudioExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();

  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("m4a")) return "m4a";
  if (normalized.includes("mp4")) return "mp4";

  return "webm";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCriterionWithFallback(
  key: CriterionKey,
  criteria: Partial<Record<CriterionKey, CriterionFeedback>> | undefined
): CriterionFeedback {
  const value = criteria?.[key];

  if (value) {
    return value;
  }

  return {
    score: 5,
    title: CRITERION_LABELS[key],
    explanation: "No explanation was returned for this criterion.",
    evidence: [],
    recommendation: "Try another recording for a more complete report.",
  };
}

function normalizeStoredAttempt(value: unknown): PracticeAttempt | null {
  if (!isRecord(value) || !isRecord(value.feedback)) {
    return null;
  }

  if (typeof value.id !== "string" || typeof value.topic !== "string") {
    return null;
  }

  const feedback = value.feedback as Record<string, unknown>;

  if (typeof feedback.overallScore !== "number") {
    return null;
  }

  return value as PracticeAttempt;
}

function buildApiErrorMessage(
  status: number,
  payload: PracticeFeedbackErrorResponse | null
): string {
  if (!payload) {
    return `Feedback request failed (HTTP ${status}).`;
  }

  const stagePrefix = payload.stage ? `${payload.stage}: ` : "";
  const primary = payload.error || `Feedback request failed (HTTP ${status}).`;
  const details = payload.details;

  if (details?.audioType && payload.stage === "upload-validation") {
    return `${stagePrefix}${primary} (${details.audioType})`;
  }

  if (details?.code || details?.type || details?.status) {
    const info = [
      details.status ? `status ${details.status}` : "",
      details.code ? `code ${details.code}` : "",
      details.type ? `type ${details.type}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    return info ? `${stagePrefix}${primary} (${info})` : `${stagePrefix}${primary}`;
  }

  return `${stagePrefix}${primary}`;
}

export default function StudentPracticePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<PracticeMode>("individual");
  const [topic, setTopic] = useState(randomTopics[0]);
  const [practiceGoal, setPracticeGoal] = useState(
    "Speak clearly, organize your ideas, and maintain a confident pace."
  );
  const [targetSeconds, setTargetSeconds] = useState(120);
  const [groupMembersText, setGroupMembersText] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const [attempts, setAttempts] = useState<PracticeAttempt[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const storedAttempts = localStorage.getItem(
        "oraliq_student_practice_attempts"
      );

      if (!storedAttempts) {
        return [];
      }

      const parsed = JSON.parse(storedAttempts);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => normalizeStoredAttempt(item))
        .filter((item): item is PracticeAttempt => item !== null);
    } catch (error) {
      console.error("Could not load practice history:", error);
      return [];
    }
  });
  const [attemptSaved, setAttemptSaved] = useState(false);

  const studentName =
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "Student";

  const groupMembers = groupMembersText
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const canRequestFeedback =
    Boolean(audioBlob) &&
    recordedSeconds >= 2 &&
    !isRecording &&
    (mode === "individual" || groupMembers.length > 0);

  const feedbackStatusMessage = useMemo(() => {
    if (isGeneratingFeedback) {
      return "Analyzing audio, transcribing speech, and preparing feedback...";
    }

    if (!audioBlob) {
      return "Record your practice first, then request feedback.";
    }

    if (recordedSeconds < 2) {
      return "Recording is too short. Record at least 2 seconds.";
    }

    if (mode === "group" && groupMembers.length === 0) {
      return "Add at least one group member to request group feedback.";
    }

    return "Ready for AI feedback.";
  }, [audioBlob, groupMembers.length, isGeneratingFeedback, mode, recordedSeconds]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?role=student");
    }
  }, [status, router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  function chooseRandomTopic() {
    const availableTopics = randomTopics.filter((item) => item !== topic);
    const nextTopic =
      availableTopics[Math.floor(Math.random() * availableTopics.length)];

    setTopic(nextTopic || randomTopics[0]);
    resetPracticeResult();
  }

  function resetPracticeResult() {
    setFeedback(null);
    setFeedbackError("");
    setAttemptSaved(false);
  }

  function resetRecording() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
    setAudioBlob(null);
    setRecordedSeconds(0);
    setFeedback(null);
    setFeedbackError("");
    setAttemptSaved(false);
  }

  async function startRecording() {
    try {
      setFeedbackError("");
      setFeedback(null);
      setAttemptSaved(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Audio recording is not supported by this browser."
        );
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }

      setAudioBlob(null);
      setRecordedSeconds(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const supportedMimeType = preferredMimeTypes.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType)
      );

      const mediaRecorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordingType =
          mediaRecorder.mimeType || supportedMimeType || "audio/webm";

        const blob = new Blob(audioChunksRef.current, {
          type: recordingType,
        });

        const nextAudioUrl = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(nextAudioUrl);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordedSeconds((previous) => previous + 1);
      }, 1000);
    } catch (error) {
      console.error("Recording error:", error);

      setFeedbackError(
        error instanceof Error
          ? error.message
          : "The microphone could not be started."
      );
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
  }

  async function generateFeedback() {
    if (!audioBlob || audioBlob.size <= 0 || recordedSeconds < 2) {
      setFeedbackError(
        "Please complete a recording before requesting feedback."
      );
      return;
    }

    if (mode === "group" && groupMembers.length === 0) {
      setFeedbackError(
        "Please enter at least one group member before requesting group feedback."
      );
      return;
    }

    setIsGeneratingFeedback(true);
    setFeedbackError("");
    setFeedback(null);
    setAttemptSaved(false);

    try {
      const audioType = audioBlob.type || "audio/webm";
      const extension = getAudioExtension(audioType);
      const filename = `practice-${Date.now()}.${extension}`;
      const file = new File([audioBlob], filename, {
        type: audioType,
      });

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("studentName", studentName);
      formData.append("topic", topic);
      formData.append("practiceGoal", practiceGoal);
      formData.append("mode", mode);
      formData.append("groupMembers", JSON.stringify(groupMembers));
      formData.append("targetSeconds", String(targetSeconds));
      formData.append("recordedSeconds", String(recordedSeconds));

      const response = await fetch("/api/practice-feedback", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error(
          `Feedback API returned an empty response (HTTP ${response.status}).`
        );
      }

      let result: PracticeFeedbackResponse;

      try {
        result = JSON.parse(responseText) as PracticeFeedbackResponse;
      } catch {
        throw new Error(
          `Feedback API returned invalid JSON (HTTP ${response.status}). Response: ${responseText.slice(
            0,
            220
          )}`
        );
      }

      if (!response.ok) {
        const errorPayload = (result as PracticeFeedbackErrorResponse) || null;

        if (process.env.NODE_ENV !== "production" && errorPayload?.details) {
          console.warn("[PracticeFeedback] API error details", errorPayload.details);
        }

        throw new Error(buildApiErrorMessage(response.status, errorPayload));
      }

      if (!result.success) {
        const errorPayload = result as PracticeFeedbackErrorResponse;

        if (process.env.NODE_ENV !== "production" && errorPayload?.details) {
          console.warn("[PracticeFeedback] API error details", errorPayload.details);
        }

        throw new Error(buildApiErrorMessage(response.status, errorPayload));
      }

      if (!result.feedback) {
        throw new Error("Feedback response was missing feedback data.");
      }

      setFeedback(result.feedback);
    } catch (error) {
      console.error("Feedback error:", error);

      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Feedback could not be generated."
      );
    } finally {
      setIsGeneratingFeedback(false);
    }
  }

  function saveAttempt() {
    if (!feedback) {
      setFeedbackError(
        "Please generate your feedback before saving this attempt."
      );
      return;
    }

    const attempt: PracticeAttempt = {
      id: crypto.randomUUID(),
      studentName,
      topic,
      practiceGoal,
      mode,
      groupMembers: mode === "group" ? groupMembers : [],
      targetSeconds,
      recordedSeconds,
      audioType: audioBlob?.type || "audio/webm",
      createdAt: new Date().toISOString(),
      feedback,
    };

    const updatedAttempts = [attempt, ...attempts].slice(0, 20);

    setAttempts(updatedAttempts);
    localStorage.setItem(
      "oraliq_student_practice_attempts",
      JSON.stringify(updatedAttempts)
    );

    setAttemptSaved(true);
    setFeedbackError("");
  }

  function startNewPractice() {
    resetRecording();
    setTopic(randomTopics[0]);
    setPracticeGoal(
      "Speak clearly, organize your ideas, and maintain a confident pace."
    );
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white px-10 py-8 shadow-lg">
          <p className="font-semibold text-slate-700">
            Loading Student Practice...
          </p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const progressPercentage = Math.min(
    100,
    Math.round((recordedSeconds / targetSeconds) * 100)
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              OralIQ AI
            </h1>
            <p className="text-sm font-medium text-emerald-700">
              Student Practice Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {studentName}
              </p>
              <p className="text-xs text-slate-500">
                Student
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
              {getInitials(studentName)}
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <section className="rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-700 p-7 text-white shadow-lg md:p-9">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
            Welcome back
          </p>

          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Hello, {studentName}
          </h2>

          <p className="mt-3 max-w-2xl text-emerald-50">
            Choose individual or group practice, record your presentation,
            and request feedback when you finish.
          </p>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                  Practice setup
                </p>

                <h3 className="mt-1 text-2xl font-bold text-slate-950">
                  Choose how you will practice
                </h3>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("individual");
                    resetPracticeResult();
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${
                    mode === "individual"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-3xl">🎤</div>
                  <p className="mt-3 text-lg font-bold text-slate-950">
                    Practice Alone
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Record and review an individual speech or presentation.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("group");
                    resetPracticeResult();
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${
                    mode === "group"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-3xl">👥</div>
                  <p className="mt-3 text-lg font-bold text-slate-950">
                    Practice in a Group
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Record several speakers practicing one presentation.
                  </p>
                </button>
              </div>

              {mode === "group" && (
                <div className="mt-6">
                  <label
                    htmlFor="group-members"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Group members
                  </label>

                  <input
                    id="group-members"
                    value={groupMembersText}
                    onChange={(event) =>
                      setGroupMembersText(event.target.value)
                    }
                    placeholder="Example: Maria, Daniel, Sofia"
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Separate each student name with a comma.
                  </p>
                </div>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="topic"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Practice topic
                  </label>

                  <button
                    type="button"
                    onClick={chooseRandomTopic}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Choose Random Topic
                  </button>
                </div>

                <textarea
                  id="topic"
                  value={topic}
                  onChange={(event) => {
                    setTopic(event.target.value);
                    resetPracticeResult();
                  }}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="practice-goal"
                  className="text-sm font-semibold text-slate-800"
                >
                  Practice goal
                </label>

                <textarea
                  id="practice-goal"
                  value={practiceGoal}
                  onChange={(event) =>
                    setPracticeGoal(event.target.value)
                  }
                  rows={2}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="duration"
                  className="text-sm font-semibold text-slate-800"
                >
                  Target speaking time
                </label>

                <select
                  id="duration"
                  value={targetSeconds}
                  onChange={(event) => {
                    setTargetSeconds(Number(event.target.value));
                    resetPracticeResult();
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={180}>3 minutes</option>
                  <option value={300}>5 minutes</option>
                  <option value={420}>7 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-rose-600">
                    Recording studio
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    {mode === "group"
                      ? "Group Practice Recording"
                      : "Individual Practice Recording"}
                  </h3>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    isRecording
                      ? "bg-rose-100 text-rose-700"
                      : audioUrl
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isRecording
                    ? "● Recording"
                    : audioUrl
                      ? "Recording complete"
                      : "Ready"}
                </span>
              </div>

              <div className="mt-8 rounded-3xl bg-slate-950 px-6 py-10 text-center text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Recording time
                </p>

                <p className="mt-3 font-mono text-6xl font-bold">
                  {formatTime(recordedSeconds)}
                </p>

                <p className="mt-3 text-sm text-slate-400">
                  Target: {formatTime(targetSeconds)}
                </p>

                <div className="mx-auto mt-6 h-3 max-w-xl overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="rounded-2xl bg-rose-600 px-7 py-4 font-bold text-white shadow-lg transition hover:bg-rose-700"
                    >
                      ● Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="rounded-2xl bg-white px-7 py-4 font-bold text-slate-950 shadow-lg transition hover:bg-slate-100"
                    >
                      ■ Stop Recording
                    </button>
                  )}

                  {!isRecording && audioUrl && (
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="rounded-2xl border border-slate-600 px-7 py-4 font-semibold text-white hover:bg-slate-800"
                    >
                      Record Again
                    </button>
                  )}
                </div>
              </div>

              {audioUrl && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">
                    Listen to your recording
                  </p>

                  <audio
                    controls
                    src={audioUrl}
                    className="mt-4 w-full"
                  />

                  <button
                    type="button"
                    onClick={generateFeedback}
                    disabled={!canRequestFeedback || isGeneratingFeedback}
                    className="mt-6 w-full rounded-2xl bg-indigo-700 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingFeedback
                      ? "Analyzing Practice..."
                      : "✨ Get AI Feedback"}
                  </button>

                  <p className="mt-3 text-xs text-slate-600">
                    {feedbackStatusMessage}
                  </p>
                </div>
              )}

              {feedbackError && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                  {feedbackError}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">
                    Practice analysis
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    AI Feedback
                  </h3>
                </div>

                {feedback && (
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-indigo-700 text-white">
                    <span className="text-2xl font-bold">
                      {feedback.overallScore}
                    </span>
                    <span className="text-xs">out of 100</span>
                  </div>
                )}
              </div>

              {!feedback && !isGeneratingFeedback && (
                <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <div className="text-4xl">💬</div>

                  <p className="mt-4 text-lg font-bold text-slate-800">
                    Your feedback will appear here
                  </p>

                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Complete your recording, listen to it, and select
                    <strong> Get AI Feedback</strong>.
                  </p>
                </div>
              )}

              {isGeneratingFeedback && (
                <div className="mt-6 rounded-3xl bg-indigo-50 px-6 py-12 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-700" />

                  <p className="mt-4 font-bold text-indigo-900">
                    Analyzing your practice
                  </p>

                  <p className="mt-2 text-sm text-indigo-700">
                    OralIQ AI is preparing your coaching feedback.
                  </p>
                </div>
              )}

              {feedback && (
                <div className="mt-7 space-y-6">
                  <div className="rounded-2xl bg-indigo-50 p-5">
                    <h4 className="font-bold text-indigo-950">
                      Overall Feedback
                    </h4>

                    <p className="mt-2 whitespace-pre-line leading-7 text-slate-700">
                      {feedback.overallFeedback}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-white p-5">
                    <h4 className="font-bold text-slate-900">Transcript</h4>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {feedback.transcript || "Transcript was not returned."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Word Count
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {feedback.metrics?.wordCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        WPM
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {feedback.metrics?.wordsPerMinute ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Fillers
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {feedback.metrics?.fillerWordCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Sentences
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {feedback.metrics?.sentenceCount ?? 0}
                      </p>
                    </div>
                  </div>

                  {feedback.metrics?.fillerWords?.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <h4 className="font-bold text-amber-900">Detected Fillers</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {feedback.metrics.fillerWords.join(", ")}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <h4 className="font-bold text-emerald-900">
                        What You Did Well
                      </h4>

                      <ul className="mt-3 space-y-3">
                        {(feedback.strengths ?? []).map((strength) => (
                          <li
                            key={strength}
                            className="flex gap-3 text-sm leading-6 text-slate-700"
                          >
                            <span className="font-bold text-emerald-700">
                              ✓
                            </span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <h4 className="font-bold text-amber-900">
                        Priorities to Improve
                      </h4>

                      <ul className="mt-3 space-y-3">
                        {(feedback.priorities ?? []).map((improvement) => (
                          <li
                            key={improvement}
                            className="flex gap-3 text-sm leading-6 text-slate-700"
                          >
                            <span className="font-bold text-amber-700">
                              →
                            </span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-5 text-white">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                      Your next step
                    </p>

                    <p className="mt-2 leading-7">
                      {feedback.nextStep}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      Criterion Feedback
                    </h4>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {CRITERION_ORDER.map((key) => {
                        const criterion = getCriterionWithFallback(
                          key,
                          feedback.criteria
                        );

                        return (
                          <article
                            key={key}
                            className="rounded-2xl border border-slate-200 bg-white p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="font-bold text-slate-900">
                                {criterion.title}
                              </h5>

                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                                {criterion.score}/10
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-700">
                              {criterion.explanation}
                            </p>

                            {criterion.evidence.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Evidence
                                </p>
                                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                                  {criterion.evidence.map((item) => (
                                    <li key={item} className="flex gap-2">
                                      <span className="font-bold text-slate-400">
                                        •
                                      </span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                              <strong className="font-semibold text-slate-900">
                                Recommendation:
                              </strong>{" "}
                              {criterion.recommendation}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveAttempt}
                      disabled={attemptSaved}
                      className="rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {attemptSaved
                        ? "✓ Practice Saved"
                        : "Save Practice"}
                    </button>

                    <button
                      type="button"
                      onClick={startNewPractice}
                      className="rounded-2xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Start New Practice
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Current practice
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    MODE
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {mode === "group"
                      ? "Group Practice"
                      : "Individual Practice"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    TARGET TIME
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {formatTime(targetSeconds)}
                  </p>
                </div>

                {mode === "group" && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      GROUP MEMBERS
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {groupMembers.length > 0
                        ? groupMembers.join(", ")
                        : "No names entered yet"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Practice history
                  </p>

                  <h3 className="mt-1 text-xl font-bold text-slate-950">
                    Recent Attempts
                  </h3>
                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                  {attempts.length}
                </span>
              </div>

              {attempts.length === 0 ? (
                <p className="mt-5 text-sm leading-6 text-slate-500">
                  Saved practice attempts will appear here.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {attempts.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-bold text-slate-900">
                          {attempt.topic}
                        </p>

                        {attempt.feedback && (
                          <span className="rounded-lg bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">
                            {attempt.feedback.overallScore}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {attempt.mode === "group"
                          ? "Group"
                          : "Individual"}
                        {" • "}
                        {formatTime(attempt.recordedSeconds)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(attempt.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-indigo-950 p-6 text-white shadow-sm">
              <div className="text-3xl">💡</div>

              <h3 className="mt-4 text-lg font-bold">
                Practice Tip
              </h3>

              <p className="mt-2 text-sm leading-6 text-indigo-100">
                Begin with a clear opening, organize your ideas into two or
                three main points, and finish with a strong conclusion.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
