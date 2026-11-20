import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, uid: null, loading: false, error: null }) }));
vi.mock('@/lib/firebase/client', () => ({ auth: {}, db: {}, app: {} }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {} }));
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { parsePortalText } from '@/lib/import/portalText';
import { expiryState } from '@/lib/timetable/engine';
import { AI_DISCLAIMER } from '@/components/ai/AiDisclosure';
import { BUILTIN_LEGAL } from '@/lib/legal/builtin';
import { DEFAULT_COIN_POLICY } from '@/lib/usage/policy';
import type { PublicUsage } from '@/lib/public/usage-public';
import { CONTENTS_GROUPS, exampleDegreeGoal, workedRecord } from '@/lib/public/features-overview';
import {
  PASTE_SAMPLE, pasteResult, plateFallbackLine, plateFigures, plateRows, scannerSlip, waysIn,
} from '@/lib/public/features-scanner';
import {
  ACADEMIND_COPY, DATA_QA, NAMED_PROVIDERS, exampleAnalysis, exampleForecast, exampleRecord, exampleWhatIf, freeEveryDay, tellBlocks,
} from '@/lib/public/features-academind';
import {
  COUPON, EXTEND_AT, FIXED_TIMETABLE, ICS_FILE, TIMETABLE_FAQ, examplePlan, exampleWeek, extendExample, kindFields,
  notificationExample, planWorking, readingTimetable,
} from '@/lib/public/features-timetable';
import {
  appExtras, appRelease, bandLine, downloadName, installSteps, iosRedirectTarget, iosSteps, metaLine, safetyQa, softwareApplicationJsonLd,
} from '@/lib/public/features-android';
import { ADULT_FEATURE_VALUE, breadcrumbJsonLd, dailyAllowance, featureFoot } from '@/lib/public/features-shared';

const usage = (overrides: Partial<{ ocr: number; insights: number; forecast: number; whatif: number; coins: boolean }> = {}): PublicUsage => ({
  dailyLimits: { insights: overrides.insights ?? 3, forecast: overrides.forecast ?? 8, whatif: overrides.whatif ?? 20, ocr: overrides.ocr ?? 20 },
  coins: {
    enabled: overrides.coins ?? false,
    coinsPerAd: DEFAULT_COIN_POLICY.coinsPerAd,
    dailyEarnCap: DEFAULT_COIN_POLICY.dailyEarnCap,
    features: {
      insights: { ...DEFAULT_COIN_POLICY.features.insights },
      forecast: { ...DEFAULT_COIN_POLICY.features.forecast },
      whatif: { ...DEFAULT_COIN_POLICY.features.whatif },
      ocr: { ...DEFAULT_COIN_POLICY.features.ocr },
    },
  },
});

describe('/features: every figure, worked out', () => {
  it('sums the receipt exactly: 54 points, GPA 4.15, PI 3.30, 385 ÷ 87 = 4.43', () => {
    const record = workedRecord();
    expect(record.semesterPoints).toBe(54);
    expect(record.semesterUnits).toBe(13);
    expect(record.gpa).toBe('4.15');
    expect(record.pi).toBe('3.30');
    expect(record.totalPoints).toBe(385);
    expect(record.totalUnits).toBe(87);
    expect(record.cgpa).toBe('4.43');
    expect(record.total).toEqual({ label: 'CGPA: 385 ÷ 87', value: '4.43' });
    expect(record.caption).toBe('CGPA after 87 units · Second Class Upper · 0.07 to First Class');
    const semesterRows = record.groups[1].rows.map((row) => row.value);
    expect(semesterRows.slice(0, 5)).toEqual(['15', '12', '9', '10', '8']);
    expect(record.groups[0].rows[0].value).toBe('74 units · 331 points');
    expect(record.groups[1].rows[6].label).toBe('Performance Index (scores 76, 65, 56, 72, 61)');
  });

  it('works out the degree goal: required 4.67 (rounded up), about 93%, Second Class Upper safe above 1.44', () => {
    const goal = exampleDegreeGoal();
    expect(goal.required).toBe('4.67');
    expect(goal.averageScore).toBe(93);
    expect(goal.upperFloor).toBe('1.44');
    expect(goal.semestersLeft * goal.unitsPerSemester).toBe(39);
  });

  it('labels AcadeMind and the scanner with the shared age constant', () => {
    const values = CONTENTS_GROUPS.flatMap((group) => group.rows).filter((row) => row.value === ADULT_FEATURE_VALUE).map((row) => row.name);
    expect(values).toEqual(['Result scanner', 'AcadeMind']);
  });
});

