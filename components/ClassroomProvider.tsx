"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ClassroomCourse = {
  id: string;
  name: string;
  section?: string;
  room?: string;
};

type ClassroomStudent = {
  id: string;
  name: string;
  email?: string;
};

type ClassroomContextType = {
  courses: ClassroomCourse[];
  students: ClassroomStudent[];
  selectedCourse: ClassroomCourse | null;
  importStatus: "idle" | "loading" | "error";
  errorMessage: string;
  loadCourses: () => Promise<void>;
  loadCourseStudents: (course: ClassroomCourse) => Promise<void>;
  clearImportedStudents: () => Promise<void>;
};

type UnknownRecord = Record<string, unknown>;

const ClassroomContext =
  createContext<ClassroomContextType | undefined>(undefined);

function asRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null) {
    return value as UnknownRecord;
  }

  return {};
}

function normalizeCourse(raw: unknown): ClassroomCourse {
  const record = asRecord(raw);
  const nestedCourse = asRecord(record.course);

  return {
    id: String(
      record.id ??
        record.courseId ??
        nestedCourse.id ??
        ""
    ),
    name: String(
      record.name ??
        nestedCourse.name ??
        record.title ??
        nestedCourse.title ??
        "Untitled Course"
    ),
    section:
      typeof record.section === "string"
        ? record.section
        : undefined,
    room:
      typeof record.room === "string"
        ? record.room
        : undefined,
  };
}

function normalizeStudent(raw: unknown): ClassroomStudent {
  const record = asRecord(raw);
  const profile = asRecord(record.profile);
  const profileName = asRecord(profile.name);
  const studentProfile = asRecord(record.studentProfile);
  const studentProfileName = asRecord(studentProfile.name);
  const userProfile = asRecord(record.userProfile);
  const userProfileName = asRecord(userProfile.name);
  const nestedStudent = asRecord(record.student);
  const nestedUser = asRecord(record.user);

  const name = String(
    record.name ??
      profileName.fullName ??
      studentProfileName.fullName ??
      userProfileName.fullName ??
      ""
  ).trim();

  const email = String(
    record.email ??
      record.emailAddress ??
      profile.emailAddress ??
      studentProfile.emailAddress ??
      userProfile.emailAddress ??
      ""
  ).trim();

  return {
    id: String(
      record.userId ??
        record.id ??
        record.studentId ??
        nestedStudent.userId ??
        nestedUser.id ??
        ""
    ),
    name: name || email || "Unknown Student",
    email: email || undefined,
  };
}

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json();

    if (
      typeof data.error === "string" &&
      data.error.trim()
    ) {
      return data.error;
    }

    if (
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }
  } catch {
    // Use the fallback below.
  }

  return fallback;
}

