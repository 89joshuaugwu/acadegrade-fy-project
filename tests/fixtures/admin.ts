export const adminListFixture = Array.from({ length: 63 }, (_, index) => ({
  uid: `student-${String(index + 1).padStart(3, '0')}`,
  fullName: `Student ${String(index + 1).padStart(2, '0')}`,
  matric: `20220302${String(index + 1).padStart(5, '0')}`,
  department: index % 2 === 0 ? 'Computer Science' : 'Electrical Engineering',
  currentLevel: ((index % 5) + 1) * 100,
  disabled: index % 11 === 0,
  createdAt: '2026-06-14T12:00:00.000Z',
}));

export const apiMonitorCapFixture = {
  returned: 5_000,
  capped: true,
  windowStart: '2026-06-07T00:00:00.000Z',
  windowEnd: '2026-06-14T00:00:00.000Z',
} as const;