describe('/features/result-scanner', () => {
  it('draws a slip whose scores, grades and foot add up', () => {
    const slip = scannerSlip();
    expect(slip.rows.map((row) => [row.total, row.grade])).toEqual([[76, 'A'], [65, 'B'], [56, 'C'], [72, 'A'], [61, 'B']]);
    for (const row of slip.rows) {
      expect(row.ca).toBeLessThanOrEqual(30);
      expect(row.exam).toBeLessThanOrEqual(70);
    }
    expect(slip.foot).toBe('TNU 13 · TCP 54 · GPA 4.15 · CGPA 4.43');
  });

  it('computes the live plate: 4.17 / 3.32 as read, 4.15 / 3.30 after the check', () => {
    const asRead = plateFigures(plateRows('as-read'));
    expect([asRead.units, asRead.gpa, asRead.pi]).toEqual([12, '4.17', '3.32']);
    const checked = plateFigures(plateRows('checked'));
    expect([checked.units, checked.gpa, checked.pi]).toEqual([13, '4.15', '3.30']);
    expect(plateFallbackLine()).toBe('As read, GST 311 showed 1 unit and a GPA of 4.17.');
  });

  it('parses the paste sample into five rows with nothing unread', () => {
    const parsed = parsePortalText(PASTE_SAMPLE);
    expect(parsed.rows).toHaveLength(5);
    expect(parsed.unparsed).toEqual([]);
    expect(parsed.rows.map((row) => [row.code, row.units, row.totalScore, row.grade])).toEqual([
      ['CSC 301', 3, 76, 'A'], ['CSC 303', 3, 65, 'B'], ['MTH 301', 3, 56, 'C'], ['CSC 305', 2, 72, 'A'], ['GST 311', 2, 61, 'B'],
    ]);
    expect(pasteResult()).toMatchObject({ found: '5 courses found', action: 'Add 5 courses for review' });
  });

  it('quotes live scan allowances, hides the coins row while coins are off, and falls back without numbers', () => {
    const free = (rows: ReturnType<typeof waysIn>) => rows.find((row) => row.name === 'Free each day')?.scan;
    expect(free(waysIn(usage()))).toBe('20 scans in any 24 hours, at most 5 in 15 minutes');
    expect(free(waysIn(usage({ ocr: 0 })))).toBe('Not available right now');
    expect(free(waysIn(null))).toBe('Free scans every day');
    expect(waysIn(usage()).some((row) => row.name === 'More when you need it')).toBe(false);
    expect(waysIn(usage({ coins: true })).some((row) => row.name === 'More when you need it')).toBe(true);
  });
});

