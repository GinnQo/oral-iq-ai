import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import {
  CRITERION_LABELS,
  CRITERION_ORDER,
  type CriterionFeedback,
  type CriterionKey,
  type PracticeCriteria,
  type PracticeFeedbackErrorDetails,
  type PracticeFeedbackErrorStage,
  type PracticeFeedback,
  type PracticeMode,
  type SpeechMetrics,
} from "@/app/types/practice";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MINIMUM_WORDS_FOR_DETAILED_FEEDBACK = 20;
const MAX_TEXT_FIELD_LENGTH = 400;
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-1";
const TRANSCRIPTION_MODEL_FALLBACKS = [
  "whisper-1",
  "gpt-4o-mini-transcribe",
] as const;

const SUPPORTED_AUDIO_MIME_PREFIXES = new Set([
  "audio/webm",
  "video/webm",
  "audio/mp4",
  "video/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "video/ogg",
  "audio/aac",
  "audio/3gpp",
]);

const TRANSCRIPT_BASED_CRITERIA: Set<CriterionKey> = new Set([
  "fluency",
  "speakingRate",
  "grammar",
  "vocabulary",
  "sentenceVariety",
  "organization",
]);

type TranscriptionWord = {
  word?: string;
  start?: number;
  end?: number;
};

type TranscriptionResponse = {
  text?: string;
  duration?: number;
  words?: TranscriptionWord[];
};

type CriterionDraft = {
  score?: number;
  explanation?: string;
  evidence?: unknown;
  recommendation?: string;
};

type AIAnalysisDraft = {
  criteria?: Partial<Record<CriterionKey, CriterionDraft>>;
  strengths?: unknown;
  priorities?: unknown;
  overallFeedback?: string;
  nextStep?: string;
};

type RequestContext = {
  studentName: string;
  topic: string;
  practiceGoal: string;
  mode: PracticeMode;
  groupMembers: string[];
  targetSeconds: number;
  recordedSeconds: number;
  audioMimeType: string;
  normalizedAudioMimeType: string;
  filename: string;
  audioSizeBytes: number;
};

type SafeOpenAIError = {
  name: string;
  status?: number;
  code?: string;
  type?: string;
  message: string;
};

