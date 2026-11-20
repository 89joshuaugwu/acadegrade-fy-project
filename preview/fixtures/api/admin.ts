import type { ApiFixture } from './types';
import { reply } from './types';

/**
 * Admin endpoints (owned by the admin UI lane). Read the route in app/api/admin/... and mirror its JSON shape.
 * Sections are grouped by admin area; the first match wins, so a path must appear in one section only.
 * Sample data is invented (Nigerian names, universities and courses); it is never real student data.
 */

const DAY = 24 * 60 * 60 * 1000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

/* ============================== Overview + analytics (stats, cron) ============================== */

const DEPARTMENTS = [
  { department: 'Computer Science', count: 412, avgCGPA: 3.86 },
  { department: 'Electrical/Electronic Engineering', count: 297, avgCGPA: 3.61 },
  { department: 'Medicine and Surgery', count: 268, avgCGPA: 3.92 },
  { department: 'Accounting', count: 241, avgCGPA: 3.48 },
  { department: 'Law', count: 213, avgCGPA: 3.71 },
  { department: 'Mass Communication', count: 176, avgCGPA: 3.39 },
  { department: 'Mechanical Engineering', count: 164, avgCGPA: 3.33 },
  { department: 'Economics', count: 149, avgCGPA: 3.44 },
  { department: 'Pharmacy', count: 121, avgCGPA: 3.79 },
  { department: 'Biochemistry', count: 108, avgCGPA: 3.27 },
];

function signupChartData() {
  const counts = [31, 28, 35, 42, 39, 22, 19, 44, 51, 47, 38, 36, 25, 21, 58, 64, 61, 49, 43, 30, 27, 55, 62, 70, 66, 52, 34, 29, 73, 81];
  return counts.map((count, index) => {
    const day = new Date(Date.now() - (counts.length - 1 - index) * DAY);
    return {
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count,
    };
  });
}

function funnel() {
  const rows = [
    [212, 171, 96, 133, 88],
    [236, 190, 104, 151, 97],
    [198, 158, 87, 122, 79],
    [264, 219, 131, 170, 112],
    [287, 238, 142, 184, 0],
    [301, 247, 155, 196, 0],
    [276, 221, 129, 0, 0],
    [318, 252, 148, 0, 0],
  ];
  const now = new Date();
  return rows.map(([registered, firstSemester, usedAi, returned7d, returned30d], index) => {
    const weekStart = new Date(now.getTime() - (rows.length - 1 - index) * 7 * DAY);
    const jan1 = new Date(weekStart.getFullYear(), 0, 1);
    const week = Math.ceil(((weekStart.getTime() - jan1.getTime()) / DAY + jan1.getDay() + 1) / 7);
    return { week: `${weekStart.getFullYear()}-W${String(week).padStart(2, '0')}`, registered, firstSemester, usedAi, returned7d, returned30d };
  });
}

function stats() {
  return {
    generatedAt: iso(2 * 60 * 60 * 1000),
    totalUsers: 2149,
    activeThisWeek: 1318,
    newUsers7d: 386,
    avgCGPA: 3.62,
    avgPI: 3.71,
    cgpaBuckets: {
      '0.0-0.5': 4, '0.5-1.0': 9, '1.0-1.5': 27, '1.5-2.0': 61, '2.0-2.5': 148,
      '2.5-3.0': 297, '3.0-3.5': 488, '3.5-4.0': 571, '4.0-4.5': 402, '4.5-5.0': 142,
    },
    degreeClassCounts: {
      'First Class': 271, 'Second Class Upper': 904, 'Second Class Lower': 676, 'Third Class': 219, Pass: 52, Fail: 27,
    },
    departmentBreakdown: DEPARTMENTS,
    signupChartData: signupChartData(),
    funnel: funnel(),
    stale: false,
  };
}

const OVERVIEW_API: ApiFixture[] = [
  { method: 'GET', path: '/api/admin/stats', respond: () => stats() },
  {
    method: 'GET',
    path: '/api/admin/cron',
    respond: () => ({
      lastRun: {
        date: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString().slice(0, 10),
        finishedAt: iso(18 * 60 * 60 * 1000),
        results: { metrics: { ok: true }, scheduledAnnouncements: { sent: 1 }, expiredShareCodes: { deleted: 14 } },
      },
    }),
  },
];

/* ============================== Users, support inbox, share codes, audit ============================== */

type PeopleAge = 'adult' | 'minor' | 'unknown';
interface PeopleUser {
  uid: string; fullName: string; email: string; matric: string; university: string; department: string; programme: string;
  currentLevel: number; cgpa: number; pi: number; semesterCount: number; disabled: boolean; ageStatus: PeopleAge;
  aiConsent: boolean | null; marketingConsent: boolean | null; createdAt: string; lastActiveAt: string | null;
}

// [full name, email, university, department, level, cgpa, pi, semesters, flags] — d: disabled, m: under 18, u: age not answered, n: no AI consent
const PEOPLE_ROWS: [string, string, string, string, number, number, number, number, string][] = [
  ['Chiamaka Okafor', 'chiamaka.okafor@gmail.com', 'University of Nigeria, Nsukka', 'Computer Science', 300, 4.62, 4.71, 4, ''],
  ['Tunde Adeyemi', 'tunde.adeyemi@yahoo.com', 'University of Lagos', 'Electrical/Electronic Engineering', 400, 3.87, 3.92, 6, ''],
  ['Aisha Bello', 'aisha.bello@gmail.com', 'Ahmadu Bello University, Zaria', 'Medicine and Surgery', 200, 4.12, 4.05, 2, ''],
  ['Emeka Nwosu', 'emeka.nwosu@outlook.com', 'University of Benin', 'Mechanical Engineering', 500, 3.21, 3.34, 8, 'd'],
  ['Funmilayo Ogunleye', 'funmi.ogunleye@gmail.com', 'Obafemi Awolowo University', 'Law', 300, 4.48, 4.52, 4, ''],
  ['Ibrahim Musa', 'ibrahim.musa@gmail.com', 'Ahmadu Bello University, Zaria', 'Accounting', 200, 3.56, 3.61, 2, 'n'],
  ['Ngozi Eze', 'ngozi.eze@gmail.com', 'University of Nigeria, Nsukka', 'Pharmacy', 400, 4.05, 4.11, 6, ''],
  ['Oluwaseun Bakare', 'seun.bakare@gmail.com', 'Federal University of Technology, Akure', 'Computer Science', 100, 4.81, 4.81, 1, 'm'],
  ['Zainab Abdullahi', 'zainab.abdullahi@yahoo.com', 'Bayero University Kano', 'Economics', 300, 3.44, 3.49, 4, ''],
  ['Chukwudi Obi', 'chukwudi.obi@gmail.com', 'Covenant University', 'Mass Communication', 200, 2.96, 3.02, 3, 'u'],
  ['Adaeze Nnamdi', 'adaeze.nnamdi@gmail.com', 'University of Lagos', 'Biochemistry', 400, 3.73, 3.80, 6, ''],
  ['Yusuf Garba', 'yusuf.garba@gmail.com', 'University of Ibadan', 'Medicine and Surgery', 500, 3.98, 4.01, 9, ''],
  ['Temitope Alabi', 'temitope.alabi@gmail.com', 'Lagos State University', 'Accounting', 300, 4.24, 4.30, 4, ''],
  ['Kelechi Ihejirika', 'kelechi.ihe@gmail.com', 'Federal University of Technology, Owerri', 'Civil Engineering', 300, 2.41, 2.58, 5, ''],
  ['Halima Sani', 'halima.sani@gmail.com', 'Ahmadu Bello University, Zaria', 'Law', 100, 4.36, 4.36, 1, ''],
  ['Babatunde Olatunji', 'baba.olatunji@yahoo.com', 'Obafemi Awolowo University', 'Agricultural Economics', 400, 3.11, 3.19, 6, 'd'],
  ['Ifeoma Chukwu', 'ifeoma.chukwu@gmail.com', 'Nnamdi Azikiwe University', 'Nursing Science', 300, 4.57, 4.60, 4, ''],
  ['Abubakar Danjuma', 'abubakar.danjuma@gmail.com', 'University of Ilorin', 'Computer Science', 200, 3.67, 3.70, 2, ''],
  ['Folake Adebayo', 'folake.adebayo@gmail.com', 'University of Ibadan', 'English', 300, 3.92, 3.95, 4, 'n'],
  ['Obinna Okeke', 'obinna.okeke@gmail.com', 'University of Nigeria, Nsukka', 'Electrical/Electronic Engineering', 500, 4.71, 4.74, 8, ''],
  ['Amina Lawal', 'amina.lawal@gmail.com', 'Usmanu Danfodiyo University', 'Microbiology', 200, 3.38, 3.45, 2, ''],
  ['Segun Ajayi', 'segun.ajayi@gmail.com', 'Federal University of Technology, Akure', 'Mechanical Engineering', 400, 2.87, 2.93, 6, ''],
  ['Chioma Anyanwu', 'chioma.anyanwu@gmail.com', 'University of Port Harcourt', 'Petroleum Engineering', 300, 4.09, 4.15, 4, ''],
  ['Musa Ibrahim', 'musa.ibrahim@yahoo.com', 'Bayero University Kano', 'Political Science', 100, 3.25, 3.25, 1, 'u'],
  ['Kemi Oyelaran', 'kemi.oyelaran@gmail.com', 'Covenant University', 'Computer Science', 400, 4.88, 4.90, 6, ''],
  ['Ebuka Umeh', 'ebuka.umeh@gmail.com', 'Nnamdi Azikiwe University', 'Law', 200, 3.04, 3.10, 3, ''],
  ['Rukayat Salami', 'rukayat.salami@gmail.com', 'University of Ilorin', 'Accounting', 300, 3.79, 3.83, 4, ''],
  ['Godwin Akpan', 'godwin.akpan@gmail.com', 'University of Uyo', 'Chemical Engineering', 500, 2.19, 2.31, 9, 'd'],
  ['Blessing Etim', 'blessing.etim@gmail.com', 'University of Calabar', 'Medicine and Surgery', 300, 3.61, 3.66, 5, ''],
  ['Ahmed Tijani', 'ahmed.tijani@gmail.com', 'University of Lagos', 'Architecture', 200, 3.95, 3.97, 2, ''],
  ['Oluchi Nwankwo', 'oluchi.nwankwo@gmail.com', 'University of Nigeria, Nsukka', 'Economics', 100, 4.44, 4.44, 1, ''],
  ['Damilola Fashola', 'dami.fashola@gmail.com', 'Lagos State University', 'Mass Communication', 400, 3.52, 3.58, 6, ''],
  ['Fatima Yakubu', 'fatima.yakubu@gmail.com', 'Ahmadu Bello University, Zaria', 'Pharmacy', 300, 4.18, 4.22, 4, ''],
  ['Chinedu Agu', 'chinedu.agu@gmail.com', 'University of Benin', 'Computer Science', 200, 1.84, 1.97, 3, ''],
  ['Yewande Coker', 'yewande.coker@gmail.com', 'University of Lagos', 'Law', 500, 4.39, 4.41, 8, ''],
  ['Samuel Okon', 'samuel.okon@gmail.com', 'University of Port Harcourt', 'Geology', 300, 3.29, 3.36, 4, ''],
  ['Hauwa Mohammed', 'hauwa.mohammed@gmail.com', 'University of Maiduguri', 'Nursing Science', 200, 3.83, 3.88, 2, ''],
  ['Ikechukwu Madu', 'ike.madu@gmail.com', 'Federal University of Technology, Owerri', 'Electrical/Electronic Engineering', 400, 4.27, 4.29, 6, ''],
  ['Bisola Adekunle', 'bisola.adekunle@gmail.com', 'Obafemi Awolowo University', 'Medicine and Surgery', 100, 4.02, 4.02, 1, 'm'],
  ['Victor Eze', 'victor.eze@yahoo.com', 'Covenant University', 'Mechanical Engineering', 300, 3.48, 3.51, 4, ''],
];

