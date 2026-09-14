export const FIXED_TEST_DATE = new Date('2026-06-14T12:00:00.000Z');

export const mixedScoreCourses = [
  { id: 'course-ca-exam', code: 'CSC 425', title: 'Allation Management', units: 2, caScore: 26, examScore: 28 },
  { id: 'course-total-only', code: 'CSC 415', title: 'Computer Graphics', units: 2, totalScore: 74, caScore: null, examScore: null },
  { id: 'course-letter-only', code: 'CSC 463', title: 'Software Engineering', units: 2, grade: 'B' as const, caScore: null, examScore: null },
  { id: 'course-zero', code: 'CSC 455', title: 'Computer Networks and Data Communication', units: 3, caScore: 0, examScore: 0 },
  { id: 'course-awaiting', code: 'CSC 499', title: 'Final Year Project', units: 6, caScore: null, examScore: null, isAR: true },
] as const;

export const weightedSemesterFixture = [
  { gpa: 4, pi: 4.2, creditLoaded: 12 },
  { gpa: 3, pi: 3.1, creditLoaded: 18 },
];

export const degreeClassBoundaries = [0, 0.99, 1, 1.49, 1.5, 2.39, 2.4, 3.49, 3.5, 4.49, 4.495, 4.5, 5] as const;
