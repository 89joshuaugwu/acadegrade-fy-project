/** The shared record as the public share API returns it (GET /api/transcript/share). */

export interface SharedCourse {
  id: string;
  code: string;
  title: string;
  units: number;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  grade?: string;
  gradePoint?: number;
}

export interface SharedSemester {
  id: string;
  label: string;
  session: string;
  level: number;
  semester: number;
  gpa: number;
  pi: number;
  creditLoaded: number;
  /** Empty on a summary link; may be missing on malformed records. */
  courses?: SharedCourse[];
}

export interface SharedTranscript {
  studentName: string;
  matric: string;
  department: string;
  programme: string;
  currentLevel: string;
  /** Present only when the share snapshot carries the student's own profile value. */
  university?: string | null;
  institution?: string | null;
  avatarUrl?: string | null;
  showPhoto?: boolean;
  /** Server-computed with the shared academic rules; absent on old snapshots. */
  cgpa?: number;
  pi?: number;
  totalCredits?: number;
  semesters: SharedSemester[];
  /** 'summary' links carry semester totals only. Absent on older links (full). */
  shareLevel?: 'full' | 'summary';
  /** The student's grading scale (users/{uid}.gradingScale); absent means the 5-point scale. */
  gradingScale?: unknown;
  createdAt?: unknown;
}