const MATRIC_PREFIX: Record<string, string> = {
  'Computer Science': 'CSC', 'Electrical/Electronic Engineering': 'EEE', 'Medicine and Surgery': 'MBBS', 'Mechanical Engineering': 'MEE',
  Law: 'LAW', Accounting: 'ACC', Pharmacy: 'PHM', Economics: 'ECO', 'Mass Communication': 'MAC', Biochemistry: 'BCH',
  'Civil Engineering': 'CVE', 'Agricultural Economics': 'AEC', 'Nursing Science': 'NSC', English: 'ENG', Microbiology: 'MCB',
  'Petroleum Engineering': 'PTE', 'Political Science': 'POL', 'Chemical Engineering': 'CHE', Architecture: 'ARC', Geology: 'GLY',
};

const PEOPLE_USERS: PeopleUser[] = PEOPLE_ROWS.map(([fullName, email, university, department, level, cgpa, pi, semesters, flags], index) => {
  const entryYear = 2026 - Math.floor(level / 100);
  const programme = department === 'Medicine and Surgery' ? 'MBBS' : department === 'Law' ? 'LLB' : department.includes('Engineering') ? 'BEng' : department === 'Pharmacy' ? 'BPharm' : 'BSc';
  return {
    uid: `stu-${String(index + 1).padStart(3, '0')}`,
    fullName,
    email,
    matric: `${MATRIC_PREFIX[department] ?? 'GEN'}/${entryYear}/${String(37 + index * 13).padStart(3, '0')}`,
    university,
    department,
    programme,
    currentLevel: level,
    cgpa,
    pi,
    semesterCount: semesters,
    disabled: flags.includes('d'),
    ageStatus: flags.includes('m') ? 'minor' : flags.includes('u') ? 'unknown' : 'adult',
    aiConsent: flags.includes('m') ? false : flags.includes('n') ? null : true,
    marketingConsent: index % 3 === 0 ? true : index % 3 === 1 ? false : null,
    createdAt: iso((index * 2.3 + 0.4) * DAY),
    lastActiveAt: flags.includes('d') ? iso((index + 30) * DAY) : index % 9 === 8 ? null : iso((index % 6) * 3.5 * 60 * 60 * 1000 + 20 * 60 * 1000),
  };
});

const userRow = ({ university: _university, programme: _programme, marketingConsent: _marketing, ...row }: PeopleUser) => row;

function userDetail(uid: string) {
  const person = PEOPLE_USERS.find((row) => row.uid === uid);
  if (!person) return null;
  const allowed = person.ageStatus !== 'minor' && person.aiConsent === true;
  const index = Number(uid.slice(4)) || 1;
  const ledger = allowed ? [
    { type: 'spend', amount: 2, feature: 'insights', at: iso(5 * 60 * 60 * 1000), balanceAfter: 6 },
    { type: 'earn', amount: 2, at: iso(6 * 60 * 60 * 1000), balanceAfter: 8 },
    { type: 'earn', amount: 2, at: iso(26 * 60 * 60 * 1000), balanceAfter: 6 },
    { type: 'grant', amount: 3, at: iso(4 * DAY), balanceAfter: 4 },
    { type: 'spend', amount: 1, feature: 'scanner', at: iso(6 * DAY), balanceAfter: 1 },
    { type: 'refund', amount: 1, feature: 'scanner', at: iso(6 * DAY - 60 * 1000), balanceAfter: 2 },
  ] : [];
  return {
    profile: {
      uid: person.uid, fullName: person.fullName, email: person.email, matric: person.matric, university: person.university,
      department: person.department, programme: person.programme, currentLevel: person.currentLevel, createdAt: person.createdAt,
      lastActiveAt: person.lastActiveAt, disabled: person.disabled, ageStatus: person.ageStatus, aiConsent: person.aiConsent,
      marketingConsent: person.marketingConsent,
    },
    academic: { semesterCount: person.semesterCount, completedCount: Math.max(0, person.semesterCount - 1) },
    devices: { count: index % 4 === 0 ? 0 : (index % 3) + 1 },
    usage: {
      features: [
        { id: 'insights', label: 'Written analysis', freeDailyLimit: 2, freeRemaining: allowed ? 1 : 0 },
        { id: 'forecast', label: 'Forecast', freeDailyLimit: 3, freeRemaining: allowed ? 3 : 0 },
        { id: 'scanner', label: 'Result scanner', freeDailyLimit: 2, freeRemaining: allowed ? 2 : 0 },
        { id: 'chat', label: 'AcadeMind chat', freeDailyLimit: 10, freeRemaining: allowed ? 7 : 0 },
      ],
      checkedAt: Date.now(),
    },
    coins: { balance: allowed ? 6 : 0, earnedToday: allowed ? 2 : 0, ledger },
  };
}

function revealedGrades(uid: string) {
  const person = PEOPLE_USERS.find((row) => row.uid === uid);
  const count = person?.semesterCount ?? 2;
  const base = person?.cgpa ?? 3.5;
  const labels = ['100L First', '100L Second', '200L First', '200L Second', '300L First', '300L Second', '400L First', '400L Second', '500L First'];
  const semesters = labels.slice(0, count).map((label, index) => ({
    label,
    gpa: Math.max(1, Math.min(5, Number((base + ((index % 3) - 1) * 0.14).toFixed(2)))),
    creditLoaded: 18 + (index % 3) * 2,
    isComplete: index < count - 1,
  }));
  return { semesters, cgpa: base };
}

type PeopleTicket = {
  id: string; uid: string | null; source: 'account' | 'public'; email: string | null; name: string | null; category: string; message: string;
  platform: 'web' | 'android'; appVersion: string | null; route: string | null; status: 'open' | 'waiting' | 'closed';
  createdAt: string | null; updatedAt: string | null; closedAt: string | null; purgeAt: string | null;
  replies: { message: string; at: string | null; actorEmail: string | null }[];
};

