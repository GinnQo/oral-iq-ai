export type PracticeMode = "individual" | "group";

export type CriterionKey =
  | "pronunciation"
  | "fluency"
  | "speakingRate"
  | "volume"
  | "pace"
  | "grammar"
  | "vocabulary"
  | "sentenceVariety"
  | "organization"
  | "confidence";

export type CriterionFeedback = {
  score: number;
  title: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
};

export type PracticeCriteria = {
  pronunciation: CriterionFeedback;
  fluency: CriterionFeedback;
  speakingRate: CriterionFeedback;
  volume: CriterionFeedback;
  pace: CriterionFeedback;
  grammar: CriterionFeedback;
  vocabulary: CriterionFeedback;
  sentenceVariety: CriterionFeedback;
  organization: CriterionFeedback;
  confidence: CriterionFeedback;
};

export type SpeechMetrics = {
  wordCount: number;
  speakingSeconds: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerWords: string[];
  repeatedWordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
};

export type PracticeFeedback = {
  overallScore: number;
  criteria: PracticeCriteria;
  transcript: string;
  metrics: SpeechMetrics;
  strengths: string[];
  priorities: string[];
  overallFeedback: string;
  nextStep: string;
  generatedAt: string;
};

export type PracticeFeedbackSuccessResponse = {
  success: true;
  mode: PracticeMode;
  feedback: PracticeFeedback;
  groupMembers: string[];
};

export type PracticeFeedbackErrorStage =
  | "configuration"
  | "request"
  | "upload-validation"
  | "transcription"
  | "transcript-validation"
  | "analysis";

export type PracticeFeedbackErrorDetails = {
  status?: number;
  code?: string;
  type?: string;
  audioType?: string;
  normalizedAudioType?: string;
  audioSize?: number;
  filename?: string;
  model?: string;
};

export type PracticeFeedbackErrorResponse = {
  success: false;
  stage?: PracticeFeedbackErrorStage;
  mode?: PracticeMode;
  error?: string;
  details?: PracticeFeedbackErrorDetails;
};

export type PracticeFeedbackResponse =
  | PracticeFeedbackSuccessResponse
  | PracticeFeedbackErrorResponse;

export type PracticeAttempt = {
  id: string;
  studentName: string;
  topic: string;
  practiceGoal: string;
  mode: PracticeMode;
  groupMembers: string[];
  targetSeconds: number;
  recordedSeconds: number;
  audioType: string;
  createdAt: string;
  feedback: PracticeFeedback;
};

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  pronunciation: "Pronunciation",
  fluency: "Fluency",
  speakingRate: "Speaking Rate",
  volume: "Volume",
  pace: "Pace",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  sentenceVariety: "Sentence Variety",
  organization: "Organization",
  confidence: "Vocal Confidence",
};

export const CRITERION_ORDER: CriterionKey[] = [
  "pronunciation",
  "fluency",
  "speakingRate",
  "volume",
  "pace",
  "grammar",
  "vocabulary",
  "sentenceVariety",
  "organization",
  "confidence",
]; 