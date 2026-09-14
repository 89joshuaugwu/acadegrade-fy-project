export const accountFixtures = {
  newStudent: { uid: 'student-new', fullName: 'Chimamanda Adaeze Nwankwo-Okafor', email: 'new.student@example.test', setupComplete: true, semesters: [] },
  incompleteGoogleAccount: { uid: 'student-google-incomplete', email: 'google.student@example.test', providerId: 'google.com', setupComplete: false },
  activeStudent: { uid: 'student-active', fullName: 'Joshua Chimaobi Ugwu', email: 'active.student@example.test', matric: '2022030202909', setupComplete: true },
} as const;