const HOUR = 60 * 60 * 1000;
const PEOPLE_TICKETS: PeopleTicket[] = [
  { id: 'tk-1048', uid: 'stu-002', source: 'account', email: 'tunde.adeyemi@yahoo.com', name: 'Tunde Adeyemi', category: 'grades', message: 'My 400L first semester GPA shows 3.62 but I calculated 3.71. I think EEE411 (3 units) is being counted twice after I edited it.', platform: 'android', appVersion: '2.4.1 (41)', route: '/semesters', status: 'open', createdAt: iso(2 * HOUR), updatedAt: null, closedAt: null, purgeAt: null, replies: [] },
  { id: 'tk-1047', uid: null, source: 'public', email: 'ngozi.locked@gmail.com', name: null, category: 'account', message: 'I cannot sign in and the reset code never arrives. I changed phones last week and I no longer have the old number.', platform: 'web', appVersion: null, route: '/support', status: 'open', createdAt: iso(5 * HOUR), updatedAt: null, closedAt: null, purgeAt: null, replies: [] },
  { id: 'tk-1046', uid: 'stu-006', source: 'account', email: 'ibrahim.musa@gmail.com', name: 'Ibrahim Musa', category: 'ai', message: 'The result scanner says my photo is unclear every time, even in good light. It is a printed result slip from the faculty notice board.', platform: 'android', appVersion: '2.4.1 (41)', route: '/scanner', status: 'open', createdAt: iso(9 * HOUR), updatedAt: null, closedAt: null, purgeAt: null, replies: [] },
  { id: 'tk-1045', uid: 'stu-013', source: 'account', email: 'temitope.alabi@gmail.com', name: 'Temitope Alabi', category: 'ads', message: 'I watched two rewarded ads yesterday but only got coins for one. Balance stayed at 4.', platform: 'android', appVersion: '2.4.0 (40)', route: '/coins', status: 'open', createdAt: iso(27 * HOUR), updatedAt: null, closedAt: null, purgeAt: null, replies: [] },
  { id: 'tk-1044', uid: 'stu-017', source: 'account', email: 'ifeoma.chukwu@gmail.com', name: 'Ifeoma Chukwu', category: 'bug', message: 'The timetable reminder for NSC305 came 30 minutes late on Tuesday.', platform: 'android', appVersion: '2.4.1 (41)', route: '/timetable', status: 'waiting', createdAt: iso(2 * DAY), updatedAt: iso(30 * HOUR), closedAt: null, purgeAt: null, replies: [{ message: 'Thanks Ifeoma. Is battery saver on for AcadeGrade? Android can delay reminders when it is. Settings > Apps > AcadeGrade > Battery > Unrestricted fixes it on most phones.', at: iso(30 * HOUR), actorEmail: 'support@acadegrade.ng' }] },
  { id: 'tk-1043', uid: 'stu-025', source: 'account', email: 'kemi.oyelaran@gmail.com', name: 'Kemi Oyelaran', category: 'privacy', message: 'Please can you tell me what data you keep about me? I want to download a copy before I graduate.', platform: 'web', appVersion: null, route: '/settings', status: 'waiting', createdAt: iso(3 * DAY), updatedAt: iso(2 * DAY), closedAt: null, purgeAt: null, replies: [{ message: 'Hi Kemi, you can download everything from Settings > Privacy > Download my data. It includes your semesters, results and settings.', at: iso(2 * DAY), actorEmail: 'support@acadegrade.ng' }] },
  { id: 'tk-1041', uid: 'stu-030', source: 'account', email: 'ahmed.tijani@gmail.com', name: 'Ahmed Tijani', category: 'other', message: 'Can you add the University of Lagos 5-point scale for architecture studio courses? Ours carry 6 units.', platform: 'web', appVersion: null, route: '/help', status: 'closed', createdAt: iso(9 * DAY), updatedAt: iso(7 * DAY), closedAt: iso(7 * DAY), purgeAt: new Date(Date.now() + 173 * DAY).toISOString(), replies: [{ message: 'Good news: 6-unit courses are supported. Add the course and set Units to 6.', at: iso(8 * DAY), actorEmail: 'support@acadegrade.ng' }] },
  { id: 'tk-1039', uid: 'stu-011', source: 'account', email: 'adaeze.nnamdi@gmail.com', name: 'Adaeze Nnamdi', category: 'grades', message: 'Carry-over course BCH201 still shows the old F after I added the resit grade.', platform: 'android', appVersion: '2.3.8 (38)', route: '/semesters', status: 'closed', createdAt: iso(14 * DAY), updatedAt: iso(12 * DAY), closedAt: iso(12 * DAY), purgeAt: new Date(Date.now() + 168 * DAY).toISOString(), replies: [{ message: 'Fixed in 2.3.9. Update the app and the resit grade replaces the F in your CGPA.', at: iso(13 * DAY), actorEmail: 'support@acadegrade.ng' }] },
];

const PEOPLE_CODE_COURSES: Record<string, { code: string; title: string; units: number }[]> = {
  CSC300: [
    { code: 'CSC301', title: 'Data Structures', units: 3 }, { code: 'CSC303', title: 'Operating Systems I', units: 3 },
    { code: 'CSC305', title: 'Database Design', units: 3 }, { code: 'CSC307', title: 'Software Engineering', units: 2 },
    { code: 'MTH301', title: 'Numerical Analysis', units: 3 }, { code: 'GST301', title: 'Entrepreneurship Studies', units: 2 },
  ],
  EEE400: [
    { code: 'EEE401', title: 'Power Systems II', units: 3 }, { code: 'EEE411', title: 'Control Engineering', units: 3 },
    { code: 'EEE421', title: 'Digital Signal Processing', units: 3 }, { code: 'EEE431', title: 'Telecommunications', units: 2 },
  ],
  MED200: [
    { code: 'ANA201', title: 'Gross Anatomy I', units: 4 }, { code: 'PHS201', title: 'Physiology I', units: 4 }, { code: 'BCH203', title: 'Medical Biochemistry', units: 3 },
  ],
};

const PEOPLE_SHARE_CODES = [
  ['K7Q2PX', 214, 'CSC300', '', 8, 4],
  ['M3ZT8A', 167, 'EEE400', '', 15, 0],
  ['H9WV4C', 131, 'MED200', '', 22, 9],
  ['P2LN6R', 96, 'CSC300', '', 30, 0],
  ['B8XK3E', 74, 'EEE400', 'Course titles were rude', 41, 0],
  ['T4GJ7M', 58, 'MED200', '', 12, 0],
  ['Q6RD2S', 41, 'CSC300', '', 5, 0],
  ['W1YF9H', 29, 'EEE400', '', 3, 0],
  ['E5CA8N', 17, 'MED200', 'Spam course list', 60, 0],
  ['Z3UB6L', 9, 'CSC300', '', 2, 0],
].map(([code, useCount, list, disabledReason, madeDaysAgo, promotedDaysAgo], index) => {
  const courses = PEOPLE_CODE_COURSES[String(list)];
  return {
    code: String(code), useCount: Number(useCount), disabled: Boolean(disabledReason), disabledReason: disabledReason ? String(disabledReason) : null,
    disabledAt: disabledReason ? iso(2 * DAY) : null, promotedAt: Number(promotedDaysAgo) ? iso(Number(promotedDaysAgo) * DAY) : null,
    createdAt: iso(Number(madeDaysAgo) * DAY), authorId: PEOPLE_USERS[(index * 7) % PEOPLE_USERS.length].uid,
    courseCount: courses.length, courses,
  };
});

const AUDIT_ROWS: [number, string, string, string, string, unknown, unknown][] = [
  [0.3, 'ops@acadegrade.ng', 'support.reply', 'support_tickets/tk-1044', 'Replied to a support request (164 characters)', { status: 'open' }, { status: 'waiting', replies: 1, emailSent: true }],
  [1.2, 'joshua@acadegrade.ng', 'metrics.refresh', 'admin_metrics/latest', 'Recomputed admin metrics', null, { totalUsers: 2149 }],
  [3.5, 'ops@acadegrade.ng', 'users.disable', 'users/stu-004', 'Disabled account', { disabled: false }, { disabled: true }],
  [5, 'joshua@acadegrade.ng', 'settings.update', 'config/settings', 'Updated public site settings', { maintenanceMode: false, disableSignups: false, bannerText: '' }, { maintenanceMode: false, disableSignups: false, bannerText: 'Exams week: results scanning may be slower' }],
  [8, 'ops@acadegrade.ng', 'users.grant-coins', 'users/stu-013', 'Granted 3 coins: Rewarded ad did not credit on 18 Nov', null, { amount: 3, balance: 7 }],
  [11, 'joshua@acadegrade.ng', 'ai.update-routing', 'config/ai', 'Saved AI routing (revision 14)', { revision: 13, chatPrimary: 'groq' }, { revision: 14, chatPrimary: 'gemini' }],
  [15, 'ops@acadegrade.ng', 'share-codes.disable', 'shareCodes/B8XK3E', 'Disabled share code: Course titles were rude', { disabled: false }, { disabled: true }],
  [20, 'ops@acadegrade.ng', 'users.set-age', 'users/stu-039', 'Support age correction: Parent emailed support', { ageStatus: 'adult' }, { ageStatus: 'minor' }],
  [26, 'joshua@acadegrade.ng', 'announcements.create', 'announcements/an-0192', 'Scheduled announcement "Second semester results are out"', null, { audience: 'all', push: true }],
  [31, 'ops@acadegrade.ng', 'support.close', 'support_tickets/tk-1041', 'Closed support request', { status: 'waiting' }, { status: 'closed' }],
  [37, 'joshua@acadegrade.ng', 'ads.update', 'config/ads', 'Updated house campaign "Exam prep tips"', { enabled: false }, { enabled: true }],
  [44, 'ops@acadegrade.ng', 'users.reveal-grades', 'users/stu-002', 'Revealed grades: Ticket tk-1048, GPA mismatch', null, { semesterCount: 6 }],
  [52, 'joshua@acadegrade.ng', 'usage.update', 'config/usage', 'Changed free uses', { scannerDaily: 3, chatDaily: 10 }, { scannerDaily: 2, chatDaily: 10 }],
  [60, 'joshua@acadegrade.ng', 'mobile-release.update', 'config/mobile_release', 'Published Android 2.4.1 (41)', { latestBuild: 40, minSupportedBuild: 36 }, { latestBuild: 41, minSupportedBuild: 36 }],
  [70, 'ops@acadegrade.ng', 'users.sign-out-all', 'users/stu-016', 'Signed out of every device and cleared push tokens', { devices: 2 }, { devices: 0 }],
  [81, 'ops@acadegrade.ng', 'share-codes.promote', 'shareCodes/K7Q2PX', 'Added 6 courses to the catalogue (Computer Science, 300L, first semester)', null, { promoted: 6, skipped: 0 }],
  [95, 'joshua@acadegrade.ng', 'legal.publish', 'legal/privacy', 'Published privacy notice version 2026-11-01', { version: '2026-09-14' }, { version: '2026-11-01' }],
  [110, 'ops@acadegrade.ng', 'users.enable', 'users/stu-022', 'Enabled account', { disabled: true }, { disabled: false }],
  [126, 'joshua@acadegrade.ng', 'ai.set-secret-state', '_ai_secrets/groq-primary', 'Key disabled', null, null],
  [140, 'joshua@acadegrade.ng', 'email.update', 'config/email', 'Changed the sending account', { from: 'hello@acadegrade.ng' }, { from: 'support@acadegrade.ng' }],
  [158, 'ops@acadegrade.ng', 'testimonials.publish', 'testimonials/t-014', 'Published a testimonial (consent on file)', { published: false }, { published: true }],
  [176, 'joshua@acadegrade.ng', 'settings.update', 'config/settings', 'Maintenance mode turned off', { maintenanceMode: true }, { maintenanceMode: false }],
  [177, 'joshua@acadegrade.ng', 'settings.update', 'config/settings', 'Maintenance mode turned on', { maintenanceMode: false }, { maintenanceMode: true }],
  [195, 'ops@acadegrade.ng', 'users.delete-account', 'users/stu-091', 'Deleted the account and its data', null, { deleted: 214, truncated: false }],
  [220, 'joshua@acadegrade.ng', 'academic-catalog.approve', 'academic_catalog/unilag-csc-300-1', 'Approved 2 catalogue suggestions', { status: 'pending' }, { status: 'approved' }],
];