export function ClassroomProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status: sessionStatus } =
    useSession();

  const [courses, setCourses] =
    useState<ClassroomCourse[]>([]);
  const [students, setStudents] =
    useState<ClassroomStudent[]>([]);
  const [selectedCourse, setSelectedCourse] =
    useState<ClassroomCourse | null>(null);
  const [importStatus, setImportStatus] =
    useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSavedClassroom = useCallback(async () => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    try {
      const response = await fetch(
        "/api/classroom/import",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to load saved classroom."
          )
        );
      }

      const data = await response.json();

      setSelectedCourse(
        data.classroom
          ? normalizeCourse(data.classroom)
          : null
      );

      const savedStudents = Array.isArray(data.students)
        ? data.students
            .map(normalizeStudent)
            .filter(
              (student: ClassroomStudent) =>
                Boolean(student.id && student.name)
            )
        : [];

      setStudents(savedStudents);
    } catch (error) {
      console.warn(
        "[ClassroomProvider] Saved classroom could not be loaded. Continuing without a saved classroom.",
        error
      );

      setSelectedCourse(null);
      setStudents([]);
      setErrorMessage("");
      setImportStatus("idle");
    }
  }, [sessionStatus]);

  useEffect(() => {
    void loadSavedClassroom();
  }, [loadSavedClassroom]);

  const loadCourses = useCallback(async () => {
    setImportStatus("loading");
    setErrorMessage("");

    if (!session?.user) {
      setErrorMessage(
        "Please sign in with Google first to access your Classroom courses."
      );
      setImportStatus("error");
      return;
    }

    try {
      const response = await fetch(
        "/api/classroom/courses"
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to load courses."
          )
        );
      }

      const data = await response.json();

      const rawCourses = Array.isArray(data.courses)
        ? data.courses
        : [];

      const normalizedCourses = rawCourses
        .map(normalizeCourse)
        .filter(
          (course: ClassroomCourse) =>
            Boolean(course.id && course.name)
        );

      setCourses(normalizedCourses);
      setImportStatus("idle");
    } catch (error) {
      console.error(
        "[ClassroomProvider] Course loading failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Classroom courses."
      );

      setImportStatus("error");
    }
  }, [session]);

  const loadCourseStudents = useCallback(
    async (course: ClassroomCourse) => {
      setImportStatus("loading");
      setErrorMessage("");

      if (!session?.user) {
        setErrorMessage(
          "Please sign in with Google first to access your Classroom students."
        );
        setImportStatus("error");
        return;
      }

      try {
        const studentsResponse = await fetch(
          `/api/classroom/students?courseId=${encodeURIComponent(
            course.id
          )}`
        );

        if (!studentsResponse.ok) {
          throw new Error(
            await readErrorMessage(
              studentsResponse,
              "Unable to load students."
            )
          );
        }

        const studentsData =
          await studentsResponse.json();

        const rawStudents = Array.isArray(
          studentsData.students
        )
          ? studentsData.students
          : [];

        const normalizedStudents = rawStudents
          .map(normalizeStudent)
          .filter(
            (student: ClassroomStudent) =>
              Boolean(student.id && student.name)
          );

        const importResponse = await fetch(
          "/api/classroom/import",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              course,
              students: normalizedStudents,
            }),
          }
        );

        if (!importResponse.ok) {
          console.warn(
            "[ClassroomProvider] Classroom data could not be saved. Continuing with the live Google Classroom roster."
          );

          setSelectedCourse(course);
          setStudents(normalizedStudents);
          setImportStatus("idle");
          setErrorMessage("");
          return;
        }

        const savedData = await importResponse.json();

        setSelectedCourse(
          savedData.classroom
            ? normalizeCourse(savedData.classroom)
            : course
        );

        const savedStudents = Array.isArray(
          savedData.students
        )
          ? savedData.students
              .map(normalizeStudent)
              .filter(
                (student: ClassroomStudent) =>
                  Boolean(student.id && student.name)
              )
          : normalizedStudents;

        setStudents(savedStudents);
        setImportStatus("idle");
      } catch (error) {
        console.error(
          "[ClassroomProvider] Student import failed:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to import Classroom students."
        );

        setImportStatus("error");
      }
    },
    [session]
  );

  const clearImportedStudents =
    useCallback(async () => {
      setImportStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/classroom/import",
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Unable to clear saved classroom."
            )
          );
        }

        setSelectedCourse(null);
        setStudents([]);
        setImportStatus("idle");
      } catch (error) {
        console.error(
          "[ClassroomProvider] Clear failed:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to clear saved classroom."
        );

        setImportStatus("error");
      }
    }, []);

  const value = useMemo(
    () => ({
      courses,
      students,
      selectedCourse,
      importStatus,
      errorMessage,
      loadCourses,
      loadCourseStudents,
      clearImportedStudents,
    }),
    [
      courses,
      students,
      selectedCourse,
      importStatus,
      errorMessage,
      loadCourses,
      loadCourseStudents,
      clearImportedStudents,
    ]
  );

  return (
    <ClassroomContext.Provider value={value}>
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);

  if (!context) {
    throw new Error(
      "useClassroom must be used within a ClassroomProvider"
    );
  }

  return context;
}