describe('/features/ai-insights (AcadeMind)', () => {
  it('rebuilds the record: running CGPA 4.72, 4.75, 4.42, 4.47, 4.43', () => {
    const record = exampleRecord();
    expect(record.map((row) => row.cgpaAfter)).toEqual(['4.72', '4.75', '4.42', '4.47', '4.43']);
    expect(record.reduce((sum, row) => sum + row.units, 0)).toBe(87);
    expect(record.reduce((sum, row) => sum + row.points, 0)).toBe(385);
  });

  it('writes an analysis whose figures add up (4.62 had MTH 301 been an A; 0.07 below First Class; 4.67)', () => {
    const text = exampleAnalysis().map((section) => section.text).join(' ');
    expect(text).toContain('CSC 301 (76) and CSC 305 (72) were both A');
    expect(text).toContain('(56, C)');
    expect(text).toContain('would have been 4.62 instead of 4.15');
    expect(text).toContain('Second Class Upper at 4.43, 0.07 below First Class');
    expect(text).toContain('an average of 4.67 gets you there');
  });

  it('forecasts 4.30 then 4.21 with computeForecast', () => {
    const forecast = exampleForecast();
    expect(forecast.next).toBe('4.30');
    expect(forecast.after).toBe('4.21');
    expect(forecast.alt).toBe('Running CGPA 4.72, 4.75, 4.42, 4.47, 4.43; projected 4.30 next semester and 4.21 after.');
  });

  it('answers the what-if: 4.67, about 93%, 1.44 keeps Second Class Upper', () => {
    const whatIf = exampleWhatIf();
    expect([whatIf.required, whatIf.averageScore, whatIf.upperFloor]).toEqual(['4.67', 93, '1.44']);
  });

  it('keeps the disclaimer word for word and the providers in step with the privacy notice', () => {
    expect(ACADEMIND_COPY.disclaimer).toBe(AI_DISCLAIMER);
    const notice = JSON.stringify(BUILTIN_LEGAL);
    const answer = DATA_QA[1].answer;
    for (const provider of NAMED_PROVIDERS) {
      expect(notice).toContain(provider);
      expect(answer).toContain(provider);
    }
    expect(notice).toMatch(/up to 55 days/);
    expect(DATA_QA[2].answer).toContain('up to 55 days');
  });

  it('shows live allowances, the coins group only when coins are on, and numberless wording on a failed read', () => {
    expect(tellBlocks(usage())[0].lines[4]).toBe('3 free each day');
    expect(tellBlocks(usage())[1].lines[4]).toBe('8 trend notes free each day');
    expect(tellBlocks(null)[2].lines[4]).toBe('Free uses every day');
    expect(tellBlocks(usage({ insights: 0 }))[0].lines[4]).toBe('Not available right now');

    const off = freeEveryDay(usage());
    expect(off.groups.map((group) => group.name)).toEqual(['Free each day', 'Always free, no limit']);
    expect(off.closing).toBe('Used them all? Your free uses come back within 24 hours.');
    expect(off.groups[0].items.map((item) => [item.value, item.description])).toEqual([
      ['3 a day', 'At most 2 an hour, and a fresh one every 12 hours'],
      ['8 a day', 'At most 2 an hour'],
      ['20 a day', 'At most 3 in 5 minutes'],
      ['20 a day', 'At most 5 in 15 minutes'],
    ]);

    const on = freeEveryDay(usage({ coins: true }));
    expect(on.groups[2].name).toBe('Extra uses with coins on Android');
    expect(on.groups[2].items.map((item) => item.value)).toEqual(['2 per ad', '2 coins', '1 coin', '1 coin', '3 coins']);
    expect(on.closing).toContain("Coins can't be bought");
  });
});

