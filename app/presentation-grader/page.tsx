"use client";

import GoogleDriveRubricPicker from "@/components/GoogleDriveRubricPicker";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useClassroom } from "@/components/ClassroomProvider";

type PresentationType = "individual" | "group";

type RecorderStatus =
  | "ready"
  | "recording"
  | "recorded"
  | "diarizing"
  | "confirming-speakers"
  | "grading"
  | "complete"
  | "error";

type DiarizedSegment = {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: string;
};

type SpeakerStatistic = {
  speaker: string;
  speakingSeconds: number;
  speakingPercentage: number;
  segmentCount: number;
  wordCount: number;
};

type OverlapWarning = {
  firstSpeaker: string;
  secondSpeaker: string;
  start: number;
  end: number;
  duration: number;
};

type DiarizationResult = {
  presentationType: PresentationType;
  studentNames: string[];
  grade: string;
  topic: string;
  duration: number;
  transcript: string;
  segments: DiarizedSegment[];
  detectedSpeakers: string[];
  speakerStatistics: SpeakerStatistic[];
  overlapWarnings: OverlapWarning[];
  warnings: string[];
};

type CategoryResult = {
  score: number;
  feedback: string;
  evidence: string[];
};

type GroupAssessment = {
  overallScore: number;
  organization: CategoryResult;
  content: CategoryResult;
  clarity: CategoryResult;
  vocabulary: CategoryResult;
  fluency: CategoryResult;
  collaboration: CategoryResult;
  strengths: string[];
  improvements: string[];
  teacherSummary: string;
  studentSummary: string;
};

type IndividualAssessment = {
  studentName: string;
  speakerLabels: string[];
  speakingSeconds: number;
  speakingPercentage: number;
  wordCount: number;
  participationStatus:
    | "sufficient"
    | "limited"
    | "minimal"
    | "no-evidence";
  score: number | null;
  organization: CategoryResult | null;
  content: CategoryResult | null;
  clarity: CategoryResult | null;
  vocabulary: CategoryResult | null;
  fluency: CategoryResult | null;
  strengths: string[];
  improvements: string[];
  feedback: string;
  teacherNote: string;
};

type FinalGradingResult = {
  presentationType: PresentationType;
  studentNames: string[];
  grade: string;
  topic: string;
  duration: number;
  namedTranscript: string;
  segments: Array<
    DiarizedSegment & {
      assignedStudent: string | null;
      displayName: string;
    }
  >;
  detectedSpeakers: string[];
  speakerMappings: Record<string, string>;
  speakerStatistics: SpeakerStatistic[];
  overlapWarnings: OverlapWarning[];
  warnings: string[];
  groupAssessment: GroupAssessment;
  individualAssessments: IndividualAssessment[];
};

const NON_STUDENT_VALUE = "__NON_STUDENT__";

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function formatDecimalTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createInitialMappings(
  speakers: string[],
  studentNames: string[],
  presentationType: PresentationType
): Record<string, string> {
  const mappings: Record<string, string> = {};

  if (
    presentationType === "individual" &&
    speakers.length === 1 &&
    studentNames.length === 1
  ) {
    mappings[speakers[0]] = studentNames[0];
    return mappings;
  }

  for (const speaker of speakers) {
    mappings[speaker] = "";
  }

  return mappings;
}

function parseRubric(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const items: Array<{ title: string; description: string }> = [];

  for (const raw of lines) {
    if (!raw) continue;

    // common patterns: "Criterion: details" or numbered/bulleted items
    const colonMatch = raw.match(/^(.+?)[:\-–]\s*(.+)$/);
    if (colonMatch) {
      items.push({ title: colonMatch[1].trim(), description: colonMatch[2].trim() });
      continue;
    }

    const bulletMatch = raw.match(/^[\*\-•\d\.]+\s+(.*)$/);
    if (bulletMatch) {
      items.push({ title: bulletMatch[1].trim(), description: "" });
      continue;
    }

    // fallback: append as description to last item or create new
    if (items.length === 0) items.push({ title: raw, description: "" });
    else items[items.length - 1].description += (items[items.length - 1].description ? " " : "") + raw;
  }

  return items;
}