const AUDIT_ENTRIES = AUDIT_ROWS.map(([hoursAgo, actorEmail, action, target, summary, before, after], index) => {
  const createdAtMs = Date.now() - hoursAgo * HOUR;
  return {
    id: `audit-${String(AUDIT_ROWS.length - index).padStart(4, '0')}`,
    actorUid: actorEmail.startsWith('joshua') ? 'admin-owner' : 'admin-ops',
    actorEmail, action, target, summary, before, after,
    createdAt: new Date(createdAtMs).toISOString(), createdAtMs,
  };
});

const PEOPLE_API: ApiFixture[] = [
  {
    method: 'GET',
    path: '/api/admin/users',
    respond: ({ url }) => {
      const q = (url.searchParams.get('q') ?? '').trim();
      if (q) {
        const value = q.toLowerCase().replace(/\s+/g, '');
        const matches = PEOPLE_USERS.filter((row) => row.email.toLowerCase() === value || row.matric.toLowerCase().replace(/\s+/g, '') === value);
        return { users: matches.map(userRow), nextCursor: null };
      }
      const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') ?? '', 10) || 50, 1), 100);
      const cursor = url.searchParams.get('cursor');
      const start = cursor ? PEOPLE_USERS.findIndex((row) => row.uid === cursor) + 1 : 0;
      const page = PEOPLE_USERS.slice(start, start + limit);
      return { users: page.map(userRow), nextCursor: page.length === limit ? page[page.length - 1].uid : null };
    },
  },
  {
    method: 'POST',
    path: '/api/admin/users',
    respond: ({ body }) => {
      const input = (body ?? {}) as Record<string, unknown>;
      const uid = String(input.uid ?? '');
      if (input.action === 'reveal-grades') return revealedGrades(uid);
      if (input.action === 'grant-coins') {
        const amount = Number(input.amount) || 1;
        return { granted: amount, balance: 6 + amount, monthTotal: amount + 12 };
      }
      if (input.action === 'set-age') return { success: true, ageStatus: input.ageStatus };
      return { success: true };
    },
  },
  {
    method: 'GET',
    path: /^\/api\/admin\/users\/[^/]+$/,
    respond: ({ url }) => {
      const uid = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      return userDetail(uid) ?? reply(404, { error: 'User not found' });
    },
  },
  {
    method: 'GET',
    path: '/api/admin/support',
    respond: ({ url }) => {
      const status = url.searchParams.get('status');
      const rows = status ? PEOPLE_TICKETS.filter((ticket) => ticket.status === status) : PEOPLE_TICKETS;
      return { tickets: rows, nextCursor: null };
    },
  },
  {
    method: 'POST',
    path: '/api/admin/support',
    respond: ({ body }) => {
      const input = (body ?? {}) as Record<string, unknown>;
      const ticket = PEOPLE_TICKETS.find((row) => row.id === input.ticketId);
      if (!ticket) return reply(404, { error: 'Ticket not found' });
      const now = new Date();
      if (input.action === 'close') {
        Object.assign(ticket, { status: 'closed', closedAt: now.toISOString(), purgeAt: new Date(now.getTime() + 180 * DAY).toISOString(), updatedAt: now.toISOString() });
      } else if (input.action === 'reopen') {
        Object.assign(ticket, { status: 'open', closedAt: null, purgeAt: null, updatedAt: now.toISOString() });
      } else {
        ticket.replies = [...ticket.replies, { message: String(input.message ?? ''), at: now.toISOString(), actorEmail: 'admin@acadegrade.preview' }];
        Object.assign(ticket, { status: 'waiting', closedAt: null, purgeAt: null, updatedAt: now.toISOString() });
        return { success: true, emailSent: true, ticket: { ...ticket } };
      }
      return { success: true, ticket: { ...ticket } };
    },
  },
  { method: 'GET', path: '/api/admin/share-codes', respond: () => ({ codes: PEOPLE_SHARE_CODES, nextCursor: null }) },
  {
    method: 'POST',
    path: '/api/admin/share-codes',
    respond: ({ body }) => {
      const input = (body ?? {}) as Record<string, unknown>;
      if (input.action === 'promote') {
        const row = PEOPLE_SHARE_CODES.find((item) => item.code === input.code);
        return { success: true, promoted: Math.max(0, (row?.courseCount ?? 0) - 1), skipped: 1 };
      }
      return { success: true };
    },
  },
  {
    method: 'GET',
    path: '/api/admin/audit',
    respond: ({ url }) => {
      const action = url.searchParams.get('action');
      const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
      const cursor = url.searchParams.get('cursor');
      const rows = AUDIT_ENTRIES.filter((entry) => (!action || entry.action === action) && (cursor === null || entry.createdAtMs < Number(cursor)));
      const page = rows.slice(0, limit);
      return { entries: page, nextCursor: rows.length > limit ? page[page.length - 1].createdAtMs : null };
    },
  },
];

/* ============================== Settings, announcements, email, legal, testimonials, Android release ============================== */

const SYS_APK_URL = 'https://github.com/89joshuaugwu/AcadeGrade-APK/releases/download/v1.4.2/acadegrade.apk';

const sysSettings = {
  announcementBanner: 'Second-semester exams start Monday 2 February. Check your timetable for venue changes.',
  maintenanceMode: false,
  disableSignups: false,
  disabledFeatures: ['extract_slip'],
  ageGate: { enforceUnknown: true },
  mobileAppLinks: { androidUrl: SYS_APK_URL, iosUrl: '', androidSizeMb: 38, playUrl: '' },
  admobAndroidAppId: 'ca-app-pub-3940256099942544~3347511713',
};

type SysAnnouncement = {
  id: string; title: string; body: string; linkUrl: string | null;
  audience: { universities?: string[]; levels?: number[] };
  startsAt: string | null; endsAt: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  showAsBanner: boolean; push: boolean; sentAt: string | null;
};

const sysAnnouncements: SysAnnouncement[] = [
  {
    id: 'ann-exams-unilag', title: 'Exam timetable is out', body: 'The second-semester timetable for 300L and 400L is live. Add your courses so reminders go off the evening before each paper.',
    linkUrl: '/timetable', audience: { universities: ['University of Lagos'], levels: [300, 400] },
    startsAt: iso(2 * DAY), endsAt: iso(-12 * DAY), status: 'published', showAsBanner: false, push: true, sentAt: iso(2 * DAY),
  },
  {
    id: 'ann-maintenance', title: 'Short maintenance on Saturday night', body: 'AcadeGrade will be unavailable from 01:00 to 02:00 WAT on Saturday while we upgrade the servers. Your saved results are safe.',
    linkUrl: null, audience: {}, startsAt: iso(-3 * DAY), endsAt: iso(-3.2 * DAY), status: 'scheduled', showAsBanner: true, push: false, sentAt: null,
  },
  {
    id: 'ann-carryover', title: 'Plan your carry-over courses', body: 'Use What-If to see how clearing a carry-over this semester moves your CGPA before you register.',
    linkUrl: '/what-if', audience: { levels: [200, 300] }, startsAt: null, endsAt: null, status: 'draft', showAsBanner: false, push: false, sentAt: null,
  },
  {
    id: 'ann-welcome', title: 'Welcome back for the new session', body: 'Add your first-semester results as soon as they are released to keep your CGPA up to date.',
    linkUrl: '/results', audience: {}, startsAt: iso(48 * DAY), endsAt: iso(30 * DAY), status: 'archived', showAsBanner: false, push: true, sentAt: iso(48 * DAY),
  },
];

const sysLegalBody = (doc: 'terms' | 'privacy') => (doc === 'terms'
  ? '## Agreement\n\nBy using AcadeGrade you agree to these terms. AcadeGrade helps you track your GPA, CGPA and degree class; it is not an official university record.\n\n## Your account\n\n- Keep your sign-in details private.\n- You are responsible for the results you enter.\n\n## Coins and AcadeMind\n\nFree uses reset every 24 hours. Coins earned from rewarded ads have no cash value.\n\n## Contact\n\nQuestions about these terms: {{contact:Terms}}.'
  : '## What we collect\n\nYour name, email, university, department, level and the course results you enter.\n\n## How we use it\n\n- To calculate your GPA and CGPA.\n- To send the reminders you turn on.\n\n## AcadeMind\n\nWhen you ask AcadeMind for analysis, your results are sent to our AI provider for that request only.\n\n## Your choices\n\nYou can download or delete your data at any time from Settings. Contact {{contact:Privacy}}.');

const sysLegalDocument = (doc: 'terms' | 'privacy') => ({
  current: {
    version: '2026-11-13', effectiveDate: '2026-11-13',
    title: doc === 'terms' ? 'Terms of use' : 'Privacy notice',
    summary: doc === 'terms' ? 'The rules for using AcadeGrade on the web and on Android.' : 'What AcadeGrade collects, why, and the choices you have.',
    body: sysLegalBody(doc), changeNote: 'Clarified coins and AcadeMind', source: 'published' as const,
  },
  configVersion: '2026-11-13',
  draft: doc === 'terms' ? null : {
    title: 'Privacy notice', summary: 'What AcadeGrade collects, why, and the choices you have.', effectiveDate: '2026-12-01',
    body: sysLegalBody('privacy'), changeNote: 'Added timetable reminders', updatedAt: iso(5 * 60 * 60 * 1000), updatedBy: 'admin@acadegrade.preview',
  },
  versions: [
    { version: '2026-11-13', publishedAt: iso(7 * DAY), publishedBy: 'admin@acadegrade.preview', changeNote: 'Clarified coins and AcadeMind' },
    { version: '2026-09-01', publishedAt: iso(80 * DAY), publishedBy: 'admin@acadegrade.preview', changeNote: 'Under-18s may use AcadeGrade without AI' },
    { version: '2026-06-15', publishedAt: iso(158 * DAY), publishedBy: 'admin@acadegrade.preview', changeNote: 'First published version' },
  ],
});