describe('/features/timetable', () => {
  it('pins the builder output: 23 of 24 sessions, 10 / 6 / 5 / 2', () => {
    const plan = examplePlan();
    expect(plan.events).toHaveLength(23);
    expect(plan.warnings).toEqual(['Only 23 of 24 requested sessions fit around your lectures and exams.']);
    expect(plan.why).toContain('Numerical Analysis: 10 sessions (priority 3, difficulty 3, exam on 2026-12-11).');
    expect(plan.why).toContain('Data Structures: 6 sessions (priority 2, difficulty 2, exam on 2026-12-14).');
    expect(plan.why).toContain('Operating Systems: 5 sessions (priority 3, difficulty 2, exam on 2026-12-09).');
    expect(plan.why).toContain('Entrepreneurship: 2 sessions (priority 1, difficulty 1).');
    const onOrAfter = (title: string, exam: string) =>
      plan.events.filter((event) => event.title === `Study: ${title}` && event.recurrence.kind === 'once' && event.recurrence.date >= exam);
    expect(onOrAfter('Operating Systems', '2026-12-09')).toEqual([]);
    expect(onOrAfter('Numerical Analysis', '2026-12-11')).toEqual([]);
  });

  it('renders the receipt rows from the engine, summing to 23', () => {
    const working = planWorking();
    const perSubject = working.groups[0].rows;
    expect(perSubject.map((row) => row.value)).toEqual(['10', '6', '5', '2']);
    expect(perSubject.reduce((sum, row) => sum + Number(row.value), 0)).toBe(23);
    expect(perSubject[0].label).toBe('Numerical Analysis · high, hard, exam Fri 11 Dec');
    expect(perSubject[3].label).toBe('Entrepreneurship · low, easy, no exam date');
    const rules = Object.fromEntries(working.groups[1].rows.map((row) => [row.label, row.value]));
    expect(rules['Lighter day before an exam']).toBe('Tue 8, Thu 10 Dec');
    expect(rules['Never the same subject twice in a row']).toBe('all 12 days');
    expect(working.groups[2].rows[0].label).toBe('Only 23 of 24 requested sessions fit');
    expect(working.studyDays).toBe(12);
    expect(working.totalRow.value).toBe('23 sessions');
  });

  it('lays out the hero week with reminder times from the engine', () => {
    const week = exampleWeek();
    expect(week.map((day) => day.long)).toEqual(['Mon 30 Nov', 'Tue 1 Dec', 'Wed 2 Dec', 'Thu 3 Dec', 'Fri 4 Dec', 'Sat 5 Dec']);
    expect(week[0].bands.map((band) => [band.start, band.end, band.title, band.reminder, band.timetable])).toEqual([
      ['09:00', '11:00', 'Data Structures', '08:50', '300L lectures'],
      ['12:00', '14:00', 'Numerical Analysis', '11:50', '300L lectures'],
      ['16:00', '17:00', 'Study: Numerical Analysis', '15:50', 'Exam reading plan'],
      ['17:10', '18:10', 'Study: Operating Systems', '17:00', 'Exam reading plan'],
    ]);
    expect(week[0].bands[0].note).toBe('CSC 301 · LT 2 · Lecture');
    expect(week[0].bands[2].note).toBe('MTH 301 · Built with AcadeMind');
    expect(week[3].bands.map((band) => [band.start, band.title, band.reminder])).toEqual([
      ['09:00', 'Operating Systems', '08:50'],
      ['16:00', 'Computer Networks practical', '15:50'],
      ['18:00', 'Study: Numerical Analysis', '17:50'],
    ]);
    expect(week[0].bands[0].spoken).toBe('09:00 to 11:00, Data Structures, CSC 301, LT 2, lecture, reminder at 08:50');
  });

  it('pins validity, expiry and extend', () => {
    expect(FIXED_TIMETABLE.validity.endsAt).toBe('2027-02-01T23:59:59');
    const reading = readingTimetable();
    expect(reading.validity.endsAt).toBe('2026-12-13T23:59:59');
    expect(expiryState(reading, '2026-12-11T09:00:00')).toBe('ending_soon');
    expect(expiryState(reading, '2026-12-10T23:00:00')).toBe('ok');
    const extend = extendExample();
    expect(EXTEND_AT).toBe('2026-12-11T09:00:00');
    expect(extend.extended.endsAt).toBe('2026-12-27T23:59:59');
    expect(extend.newEnd).toBe('Sun 27 Dec 2026');
    expect(extend.validity).toBe('Valid for 2 weeks, until Sun 13 Dec 2026');
    expect(extend.kindLine).toBe('Reading timetable, 23 events');
    expect(extend.status).toBe('Ending soon');
  });

  it('pins the kinds, the notification, the .ics file and the FAQ facts', () => {
    expect(kindFields().map((field) => field.figure)).toEqual(['Mon 09:00', '23', '10']);
    expect(notificationExample()).toEqual({ title: 'Data Structures', body: 'Starts in 10 minutes, at 09:00, LT 2.' });
    expect(ICS_FILE).toBe('acadegrade-exam-reading-plan.ics');
    expect(TIMETABLE_FAQ).toHaveLength(7);
    expect(TIMETABLE_FAQ[5].answer).toContain('up to 10 timetables, each with up to 300 events');
  });

  it('never calls the builder AI, smart, intelligent or learning', () => {
    const text = JSON.stringify([COUPON, TIMETABLE_FAQ, planWorking().groups, kindFields()]);
    expect(text).not.toMatch(/\bAI\b|smart|intelligen|machine learning|learns/i);
  });
});