export default function PresentationGraderPage() {
  const [presentationType, setPresentationType] =
    useState<PresentationType>("individual");

  const [studentNames, setStudentNames] = useState<string[]>([""]);
  const [grade, setGrade] = useState("Grade 6");
  const [rubric, setRubric] = useState("Presentation Rubric");
  const [driveLoading, setDriveLoading] = useState(false);
  const [rubricContent, setRubricContent] = useState("");
  const [selectedDriveRubric, setSelectedDriveRubric] = useState<{
    id: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  const [showRubricPreview, setShowRubricPreview] = useState(false);
  const [isEditingRubric, setIsEditingRubric] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  const [status, setStatus] = useState<RecorderStatus>("ready");
  const [seconds, setSeconds] = useState(0);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");

  const [diarizationResult, setDiarizationResult] =
    useState<DiarizationResult | null>(null);

  const [speakerMappings, setSpeakerMappings] = useState<
    Record<string, string>
  >({});

  const [finalResult, setFinalResult] =
    useState<FinalGradingResult | null>(null);
  const [teacherFinalScore, setTeacherFinalScore] =
    useState<number | null>(null);
  const [teacherReviewNote, setTeacherReviewNote] =
    useState("");
  const [isFinalized, setIsFinalized] =
    useState(false);
  const [reportStatus, setReportStatus] =
    useState<string | null>(null);
  const [showAiFeedback, setShowAiFeedback] = useState(false);
  const [showTeacherGrading, setShowTeacherGrading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [informationMessage, setInformationMessage] = useState("");

  const {
    courses,
    students: classroomStudents,
    selectedCourse,
    importStatus,
    errorMessage: classroomError,
    loadCourses,
    loadCourseStudents,
  } = useClassroom();

  const [selectedCourseId, setSelectedCourseId] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (selectedCourse?.id) {
      setSelectedCourseId(selectedCourse.id);
    }
  }, [selectedCourse]);

  async function refreshClassroomCourses() {
    setErrorMessage("");
    await loadCourses();
  }

  async function selectClassroom(courseId: string) {
    setSelectedCourseId(courseId);
    setStudentNames(presentationType === "individual" ? [""] : ["", ""]);
    clearAssessmentData();

    const course = courses.find((item) => item.id === courseId);
    if (!course) {
      return;
    }

    await loadCourseStudents(course);
  }

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (status === "recording") {
      timer = setInterval(() => {
        setSeconds((currentSeconds) => currentSeconds + 1);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [status]);

  useEffect(() => {
    // load saved rubric for current teacher (if any)
    (async () => {
      try {
        const res = await fetch('/api/ai/rubric/save');
        if (res.ok) {
          const data = await res.json();
          if (data.entry) {
            setRubric(data.entry.name || 'Saved Rubric');
            setRubricContent(data.entry.content || '');
          }
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, [audioUrl]);

  useEffect(() => {
    if (finalResult) {
      setTeacherFinalScore(
        finalResult.groupAssessment.overallScore
      );
      setTeacherReviewNote("");
      setIsFinalized(false);
      setReportStatus(null);
      setShowAiFeedback(false);
      setShowTeacherGrading(false);
    }
  }, [finalResult]);

  const validStudentNames = useMemo(
    () =>
      studentNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    [studentNames]
  );

  const selectedStudentAssignments = useMemo(() => {
    return Object.values(speakerMappings).filter(
      (value) =>
        value &&
        value !== NON_STUDENT_VALUE
    );
  }, [speakerMappings]);

  const allSpeakersAssigned = useMemo(() => {
    if (!diarizationResult) {
      return false;
    }

    return diarizationResult.detectedSpeakers.every(
      (speaker) => Boolean(speakerMappings[speaker])
    );
  }, [diarizationResult, speakerMappings]);

  const duplicateStudentAssignments = useMemo(() => {
    const counts = new Map<string, number>();

    for (const studentName of selectedStudentAssignments) {
      counts.set(
        studentName,
        (counts.get(studentName) ?? 0) + 1
      );
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([studentName]) => studentName);
  }, [selectedStudentAssignments]);

  const studentsWithoutDetectedVoice = useMemo(() => {
    return validStudentNames.filter(
      (studentName) =>
        !selectedStudentAssignments.includes(studentName)
    );
  }, [selectedStudentAssignments, validStudentNames]);

  function clearAssessmentData() {
    setDiarizationResult(null);
    setSpeakerMappings({});
    setFinalResult(null);
    setInformationMessage("");
  }

  function changePresentationType(type: PresentationType) {
    stopActiveMicrophone();

    setPresentationType(type);
    setStudentNames(type === "individual" ? [""] : ["", ""]);
    setErrorMessage("");
    setSeconds(0);

    clearRecording();
    clearAssessmentData();

    setStatus("ready");
  }

  function updateStudentName(index: number, value: string) {
    setStudentNames((currentNames) =>
      currentNames.map((name, currentIndex) =>
        currentIndex === index ? value : name
      )
    );

    clearAssessmentData();

    if (status === "complete") {
      setStatus(audioBlob ? "recorded" : "ready");
    }
  }

  function importClassroomRoster() {
    if (!selectedCourseId) {
      setErrorMessage("Select a Google Classroom first.");
      return;
    }

    if (classroomStudents.length === 0) {
      setErrorMessage("The selected Classroom does not have any loaded students.");
      return;
    }

    setStudentNames(presentationType === "individual" ? [""] : ["", ""]);
    setErrorMessage("");
    setInformationMessage(
      `${classroomStudents.length} students are available from ${selectedCourse?.name ?? "the selected class"}.`
    );
  }

  function addStudent() {
    if (studentNames.length >= 10) {
      setErrorMessage(
        "A group presentation can contain a maximum of 10 students."
      );
      return;
    }

    setStudentNames((currentNames) => [...currentNames, ""]);
    setErrorMessage("");
    clearAssessmentData();
  }

  function removeStudent(index: number) {
    if (
      presentationType === "group" &&
      studentNames.length <= 2
    ) {
      setErrorMessage(
        "A group presentation must contain at least two students."
      );
      return;
    }

    setStudentNames((currentNames) =>
      currentNames.filter(
        (_, currentIndex) => currentIndex !== index
      )
    );

    setErrorMessage("");
    clearAssessmentData();
  }

  function stopActiveMicrophone() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
  }

  function clearRecording() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl("");
  }

  function validatePresentationInformation(): boolean {
    const trimmedNames = studentNames.map((name) => name.trim());

    if (trimmedNames.some((name) => name.length === 0)) {
      setErrorMessage(
        "Please complete every student-name field or remove the empty field."
      );
      return false;
    }

    const uniqueNames = new Set(
      trimmedNames.map((name) => name.toLowerCase())
    );

    if (uniqueNames.size !== trimmedNames.length) {
      setErrorMessage(
        "Each student must have a different name in the presentation list."
      );
      return false;
    }

    if (
      presentationType === "individual" &&
      trimmedNames.length !== 1
    ) {
      setErrorMessage(
        "An individual presentation must contain exactly one student."
      );
      return false;
    }

    if (
      presentationType === "group" &&
      trimmedNames.length < 2
    ) {
      setErrorMessage(
        "A group presentation must contain at least two students."
      );
  }

  async function extractSegmentBlob(audio: Blob, startSec: number, endSec: number) {
    try {
      const ab = await audio.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await ctx.decodeAudioData(ab.slice(0));

      const sr = decoded.sampleRate;
      const startSample = Math.max(0, Math.floor(startSec * sr));
      const endSample = Math.min(decoded.length, Math.floor(endSec * sr));
      const len = endSample - startSample;

      const numberOfChannels = decoded.numberOfChannels;
      const newBuffer = ctx.createBuffer(numberOfChannels, len, sr);

      for (let ch = 0; ch < numberOfChannels; ch++) {
        const channelData = decoded.getChannelData(ch).subarray(startSample, endSample);
        newBuffer.copyToChannel(channelData, ch, 0);
      }

      // Encode to WAV
      const wavArrayBuffer = encodeWAV(newBuffer);
      return new Blob([wavArrayBuffer], { type: "audio/wav" });
    } catch (e) {
      console.error("segment extraction failed", e);
      return null;
    }
  }

  function encodeWAV(audioBuffer: AudioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = interleave(audioBuffer);

    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    /* RIFF identifier */ writeString(view, 0, "RIFF");
    /* file length */ view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */ writeString(view, 8, "WAVE");
    /* format chunk identifier */ writeString(view, 12, "fmt ");
    /* format chunk length */ view.setUint32(16, 16, true);
    /* sample format (raw) */ view.setUint16(20, 1, true);
    /* channel count */ view.setUint16(22, numChannels, true);
    /* sample rate */ view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */ view.setUint32(28, sampleRate * numChannels * 2, true);
    /* block align (channel count * bytes per sample) */ view.setUint16(32, numChannels * 2, true);
    /* bits per sample */ view.setUint16(34, 16, true);
    /* data chunk identifier */ writeString(view, 36, "data");
    /* data chunk length */ view.setUint32(40, samples.length * 2, true);

    // write the PCM samples
    floatTo16BitPCM(view, 44, samples);

    return buffer;

    function writeString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7fff;
        output.setInt16(offset, s, true);
      }
    }

    function interleave(inputBuffer: AudioBuffer) {
      const numChannels = inputBuffer.numberOfChannels;
      const length = inputBuffer.length * numChannels;
      const result = new Float32Array(length);
      let index = 0;
      const channels = [] as Float32Array[];
      for (let i = 0; i < numChannels; i++) channels.push(inputBuffer.getChannelData(i));
      for (let i = 0; i < inputBuffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          result[index++] = channels[ch][i];
        }
      }
      return result;
    }
  }

  // Enroll current speaker sample as a voice profile
  async function enrollSpeaker(speaker: string) {
    if (!audioBlob) return;
    const name = window.prompt("Enter student name to enroll this voice as:", "");
    const studentId = window.prompt("Enter student id (optional):", "");
    if (!name) return;

    try {
      const form = new FormData();
      form.append("audio", new File([audioBlob], `enroll-${Date.now()}.webm`, { type: audioBlob.type }));
      form.append("student_id", studentId || name);
      form.append("name", name);

      const res = await fetch(`/api/speaker/enroll`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Enroll failed");
      const data = await res.json();
      alert(`Enrolled: ${data.student_id || data.id}`);
    } catch (e) {
      console.error(e);
      alert("Enroll failed");
    }
      return false;
    }

    if (!topic.trim()) {
      setErrorMessage(
        "Please enter the presentation topic."
      );
      return false;
    }

    return true;
  }

  async function startRecording() {
    if (!validatePresentationInformation()) {
      return;
    }

    setErrorMessage("");
    setInformationMessage("");
    clearAssessmentData();
    clearRecording();
    setSeconds(0);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "This browser does not support microphone recording. Please use an updated version of Chrome or Edge."
      );
      setStatus("error");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setErrorMessage(
        "Media recording is not available in this browser."
      );
      setStatus("error");
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];

      const selectedMimeType =
        supportedTypes.find((mimeType) =>
          MediaRecorder.isTypeSupported(mimeType)
        ) ?? "";

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, {
            mimeType: selectedMimeType,
          })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopActiveMicrophone();

        setErrorMessage(
          "An error occurred while recording. Please check the microphone and try again."
        );
        setStatus("error");
      };

      recorder.onstop = () => {
        const recordedAudio = new Blob(
          audioChunksRef.current,
          {
            type:
              recorder.mimeType ||
              selectedMimeType ||
              "audio/webm",
          }
        );

        stopActiveMicrophone();

        if (recordedAudio.size === 0) {
          setErrorMessage(
            "The recording was empty. Please check the microphone and record again."
          );
          setStatus("error");
          return;
        }

        const newAudioUrl =
          URL.createObjectURL(recordedAudio);

        setAudioBlob(recordedAudio);
        setAudioUrl(newAudioUrl);
        setStatus("recorded");

        setInformationMessage(
          "Recording complete. Review the audio, then click Analyze Speakers."
        );
      };

      recorder.start(1000);
      setStatus("recording");
    } catch (error) {
      console.error("Microphone error:", error);

      stopActiveMicrophone();

      setErrorMessage(
        "Microphone access was not allowed. Click the microphone icon near the browser address bar, allow access, and try again."
      );
      setStatus("error");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  function saveRecording() {
    if (!audioUrl || !audioBlob) {
      setErrorMessage("There is no recording available to save.");
      return;
    }

    const extension = audioBlob.type.includes("ogg")
      ? "ogg"
      : audioBlob.type.includes("wav")
        ? "wav"
        : audioBlob.type.includes("mpeg")
          ? "mp3"
          : "webm";

    const safeStudentName =
      validStudentNames.join("-").replace(/[^a-zA-Z0-9-_]+/g, "-") ||
      "presentation";

    const anchor = document.createElement("a");
    anchor.href = audioUrl;
    anchor.download = `${safeStudentName}-recording-${Date.now()}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setInformationMessage("Recording saved to your device.");
  }

  function resetEverything() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }

    stopActiveMicrophone();
    clearRecording();
    clearAssessmentData();

    setErrorMessage("");
    setInformationMessage("");
    setSeconds(0);
    setShowAiFeedback(false);
    setShowTeacherGrading(false);
    setStatus("ready");
  }

  async function analyzeSpeakers() {
    if (!audioBlob) {
      setErrorMessage(
        "Please record a presentation before analyzing speakers."
      );
      return;
    }

    if (!validatePresentationInformation()) {
      return;
    }

    setStatus("diarizing");
    setErrorMessage("");
    setInformationMessage(
      "OralIQ is separating the recording into detected speakers."
    );

    console.log(
      "[PresentationGrader] Starting diarization analysis",
      {
        audioSize: audioBlob.size,
        audioType: audioBlob.type,
        students: validStudentNames,
        presentationType,
        topic,
        grade,
      }
    );

    try {
      const audioExtension = audioBlob.type.includes("ogg")
        ? "ogg"
        : "webm";

      const audioFile = new File(
        [audioBlob],
        `oral-presentation-${Date.now()}.${audioExtension}`,
        {
          type: audioBlob.type || "audio/webm",
        }
      );

      const formData = new FormData();

      formData.append("action", "diarize");
      formData.append("audio", audioFile);
      formData.append(
        "presentationType",
        presentationType
      );
      formData.append(
        "studentNames",
        JSON.stringify(validStudentNames)
      );
      formData.append("grade", grade);
      formData.append("topic", topic.trim());

      console.log(
        "[PresentationGrader] Sending diarization request to /api/grade-presentation"
      );

      const response = await fetch(
        "/api/grade-presentation",
        {
          method: "POST",
          body: formData,
        }
      );

      const responseData = await response.json();

      console.log(
        "[PresentationGrader] Diarization response status:",
        response.status,
        responseData
      );

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            "The recording could not be analyzed."
        );
      }

      const result = responseData as DiarizationResult;

      if (
        !result.detectedSpeakers ||
        result.detectedSpeakers.length === 0
      ) {
        throw new Error(
          "No speakers were detected in the recording."
        );
      }

      console.log(
        "[PresentationGrader] Diarization successful",
        {
          detectedSpeakers: result.detectedSpeakers,
          segments: result.segments.length,
          duration: result.duration,
        }
      );

      setDiarizationResult(result);

      setSpeakerMappings(
        createInitialMappings(
          result.detectedSpeakers,
          validStudentNames,
          presentationType
        )
      );

      setStatus("confirming-speakers");

      setInformationMessage(
        presentationType === "individual" &&
          result.detectedSpeakers.length === 1
          ? "The detected voice was assigned to the individual student. Review the transcript before grading."
          : "Match every detected speaker to the correct student before grading."
      );
    } catch (error) {
      console.error(
        "[PresentationGrader] Diarization error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected speaker-analysis error occurred."
      );

      setInformationMessage("");
      setStatus("recorded");
    }
  }

  function updateSpeakerMapping(
    speaker: string,
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const selectedValue = event.target.value;

    setSpeakerMappings((currentMappings) => ({
      ...currentMappings,
      [speaker]: selectedValue,
    }));

    setErrorMessage("");
    setFinalResult(null);
  }

  function validateSpeakerMappings(): boolean {
    if (!diarizationResult) {
      setErrorMessage(
        "Speaker analysis must be completed first."
      );
      return false;
    }

    if (!allSpeakersAssigned) {
      setErrorMessage(
        "Please identify every detected speaker. Use “Not a listed student” for a teacher, audience member, or unidentified voice."
      );
      return false;
    }

    if (duplicateStudentAssignments.length > 0) {
      setErrorMessage(
        `Each student should normally be assigned to one detected voice. Duplicate assignment: ${duplicateStudentAssignments.join(
          ", "
        )}.`
      );
      return false;
    }

    const mappedStudents = Object.values(
      speakerMappings
    ).filter(
      (value) =>
        value &&
        value !== NON_STUDENT_VALUE
    );

    if (mappedStudents.length === 0) {
      setErrorMessage(
        "At least one detected voice must be assigned to a listed student."
      );
      return false;
    }

    return true;
  }

  async function gradeConfirmedSpeakers() {
    if (!diarizationResult) {
      setErrorMessage(
        "Please analyze the recording before grading it."
      );
      return;
    }

    if (!validateSpeakerMappings()) {
      return;
    }

    setStatus("grading");
    setErrorMessage("");
    setInformationMessage(
      "OralIQ is generating the group assessment and individual student reports."
    );

    console.log(
      "[PresentationGrader] Starting grading analysis",
      {
        students: validStudentNames,
        presentationType,
        topic,
        speakerMappings,
        rubric,
      }
    );

    try {
      const gradePayload = {
        action: "grade",
        presentationType,
        studentNames: validStudentNames,
        grade,
        rubric,
        rubricText: rubricContent,
        topic: topic.trim(),
        duration: diarizationResult.duration,
        transcript: diarizationResult.transcript,
        segments: diarizationResult.segments,
        detectedSpeakers:
          diarizationResult.detectedSpeakers,
        speakerStatistics:
          diarizationResult.speakerStatistics,
        overlapWarnings:
          diarizationResult.overlapWarnings,
        warnings: diarizationResult.warnings,
        speakerMappings,
      };

      console.log(
        "[PresentationGrader] Sending grading request to /api/grade-presentation"
      );

      const response = await fetch(
        "/api/grade-presentation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(gradePayload),
        }
      );

      const responseData = await response.json();

      console.log(
        "[PresentationGrader] Grading response status:",
        response.status
      );

      if (!response.ok) {
        console.error(
          "[PresentationGrader] Grading error response:",
          responseData
        );
        throw new Error(
          responseData.error ||
            "The assessment could not be generated."
        );
      }

      console.log(
        "[PresentationGrader] Grading successful",
        {
          groupScore:
            responseData.groupAssessment
              ?.overallScore,
          individualCount:
            responseData.individualAssessments
              ?.length,
        }
      );

      setFinalResult(
        responseData as FinalGradingResult
      );

      setStatus("complete");

      setInformationMessage(
        "Assessment complete. Review all AI-generated results before saving or sharing a grade."
      );
    } catch (error) {
      console.error(
        "[PresentationGrader] Grading error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected grading error occurred."
      );

      setInformationMessage("");
      setStatus("confirming-speakers");
    }
  }

  async function saveResults() {
    if (!finalResult) {
      setErrorMessage("No results to save. Please complete the grading first.");
      return;
    }

    try {
      setReportStatus("Saving assessment results...");

      const payload = {
        presentationType,
        studentNames: validStudentNames,
        grade,
        topic,
        transcript: finalResult.namedTranscript,
        duration: finalResult.duration,
        segments: finalResult.segments,
        detectedSpeakers: finalResult.detectedSpeakers,
        speakerMappings: finalResult.speakerMappings,
        speakerStatistics: finalResult.speakerStatistics,
        overlapWarnings: finalResult.overlapWarnings,
        warnings: finalResult.warnings,
        groupAssessment: finalResult.groupAssessment,
        individualAssessments: finalResult.individualAssessments,
        teacherFinalScore: teacherFinalScore ?? finalResult.groupAssessment.overallScore,
        teacherReviewNote: teacherReviewNote.trim(),
        finalizedAt: new Date().toISOString(),
      };

      console.log("[PresentationGrader] Saving results", {
        studentCount: validStudentNames.length,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save results");
      }

      const data = await response.json();

      console.log("[PresentationGrader] Results saved successfully", {
        resultId: data.result?.id,
      });

      setReportStatus("✅ Assessment results saved successfully!");
      setTimeout(() => {
        setReportStatus(null);
      }, 5000);
    } catch (error) {
      console.error("[PresentationGrader] Error saving results:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save assessment results"
      );
    }
  }

  const isRecording = status === "recording";
  const isDiarizing = status === "diarizing";
  const isGrading = status === "grading";
  const isBusy =
    isRecording || isDiarizing || isGrading;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 font-semibold text-indigo-700">
            OralIQ AI
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Presentation Grader
          </h1>

          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Record an individual or group
            presentation, separate the detected
            speakers, confirm each student&apos;s
            voice, and create group and individual
            assessment reports.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            1. Presentation Information
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div className="md:col-span-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <label className="flex-1">
                  <span className="mb-2 block text-sm font-bold text-slate-800">
                    Google Classroom
                  </span>
                  <select
                    value={selectedCourseId}
                    onChange={(event) => void selectClassroom(event.target.value)}
                    disabled={isBusy || importStatus === "loading"}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  >
                    <option value="">Select the class you are working with</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}{course.section ? ` — ${course.section}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void refreshClassroomCourses()}
                  disabled={isBusy || importStatus === "loading"}
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importStatus === "loading" ? "Loading…" : courses.length ? "Refresh Classes" : "Load My Classes"}
                </button>
              </div>

              {selectedCourse && (
                <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-700">
                  <strong>Current class:</strong> {selectedCourse.name}
                  {selectedCourse.section ? ` — ${selectedCourse.section}` : ""}
                  <span className="ml-3 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
                    {classroomStudents.length} students loaded
                  </span>
                </div>
              )}

              {classroomError && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {classroomError}
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              <span className="mb-3 block text-sm font-semibold">
                Presentation type
              </span>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => changePresentationType("individual")}
                  disabled={isBusy}
                  className={`rounded-xl border px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    presentationType === "individual"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Individual Student
                </button>

                <button
                  type="button"
                  onClick={() => changePresentationType("group")}
                  disabled={isBusy}
                  className={`rounded-xl border px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    presentationType === "group"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Group Presentation
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {presentationType === "individual"
                    ? "Student"
                    : "Group members"}
                </span>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                    {studentNames.length} {" "}
                    {studentNames.length === 1 ? "student" : "students"}
                  </span>

                  <button
                    type="button"
                    onClick={importClassroomRoster}
                    disabled={isBusy || !selectedCourseId || classroomStudents.length === 0}
                    className="rounded-xl border border-indigo-300 bg-white px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reset Student Selection
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {studentNames.map(
                  (studentName, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                        {index + 1}
                      </div>

                      {classroomStudents.length > 0 ? (
                        <select
                          value={studentName}
                          onChange={(event) =>
                            updateStudentName(index, event.target.value)
                          }
                          disabled={isBusy || !selectedCourseId}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                        >
                          <option value="">
                            {presentationType === "individual"
                              ? "Select a student"
                              : `Select group member ${index + 1}`}
                          </option>
                          {classroomStudents.map((student) => (
                            <option
                              key={student.id}
                              value={student.name}
                              disabled={
                                studentNames.includes(student.name) &&
                                student.name !== studentName
                              }
                            >
                              {student.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={studentName}
                          onChange={(event) =>
                            updateStudentName(index, event.target.value)
                          }
                          disabled={isBusy}
                          placeholder="Load and select a Google Classroom first"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                        />
                      )}

                      {presentationType === "group" &&
                        studentNames.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeStudent(index)
                            }
                            disabled={isBusy}
                            className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                    </div>
                  )
                )}
              </div>

              {presentationType === "group" && (
                <button
                  type="button"
                  onClick={addStudent}
                  disabled={
                    isBusy ||
                    studentNames.length >= 10
                  }
                  className="mt-4 rounded-xl border border-indigo-300 px-5 py-2.5 font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add Another Student
                </button>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Grade level
              </span>

              <select
                value={grade}
                onChange={(event) =>
                  setGrade(event.target.value)
                }
                disabled={isBusy}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
              >
                <option>Grade 6</option>
                <option>Grade 7</option>
                <option>Grade 8</option>
                <option>Grade 9</option>
              </select>
            </label>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <label className="block flex-1">
                  <span className="mb-2 block text-sm font-semibold">
                    Rubric
                  </span>

                  <select
                    value={
                      selectedDriveRubric
                        ? "__GOOGLE_DRIVE_RUBRIC__"
                        : rubric
                    }
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value === "__GOOGLE_DRIVE_RUBRIC__") {
                        return;
                      }

                      setSelectedDriveRubric(null);
                      setRubric(value);
                      setShowRubricPreview(false);
                      setIsEditingRubric(false);
                    }}
                    disabled={isBusy || driveLoading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                  >
                    <option>Presentation Rubric</option>
                    <option>Oral Fluency Rubric</option>
                    <option>Pronunciation Focus Rubric</option>
                    {selectedDriveRubric && (
                      <option value="__GOOGLE_DRIVE_RUBRIC__">
                        {selectedDriveRubric.name}
                      </option>
                    )}
                  </select>
                </label>

                <GoogleDriveRubricPicker
                  disabled={isBusy || driveLoading}
                  onError={(message) => {
                    setErrorMessage(message);
                  }}
                  onRubricSelected={async (selectedRubric) => {
                    setDriveLoading(true);
                    setErrorMessage("");
                    setInformationMessage("");
                    setShowRubricPreview(false);
                    setIsEditingRubric(false);

                    try {
                      const response = await fetch(
                        `/api/ai/rubric?fileId=${encodeURIComponent(
                          selectedRubric.id
                        )}`
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(
                          data.error ||
                            "Could not load the selected rubric."
                        );
                      }

                      const returnedContent =
                        typeof data.content === "string"
                          ? data.content
                          : "";

                      const isRawPdf = returnedContent
                        .trimStart()
                        .startsWith("%PDF-");

                      setSelectedDriveRubric({
                        id: selectedRubric.id,
                        name: selectedRubric.name,
                        mimeType: selectedRubric.mimeType,
                      });
                      setRubric(selectedRubric.name);
                      setRubricContent(
                        isRawPdf ? "" : returnedContent
                      );
                      setShowRubricPreview(true);

                      setInformationMessage(
                        isRawPdf
                          ? "The PDF is ready to view. Text extraction was skipped because the server returned raw PDF data instead of readable rubric text."
                          : "The Google Drive rubric loaded successfully."
                      );
                    } catch (error) {
                      console.error(error);
                      setSelectedDriveRubric(null);
                      setRubric("Presentation Rubric");
                      setRubricContent("");
                      setErrorMessage(
                        error instanceof Error
                          ? error.message
                          : "Failed to load the selected rubric."
                      );
                    } finally {
                      setDriveLoading(false);
                    }
                  }}
                />
              </div>

              {selectedDriveRubric && (
                <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-sm font-bold text-indigo-900">
                    Selected from Google Drive
                  </p>
                  <p className="mt-1 break-words text-sm text-indigo-800">
                    {selectedDriveRubric.name}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRubricPreview((current) => !current);
                    setIsEditingRubric(false);
                  }}
                  disabled={
                    isBusy ||
                    (!selectedDriveRubric && !rubricContent)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showRubricPreview ? "Hide Rubric" : "View Rubric"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingRubric(true);
                    setShowRubricPreview(false);
                    setSavedStatus(null);
                  }}
                  disabled={isBusy || !rubricContent}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit Extracted Text
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setSavedStatus(null);

                    try {
                      const response = await fetch(
                        "/api/ai/rubric/save",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            name: rubric,
                            content: rubricContent,
                          }),
                        }
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(
                          data.error || "Save failed"
                        );
                      }

                      setSavedStatus("Saved");
                      setIsEditingRubric(false);
                    } catch (error) {
                      console.error(error);
                      setSavedStatus(
                        error instanceof Error
                          ? error.message
                          : "Save failed"
                      );
                    }

                    window.setTimeout(
                      () => setSavedStatus(null),
                      3000
                    );
                  }}
                  disabled={isBusy || !rubricContent}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Rubric to Profile
                </button>

                {savedStatus && (
                  <span className="text-sm font-semibold text-slate-600">
                    {savedStatus}
                  </span>
                )}
              </div>

              {isEditingRubric && (
                <div className="mt-4">
                  <textarea
                    value={rubricContent}
                    onChange={(event) =>
                      setRubricContent(event.target.value)
                    }
                    rows={12}
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              )}

              {showRubricPreview && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Rubric Preview
                      </h3>
                      <p className="text-sm text-slate-500">
                        {rubric}
                      </p>
                    </div>

                    {selectedDriveRubric && (
                      <a
                        href={`https://drive.google.com/file/d/${selectedDriveRubric.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        Open in Google Drive
                      </a>
                    )}
                  </div>

                  {selectedDriveRubric ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${selectedDriveRubric.id}/preview`}
                      title={`Rubric preview: ${selectedDriveRubric.name}`}
                      className="h-[700px] w-full bg-white"
                      allow="autoplay"
                    />
                  ) : rubricContent ? (
                    <div className="p-5">
                      <ul className="list-inside list-decimal space-y-3 text-sm leading-6 text-slate-700">
                        {parseRubric(rubricContent).map(
                          (item, index) => (
                            <li key={`${item.title}-${index}`}>
                              <strong>{item.title}</strong>
                              {item.description
                                ? ` — ${item.description}`
                                : ""}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="p-5 text-sm text-slate-500">
                      No readable rubric text is available. Use the Google Drive preview above.
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">
                Presentation topic
              </span>

              <input
                type="text"
                value={topic}
                onChange={(event) =>
                  setTopic(event.target.value)
                }
                disabled={isBusy}
                placeholder="Example: Book presentation"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
              />
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
          <h2 className="text-left text-xl font-bold">
            2. Record the Presentation
          </h2>

          <div
            className={`mx-auto mt-7 flex h-28 w-28 items-center justify-center rounded-full ${
              isRecording
                ? "animate-pulse bg-red-100"
                : "bg-indigo-100"
            }`}
          >
            <span className="text-5xl">
              {isRecording ? "🎙️" : "🎤"}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              {status === "ready" &&
                "Ready to begin"}
              {status === "recording" &&
                "Recording presentation"}
              {status === "recorded" &&
                "Recording complete"}
              {status === "diarizing" &&
                "Separating detected speakers"}
              {status ===
                "confirming-speakers" &&
                "Waiting for teacher confirmation"}
              {status === "grading" &&
                "Generating assessments"}
              {status === "complete" &&
                "Assessment complete"}
              {status === "error" &&
                "Recording error"}
            </p>

            <p className="mt-2 font-mono text-5xl font-bold">
              {formatTime(seconds)}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {!isRecording && !audioBlob && (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isBusy}
                  className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start Presentation
                </button>

                <label className="rounded-xl border-2 border-slate-300 px-8 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    disabled={isBusy}
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file) {
                        setAudioBlob(file);
                        setAudioUrl(URL.createObjectURL(file));
                        setStatus("recorded");
                        setInformationMessage(
                          "Audio file uploaded. Review it, then click Analyze Speakers."
                        );
                        console.log(
                          `Audio file uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
                        );
                      }
                    }}
                    className="hidden"
                  />
                  Upload Audio File
                </label>
              </>
            )}

            {isRecording && (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-xl bg-red-600 px-8 py-3 font-bold text-white transition hover:bg-red-700"
              >
                Stop Presentation
              </button>
            )}

            {audioBlob &&
              !isRecording &&
              !diarizationResult && (
                <>
                  <button
                    type="button"
                    onClick={analyzeSpeakers}
                    disabled={isDiarizing}
                    className="rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDiarizing
                      ? "Analyzing Speakers..."
                      : "Analyze Speakers"}
                  </button>

                  <button
                    type="button"
                    onClick={resetEverything}
                    disabled={isDiarizing}
                    className="rounded-xl border border-slate-300 px-8 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Record Again
                  </button>
                </>
              )}

            {audioBlob &&
              diarizationResult &&
              !isRecording && (
                <button
                  type="button"
                  onClick={resetEverything}
                  disabled={isGrading}
                  className="rounded-xl border border-slate-300 px-8 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start a New Recording
                </button>
              )}
          </div>

          {audioUrl && (
            <div className="mx-auto mt-7 max-w-2xl rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold">
                  Review the recording
                </p>
                <button
                  type="button"
                  onClick={saveRecording}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  💾 Save Recording
                </button>
              </div>

              <audio
                controls
                src={audioUrl}
                className="w-full"
              >
                Your browser does not support audio
                playback.
              </audio>
            </div>
          )}

          {informationMessage && (
            <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-4 text-left text-blue-900">
              {informationMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4 text-left text-red-800">
              {errorMessage}
            </div>
          )}
        </section>

        {diarizationResult && (
          <SpeakerConfirmationSection
            result={diarizationResult}
            studentNames={validStudentNames}
            mappings={speakerMappings}
            selectedStudentAssignments={
              selectedStudentAssignments
            }
            duplicateStudentAssignments={
              duplicateStudentAssignments
            }
            studentsWithoutDetectedVoice={
              studentsWithoutDetectedVoice
            }
            onMappingChange={
              updateSpeakerMapping
            }
            onGrade={gradeConfirmedSpeakers}
            isGrading={isGrading}
            allSpeakersAssigned={
              allSpeakersAssigned
            }
            audioBlob={audioBlob}
          />
        )}

        {finalResult && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              4. Review and Grade the Presentation
            </h2>
            <p className="mt-2 text-slate-600">
              Choose what you want to review next. The AI feedback and the teacher grading form are kept separate so the teacher remains in control of the final grade.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiFeedback((current) => !current);
                  setShowTeacherGrading(false);
                }}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700"
              >
                {showAiFeedback ? "Hide AI Feedback" : "🤖 View AI Feedback"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTeacherGrading((current) => !current);
                  setShowAiFeedback(false);
                }}
                className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-600"
              >
                {showTeacherGrading ? "Hide Teacher Grading" : "📝 Teacher Grade Presentation"}
              </button>

              <button
                type="button"
                onClick={saveRecording}
                disabled={!audioUrl}
                className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                💾 Save Recording
              </button>
            </div>
          </section>
        )}

        {finalResult && showAiFeedback && (
          <FinalAssessmentReport result={finalResult} />
        )}

        {finalResult && showTeacherGrading && (
          <FinalizationSection
            result={finalResult}
            teacherFinalScore={teacherFinalScore}
            teacherReviewNote={teacherReviewNote}
            isFinalized={isFinalized}
            reportStatus={reportStatus}
            onScoreChange={(value) => {
              setTeacherFinalScore(value);
              setIsFinalized(false);
            }}
            onNoteChange={(value) => {
              setTeacherReviewNote(value);
              setIsFinalized(false);
            }}
            onFinalize={() => {
              setIsFinalized(true);
              setReportStatus(
                "Teacher review has been finalized."
              );
            }}
            onSave={() => saveResults()}
            onDownload={() => {
              const finalPayload = {
                ...finalResult,
                teacherFinalScore:
                  teacherFinalScore ??
                  finalResult.groupAssessment.overallScore,
                teacherReviewNote: teacherReviewNote.trim(),
                finalizedAt: new Date().toISOString(),
              };

              const blob = new Blob(
                [JSON.stringify(finalPayload, null, 2)],
                { type: "application/json" }
              );
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `oral_iq_assessment_${Date.now()}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              setReportStatus("Assessment downloaded.");
            }}
          />
        )}

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Teacher review required:</strong>{" "}
          Voice separation, transcription, speaker
          matching, and AI scoring can contain errors.
          The teacher must review the recording,
          transcript, speaker assignments, evidence,
          and scores before saving or sharing a final
          grade.
        </div>
      </div>
    </main>
  );
}

function SpeakerConfirmationSection({
  result,
  studentNames,
  mappings,
  selectedStudentAssignments,
  duplicateStudentAssignments,
  studentsWithoutDetectedVoice,
  onMappingChange,
  onGrade,
  isGrading,
  allSpeakersAssigned,
  audioBlob,
}: {
  result: DiarizationResult;
  studentNames: string[];
  mappings: Record<string, string>;
  selectedStudentAssignments: string[];
  duplicateStudentAssignments: string[];
  studentsWithoutDetectedVoice: string[];
  onMappingChange: (
    speaker: string,
    event: ChangeEvent<HTMLSelectElement>
  ) => void;
  onGrade: () => void;
  isGrading: boolean;
  allSpeakersAssigned: boolean;
  audioBlob: Blob | null;
}) {
  const [identifying, setIdentifying] = useState<
    Record<string, boolean>
  >({});

  const [identifyMatches, setIdentifyMatches] = useState<
    Record<string, Array<{ name: string; student_id?: string; distance?: number }>>
  >({});

  async function identifySpeaker(speaker: string) {
    if (!audioBlob) return;

    try {
      setIdentifying((s) => ({ ...s, [speaker]: true }));

      const audioExtension = audioBlob.type.includes("ogg")
        ? "ogg"
        : "webm";

      const audioFile = new File(
        [audioBlob],
        `oral-presentation-${Date.now()}.${audioExtension}`,
        { type: audioBlob.type || "audio/webm" }
      );

      const form = new FormData();
      form.append("audio", audioFile);
      form.append("top_k", "5");

      const res = await fetch(`/api/speaker/identify`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      const matches = Array.isArray(data.matches) ? data.matches : [];

      setIdentifyMatches((m) => ({ ...m, [speaker]: matches }));
    } catch (err) {
      console.error("identify error", err);
      setIdentifyMatches((m) => ({ ...m, [speaker]: [] }));
    } finally {
      setIdentifying((s) => ({ ...s, [speaker]: false }));
    }
  }
  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2 className="text-xl font-bold">
              3. Confirm Each Detected Speaker
            </h2>

            <p className="mt-2 max-w-3xl leading-7 text-slate-600">
              Listen to the recording and review the
              transcript. Match each detected voice to
              the correct student before generating
              individual grades.
            </p>
          </div>

          <div className="rounded-xl bg-indigo-50 px-5 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
              Detected Voices
            </p>

            <p className="mt-1 text-3xl font-bold text-indigo-950">
              {result.detectedSpeakers.length}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {result.detectedSpeakers.map(
            (speaker) => {
              const statistic =
                result.speakerStatistics.find(
                  (item) =>
                    item.speaker === speaker
                );

              const selectedValue =
                mappings[speaker] ?? "";

              return (
                <article
                  key={speaker}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">
                        {speaker}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {statistic
                          ? `${formatDecimalTime(
                              statistic.speakingSeconds
                            )} speaking time · ${formatPercentage(
                              statistic.speakingPercentage
                            )}`
                          : "No speaking statistics available"}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {statistic?.wordCount ?? 0} words
                    </span>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold">
                      Who is this speaker?
                    </span>

                    <select
                      value={selectedValue}
                      onChange={(event) =>
                        onMappingChange(
                          speaker,
                          event
                        )
                      }
                      disabled={isGrading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        Select a student
                      </option>

                      {studentNames.map(
                        (studentName) => {
                          const assignedElsewhere =
                            selectedStudentAssignments.includes(
                              studentName
                            ) &&
                            selectedValue !==
                              studentName;

                          return (
                            <option
                              key={studentName}
                              value={studentName}
                              disabled={
                                assignedElsewhere
                              }
                            >
                              {studentName}
                              {assignedElsewhere
                                ? " — already assigned"
                                : ""}
                            </option>
                          );
                        }
                      )}

                      <option
                        value={NON_STUDENT_VALUE}
                      >
                        Not a listed student
                      </option>
                    </select>
                  </label>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => identifySpeaker(speaker)}
                      disabled={isGrading || identifying[speaker]}
                      className="mr-3 rounded-md bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 hover:bg-indigo-200 disabled:opacity-50"
                    >
                      {identifying[speaker]
                        ? "Identifying..."
                        : "Identify"}
                    </button>

                    {identifyMatches[speaker] && (
                      <div className="mt-2 text-sm text-slate-600">
                        <div className="mb-1 font-semibold">Matches:</div>
                        <ul className="space-y-1">
                          {identifyMatches[speaker].length === 0 && (
                            <li>No matches found</li>
                          )}
                          {identifyMatches[speaker].map((m, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="flex-1">{m.name}{m.distance ? ` — ${m.distance.toFixed(3)}` : ''}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onMappingChange(speaker, {
                                    target: { value: m.name },
                                  } as any)
                                }
                                className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                              >
                                Assign
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>

        {duplicateStudentAssignments.length >
          0 && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
            Duplicate student assignment detected:{" "}
            {duplicateStudentAssignments.join(", ")}.
            Assign each student to only one voice.
          </div>
        )}

        {studentsWithoutDetectedVoice.length >
          0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <p className="font-bold">
              No detected voice is currently assigned
              to:
            </p>

            <p className="mt-1">
              {studentsWithoutDetectedVoice.join(", ")}
            </p>

            <p className="mt-2 text-sm leading-6">
              These students will receive a
              no-evidence or limited-evidence report
              unless a detected voice is assigned to
              them.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onGrade}
            disabled={
              isGrading ||
              !allSpeakersAssigned ||
              duplicateStudentAssignments.length > 0
            }
            className="rounded-xl bg-indigo-700 px-8 py-3 font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGrading
              ? "Generating Reports..."
              : "Confirm Speakers and Grade"}
          </button>
        </div>
      </div>

      <SpeakerStatisticsSection result={result} />

      <DiarizedTranscriptSection
        segments={result.segments}
        mappings={mappings}
      />
    </section>
  );
}

function SpeakerStatisticsSection({
  result,
}: {
  result: DiarizationResult;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        Speaker Participation
      </h2>

      <p className="mt-2 text-slate-600">
        These figures are calculated from the
        diarized transcript and should be checked
        against the recording.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-sm text-slate-500">
              <th className="px-3 py-3">
                Speaker
              </th>
              <th className="px-3 py-3">
                Speaking Time
              </th>
              <th className="px-3 py-3">
                Share
              </th>
              <th className="px-3 py-3">
                Segments
              </th>
              <th className="px-3 py-3">
                Words
              </th>
            </tr>
          </thead>

          <tbody>
            {result.speakerStatistics.map(
              (statistic) => (
                <tr
                  key={statistic.speaker}
                  className="border-b border-slate-100"
                >
                  <td className="px-3 py-4 font-bold">
                    {statistic.speaker}
                  </td>

                  <td className="px-3 py-4">
                    {formatDecimalTime(
                      statistic.speakingSeconds
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                statistic.speakingPercentage
                              )
                            )}%`,
                          }}
                        />
                      </div>

                      <span>
                        {formatPercentage(
                          statistic.speakingPercentage
                        )}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-4">
                    {statistic.segmentCount}
                  </td>

                  <td className="px-3 py-4">
                    {statistic.wordCount}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {result.overlapWarnings.length > 0 && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h3 className="font-bold text-orange-950">
            Possible Simultaneous Speech
          </h3>

          <div className="mt-3 space-y-2">
            {result.overlapWarnings
              .slice(0, 10)
              .map((warning, index) => (
                <p
                  key={`${warning.firstSpeaker}-${warning.secondSpeaker}-${index}`}
                  className="text-sm text-orange-900"
                >
                  {warning.firstSpeaker} and{" "}
                  {warning.secondSpeaker}:{" "}
                  {formatDecimalTime(
                    warning.start
                  )}–{formatDecimalTime(
                    warning.end
                  )}{" "}
                  ({warning.duration.toFixed(1)}{" "}
                  seconds)
                </p>
              ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-bold text-amber-950">
            Review Warnings
          </h3>

          <ul className="mt-3 space-y-2">
            {result.warnings.map(
              (warning, index) => (
                <li
                  key={`${warning}-${index}`}
                  className="flex gap-3 text-sm leading-6 text-amber-950"
                >
                  <span>•</span>
                  <span>{warning}</span>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function DiarizedTranscriptSection({
  segments,
  mappings,
}: {
  segments: DiarizedSegment[];
  mappings: Record<string, string>;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        Speaker-Labeled Transcript
      </h2>

      <div className="mt-5 space-y-4">
        {segments.map((segment) => {
          const mappedValue =
            mappings[segment.speaker];

          const displayName =
            mappedValue === NON_STUDENT_VALUE
              ? "Not a listed student"
              : mappedValue || segment.speaker;

          return (
            <article
              key={segment.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-indigo-800">
                    {displayName}
                  </span>

                  {displayName !==
                    segment.speaker && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({segment.speaker})
                    </span>
                  )}
                </div>

                <span className="font-mono text-xs text-slate-500">
                  {formatDecimalTime(
                    segment.start
                  )}{" "}
                  –{" "}
                  {formatDecimalTime(
                    segment.end
                  )}
                </span>
              </div>

              <p className="mt-3 leading-7 text-slate-700">
                {segment.text}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FinalAssessmentReport({
  result,
}: {
  result: FinalGradingResult;
}) {
  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">
              Final Assessment Report
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {result.studentNames.join(", ")}
            </h2>

            <p className="mt-2 text-slate-600">
              {result.grade} · {result.topic}
            </p>

            <p className="mt-1 text-sm capitalize text-slate-500">
              {result.presentationType} presentation
              ·{" "}
              {formatDecimalTime(result.duration)}
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-50 px-8 py-5 text-center">
            <p className="text-sm font-semibold text-indigo-700">
              Group Score
            </p>

            <p className="text-4xl font-bold text-indigo-950">
              {
                result.groupAssessment
                  .overallScore
              }
              <span className="text-xl">
                /100
              </span>
            </p>
          </div>
        </div>
      </div>

      <GroupAssessmentSection
        assessment={result.groupAssessment}
      />

      <IndividualAssessmentSection
        assessments={
          result.individualAssessments
        }
      />

      <details className="rounded-2xl bg-white p-6 shadow-sm">
        <summary className="cursor-pointer text-lg font-bold">
          View Final Named Transcript
        </summary>

        <pre className="mt-5 whitespace-pre-wrap font-sans leading-7 text-slate-700">
          {result.namedTranscript}
        </pre>
      </details>

      {result.overlapWarnings.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-950">
          <p className="font-bold">
            Simultaneous-speech review needed
          </p>

          <p className="mt-2 text-sm leading-6">
            Some sections may contain overlapping
            voices. Review those sections in the
            original recording before finalizing
            individual scores.
          </p>
        </div>
      )}
    </section>
  );
}

function FinalizationSection({
  result,
  teacherFinalScore,
  teacherReviewNote,
  isFinalized,
  reportStatus,
  onScoreChange,
  onNoteChange,
  onFinalize,
  onSave,
  onDownload,
}: {
  result: FinalGradingResult;
  teacherFinalScore: number | null;
  teacherReviewNote: string;
  isFinalized: boolean;
  reportStatus: string | null;
  onScoreChange: (value: number | null) => void;
  onNoteChange: (value: string) => void;
  onFinalize: () => void;
  onSave: () => void;
  onDownload: () => void;
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            5. Teacher Grading and Finalization
          </h2>
          <p className="mt-2 text-slate-600">
            Review the AI-generated assessment and apply
            a final group score or note before saving or
            downloading the report.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Finalization status
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {isFinalized ? "Finalized" : "Draft"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Teacher override group score
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={teacherFinalScore ?? ""}
            onChange={(event) => {
              const rawValue = Number(event.target.value);
              onScoreChange(
                Number.isFinite(rawValue)
                  ? clampNumber(rawValue, 0, 100)
                  : null
              );
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Enter a final score"
          />
          <p className="mt-2 text-sm text-slate-500">
            Update the AI recommendation if your final group score should be different.
          </p>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">
            Teacher review note
          </span>
          <textarea
            value={teacherReviewNote}
            onChange={(event) =>
              onNoteChange(event.target.value)
            }
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Add a final comment for this assessment"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onFinalize}
          className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
        >
          Finalize Review
        </button>

        <button
          type="button"
          onClick={onSave}
          className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700"
        >
          💾 Save Results
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
        >
          Download Final Report
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          Final group score: <strong>{teacherFinalScore ?? result.groupAssessment.overallScore}</strong> / 100
        </p>
        {reportStatus && (
          <p className="mt-2 text-slate-600">{reportStatus}</p>
        )}
      </div>
    </section>
  );
}

function GroupAssessmentSection({
  assessment,
}: {
  assessment: GroupAssessment;
}) {
  const categories = [
    {
      title: "Organization",
      value: assessment.organization,
    },
    {
      title: "Content",
      value: assessment.content,
    },
    {
      title: "Clarity",
      value: assessment.clarity,
    },
    {
      title: "Vocabulary and Language",
      value: assessment.vocabulary,
    },
    {
      title: "Fluency",
      value: assessment.fluency,
    },
    {
      title: "Collaboration",
      value: assessment.collaboration,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">
          Group Assessment
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {categories.map((category) => (
            <CategoryCard
              key={category.title}
              title={category.title}
              category={category.value}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl bg-emerald-50 p-6">
          <h3 className="text-lg font-bold text-emerald-950">
            Group Strengths
          </h3>

          <ul className="mt-4 space-y-3">
            {assessment.strengths.map(
              (strength, index) => (
                <li
                  key={`${strength}-${index}`}
                  className="flex gap-3 leading-6 text-emerald-950"
                >
                  <span>✓</span>
                  <span>{strength}</span>
                </li>
              )
            )}
          </ul>
        </article>

        <article className="rounded-2xl bg-amber-50 p-6">
          <h3 className="text-lg font-bold text-amber-950">
            Group Next Steps
          </h3>

          <ul className="mt-4 space-y-3">
            {assessment.improvements.map(
              (improvement, index) => (
                <li
                  key={`${improvement}-${index}`}
                  className="flex gap-3 leading-6 text-amber-950"
                >
                  <span>→</span>
                  <span>{improvement}</span>
                </li>
              )
            )}
          </ul>
        </article>
      </div>

      <article className="rounded-2xl bg-indigo-950 p-6 text-white">
        <h3 className="text-lg font-bold">
          Student-Friendly Group Feedback
        </h3>

        <p className="mt-3 leading-7 text-indigo-50">
          {assessment.studentSummary}
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold">
          Teacher Summary
        </h3>

        <p className="mt-3 leading-7 text-slate-700">
          {assessment.teacherSummary}
        </p>
      </article>
    </section>
  );
}

function CategoryCard({
  title,
  category,
}: {
  title: string;
  category: CategoryResult;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold">
          {title}
        </h3>

        <span className="rounded-full bg-slate-100 px-3 py-1 font-bold">
          {category.score}/20
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        {category.feedback}
      </p>

      {category.evidence.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Evidence
          </p>

          <ul className="mt-2 space-y-2">
            {category.evidence.map(
              (evidence, index) => (
                <li
                  key={`${evidence}-${index}`}
                  className="text-sm leading-6 text-slate-600"
                >
                  “{evidence}”
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </article>
  );
}

function IndividualAssessmentSection({
  assessments,
}: {
  assessments: IndividualAssessment[];
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        Individual Student Reports
      </h2>

      <div className="mt-6 space-y-6">
        {assessments.map((assessment) => (
          <IndividualStudentCard
            key={assessment.studentName}
            assessment={assessment}
          />
        ))}
      </div>
    </section>
  );
}

function IndividualStudentCard({
  assessment,
}: {
  assessment: IndividualAssessment;
}) {
  const categories = [
    {
      title: "Organization",
      value: assessment.organization,
    },
    {
      title: "Content",
      value: assessment.content,
    },
    {
      title: "Clarity",
      value: assessment.clarity,
    },
    {
      title: "Vocabulary",
      value: assessment.vocabulary,
    },
    {
      title: "Fluency",
      value: assessment.fluency,
    },
  ];

  return (
    <article className="rounded-2xl border border-slate-200 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-xl font-bold">
            {assessment.studentName}
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Speaking time:{" "}
            {formatDecimalTime(
              assessment.speakingSeconds
            )}{" "}
            ·{" "}
            {formatPercentage(
              assessment.speakingPercentage
            )}{" "}
            · {assessment.wordCount} words
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Voice label
            {assessment.speakerLabels.length === 1
              ? ""
              : "s"}
            :{" "}
            {assessment.speakerLabels.length > 0
              ? assessment.speakerLabels.join(", ")
              : "No detected voice assigned"}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ParticipationBadge
            status={
              assessment.participationStatus
            }
          />

          <div className="rounded-xl bg-indigo-50 px-5 py-3 text-center">
            <p className="text-xs font-bold text-indigo-700">
              Individual Score
            </p>

            <p className="text-2xl font-bold text-indigo-950">
              {assessment.score === null
                ? "Not Scored"
                : `${assessment.score}/100`}
            </p>
          </div>
        </div>
      </div>

      {assessment.score !== null ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {categories.map((category) =>
            category.value ? (
              <CategoryCard
                key={category.title}
                title={category.title}
                category={category.value}
              />
            ) : null
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          There was not enough reliably assigned
          speaking evidence to calculate an individual
          score.
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-5">
          <h4 className="font-bold text-emerald-950">
            Strengths
          </h4>

          <ul className="mt-3 space-y-2">
            {assessment.strengths.map(
              (strength, index) => (
                <li
                  key={`${strength}-${index}`}
                  className="flex gap-2 text-sm leading-6 text-emerald-950"
                >
                  <span>✓</span>
                  <span>{strength}</span>
                </li>
              )
            )}
          </ul>
        </div>

        <div className="rounded-xl bg-amber-50 p-5">
          <h4 className="font-bold text-amber-950">
            Next Steps
          </h4>

          <ul className="mt-3 space-y-2">
            {assessment.improvements.map(
              (improvement, index) => (
                <li
                  key={`${improvement}-${index}`}
                  className="flex gap-2 text-sm leading-6 text-amber-950"
                >
                  <span>→</span>
                  <span>{improvement}</span>
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-5">
        <h4 className="font-bold">
          Feedback for the Student
        </h4>

        <p className="mt-3 leading-7 text-slate-700">
          {assessment.feedback}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-5">
        <h4 className="font-bold">
          Teacher Note
        </h4>

        <p className="mt-3 text-sm leading-6 text-slate-700">
          {assessment.teacherNote}
        </p>
      </div>
    </article>
  );
}

function ParticipationBadge({
  status,
}: {
  status:
    | "sufficient"
    | "limited"
    | "minimal"
    | "no-evidence";
}) {
  const styles = {
    sufficient:
      "bg-emerald-100 text-emerald-900",
    limited:
      "bg-yellow-100 text-yellow-900",
    minimal:
      "bg-orange-100 text-orange-900",
    "no-evidence":
      "bg-red-100 text-red-900",
  };

  const labels = {
    sufficient: "Sufficient evidence",
    limited: "Limited evidence",
    minimal: "Minimal evidence",
    "no-evidence": "No speaking evidence",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}