type SysTestimonial = {
  id: string; quote: string; firstName: string; level: string; department: string; university: string; consentDate: string;
  status: 'draft' | 'approved' | 'hidden'; createdAt: string | null; updatedAt: string | null; approvedAt: string | null;
};

let sysTestimonials: SysTestimonial[] = [
  { id: 't-chiamaka', quote: 'I finally knew what I needed in my last two semesters to graduate with a First Class.', firstName: 'Chiamaka', level: '400L', department: 'Computer Science', university: 'University of Nigeria, Nsukka', consentDate: '2026-10-28', status: 'approved', createdAt: iso(23 * DAY), updatedAt: iso(20 * DAY), approvedAt: iso(20 * DAY) },
  { id: 't-tunde', quote: 'The What-If view showed me how one carry-over was pulling my CGPA down.', firstName: 'Tunde', level: '300L', department: 'Mechanical Engineering', university: 'Obafemi Awolowo University', consentDate: '2026-11-02', status: 'approved', createdAt: iso(18 * DAY), updatedAt: iso(15 * DAY), approvedAt: iso(15 * DAY) },
  { id: 't-aisha', quote: 'Exam reminders on my phone kept me from missing a paper during resits.', firstName: 'Aisha', level: '200L', department: 'Accounting', university: 'Ahmadu Bello University', consentDate: '2026-11-09', status: 'draft', createdAt: iso(9 * DAY), updatedAt: iso(9 * DAY), approvedAt: null },
  { id: 't-emeka', quote: 'Scanning my result slip saved me from typing twelve courses by hand.', firstName: 'Emeka', level: '500L', department: 'Medicine and Surgery', university: 'University of Lagos', consentDate: '2026-09-30', status: 'hidden', createdAt: iso(45 * DAY), updatedAt: iso(12 * DAY), approvedAt: iso(40 * DAY) },
];
let sysCountThreshold = 500;

let sysRelease = {
  enabled: true, latestVersion: '1.4.2', latestBuild: 42, minSupportedBuild: 38, allowIgnore: true,
  headline: 'AcadeGrade 1.4 is here', message: 'Faster result-slip scanning, exam reminders that work offline and a clearer CGPA forecast.',
  imageUrl: '', downloadUrl: SYS_APK_URL,
};

const sysBody = (ctx: { body: unknown }) => (ctx.body && typeof ctx.body === 'object' ? ctx.body : {}) as Record<string, unknown>;

const SYSTEM_API: ApiFixture[] = [
  { method: 'GET', path: '/api/admin/settings', respond: () => ({ settings: sysSettings }) },
  { method: 'POST', path: '/api/admin/settings', respond: () => ({ message: 'Settings updated.' }) },
  { method: 'GET', path: '/api/admin/announcements', respond: () => ({ announcements: sysAnnouncements, topicsBackfill: { completedOnce: true } }) },
  {
    method: 'POST',
    path: '/api/admin/announcements',
    respond: (ctx) => {
      const body = sysBody(ctx);
      const action = String(body.action ?? 'save');
      const input = (body.announcement && typeof body.announcement === 'object' ? body.announcement : {}) as Partial<SysAnnouncement>;
      const existing = sysAnnouncements.find((item) => item.id === input.id);
      const status: SysAnnouncement['status'] = action === 'archive' ? 'archived' : action === 'publish' ? 'published' : action === 'schedule' ? 'scheduled' : existing?.status ?? 'draft';
      const view: SysAnnouncement = {
        id: existing?.id ?? `ann-${Date.now()}`, title: '', body: '', linkUrl: null, audience: {}, startsAt: null, endsAt: null, showAsBanner: false, push: false, sentAt: null,
        ...existing, ...input, status,
      } as SysAnnouncement;
      if (action === 'publish') { view.startsAt = new Date().toISOString(); if (view.push) view.sentAt = view.startsAt; }
      const index = sysAnnouncements.findIndex((item) => item.id === view.id);
      if (index >= 0) sysAnnouncements.splice(index, 1);
      sysAnnouncements.unshift(view);
      return { announcement: view, pushed: action === 'publish' && view.push };
    },
  },
  {
    method: 'GET',
    path: '/api/about',
    respond: () => ({
      about: {
        headline: 'Know your CGPA, plan your degree class',
        platformDescription: 'AcadeGrade is a GPA and CGPA calculator built for Nigerian university students, on the web and on Android.',
        mission: 'Every student should know exactly where they stand and what it takes to reach their target class.',
        trustStatement: 'Your results stay yours. We never sell data, and you can download or delete everything at any time.',
        contactEmail: 'hello@acadegrade.ng',
      },
    }),
  },
  { method: 'GET', path: '/api/admin/legal', respond: () => ({ termsVersion: '2026-11-13', privacyVersion: '2026-11-13' }) },
  { method: 'POST', path: /^\/api\/admin\/legal\/documents\/(terms|privacy)\/publish$/, respond: () => ({ version: '2026-11-20' }) },
  {
    method: 'GET',
    path: /^\/api\/admin\/legal\/documents\/(terms|privacy)$/,
    respond: (ctx) => sysLegalDocument(ctx.url.pathname.endsWith('privacy') ? 'privacy' : 'terms'),
  },
  {
    method: 'GET',
    path: '/api/admin/email',
    respond: () => ({
      accounts: [
        { kind: 'general', configured: true, email: 'hello@acadegrade.ng', status: { ok: true, verifiedAt: iso(6 * DAY), checkedAt: iso(6 * DAY), source: 'saved' } },
        { kind: 'otp', configured: true, email: 'codes@acadegrade.ng', status: null },
      ],
    }),
  },
  {
    method: 'POST',
    path: '/api/admin/email',
    respond: (ctx) => {
      const body = sysBody(ctx);
      if (body.operation === 'save') return { account: { kind: body.kind, configured: true, email: String(body.email ?? '').trim().toLowerCase() } };
      return { ok: true, source: 'saved' };
    },
  },
  { method: 'GET', path: '/api/admin/testimonials', respond: () => ({ testimonials: sysTestimonials, countThreshold: sysCountThreshold, minimumToShow: 3 }) },
  {
    method: 'POST',
    path: '/api/admin/testimonials',
    respond: (ctx) => {
      const body = sysBody(ctx);
      const now = new Date().toISOString();
      if (body.action === 'threshold') { sysCountThreshold = Number(body.value); return { success: true, countThreshold: sysCountThreshold }; }
      if (body.action === 'delete') { sysTestimonials = sysTestimonials.filter((row) => row.id !== body.id); return { success: true }; }
      if (body.action === 'create') {
        const created: SysTestimonial = { ...(body.data as SysTestimonial), id: `t-${Date.now()}`, status: 'draft', createdAt: now, updatedAt: now, approvedAt: null };
        sysTestimonials = [created, ...sysTestimonials];
        return { success: true, testimonial: created };
      }
      const row = sysTestimonials.find((item) => item.id === body.id);
      if (!row) return { success: true };
      const next: SysTestimonial = body.action === 'update'
        ? { ...row, ...(body.data as Partial<SysTestimonial>), updatedAt: now }
        : { ...row, status: body.action === 'approve' ? 'approved' : 'hidden', updatedAt: now, approvedAt: body.action === 'approve' ? now : row.approvedAt };
      sysTestimonials = sysTestimonials.map((item) => (item.id === row.id ? next : item));
      return { success: true, testimonial: next };
    },
  },
  { method: 'GET', path: '/api/admin/mobile-release', respond: () => sysRelease },
  {
    method: 'PUT',
    path: '/api/admin/mobile-release',
    respond: (ctx) => { sysRelease = { ...sysRelease, ...(sysBody(ctx) as Partial<typeof sysRelease>) }; return sysRelease; },
  },
];

/* ============================== AI providers, usage + coins, advertising ============================== */

const OPS_HOUR = 60 * 60 * 1000;
const opsBody = (ctx: { body: unknown }) => (ctx.body && typeof ctx.body === 'object' ? ctx.body as Record<string, unknown> : {});

const OPS_AI_MODELS = {
  groq: ['llama-3.3-70b-versatile'],
  openrouter: ['openrouter/free', 'google/gemma-4-31b-it:free'],
  gemini: ['gemini-3.1-flash-lite'],
};