function jsonError(
  stage: PracticeFeedbackErrorStage,
  status: number,
  error: string,
  details?: PracticeFeedbackErrorDetails
) {
  return NextResponse.json(
    {
      success: false,
      stage,
      error,
      details,
    },
    { status }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: FormDataEntryValue | null, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function sanitizeText(value: string, fallback: string, maxLength = MAX_TEXT_FIELD_LENGTH): string {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/\s+/g, " ").slice(0, maxLength);
  return normalized || fallback;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toSafeNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getConfiguredTranscriptionModel(): string {
  const configured = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim();
  return configured || DEFAULT_TRANSCRIPTION_MODEL;
}

function getServerOpenAIKey(): { ok: boolean; value?: string } {
  const raw = process.env.OPENAI_API_KEY;

  if (typeof raw !== "string") {
    return { ok: false };
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false };
  }

  if (/^(your-|replace|changeme|example)/i.test(trimmed)) {
    return { ok: false };
  }

  return { ok: true, value: trimmed };
}

function normalizeMimeType(value: string): string {
  return value.toLowerCase().split(";")[0]?.trim() || "";
}

function deriveExtensionFromMimeType(normalizedMimeType: string): string | null {
  if (normalizedMimeType === "audio/webm" || normalizedMimeType === "video/webm") {
    return "webm";
  }

  if (normalizedMimeType === "audio/mp4" || normalizedMimeType === "video/mp4") {
    return "mp4";
  }

  if (normalizedMimeType === "audio/mpeg" || normalizedMimeType === "audio/mp3") {
    return "mp3";
  }

  if (normalizedMimeType === "audio/wav" || normalizedMimeType === "audio/x-wav") {
    return "wav";
  }

  if (normalizedMimeType === "audio/ogg" || normalizedMimeType === "video/ogg") {
    return "ogg";
  }

  if (normalizedMimeType === "audio/m4a" || normalizedMimeType === "audio/x-m4a") {
    return "m4a";
  }

  if (normalizedMimeType === "audio/aac") {
    return "aac";
  }

  if (normalizedMimeType === "audio/3gpp") {
    return "3gp";
  }

  return null;
}

function isSupportedAudioMimeType(value: string): boolean {
  const normalized = normalizeMimeType(value);

  if (!normalized) {
    return true;
  }

  return SUPPORTED_AUDIO_MIME_PREFIXES.has(normalized);
}

function sanitizeFilename(filename: string, fallback = "practice-recording"): string {
  const safe = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  return safe || fallback;
}

async function normalizeUploadedAudioFile(
  file: File,
  normalizedMimeType: string,
  extension: string
): Promise<File> {
  const originalName = sanitizeFilename(file.name || "practice-recording");
  const withoutExtension = originalName.replace(/\.[a-zA-Z0-9]+$/, "");
  const filename = `${withoutExtension || "practice-recording"}.${extension}`;
  const bytes = await file.arrayBuffer();

  return new File([bytes], filename, {
    type: normalizedMimeType || file.type || "application/octet-stream",
  });
}

function toSafeOpenAIError(error: unknown): SafeOpenAIError {
  if (isRecord(error)) {
    const name = typeof error.name === "string" ? error.name : "OpenAIError";
    const status = typeof error.status === "number" ? error.status : undefined;
    const code = typeof error.code === "string" ? error.code : undefined;
    const type = typeof error.type === "string" ? error.type : undefined;
    const message =
      typeof error.message === "string" ? error.message : "OpenAI request failed.";

    return { name, status, code, type, message };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: "An unknown error occurred.",
  };
}

function parseMode(value: string): PracticeMode {
  return value === "group" ? "group" : "individual";
}

function parseGroupMembers(raw: string): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => sanitizeText(item, "", 80))
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function splitSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokenizeWords(transcript: string): string[] {
  const matches = transcript.toLowerCase().match(/[a-z0-9']+/g);
  return matches ?? [];
}

function buildMetrics(transcript: string, speakingSeconds: number): SpeechMetrics {
  const words = tokenizeWords(transcript);
  const wordCount = words.length;

  const sentences = splitSentences(transcript);
  const sentenceCount = sentences.length;
  const averageSentenceLength =
    sentenceCount > 0 ? Number((wordCount / sentenceCount).toFixed(1)) : 0;

  const wordsPerMinute =
    speakingSeconds > 0 ? Math.round((wordCount / speakingSeconds) * 60) : 0;

  const fillerStats = countFillers(transcript);
  const repeatedWordCount = countRepeatedAdjacentWords(words);

  return {
    wordCount,
    speakingSeconds,
    wordsPerMinute,
    fillerWordCount: fillerStats.count,
    fillerWords: fillerStats.words,
    repeatedWordCount,
    sentenceCount,
    averageSentenceLength,
  };
}

function countRepeatedAdjacentWords(words: string[]): number {
  let repeats = 0;

  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      repeats += 1;
    }
  }

  return repeats;
}

function countFillers(transcript: string): { count: number; words: string[] } {
  const lower = transcript.toLowerCase();
  const counters = new Map<string, number>();

  const patterns: Array<{ token: string; regex: RegExp }> = [
    { token: "um", regex: /\bum+\b/g },
    { token: "uh", regex: /\buh+\b/g },
    { token: "you know", regex: /\byou know\b/g },
    { token: "i mean", regex: /\bi mean\b/g },
    { token: "kind of", regex: /\bkind of\b/g },
    { token: "sort of", regex: /\bsort of\b/g },
    { token: "like", regex: /\blike\b(?=\s*,)/g },
    { token: "so", regex: /(?:^|[.!?]\s+)so\b/g },
    { token: "well", regex: /(?:^|[.!?]\s+)well\b/g },
  ];

  for (const pattern of patterns) {
    const matches = lower.match(pattern.regex);

    if (matches && matches.length > 0) {
      counters.set(pattern.token, matches.length);
    }
  }

  const sorted = Array.from(counters.entries()).sort((a, b) => b[1] - a[1]);

  return {
    count: sorted.reduce((total, [, count]) => total + count, 0),
    words: sorted.map(([token]) => token),
  };
}

