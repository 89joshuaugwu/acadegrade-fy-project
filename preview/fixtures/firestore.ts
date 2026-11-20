/**
 * Firestore and Realtime Database seed for the UI preview (dev only). One realistic student with five
 * semesters (the latest still has a course awaiting its result), notifications and two timetables.
 * Numbers come from the real grading rules, so every GPA and CGPA on screen adds up.
 */
import { computeCourseMetrics, computeSemesterGPA, type GpaRow } from '@/lib/cgpa/academicRules';
import { daysAgo, PREVIEW_UID } from '../runtime';

type Row = [code: string, title: string, units: number, ca: number | null, exam: number | null, ar?: boolean];

const SEMESTERS: { id: string; level: number; semester: 1 | 2; session: string; ago: number; complete: boolean; rows: Row[] }[] = [
  {
    id: 'y1s1', level: 100, semester: 1, session: '2021/2022', ago: 900, complete: true,
    rows: [
      ['GST 101', 'Use of English I', 2, 24, 48],
      ['MTH 101', 'Elementary Mathematics I', 3, 26, 52],
      ['PHY 101', 'General Physics I', 3, 21, 40],
      ['CHM 101', 'General Chemistry I', 3, 18, 39],
      ['CSC 101', 'Introduction to Computer Science', 3, 27, 55],
      ['BIO 101', 'General Biology I', 2, 20, 44],
    ],
  },
  {
    id: 'y1s2', level: 100, semester: 2, session: '2021/2022', ago: 720, complete: true,
    rows: [
      ['GST 102', 'Use of English II', 2, 25, 47],
      ['MTH 102', 'Elementary Mathematics II', 3, 24, 49],
      ['PHY 102', 'General Physics II', 3, 22, 36],
      ['CSC 102', 'Introduction to Programming', 3, 28, 58],
      ['STA 102', 'Introductory Statistics', 3, 23, 45],
      ['GST 104', 'Nigerian Peoples and Culture', 2, 26, 50],
    ],
  },
  {
    id: 'y2s1', level: 200, semester: 1, session: '2022/2023', ago: 540, complete: true,
    rows: [
      ['CSC 201', 'Computer Programming I', 3, 27, 56],
      ['CSC 203', 'Discrete Structures', 3, 22, 42],
      ['MTH 201', 'Mathematical Methods I', 3, 19, 33],
      ['CSC 205', 'Digital Logic Design', 3, 25, 47],
      ['GST 201', 'Philosophy and Logic', 2, 24, 46],
      ['ENT 201', 'Entrepreneurship Studies', 2, 26, 51],
    ],
  },
  {
    id: 'y2s2', level: 200, semester: 2, session: '2022/2023', ago: 360, complete: true,
    rows: [
      ['CSC 202', 'Computer Programming II', 3, 28, 57],
      ['CSC 204', 'Data Structures', 3, 26, 50],
      ['CSC 206', 'Operating Systems I', 3, 23, 44],
      ['MTH 202', 'Linear Algebra', 3, 21, 41],
      ['CSC 208', 'Introduction to Databases', 3, 27, 52],
    ],
  },
  {
    id: 'y3s1', level: 300, semester: 1, session: '2023/2024', ago: 120, complete: false,
    rows: [
      ['CSC 301', 'Software Engineering', 3, 27, 54],
      ['CSC 303', 'Algorithms and Complexity', 3, 25, 46],
      ['CSC 305', 'Computer Architecture', 3, 24, 47],
      ['MTH 301', 'Numerical Analysis', 3, 22, null, true],
      ['CSC 307', 'Web Technologies', 2, 28, 56],
    ],
  },
];