let opsAiConfig: Record<string, unknown> = {
  source: 'managed',
  revision: 12,
  providerModels: OPS_AI_MODELS,
  routes: {
    insights: {
      mode: 'fallback-chain',
      chain: [
        { providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-primary' },
        { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-fallback' },
      ],
      dataCollection: 'deny',
    },
    forecast: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-fallback' }] },
    whatif: {
      mode: 'fallback-chain',
      chain: [
        { providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' },
        { providerId: 'openrouter', modelId: 'google/gemma-4-31b-it:free', secretId: 'openrouter-primary' },
      ],
      dataCollection: 'deny',
    },
    extract: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-ocr' }] },
  },
};

let opsAiSecrets: Record<string, unknown>[] = [
  { secretId: 'groq-primary', providerId: 'groq', state: 'active', version: 3, label: 'Groq primary', modelId: 'llama-3.3-70b-versatile', priority: 1, purpose: 'general', lastTest: { ok: true, at: iso(3 * OPS_HOUR), latencyMs: 412 } },
  { secretId: 'groq-spare', providerId: 'groq', state: 'inactive', version: 1, label: 'Groq spare', modelId: 'llama-3.3-70b-versatile', priority: 2, purpose: 'general' },
  { secretId: 'openrouter-primary', providerId: 'openrouter', state: 'active', version: 2, label: 'OpenRouter primary', modelId: 'openrouter/free', priority: 1, purpose: 'general', lastTest: { ok: true, at: iso(26 * OPS_HOUR), latencyMs: 1184 } },
  { secretId: 'gemini-ocr', providerId: 'gemini', state: 'active', version: 4, label: 'Gemini OCR', modelId: 'gemini-3.1-flash-lite', priority: 1, purpose: 'ocr', lastTest: { ok: true, at: iso(5 * OPS_HOUR), latencyMs: 865 } },
  { secretId: 'gemini-fallback', providerId: 'gemini', state: 'active', version: 2, label: 'Gemini fallback', modelId: 'gemini-3.1-flash-lite', priority: 2, purpose: 'fallback', lastTest: { ok: false, at: iso(2 * DAY), latencyMs: 0, error: 'Quota exceeded for this project. It resets at midnight Pacific time.' } },
];
let opsGeminiBilling = 'unconfirmed';

function opsAiSnapshot() {
  const models = (opsAiConfig.providerModels ?? OPS_AI_MODELS) as typeof OPS_AI_MODELS;
  return {
    providers: {
      groq: { models: models.groq, capabilities: ['text'] },
      openrouter: { models: models.openrouter, capabilities: ['text'] },
      gemini: { models: models.gemini, capabilities: ['text', 'multimodal'] },
    },
    config: opsAiConfig,
    secrets: opsAiSecrets,
    geminiBilling: opsGeminiBilling,
  };
}

function opsAiPost(ctx: { body: unknown }) {
  const body = opsBody(ctx);
  switch (body.operation) {
    case 'test-secret': {
      const secret = opsAiSecrets.find((item) => item.secretId === body.secretId);
      const lastTest = { ok: true, at: new Date().toISOString(), latencyMs: 538 };
      opsAiSecrets = opsAiSecrets.map((item) => (item.secretId === body.secretId ? { ...item, lastTest } : item));
      return { ok: true, latencyMs: 538, testedAt: lastTest.at, providerId: secret?.providerId ?? '', modelId: secret?.modelId ?? '' };
    }
    case 'set-secret-state':
      opsAiSecrets = opsAiSecrets.map((item) => (item.secretId === body.secretId ? { ...item, state: body.state } : item));
      return { secretId: body.secretId, state: body.state };
    case 'set-gemini-billing':
      opsGeminiBilling = body.geminiBilling === 'confirmed' ? 'confirmed' : 'unconfirmed';
      return { geminiBilling: opsGeminiBilling };
    case 'save-routing':
      opsAiConfig = { source: 'managed', revision: Number(body.expectedRevision ?? 0) + 1, providerModels: body.providerModels, routes: body.routing };
      return { config: opsAiConfig };
    case 'upsert-secret': {
      const secret = {
        secretId: body.secretId, providerId: body.providerId, state: 'active', version: 1,
        label: body.label, modelId: body.modelId, priority: body.priority, purpose: body.purpose,
      };
      opsAiSecrets = [...opsAiSecrets.filter((item) => item.secretId !== body.secretId), secret];
      return { secret };
    }
    default:
      return { ok: true };
  }
}

function opsAiFeedback(ctx: { url: URL }) {
  const asked = Number.parseInt(ctx.url.searchParams.get('days') ?? '', 10);
  const days = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), 90) : 30;
  const scale = (value: number) => Math.round((value * days) / 30);
  const byFeature = {
    insights: { helpful: scale(168), notHelpful: scale(41), reports: scale(3) },
    forecast: { helpful: scale(97), notHelpful: scale(22), reports: scale(1) },
    whatif: { helpful: scale(74), notHelpful: scale(18), reports: 0 },
    ocr: { helpful: scale(51), notHelpful: scale(9), reports: scale(2) },
  };
  const total = Object.values(byFeature).reduce((sum, row) => sum + row.helpful + row.notHelpful + row.reports, 0);
  const model = (providerId: string, modelId: string, helpful: number, notHelpful: number, reports: number) => ({
    providerId, modelId, helpful, notHelpful, reports, helpfulRate: helpful + notHelpful ? helpful / (helpful + notHelpful) : null,
  });
  return {
    days,
    total,
    truncated: false,
    byFeature,
    byModel: [
      model('gemini', 'gemini-3.1-flash-lite', scale(163), scale(36), scale(2)),
      model('openrouter', 'openrouter/free', scale(102), scale(27), scale(2)),
    ],
    notHelpfulReasons: { inaccurate: scale(27), other: scale(9), unsafe: scale(1) },
    reports: [
      { feature: 'insights', reason: 'inaccurate', note: 'It said my CGPA would drop, but I had all As in 300L first semester.', platform: 'android', providerId: 'openrouter', modelId: 'openrouter/free', createdAt: iso(9 * OPS_HOUR) },
      { feature: 'ocr', reason: 'inaccurate', note: 'The scanner read MTH 201 as MTH 207 on my result slip.', platform: 'web', providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', createdAt: iso(31 * OPS_HOUR) },
      { feature: 'insights', reason: 'other', note: null, platform: 'web', providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', createdAt: iso(3 * DAY) },
      { feature: 'forecast', reason: 'unsafe', note: 'Told me to drop a carry-over course without checking with my adviser.', platform: 'android', providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', createdAt: iso(6 * DAY) },
    ].slice(0, days < 7 ? 2 : 4),
  };
}

let opsUsagePolicy: Record<string, unknown> = {
  dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 20 },
  coins: {
    enabled: true,
    coinsPerAd: 2,
    dailyEarnCap: 10,
    balanceCap: 30,
    features: {
      insights: { enabled: true, price: 2, dailyUseCap: 2 },
      forecast: { enabled: true, price: 1, dailyUseCap: 5 },
      whatif: { enabled: true, price: 1, dailyUseCap: 10 },
      ocr: { enabled: true, price: 3, dailyUseCap: 5 },
    },
  },
};

const opsCampaign = (id: string, name: string, fields: Partial<Record<string, unknown>> & { creative: Record<string, string> }) => ({
  id,
  name,
  placementIds: ['dashboard.overview'],
  deliveryMode: 'house',
  active: true,
  schedule: { startsAt: null, endsAt: null },
  weight: 50,
  frequencyCap: { maxImpressions: 3, windowHours: 24 },
  linkUrl: '',
  ...fields,
  creative: { imageUrl: '', altText: '', body: '', ctaLabel: 'Learn more', headline: '', ...fields.creative },
});

let opsAdsConfig: Record<string, unknown> = {
  version: 1,
  enabled: true,
  deliveryModes: { house: true, rewarded: false, thirdParty: false },
  placements: [
    { id: 'dashboard.overview', name: 'Dashboard overview', enabled: true },
    { id: 'results.overview', name: 'Results overview', enabled: true },
  ],
  campaigns: [
    opsCampaign('android-app-launch', 'Android app: offline reminders', {
      placementIds: ['dashboard.overview', 'results.overview'],
      weight: 70,
      linkUrl: 'https://acadegrade.com/android',
      creative: { headline: 'Get AcadeGrade on Android', body: 'Lecture reminders that work offline, and your CGPA in your pocket.', ctaLabel: 'Download the app' },
    }),
    opsCampaign('timetable-builder', 'Timetable builder for second semester', {
      weight: 40,
      schedule: { startsAt: new Date(Date.now() - 4 * DAY).toISOString(), endsAt: new Date(Date.now() + 26 * DAY).toISOString() },
      frequencyCap: { maxImpressions: 2, windowHours: 48 },
      linkUrl: 'https://acadegrade.com/timetable',
      creative: { headline: 'Plan your second semester', body: 'Build a clash-free timetable from your course list in two minutes.', ctaLabel: 'Build my timetable' },
    }),
    opsCampaign('past-questions-week', 'Past questions week (ended)', {
      active: false,
      weight: 30,
      schedule: { startsAt: new Date(Date.now() - 40 * DAY).toISOString(), endsAt: new Date(Date.now() - 33 * DAY).toISOString() },
      linkUrl: 'https://acadegrade.com/blog/past-questions',
      creative: { headline: 'Exams in two weeks?', body: 'How 300L students at UNILAG use past questions without cramming.', ctaLabel: 'Read the guide' },
    }),
  ],
};
let opsHouseConfig: Record<string, unknown> = { version: 1, enabled: true, placements: { dashboard: true, results: true }, includeLegacy: true };
let opsMobileAds: Record<string, unknown> = {
  version: 1,
  enabled: true,
  testMode: false,
  placements: { dashboard: true, results: false },
  bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  dashboardBannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  resultsBannerUnitId: 'ca-app-pub-3940256099942544/6300978112',
  rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  rewardedEnabled: true,
};
let opsIosAds: Record<string, unknown> = {
  version: 1, enabled: false, testMode: true, placements: { dashboard: false, results: false },
  bannerUnitId: '', dashboardBannerUnitId: '', resultsBannerUnitId: '', rewardedUnitId: '', rewardedEnabled: false,
};
let opsProviders: Record<string, unknown> = {
  version: 1,
  adsense: { enabled: true, publisherId: 'ca-pub-4815162342108421', slotId: '7302945816' },
  adsterra: { enabled: false, smartLinkUrl: '' },
};
const opsConfigOf = (ctx: { body: unknown }, current: Record<string, unknown>) => {
  const config = opsBody(ctx).config;
  return config && typeof config === 'object' ? config as Record<string, unknown> : current;
};

const OPS_API: ApiFixture[] = [
  { method: 'GET', path: '/api/admin/ai', respond: () => opsAiSnapshot() },
  { method: 'POST', path: '/api/admin/ai', respond: (ctx) => opsAiPost(ctx) },
  { method: 'GET', path: '/api/admin/ai/feedback', respond: (ctx) => opsAiFeedback(ctx) },
  { method: 'GET', path: '/api/admin/usage', respond: () => ({ policy: opsUsagePolicy, source: 'stored', fallbacks: [] }) },
  {
    method: 'PUT',
    path: '/api/admin/usage',
    respond: (ctx) => {
      const body = opsBody(ctx);
      opsUsagePolicy = { dailyLimits: body.dailyLimits ?? opsUsagePolicy.dailyLimits, coins: body.coins ?? opsUsagePolicy.coins };
      return { policy: opsUsagePolicy, source: 'stored', fallbacks: [] };
    },
  },
  { method: 'GET', path: '/api/admin/ads', respond: () => ({ config: opsAdsConfig, legacyBannerCount: 0, warnings: [] }) },
  { method: 'PUT', path: '/api/admin/ads', respond: (ctx) => { opsAdsConfig = opsConfigOf(ctx, opsAdsConfig); return { config: opsAdsConfig }; } },
  { method: 'GET', path: '/api/admin/ads/house', respond: () => ({ config: opsHouseConfig }) },
  { method: 'PUT', path: '/api/admin/ads/house', respond: (ctx) => { opsHouseConfig = opsConfigOf(ctx, opsHouseConfig); return { config: opsHouseConfig }; } },
  { method: 'GET', path: '/api/admin/ads/mobile', respond: () => ({ config: opsMobileAds }) },
  { method: 'PUT', path: '/api/admin/ads/mobile', respond: (ctx) => { opsMobileAds = opsConfigOf(ctx, opsMobileAds); return { config: opsMobileAds }; } },
  { method: 'GET', path: '/api/admin/ads/ios', respond: () => ({ config: opsIosAds }) },
  { method: 'PUT', path: '/api/admin/ads/ios', respond: (ctx) => { opsIosAds = opsConfigOf(ctx, opsIosAds); return { config: opsIosAds }; } },
  { method: 'GET', path: '/api/admin/ads/providers', respond: () => ({ config: opsProviders }) },
  { method: 'PUT', path: '/api/admin/ads/providers', respond: (ctx) => { opsProviders = opsConfigOf(ctx, opsProviders); return { config: opsProviders }; } },
];

/* ============================== API health, legacy courses, academic catalogue ============================== */

/** One week of api_logs, per endpoint. Every total on the API health page is summed from these rows. */
const API_ENDPOINTS: { endpoint: string; category: string; count: number; errors: number; avgMs: number; provider?: Record<string, number> }[] = [
  { endpoint: '/api/ai/insights', category: 'ai', count: 1046, errors: 14, avgMs: 2140, provider: { gemini: 702, groq: 281, openrouter: 63 } },
  { endpoint: '/api/auth/otp/send', category: 'otp', count: 688, errors: 9, avgMs: 940 },
  { endpoint: '/api/auth/otp/verify', category: 'otp', count: 652, errors: 31, avgMs: 210 },
  { endpoint: '/api/ai/forecast', category: 'ai', count: 492, errors: 6, avgMs: 2860, provider: { gemini: 318, groq: 149, openrouter: 25 } },
  { endpoint: '/api/notifications/send', category: 'notification', count: 430, errors: 1, avgMs: 160 },
  { endpoint: '/api/results/extract', category: 'extract', count: 301, errors: 13, avgMs: 4820, provider: { gemini: 301 } },
  { endpoint: '/api/ai/whatif', category: 'ai', count: 264, errors: 3, avgMs: 2310, provider: { gemini: 171, groq: 93 } },
  { endpoint: '/api/auth/register/finalize', category: 'auth', count: 241, errors: 2, avgMs: 380 },
  { endpoint: '/api/ai/report', category: 'ai', count: 207, errors: 4, avgMs: 3110, provider: { gemini: 142, openrouter: 65 } },
  { endpoint: '/api/support/tickets', category: 'email', count: 134, errors: 2, avgMs: 1210 },
  { endpoint: '/api/transcript/generate', category: 'transcript', count: 71, errors: 2, avgMs: 3970 },
  { endpoint: '/api/admin/users', category: 'admin', count: 47, errors: 0, avgMs: 610 },
  { endpoint: '/api/admin/stats', category: 'admin', count: 32, errors: 0, avgMs: 420 },
];

const API_TOP_USERS = [
  { uid: 'anonymous', name: 'Anonymous', email: '', share: 0.124, errorShare: 0.21, lastEndpoint: '/api/auth/otp/send' },
  { uid: 'u-chukwuemeka-okafor', name: 'Chukwuemeka Okafor', email: 'chukwuemeka.okafor@stu.unilag.edu.ng', share: 0.038, errorShare: 0.04, lastEndpoint: '/api/ai/insights' },
  { uid: 'u-aisha-bello', name: 'Aisha Bello', email: 'aisha.bello@abu.edu.ng', share: 0.019, errorShare: 0.02, lastEndpoint: '/api/results/extract' },
  { uid: 'u-tobiloba-adeyemi', name: 'Tobiloba Adeyemi', email: 'tobiloba.adeyemi@student.oauife.edu.ng', share: 0.013, errorShare: 0, lastEndpoint: '/api/ai/forecast' },
  { uid: 'u-ngozi-eze', name: 'Ngozi Eze', email: 'ngozi.eze@unn.edu.ng', share: 0.01, errorShare: 0.01, lastEndpoint: '/api/ai/whatif' },
  { uid: 'u-ibrahim-musa', name: 'Ibrahim Musa', email: 'ibrahim.musa@buk.edu.ng', share: 0.0094, errorShare: 0, lastEndpoint: '/api/ai/insights' },
  { uid: 'u-funmilayo-ogunleye', name: 'Funmilayo Ogunleye', email: 'funmilayo.ogunleye@stu.ui.edu.ng', share: 0.0083, errorShare: 0.01, lastEndpoint: '/api/ai/report' },
  { uid: 'u-chidinma-nwosu', name: 'Chidinma Nwosu', email: 'chidinma.nwosu@uniben.edu', share: 0.0074, errorShare: 0, lastEndpoint: '/api/transcript/generate' },
  { uid: 'u-babatunde-lawal', name: 'Babatunde Lawal', email: 'babatunde.lawal@futa.edu.ng', share: 0.0066, errorShare: 0, lastEndpoint: '/api/ai/insights' },
  { uid: 'u-zainab-abdullahi', name: 'Zainab Abdullahi', email: 'zainab.abdullahi@lasu.edu.ng', share: 0.0061, errorShare: 0, lastEndpoint: '/api/ai/forecast' },
];

const API_RECENT_ERRORS = [
  { endpoint: '/api/auth/otp/verify', status: 400, error: 'The code has expired. Ask for a new one.', uid: 'anonymous', minutesAgo: 6 },
  { endpoint: '/api/ai/insights', status: 503, error: 'Gemini returned 503: the model is overloaded. Fell back to Groq.', uid: 'u-chukwuemeka-okafor', minutesAgo: 19 },
  { endpoint: '/api/results/extract', status: 422, error: 'Could not read the result slip: the photo is too blurry.', uid: 'u-aisha-bello', minutesAgo: 47 },
  { endpoint: '/api/auth/otp/send', status: 429, error: 'Too many codes requested. Limit is 5 an hour.', uid: 'anonymous', minutesAgo: 83 },
  { endpoint: '/api/ai/forecast', status: 504, error: 'The provider took longer than 30 seconds to answer.', uid: 'u-ngozi-eze', minutesAgo: 141 },
  { endpoint: '/api/auth/otp/verify', status: 400, error: 'Wrong code entered.', uid: 'anonymous', minutesAgo: 196 },
  { endpoint: '/api/support/tickets', status: 502, error: 'SMTP server refused the connection.', uid: 'u-funmilayo-ogunleye', minutesAgo: 260 },
  { endpoint: '/api/ai/report', status: 500, error: 'OpenRouter returned an empty answer.', uid: 'u-chidinma-nwosu', minutesAgo: 388 },
  { endpoint: '/api/transcript/generate', status: 413, error: 'The transcript has more than 12 semesters.', uid: 'u-babatunde-lawal', minutesAgo: 511 },
  { endpoint: '/api/results/extract', status: 422, error: 'No course codes were found on the image.', uid: 'u-zainab-abdullahi', minutesAgo: 702 },
];

function apiAnalytics(range: string) {
  const factor = range === 'day' ? 0.16 : range === 'month' ? 1.06 : 1;
  const rows = API_ENDPOINTS.map((row) => ({
    ...row,
    count: Math.max(1, Math.round(row.count * factor)),
    errors: Math.round(row.errors * factor),
  }));
  const totalCalls = rows.reduce((sum, row) => sum + row.count, 0);
  const errorCalls = rows.reduce((sum, row) => sum + row.errors, 0);
  const byCategory: Record<string, { count: number; errors: number; avgMs: number }> = {};
  const msSum: Record<string, number> = {};
  for (const row of rows) {
    const entry = (byCategory[row.category] ??= { count: 0, errors: 0, avgMs: 0 });
    entry.count += row.count;
    entry.errors += row.errors;
    msSum[row.category] = (msSum[row.category] ?? 0) + row.avgMs * row.count;
  }
  for (const [key, entry] of Object.entries(byCategory)) entry.avgMs = Math.round(msSum[key] / entry.count);
  const byEndpoint = Object.fromEntries(rows.map((row) => [row.endpoint, { count: row.count, errors: row.errors }]));
  const byProvider: Record<string, number> = {};
  for (const row of rows) {
    if (!row.provider) continue;
    const base = API_ENDPOINTS.find((item) => item.endpoint === row.endpoint)!;
    for (const [provider, calls] of Object.entries(row.provider)) {
      byProvider[provider] = (byProvider[provider] ?? 0) + Math.round((calls / base.count) * row.count);
    }
  }
  const avgDuration = Math.round(rows.reduce((sum, row) => sum + row.avgMs * row.count, 0) / totalCalls);

  // Timeline: hours for a day, days otherwise. The last bucket takes the rounding so it sums to totalCalls.
  const now = new Date();
  const weights = range === 'day'
    ? [2, 1, 1, 1, 1, 2, 4, 7, 9, 11, 12, 12, 11, 10, 10, 9, 8, 8, 9, 11, 12, 10, 7, 4]
    : range === 'month'
      ? Array.from({ length: 30 }, (_, index) => 8 + ((index * 7) % 6) + (index > 20 ? 4 : 0))
      : [12, 13, 15, 16, 14, 13, 17];
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  let assigned = 0;
  const timelineData = weights.map((weight, index) => {
    const calls = index === weights.length - 1 ? totalCalls - assigned : Math.round((weight / weightSum) * totalCalls);
    assigned += calls;
    if (range === 'day') return { label: `${String(index).padStart(2, '0')}:00`, calls };
    const day = new Date(now.getTime() - (weights.length - 1 - index) * DAY);
    return { label: `${day.getMonth() + 1}/${day.getDate()}`, calls };
  });

  const topUsers = API_TOP_USERS.map(({ share, errorShare, ...user }) => ({
    ...user,
    count: Math.max(1, Math.round(totalCalls * share)),
    errors: Math.round(errorCalls * errorShare),
  }));
  const recentErrors = API_RECENT_ERRORS
    .filter((item) => range !== 'day' || item.minutesAgo < 24 * 60)
    .map(({ minutesAgo, ...item }) => ({ ...item, timestamp: iso(minutesAgo * 60 * 1000) }));

  return {
    totalCalls,
    errorCalls,
    errorRate: totalCalls > 0 ? ((errorCalls / totalCalls) * 100).toFixed(1) : '0.0',
    avgDuration,
    byCategory,
    byEndpoint,
    byProvider,
    topUsers,
    timelineData,
    recentErrors,
    range,
  };
}

/* ---- Legacy course list: GET/POST/PUT/DELETE /api/admin/courses ---- */
const LEGACY_COURSES = [
  { id: 'c-csc201', code: 'CSC201', title: 'Computer Programming I', units: 3, department: 'Computer Science', level: 200, semester: 1 },
  { id: 'c-csc202', code: 'CSC202', title: 'Computer Programming II', units: 3, department: 'Computer Science', level: 200, semester: 2 },
  { id: 'c-csc301', code: 'CSC301', title: 'Operating Systems', units: 3, department: 'Computer Science', level: 300, semester: 1 },
  { id: 'c-csc305', code: 'CSC305', title: 'Data Structures and Algorithms', units: 3, department: 'Computer Science', level: 300, semester: 1 },
  { id: 'c-csc402', code: 'CSC402', title: 'Compiler Construction', units: 3, department: 'Computer Science', level: 400, semester: 2 },
  { id: 'c-eee305', code: 'EEE305', title: 'Electromagnetic Fields and Waves', units: 3, department: 'Electrical/Electronic Engineering', level: 300, semester: 1 },
  { id: 'c-eee311', code: 'EEE311', title: 'Circuit Theory II', units: 2, department: 'Electrical/Electronic Engineering', level: 300, semester: 1 },
  { id: 'c-gst111', code: 'GST111', title: 'Communication in English I', units: 2, department: 'General Studies', level: 100, semester: 1 },
  { id: 'c-gst112', code: 'GST112', title: 'Nigerian Peoples and Culture', units: 2, department: 'General Studies', level: 100, semester: 2 },
  { id: 'c-mth101', code: 'MTH101', title: 'Elementary Mathematics I', units: 3, department: 'Mathematics', level: 100, semester: 1 },
  { id: 'c-mth201', code: 'MTH201', title: 'Mathematical Methods I', units: 3, department: 'Mathematics', level: 200, semester: 1 },
  { id: 'c-phy102', code: 'PHY102', title: 'General Physics II', units: 3, department: 'Physics', level: 100, semester: 2 },
  { id: 'c-acc301', code: 'ACC301', title: 'Financial Accounting III', units: 3, department: 'Accounting', level: 300, semester: 1 },
  { id: 'c-ecn204', code: 'ECN204', title: 'Introduction to Econometrics', units: 2, department: 'Economics', level: 200, semester: 2 },
  { id: 'c-law311', code: 'LAW311', title: 'Law of Contract', units: 4, department: 'Law', level: 300, semester: 1 },
  { id: 'c-mcm212', code: 'MCM212', title: 'News Writing and Reporting', units: 3, department: 'Mass Communication', level: 200, semester: 2 },
];
let legacyCourses = [...LEGACY_COURSES];

/* ---- Academic catalogue: GET/PATCH /api/admin/academic-catalog and /suggestions ---- */
type PreviewCatalog = { revision: number; entries: { id: string; kind: 'university' | 'department' | 'programme'; name: string; status: 'active' | 'archived'; source: 'default' | 'admin' }[] };
let previewCatalog: PreviewCatalog | null = null;

async function catalog(): Promise<PreviewCatalog> {
  if (previewCatalog) return previewCatalog;
  const [{ createInitialCatalog }, { DEFAULT_CATALOG }] = await Promise.all([
    import('@/lib/academic-catalog/model'),
    import('@/lib/academic-catalog/defaults'),
  ]);
  const base = createInitialCatalog(DEFAULT_CATALOG) as PreviewCatalog;
  const extras: PreviewCatalog['entries'] = [
    { id: 'university:admiralty-university-of-nigeria-ibusa', kind: 'university', name: 'Admiralty University of Nigeria, Ibusa', status: 'active', source: 'admin' },
    { id: 'department:cyber-security', kind: 'department', name: 'Cyber Security', status: 'active', source: 'admin' },
    { id: 'department:data-science', kind: 'department', name: 'Data Science', status: 'active', source: 'admin' },
    { id: 'programme:b-sc-ed-computer-science-education', kind: 'programme', name: 'B.Sc.(Ed.) Computer Science Education', status: 'active', source: 'admin' },
    { id: 'university:lagos-state-polytechnic-test-entry', kind: 'university', name: 'Lagos State Polytechnic (duplicate entry)', status: 'archived', source: 'admin' },
    { id: 'department:computer-sci', kind: 'department', name: 'Computer Sci.', status: 'archived', source: 'admin' },
  ];
  previewCatalog = { revision: 14, entries: [...base.entries, ...extras] };
  return previewCatalog;
}

let catalogSuggestions = [
  { id: 'sg-7Hk2LmQ9', kind: 'university', name: 'Thomas Adewumi University, Oko', status: 'pending', uid: 'u-tobiloba-adeyemi', createdAt: iso(3 * 60 * 60 * 1000) },
  { id: 'sg-Qe81ZpWc', kind: 'department', name: 'Software Engineering', status: 'pending', uid: 'u-ngozi-eze', createdAt: iso(20 * 60 * 60 * 1000) },
  { id: 'sg-Mx40TbRa', kind: 'programme', name: 'B.Eng. Mechatronics Engineering', status: 'pending', uid: 'u-ibrahim-musa', createdAt: iso(2 * DAY) },
];

const INSIGHT_API: ApiFixture[] = [
  { method: 'GET', path: '/api/admin/api-analytics', respond: ({ url }) => apiAnalytics(url.searchParams.get('range') || 'week') },
  { method: 'GET', path: '/api/admin/courses', respond: () => ({ courses: [...legacyCourses].sort((a, b) => a.code.localeCompare(b.code)) }) },
  {
    method: 'POST',
    path: '/api/admin/courses',
    respond: ({ body }) => {
      const value = (body ?? {}) as Record<string, unknown>;
      const id = `c-preview-${Date.now()}`;
      legacyCourses = [...legacyCourses, {
        id, code: String(value.code ?? '').toUpperCase(), title: String(value.title ?? ''), units: Number(value.units) || 0,
        department: String(value.department ?? ''), level: Number(value.level) || 100, semester: Number(value.semester) || 1,
      }];
      return { id, message: 'Course added.' };
    },
  },
  {
    method: 'PUT',
    path: '/api/admin/courses',
    respond: ({ body }) => {
      const value = (body ?? {}) as Record<string, unknown>;
      legacyCourses = legacyCourses.map((course) => course.id === value.id ? {
        ...course, code: String(value.code ?? course.code).toUpperCase(), title: String(value.title ?? course.title), units: Number(value.units) || course.units,
        department: String(value.department ?? course.department), level: Number(value.level) || course.level, semester: Number(value.semester) || course.semester,
      } : course);
      return { message: 'Course updated.' };
    },
  },
  {
    method: 'DELETE',
    path: '/api/admin/courses',
    respond: ({ url }) => {
      const id = url.searchParams.get('id');
      legacyCourses = legacyCourses.filter((course) => course.id !== id);
      return { message: 'Course deleted.' };
    },
  },
  { method: 'GET', path: '/api/admin/academic-catalog/suggestions', respond: () => ({ suggestions: catalogSuggestions.filter((item) => item.status === 'pending') }) },
  {
    method: 'PATCH',
    path: '/api/admin/academic-catalog/suggestions',
    respond: async ({ body }) => {
      const value = (body ?? {}) as { id?: string; action?: string };
      const suggestion = catalogSuggestions.find((item) => item.id === value.id);
      if (!suggestion) return { __reply: true, status: 400, body: { error: 'Suggestion not found.' } };
      catalogSuggestions = catalogSuggestions.map((item) => item.id === value.id ? { ...item, status: value.action === 'approve' ? 'approved' : 'rejected' } : item);
      if (value.action !== 'approve') return { status: 'rejected' };
      const current = await catalog();
      const { mutateCatalog } = await import('@/lib/academic-catalog/model');
      previewCatalog = mutateCatalog(current, { action: 'add', kind: suggestion.kind as PreviewCatalog['entries'][number]['kind'], name: suggestion.name }) as PreviewCatalog;
      return { status: 'approved' };
    },
  },
  { method: 'GET', path: '/api/admin/academic-catalog', respond: () => catalog() },
  {
    method: 'PATCH',
    path: '/api/admin/academic-catalog',
    respond: async ({ body }) => {
      const { mutateCatalog } = await import('@/lib/academic-catalog/model');
      try {
        previewCatalog = mutateCatalog(await catalog(), body as Parameters<typeof mutateCatalog>[1]) as PreviewCatalog;
        return previewCatalog;
      } catch (error) {
        return { __reply: true, status: 400, body: { error: error instanceof Error ? error.message : 'Invalid request.' } };
      }
    },
  },
];

export const ADMIN_API: ApiFixture[] = [...OVERVIEW_API, ...PEOPLE_API, ...SYSTEM_API, ...OPS_API, ...INSIGHT_API];
