import { reply, type ApiFixture } from './types';

/**
 * Transcript share links (mirrors app/api/transcript/share). Sample ids:
 * 5f2a9c81d3e4 opens straight away (summary), 9b7e1a4c6d20 needs PIN 4821,
 * 0c3d5e7f9a1b opens the full record, e1e1e1e1e1e1 has expired. Anything else is not found.
 */
export const PREVIEW_SHARE_IDS = { summary: '5f2a9c81d3e4', pin: '9b7e1a4c6d20', full: '0c3d5e7f9a1b', expired: 'e1e1e1e1e1e1' } as const;
const PREVIEW_PIN = '4821';

const DAY = 86_400_000;

function course(id: string, code: string, title: string, units: number, ca: number, exam: number) {
  const totalScore = ca + exam;
  const [grade, gradePoint] = totalScore >= 70 ? ['A', 5] : totalScore >= 60 ? ['B', 4] : totalScore >= 50 ? ['C', 3] : totalScore >= 45 ? ['D', 2] : totalScore >= 40 ? ['E', 1] : ['F', 0];
  return { id, code, title, units, caScore: ca, examScore: exam, totalScore, grade, gradePoint };
}

function record(level: 'full' | 'summary') {
  const first = [
    course('c1', 'CSC 101', 'Introduction to Computer Science', 3, 26, 52),
    course('c2', 'MTH 101', 'Elementary Mathematics I', 3, 22, 41),
    course('c3', 'PHY 101', 'General Physics I', 3, 20, 44),
    course('c4', 'GST 111', 'Communication in English', 2, 25, 49),
  ];
  const second = [
    course('c5', 'CSC 102', 'Introduction to Programming', 3, 28, 55),
    course('c6', 'MTH 102', 'Elementary Mathematics II', 3, 21, 42),
    course('c7', 'STA 112', 'Probability I', 3, 24, 47),
    course('c8', 'GST 112', 'Nigerian Peoples and Culture', 2, 26, 50),
  ];
  const sem = (id: string, label: string, semester: 1 | 2, courses: ReturnType<typeof course>[]) => {
    const units = courses.reduce((sum, c) => sum + c.units, 0);
    const points = courses.reduce((sum, c) => sum + c.units * c.gradePoint, 0);
    const gpa = Math.round((points / units) * 100) / 100;
    return { id, label, session: '2021/2022', level: 100, semester, gpa, pi: gpa, creditLoaded: units, courses: level === 'summary' ? [] : courses };
  };
  const semesters = [sem('y1s1', '100 Level, First Semester', 1, first), sem('y1s2', '100 Level, Second Semester', 2, second)];
  const all = [...first, ...second];
  const units = all.reduce((sum, c) => sum + c.units, 0);
  const cgpa = Math.round((all.reduce((sum, c) => sum + c.units * c.gradePoint, 0) / units) * 100) / 100;
  return {
    studentName: 'Chinedu Obi',
    matric: 'UG/2021/CSC/03122',
    department: 'Computer Science',
    programme: 'B.Sc. Computer Science',
    currentLevel: '200',
    university: 'University of Nigeria, Nsukka',
    showPhoto: false,
    avatarUrl: null,
    cgpa,
    pi: cgpa,
    totalCredits: units,
    semesters,
    shareLevel: level,
  };
}

export const SHARE_API: ApiFixture[] = [
  {
    method: 'GET',
    path: '/api/transcript/share',
    respond: ({ url, headers }) => {
      const id = url.searchParams.get('id') ?? '';
      const expiresAt = new Date(Date.now() + 7 * DAY).toISOString();
      if (id === PREVIEW_SHARE_IDS.expired) return reply(410, { error: 'This shared transcript has expired' });
      if (id === PREVIEW_SHARE_IDS.summary) return { transcript: record('summary'), expiresAt };
      if (id === PREVIEW_SHARE_IDS.full) return { transcript: record('full'), expiresAt };
      if (id === PREVIEW_SHARE_IDS.pin) {
        const pin = headers?.get('X-Share-Pin');
        if (!pin) return reply(401, { code: 'PIN_REQUIRED', error: 'This link needs a PIN.' });
        if (pin !== PREVIEW_PIN) return reply(401, { code: 'PIN_INCORRECT', error: 'That PIN is not right.' });
        return { transcript: record('full'), expiresAt };
      }
      return reply(404, { error: 'Transcript not found or expired' });
    },
  },
  {
    method: 'POST',
    path: '/api/transcript/share',
    respond: ({ url, body }) => {
      const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
      const days = typeof input.expiresInDays === 'number' ? input.expiresInDays : 30;
      const shareId = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
      return {
        shareId,
        shareUrl: `${url.origin}/share/${shareId}`,
        expiresAt: new Date(Date.now() + days * DAY).toISOString(),
        expiresInDays: days,
        level: input.level === 'summary' ? 'summary' : 'full',
        hasPin: typeof input.pin === 'string' && input.pin.length > 0,
      };
    },
  },
];