export function firestoreSeed(): Record<string, unknown> {
  const uid = PREVIEW_UID;
  const out: Record<string, unknown> = {};

  out['config/settings'] = { maintenanceMode: false };

  out[`users/${uid}`] = {
    fullName: 'Adaeze Chiamaka Okafor',
    email: 'adaeze.okafor@student.preview',
    matric: 'UG/2021/CSC/04417',
    university: 'Nnamdi Azikiwe University, Awka',
    department: 'Computer Science',
    programme: 'B.Sc. Computer Science',
    currentLevel: 300,
    currentSession: '2023/2024',
    entrySession: '2021/2022',
    graduationSession: '2024/2025',
    courseDuration: 4,
    recordMode: 'full',
    gradeMode: 'scores',
    avatarUrl: null,
    isAdmin: false,
    disabled: false,
    fcmToken: null,
    setupComplete: true,
    setupCompletedAt: daysAgo(900),
    semestersCompleted: 4,
    tourCompleted: true,
    resultsTourCompleted: true,
    ageStatus: 'adult',
    aiConsent: true,
    notificationPreferences: { semesterSaved: true, degreeClass: true, aiInsights: true, adminBroadcasts: true },
    coins: 40,
    createdAt: daysAgo(900),
    updatedAt: daysAgo(2),
  };

  for (const s of SEMESTERS) {
    const gpaRows: GpaRow[] = [];
    s.rows.forEach(([code, title, units, ca, exam, ar], index) => {
      const metrics = computeCourseMetrics({ code, title, units, caScore: ca, examScore: exam, ...(ar ? { isAR: true } : {}) });
      gpaRows.push(metrics);
      out[`users/${uid}/semesters/${s.id}/courses/c${index + 1}`] = {
        ...metrics,
        ...(ar ? { isAR: true, totalScore: null } : {}),
        createdAt: daysAgo(s.ago),
        updatedAt: daysAgo(s.ago),
      };
    });
    const result = computeSemesterGPA(gpaRows);
    out[`users/${uid}/semesters/${s.id}`] = {
      label: `${s.level} Level, ${s.semester === 1 ? 'First' : 'Second'} Semester`,
      session: s.session,
      level: s.level,
      semester: s.semester,
      gpa: result.gpa,
      pi: result.pi,
      creditLoaded: result.creditLoaded,
      isComplete: s.complete,
      recapShownAt: s.complete ? daysAgo(s.ago - 1) : undefined,
      createdAt: daysAgo(s.ago),
      updatedAt: daysAgo(s.ago),
    };
  }

  const notes: [string, string, string, boolean, number, string?][] = [
    ['success', 'Semester saved', '300 Level, First Semester is saved. MTH 301 is still awaiting its result.', false, 0, '/results/y3s1'],
    ['achievement', 'You moved up a class', 'Your CGPA is now in Second Class Upper. Keep going.', false, 3, '/dashboard'],
    ['info', 'Timetable ends soon', 'Your Rain semester lectures timetable ends in 3 days. Extend it if you still need it.', true, 6, '/timetable'],
    ['tip', 'Preview expected grades', 'Add the grade you expect for MTH 301 to see where your CGPA could land.', true, 9, '/results/y3s1'],
    ['system', 'Updated Privacy notice', 'We updated our Privacy notice. Nothing changes in how your results are stored.', true, 20],
  ];
  notes.forEach(([type, title, message, read, ago, actionUrl], i) => {
    out[`notifications/${uid}/items/n${i + 1}`] = { type, title, message, read, ...(actionUrl ? { actionUrl } : {}), createdAt: daysAgo(ago, 9 + i) };
  });

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(start.getDate() - 30);
  const end = new Date(today);
  end.setDate(end.getDate() + 3);
  out[`users/${uid}/timetables/tt-lectures`] = {
    title: 'Rain semester lectures',
    kind: 'fixed',
    validity: { startsOn: iso(start), unit: 'weeks', amount: 5, endsAt: end.toISOString() },
    reminders: { defaultOffsetsMin: [10] },
    status: 'active',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(4),
    events: [
      { id: 'e1', title: 'Software Engineering', type: 'lecture', courseCode: 'CSC 301', venue: 'Lecture Theatre 2', recurrence: { kind: 'weekly', days: [1, 3] }, startTime: '08:00', endTime: '10:00' },
      { id: 'e2', title: 'Algorithms and Complexity', type: 'lecture', courseCode: 'CSC 303', venue: 'CS Lab 1', recurrence: { kind: 'weekly', days: [2] }, startTime: '10:00', endTime: '12:00' },
      { id: 'e3', title: 'Computer Architecture', type: 'lecture', courseCode: 'CSC 305', venue: 'Hall B', recurrence: { kind: 'weekly', days: [2, 4] }, startTime: '13:00', endTime: '14:00' },
      { id: 'e4', title: 'Numerical Analysis', type: 'class', courseCode: 'MTH 301', venue: 'Maths Block 3', recurrence: { kind: 'weekly', days: [5] }, startTime: '09:00', endTime: '11:00' },
      { id: 'e5', title: 'Web Technologies practical', type: 'class', courseCode: 'CSC 307', venue: 'CS Lab 2', recurrence: { kind: 'weekly', days: [4] }, startTime: '15:00', endTime: '17:00', reminderOffsetsMin: [30, 10] },
    ],
  };
  const readEnd = new Date(today);
  readEnd.setDate(readEnd.getDate() + 21);
  out[`users/${uid}/timetables/tt-reading`] = {
    title: 'Exam reading plan',
    kind: 'reading',
    builtWith: 'academind',
    validity: { startsOn: iso(today), unit: 'weeks', amount: 3, endsAt: readEnd.toISOString() },
    reminders: { defaultOffsetsMin: [10] },
    status: 'active',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    events: [
      { id: 'r1', title: 'Study: Algorithms and Complexity', type: 'study', courseCode: 'CSC 303', recurrence: { kind: 'weekly', days: [1, 4] }, startTime: '17:00', endTime: '18:30' },
      { id: 'r2', title: 'Study: Numerical Analysis', type: 'study', courseCode: 'MTH 301', recurrence: { kind: 'weekly', days: [2, 6] }, startTime: '16:00', endTime: '17:30' },
      { id: 'r3', title: 'Study: Computer Architecture', type: 'study', courseCode: 'CSC 305', recurrence: { kind: 'weekly', days: [3] }, startTime: '18:00', endTime: '19:00' },
    ],
  };

  // Insights (AcadeMind): a cached forecast and written analysis, as /api/ai/forecast and /api/ai/insights save them.
  out[`analytics/${uid}`] = {
    insightsStale: false,
    forecast: {
      slope: 0.04,
      projected: [3.82, 3.86],
      projectedPi: [3.82, 3.86],
      projectedCgpa: [4.55, 4.58],
      riskScore: 1,
      trendLabel: 'Steady and rising',
      trendDirection: 'improving',
      aiEnhanced: true,
      lastUpdated: daysAgo(2),
    },
    lastInsight: {
      timestamp: daysAgo(1),
      data: {
        strengths: [
          'Your computing courses are consistently your strongest: CSC 102, CSC 201 and CSC 202 all scored 80 or above.',
          'Your continuous assessment is reliable, usually 24 or more out of 30.',
        ],
        concerns: [
          'Mathematics is where you drop marks: MTH 201 (52) and MTH 202 (62) pulled your 200L GPA down.',
          'Exam scores dip in heavy semesters, so plan revision early when you carry 18 units or more.',
        ],
        recommendations: [
          'Your MTH 301 result is still awaited. Keep a weekly practice slot for Mathematics; past questions help most.',
          'Keep every remaining course at a B or better to stay above the First Class line.',
        ],
        degreeOutlook: 'You are on course for a First Class. Your CGPA of 4.53 sits just above the 4.50 line, so steady As and Bs in 300L and 400L keep it safe.',
      },
    },
  };

  return out;
}

export function rtdbSeed(): Record<string, unknown> {
  return { [`notif_counts/${PREVIEW_UID}`]: { unread: 2 } };
}