describe('/app and /app/download/ios', () => {
  const links = { androidUrl: 'https://x.example/a.apk', iosUrl: '', androidSizeMb: 45, playUrl: '' };

  it('drops missing size and version without leaving a stray separator', () => {
    expect(metaLine({ sizeMb: 45, version: '1.4.0' })).toBe('Version 1.4.0 · 45 MB · Android 7.0 or newer · APK file');
    expect(metaLine({ sizeMb: null, version: null })).toBe('Android 7.0 or newer · APK file');
    expect(downloadName({ sizeMb: 45 })).toBe('Download AcadeGrade for Android, APK file, 45 MB');
    expect(downloadName({ sizeMb: null })).toBe('Download AcadeGrade for Android, APK file');
    expect(bandLine({ sizeMb: null, version: null, playUrl: null })).toBe('Download AcadeGrade for Android');
    expect(installSteps({ sizeMb: null })[0].steps[0].note).toBe('one file');
  });

  it('lists the coins extra and the coins clause only when coins are on', () => {
    const off = appRelease(links, null, usage());
    expect(appExtras(off).map((extra) => extra.id)).not.toContain('coins');
    expect(safetyQa(off, 'acadegrade.vercel.app').find((qa) => qa.question === 'Is it free?')?.answer).toBe(
      'Yes, with nothing to pay and no subscription. AcadeMind has free uses every day.'
    );
    const on = appRelease(links, null, usage({ coins: true }));
    expect(appExtras(on).find((extra) => extra.id === 'coins')?.fact).toContain('for 2 coins');
    expect(safetyQa(on, 'acadegrade.vercel.app').find((qa) => qa.question === 'Is it free?')?.answer).toContain('coins from short ads');
  });

  it('adds the Google Play question only with a Play link, and uses "small" wording without a size', () => {
    const plain = safetyQa({ sizeMb: null, playUrl: null, coinsPerAd: null }, 'acadegrade.vercel.app');
    expect(plain).toHaveLength(10);
    expect(plain[6].answer.startsWith('The download happens once.')).toBe(true);
    expect(plain[1].answer).toContain('acadegrade.vercel.app/app');
    expect(safetyQa({ sizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=x', coinsPerAd: null })).toHaveLength(11);
  });

  it('builds SoftwareApplication JSON-LD with version and size only when known', () => {
    const json = softwareApplicationJsonLd({ sizeMb: null, version: null });
    expect(json).toMatchObject({ operatingSystem: 'Android 7.0 or later', isAccessibleForFree: true, offers: { price: 0, priceCurrency: 'NGN' } });
    expect(json).not.toHaveProperty('softwareVersion');
    expect(json).not.toHaveProperty('fileSize');
    expect(softwareApplicationJsonLd({ sizeMb: 45, version: '1.4.0' })).toMatchObject({ softwareVersion: '1.4.0', fileSize: '45 MB' });
  });

  it('redirects only to an HTTPS iOS link and writes four honest steps', () => {
    expect(iosRedirectTarget('https://apps.apple.com/app/x')).toBe('https://apps.apple.com/app/x');
    expect(iosRedirectTarget('')).toBeNull();
    expect(iosRedirectTarget('http://insecure.example')).toBeNull();
    expect(iosSteps('acadegrade.vercel.app').map((step) => step.step)).toEqual([
      'Open AcadeGrade in Safari', 'Tap Share', 'Choose Add to Home Screen', 'Tap Add',
    ]);
  });
});

describe('shared product helpers', () => {
  it('links each feature page to the next one', () => {
    expect(featureFoot('/features/result-scanner').next.label).toBe('AcadeMind');
    expect(featureFoot('/features/ai-insights').next.label).toBe('Timetable');
    expect(featureFoot('/features/timetable').next.label).toBe('Result scanner');
    expect(featureFoot('/features/timetable').others.map((link) => link.label)).toEqual([
      'AcadeMind', 'Transcripts', 'Free tools', 'Android app',
    ]);
  });

  it('builds breadcrumbs with absolute URLs', () => {
    const json = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Features', path: '/features' }]);
    expect(json.itemListElement[1]).toMatchObject({ position: 2, name: 'Features' });
    expect(json.itemListElement[1].item).toMatch(/^https:\/\/.+\/features$/);
  });

  it('formats allowances', () => {
    expect(dailyAllowance(usage(), 'ocr', { count: (n) => `${n} a day`, unknown: '?' })).toBe('20 a day');
    expect(formatCgpa(4.425)).toBe('4.43');
  });
});