function cleanTranscript(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function pickTranscriptEvidence(transcript: string): string[] {
  const sentences = splitSentences(transcript);

  if (sentences.length === 0) {
    return [];
  }

  return sentences.slice(0, 2).map((sentence) => `"${sentence.slice(0, 160)}"`);
}

function normalizeStringArray(value: unknown, fallback: string[], max = 5): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);

  return normalized.length > 0 ? normalized : fallback;
}

function extractQuotedEvidenceCandidates(text: string): string[] {
  const matches = Array.from(text.matchAll(/"([^"]{4,180})"/g));
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function evidenceAppearsInTranscript(evidence: string, transcript: string): boolean {
  const transcriptLower = transcript.toLowerCase();
  const quoted = extractQuotedEvidenceCandidates(evidence);

  if (quoted.length > 0) {
    return quoted.some((candidate) => transcriptLower.includes(candidate.toLowerCase()));
  }

  const trimmed = evidence.trim().toLowerCase();

  if (trimmed.length < 8) {
    return false;
  }

  return transcriptLower.includes(trimmed);
}

function normalizeEvidence(
  criterionKey: CriterionKey,
  value: unknown,
  transcript: string,
  fallback: string[]
): string[] {
  const raw = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const filtered = TRANSCRIPT_BASED_CRITERIA.has(criterionKey)
    ? raw.filter((item) => evidenceAppearsInTranscript(item, transcript))
    : raw;

  return filtered.length > 0 ? filtered : fallback;
}

function normalizeCriterion(
  criterionKey: CriterionKey,
  value: unknown,
  transcript: string,
  fallback: CriterionFeedback
): CriterionFeedback {
  const record = isRecord(value) ? value : {};
  const score = Math.round(
    clampNumber(
      typeof record.score === "number" ? record.score : Number(record.score),
      1,
      10
    )
  );

  const explanationCandidate =
    typeof record.explanation === "string" ? record.explanation.trim() : "";

  const recommendationCandidate =
    typeof record.recommendation === "string" ? record.recommendation.trim() : "";

  const fallbackEvidence = fallback.evidence.length > 0 ? fallback.evidence : pickTranscriptEvidence(transcript);

  return {
    score: Number.isFinite(score) ? score : fallback.score,
    title: CRITERION_LABELS[criterionKey],
    explanation: explanationCandidate || fallback.explanation,
    evidence: normalizeEvidence(criterionKey, record.evidence, transcript, fallbackEvidence),
    recommendation: recommendationCandidate || fallback.recommendation,
  };
}

function calculateOverallScore(criteria: PracticeCriteria): number {
  const total = CRITERION_ORDER.reduce((sum, key) => sum + criteria[key].score, 0);
  return Math.round((total / CRITERION_ORDER.length) * 10);
}

function buildLowInformationFeedback(
  transcript: string,
  metrics: SpeechMetrics,
  context: RequestContext
): PracticeFeedback {
  const shortEvidence = pickTranscriptEvidence(transcript);
  const modeNote =
    context.mode === "group"
      ? "This was graded as one group presentation because speaker-by-speaker grading is not enabled yet."
      : "";

  const criteria: PracticeCriteria = {
    pronunciation: {
      score: 5,
      title: CRITERION_LABELS.pronunciation,
      explanation:
        "This score is a cautious estimate. Pronunciation needs a richer audio sample for reliable accuracy.",
      evidence: [`Audio length: ${metrics.speakingSeconds} seconds.`],
      recommendation: "Record at least 30 seconds of clear speech for stronger pronunciation feedback.",
    },
    fluency: {
      score: 5,
      title: CRITERION_LABELS.fluency,
      explanation: "There was not enough transcribed speech to fully evaluate flow and transitions.",
      evidence: shortEvidence,
      recommendation: "Try one full introduction, one body point, and one conclusion in the next recording.",
    },
    speakingRate: {
      score: 5,
      title: CRITERION_LABELS.speakingRate,
      explanation: "Speaking rate estimate is low-confidence because the transcript is short.",
      evidence: [`Words detected: ${metrics.wordCount}.`],
      recommendation: "Aim for a steady pace near 120-160 words per minute.",
    },
    volume: {
      score: 5,
      title: CRITERION_LABELS.volume,
      explanation: "Volume cannot be reliably scored from transcript text alone.",
      evidence: [`Audio format: ${context.audioMimeType || "unknown"}.`],
      recommendation: "Speak at a consistent loudness and keep the microphone at a stable distance.",
    },
    pace: {
      score: 5,
      title: CRITERION_LABELS.pace,
      explanation:
        "Pace is estimated only from timing and transcript length, so confidence is limited.",
      evidence: [`Recorded seconds: ${metrics.speakingSeconds}.`],
      recommendation: "Pause briefly between key ideas so listeners can follow your points.",
    },
    grammar: {
      score: 5,
      title: CRITERION_LABELS.grammar,
      explanation: "The transcript is too short for a reliable grammar pattern check.",
      evidence: shortEvidence,
      recommendation: "Use complete sentences with a clear subject and verb in each main point.",
    },
    vocabulary: {
      score: 5,
      title: CRITERION_LABELS.vocabulary,
      explanation: "Vocabulary depth cannot be measured well with very short speech samples.",
      evidence: shortEvidence,
      recommendation: "Add topic-specific words that show clear understanding of your subject.",
    },
    sentenceVariety: {
      score: 5,
      title: CRITERION_LABELS.sentenceVariety,
      explanation: "Sentence variety needs a longer transcript with multiple sentence patterns.",
      evidence: shortEvidence,
      recommendation: "Mix short sentences with longer explanation sentences.",
    },
    organization: {
      score: 5,
      title: CRITERION_LABELS.organization,
      explanation: "The recording is too short to confirm full presentation structure.",
      evidence: shortEvidence,
      recommendation: "Use this outline: hook, main idea 1, main idea 2, conclusion.",
    },
    confidence: {
      score: 5,
      title: CRITERION_LABELS.confidence,
      explanation:
        "Confidence is estimated only. Accurate vocal confidence scoring needs richer audio features.",
      evidence: [`Total duration: ${metrics.speakingSeconds} seconds.`],
      recommendation: "Speak with a steady pace and finish sentences strongly.",
    },
  };

  const overallScore = calculateOverallScore(criteria);

  return {
    overallScore,
    criteria,
    transcript,
    metrics,
    strengths: [
      "You completed and submitted a real recording.",
      modeNote || "Your recording reached the AI analysis service.",
    ].filter(Boolean),
    priorities: [
      "Record a longer sample so feedback can be more specific.",
      "State your main points clearly and include a conclusion.",
    ],
    overallFeedback:
      "Your recording was captured successfully, but there is not enough transcribed speech yet for detailed scoring. A longer attempt will unlock stronger, more specific coaching.",
    nextStep:
      "Try another recording of at least 30-45 seconds using your topic and goal, then request feedback again.",
    generatedAt: new Date().toISOString(),
  };
}

async function transcribeAudio(
  openai: OpenAI,
  file: File,
  configuredModel: string,
  hasOpenAIKey: boolean
): Promise<{ response: TranscriptionResponse; model: string }> {
  const triedModels: string[] = [];
  const candidates = Array.from(
    new Set([configuredModel, ...TRANSCRIPTION_MODEL_FALLBACKS])
  );

  let lastError: SafeOpenAIError | null = null;

  for (const model of candidates) {
    triedModels.push(model);

    try {
      const response = await openai.audio.transcriptions.create({
        file,
        model,
      });

      return {
        response: response as unknown as TranscriptionResponse,
        model,
      };
    } catch (error) {
      const safeError = toSafeOpenAIError(error);
      lastError = safeError;

      console.error("[PracticeFeedback][transcription] OpenAI call failed", {
        name: safeError.name,
        status: safeError.status,
        code: safeError.code,
        type: safeError.type,
        message: safeError.message,
        filename: file.name,
        audioType: file.type,
        audioSize: file.size,
        hasOpenAIKey,
        model,
      });
    }
  }

  throw {
    name: "TranscriptionError",
    message: "All transcription model attempts failed.",
    triedModels,
    lastError,
  };
}

async function analyzeTranscript(
  openai: OpenAI,
  transcript: string,
  metrics: SpeechMetrics,
  context: RequestContext
): Promise<AIAnalysisDraft> {
  const prompt = `You are OralIQ AI, an oral presentation coach for students in grades 6-9.

Return only JSON. Do not include markdown.

Context:
- Mode: ${context.mode}
- Student: ${context.studentName}
- Topic: ${context.topic}
- Practice goal: ${context.practiceGoal}
- Group members: ${context.groupMembers.join(", ") || "none"}
- Speaking seconds: ${metrics.speakingSeconds}
- Words per minute: ${metrics.wordsPerMinute}
- Word count: ${metrics.wordCount}
- Sentence count: ${metrics.sentenceCount}
- Filler words detected: ${metrics.fillerWords.join(", ") || "none"}
- Repeated adjacent words: ${metrics.repeatedWordCount}

Transcript:
"""
${transcript}
"""

Requirements:
1. Score each criterion from 1 to 10.
2. Criteria keys: pronunciation, fluency, speakingRate, volume, pace, grammar, vocabulary, sentenceVariety, organization, confidence.
3. For transcript-based criteria, include evidence quotes copied from transcript exactly. Use short quotes.
4. For audio-only criteria (pronunciation, volume, pace, confidence), clearly label any estimate and avoid fake certainty.
5. Never claim mispronunciation of a specific word unless strongly supported.
6. In group mode, evaluate the recording as a whole and state that speaker-level scoring is not enabled.
7. Keep language student-friendly and specific.

Return this JSON shape:
{
  "criteria": {
    "pronunciation": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "fluency": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "speakingRate": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "volume": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "pace": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "grammar": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "vocabulary": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "sentenceVariety": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "organization": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" },
    "confidence": { "score": 1, "explanation": "", "evidence": [""], "recommendation": "" }
  },
  "strengths": ["", ""],
  "priorities": ["", ""],
  "overallFeedback": "",
  "nextStep": ""
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a careful education assistant that does not fabricate evidence and always outputs valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI analysis returned an empty response.");
  }

  const parsed = JSON.parse(content);
  return isRecord(parsed) ? (parsed as AIAnalysisDraft) : {};
}

function buildFallbackCriterion(
  key: CriterionKey,
  transcript: string,
  context: RequestContext,
  metrics: SpeechMetrics
): CriterionFeedback {
  const commonEvidence = pickTranscriptEvidence(transcript);

  const fallbackByKey: Record<CriterionKey, CriterionFeedback> = {
    pronunciation: {
      score: 6,
      title: CRITERION_LABELS.pronunciation,
      explanation:
        "Estimated from limited text and timing signals. A full pronunciation check needs deeper audio analysis.",
      evidence: [`Audio duration: ${metrics.speakingSeconds} seconds.`],
      recommendation: "Focus on clear word endings and steady articulation.",
    },
    fluency: {
      score: 6,
      title: CRITERION_LABELS.fluency,
      explanation: "Fluency estimate uses transcript flow and repetition patterns.",
      evidence: commonEvidence,
      recommendation: "Practice connecting your ideas with fewer restarts.",
    },
    speakingRate: {
      score: 6,
      title: CRITERION_LABELS.speakingRate,
      explanation: "Speaking rate is based on transcript word count and recording time.",
      evidence: [`Words per minute estimate: ${metrics.wordsPerMinute}.`],
      recommendation: "Aim for a steady pace so each key idea is easy to follow.",
    },
    volume: {
      score: 6,
      title: CRITERION_LABELS.volume,
      explanation:
        "Volume is estimated because transcript data does not contain full loudness detail.",
      evidence: [`Received audio type: ${context.audioMimeType || "unknown"}.`],
      recommendation: "Keep your microphone distance consistent and project your voice evenly.",
    },
    pace: {
      score: 6,
      title: CRITERION_LABELS.pace,
      explanation: "Pace estimate uses timing and transcript structure, so confidence is moderate.",
      evidence: [`Target time: ${context.targetSeconds} seconds.`],
      recommendation: "Pause briefly after each main point before moving on.",
    },
    grammar: {
      score: 6,
      title: CRITERION_LABELS.grammar,
      explanation: "Grammar feedback is based on transcript sentence patterns.",
      evidence: commonEvidence,
      recommendation: "Use complete sentences and check verb tense consistency.",
    },
    vocabulary: {
      score: 6,
      title: CRITERION_LABELS.vocabulary,
      explanation: "Vocabulary score reflects precision and variety in your transcript.",
      evidence: commonEvidence,
      recommendation: "Add topic-specific words that make your explanation more exact.",
    },
    sentenceVariety: {
      score: 6,
      title: CRITERION_LABELS.sentenceVariety,
      explanation: "Sentence variety score checks for mixed short and long sentence structures.",
      evidence: commonEvidence,
      recommendation: "Mix short emphasis statements with longer explanation sentences.",
    },
    organization: {
      score: 6,
      title: CRITERION_LABELS.organization,
      explanation:
        context.mode === "group"
          ? "Group recording was scored as one presentation because speaker-level grading is not enabled."
          : "Organization score reflects clarity of opening, sequence, and closing.",
      evidence: commonEvidence,
      recommendation: "Use signpost phrases like first, next, and finally.",
    },
    confidence: {
      score: 6,
      title: CRITERION_LABELS.confidence,
      explanation:
        "Confidence is estimated from transcript consistency and timing, not full vocal-energy analysis.",
      evidence: [`Recording length: ${metrics.speakingSeconds} seconds.`],
      recommendation: "Finish each sentence strongly and avoid trailing off at the end.",
    },
  };

  return fallbackByKey[key];
}

function normalizeCriteria(
  transcript: string,
  context: RequestContext,
  metrics: SpeechMetrics,
  draft: AIAnalysisDraft
): PracticeCriteria {
  const criteriaRecord = isRecord(draft.criteria) ? draft.criteria : {};
  const result = {} as PracticeCriteria;

  for (const key of CRITERION_ORDER) {
    const fallback = buildFallbackCriterion(key, transcript, context, metrics);
    result[key] = normalizeCriterion(key, criteriaRecord[key], transcript, fallback);
  }

  return result;
}

function buildFeedbackFromAnalysis(
  transcript: string,
  metrics: SpeechMetrics,
  context: RequestContext,
  draft: AIAnalysisDraft
): PracticeFeedback {
  const criteria = normalizeCriteria(transcript, context, metrics, draft);
  const overallScore = calculateOverallScore(criteria);

  const strengths = normalizeStringArray(draft.strengths, [
    "You completed a full recording and submitted it for analysis.",
    "Your transcript includes material that can be improved with targeted practice.",
  ]);

  const priorities = normalizeStringArray(draft.priorities, [
    "Improve one criterion at a time, starting with your lowest score.",
    "Re-record with the same topic to compare your next results.",
  ]);

  const overallFeedback =
    typeof draft.overallFeedback === "string" && draft.overallFeedback.trim()
      ? draft.overallFeedback.trim()
      : "Your presentation shows progress. Use the criterion recommendations to make your next recording clearer and more organized.";

  const nextStep =
    typeof draft.nextStep === "string" && draft.nextStep.trim()
      ? draft.nextStep.trim()
      : "Practice the same topic once more and focus only on your two lowest-scoring criteria.";

  return {
    overallScore,
    criteria,
    transcript,
    metrics,
    strengths,
    priorities,
    overallFeedback,
    nextStep,
    generatedAt: new Date().toISOString(),
  };
}

function buildRequestContext(formData: FormData, audio: File): RequestContext {
  const mode = parseMode(toStringValue(formData.get("mode"), "individual"));
  const normalizedAudioMimeType = normalizeMimeType(audio.type || "");

  return {
    studentName: sanitizeText(
      toStringValue(formData.get("studentName"), "Student"),
      "Student",
      80
    ),
    topic: sanitizeText(
      toStringValue(formData.get("topic"), "Speaking practice"),
      "Speaking practice",
      220
    ),
    practiceGoal: sanitizeText(
      toStringValue(formData.get("practiceGoal"), "Improve speaking clarity"),
      "Improve speaking clarity",
      260
    ),
    mode,
    groupMembers: parseGroupMembers(toStringValue(formData.get("groupMembers"), "[]")),
    targetSeconds: clampNumber(
      toSafeNumber(toStringValue(formData.get("targetSeconds"), "120"), 120),
      15,
      1800
    ),
    recordedSeconds: clampNumber(
      toSafeNumber(toStringValue(formData.get("recordedSeconds"), "0"), 0),
      0,
      1800
    ),
    audioMimeType: audio.type || "",
    normalizedAudioMimeType,
    filename: audio.name || "practice-recording",
    audioSizeBytes: audio.size,
  };
}

export async function GET() {
  const keyState = getServerOpenAIKey();

  return NextResponse.json({
    success: true,
    routeRunning: true,
    service: "practice-feedback",
    configuredTranscriptionModel: getConfiguredTranscriptionModel(),
    runtime,
    openAIKeyConfigured: keyState.ok,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return jsonError(
      "request",
      415,
      "Content-Type must be multipart/form-data for audio uploads."
    );
  }

  const keyState = getServerOpenAIKey();
  const configuredTranscriptionModel = getConfiguredTranscriptionModel();

  if (!keyState.ok || !keyState.value) {
    return jsonError(
      "configuration",
      500,
      "OPENAI_API_KEY is not available to the server."
    );
  }

  try {
    const formData = await request.formData();
    const audioField = formData.get("audio");

    if (!(audioField instanceof File)) {
      return jsonError(
        "upload-validation",
        400,
        "No audio file was received in the audio field."
      );
    }

    if (audioField.size <= 0) {
      return jsonError(
        "upload-validation",
        400,
        "The uploaded audio file is empty.",
        {
          audioType: audioField.type || "unknown",
          normalizedAudioType: normalizeMimeType(audioField.type || ""),
          audioSize: audioField.size,
          filename: audioField.name || "unknown",
        }
      );
    }

    if (audioField.size > MAX_AUDIO_BYTES) {
      return jsonError(
        "upload-validation",
        413,
        `Audio file is too large. Maximum allowed size is ${Math.floor(
          MAX_AUDIO_BYTES / (1024 * 1024)
        )} MB.`,
        {
          audioType: audioField.type || "unknown",
          normalizedAudioType: normalizeMimeType(audioField.type || ""),
          audioSize: audioField.size,
          filename: audioField.name || "unknown",
        }
      );
    }

    const normalizedAudioMimeType = normalizeMimeType(audioField.type || "");
    const extension = deriveExtensionFromMimeType(normalizedAudioMimeType);

    if (!isSupportedAudioMimeType(audioField.type) || !extension) {
      return jsonError(
        "upload-validation",
        415,
        `Transcription service rejected the audio format: ${audioField.type || "unknown"}.`,
        {
          audioType: audioField.type || "unknown",
          normalizedAudioType: normalizedAudioMimeType || "unknown",
          audioSize: audioField.size,
          filename: audioField.name || "unknown",
        }
      );
    }

    const normalizedAudioFile = await normalizeUploadedAudioFile(
      audioField,
      normalizedAudioMimeType,
      extension
    );

    const context = buildRequestContext(formData, normalizedAudioFile);

    if (context.mode === "group" && context.groupMembers.length === 0) {
      return jsonError(
        "request",
        400,
        "Group mode requires at least one group member name."
      );
    }

    const openai = new OpenAI({ apiKey: keyState.value });

    let transcription: TranscriptionResponse;
    let transcriptionModelUsed = configuredTranscriptionModel;

    try {
      const transcriptionResult = await transcribeAudio(
        openai,
        normalizedAudioFile,
        configuredTranscriptionModel,
        keyState.ok
      );
      transcription = transcriptionResult.response;
      transcriptionModelUsed = transcriptionResult.model;
    } catch (error) {
      const safeError = toSafeOpenAIError(isRecord(error) ? error.lastError : error);

      console.error("[PracticeFeedback] Transcription failed", {
        name: safeError.name,
        status: safeError.status,
        code: safeError.code,
        type: safeError.type,
        message: safeError.message,
        filename: context.filename,
        audioType: context.audioMimeType,
        audioSize: context.audioSizeBytes,
        hasOpenAIKey: keyState.ok,
        model: transcriptionModelUsed,
      });

      return jsonError(
        "transcription",
        safeError.status ?? 502,
        safeError.message || "Transcription failed.",
        {
          status: safeError.status,
          code: safeError.code,
          type: safeError.type,
          audioType: context.audioMimeType,
          normalizedAudioType: context.normalizedAudioMimeType,
          audioSize: context.audioSizeBytes,
          filename: context.filename,
          model: transcriptionModelUsed,
        }
      );
    }

    const transcriptRaw =
      typeof transcription === "string"
        ? transcription
        : typeof transcription.text === "string"
          ? transcription.text
          : "";

    const transcript = cleanTranscript(transcriptRaw);
    const speakingSeconds = clampNumber(
      Math.round(
        context.recordedSeconds > 0
          ? context.recordedSeconds
          : typeof transcription.duration === "number" && transcription.duration > 0
            ? transcription.duration
            : 0
      ),
      0,
      1800
    );

    if (!transcript) {
      return jsonError(
        "transcript-validation",
        422,
        "Transcription completed but no readable speech text was returned.",
        {
          audioType: context.audioMimeType,
          normalizedAudioType: context.normalizedAudioMimeType,
          audioSize: context.audioSizeBytes,
          filename: context.filename,
          model: transcriptionModelUsed,
        }
      );
    }

    const metrics = buildMetrics(transcript, speakingSeconds);

    let feedback: PracticeFeedback;

    if (metrics.wordCount < MINIMUM_WORDS_FOR_DETAILED_FEEDBACK) {
      feedback = buildLowInformationFeedback(transcript, metrics, context);
    } else {
      try {
        const draft = await analyzeTranscript(openai, transcript, metrics, context);
        feedback = buildFeedbackFromAnalysis(transcript, metrics, context, draft);
      } catch (error) {
        const safeError = toSafeOpenAIError(error);

        console.error("[PracticeFeedback] Analysis failed", {
          name: safeError.name,
          status: safeError.status,
          code: safeError.code,
          type: safeError.type,
          message: safeError.message,
          filename: context.filename,
          audioType: context.audioMimeType,
          audioSize: context.audioSizeBytes,
          model: transcriptionModelUsed,
        });

        feedback = buildLowInformationFeedback(transcript, metrics, context);
        feedback.overallFeedback =
          "Your recording was transcribed successfully. Detailed AI scoring was unavailable this time, so a low-information report was returned.";
        feedback.nextStep =
          "Try requesting feedback again. If the issue continues, check your server logs for the analysis error details.";
      }
    }

    return NextResponse.json({
      success: true,
      mode: context.mode,
      groupMembers: context.groupMembers,
      feedback,
    });
  } catch (error) {
    const safeError = toSafeOpenAIError(error);

    console.error("[PracticeFeedback] Request failed", {
      name: safeError.name,
      status: safeError.status,
      code: safeError.code,
      type: safeError.type,
      message: safeError.message,
      hasOpenAIKey: keyState.ok,
      model: configuredTranscriptionModel,
    });

    return jsonError(
      "request",
      safeError.status ?? 500,
      safeError.message || "The feedback request failed.",
      {
        status: safeError.status,
        code: safeError.code,
        type: safeError.type,
        model: configuredTranscriptionModel,
      }
    );
  }
}