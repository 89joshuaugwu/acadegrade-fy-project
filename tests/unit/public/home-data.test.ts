import { describe, expect, it } from 'vitest';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { computeExampleSlip } from '@/lib/public/example-student';
import { CAMPUS_PHOTOS } from '@/lib/public/credits-data';
import { CALCULATOR_HANDOFF_KEY, CALCULATOR_HANDOFF_MAX_AGE_MS, readCalculatorHandoff, saveCalculatorHandoff } from '@/lib/handoff/calculator';
import {
  HOME_DESCRIPTION,
  HOME_FACTS,
  HOME_FAQ,
  HOME_HERO,
  HOME_ITINERARY,
  HOME_HERO_SCREENS,
  HOME_PHOTO_SLOTS,
  HOME_SHEETS,
  HOME_TITLE,
  homeHandoffCourses,
  homeJsonLd,
  liveSlipAnnouncement,
  pickHomeMedia,
  priorRecordLine,
  requiredAverageRoundedUp,
  scaleBars,
  showcaseSlips,
  toFirstClassLine,
} from '@/lib/public/home';

describe('home live slip (home.md §5.1, pinned against the real engine)', () => {
  it('loads at GPA 4.15 and CGPA 4.43, Second Class Upper (385 ÷ 87)', () => {
    const slip = computeExampleSlip();
    expect(slip.rows.map((row) => row.weighted)).toEqual([15, 12, 9, 10, 8]);
    expect(slip.units).toBe(13);
    expect(slip.points).toBe(54);
    expect(formatCgpa(slip.gpa)).toBe('4.15');
    expect(formatCgpa(slip.cgpa)).toBe('4.43');
    expect(slip.classBand.label).toBe('Second Class Upper');
    expect(toFirstClassLine(slip)).toBe('0.07 to First Class');
    expect(liveSlipAnnouncement(slip)).toBe('CGPA 4.43, Second Class Upper');
  });

  it('MTH 301 C to A gives 391 ÷ 87 = 4.49, still Second Class Upper and 0.01 short', () => {
    const slip = computeExampleSlip({ 'MTH 301': 'A' });
    expect(slip.totalPoints).toBe(391);
    expect(formatCgpa(slip.cgpa)).toBe('4.49');
    expect(slip.classBand.label).toBe('Second Class Upper');
    expect(toFirstClassLine(slip)).toBe('0.01 to First Class');
  });

  it('then CSC 303 B to A gives 394 ÷ 87 = 4.53, First Class', () => {
    const slip = computeExampleSlip({ 'MTH 301': 'A', 'CSC 303': 'A' });
    expect(slip.totalPoints).toBe(394);
    expect(formatCgpa(slip.cgpa)).toBe('4.53');
    expect(slip.classBand.label).toBe('First Class');
    expect(toFirstClassLine(slip)).toBe('First Class');
    expect(liveSlipAnnouncement(slip)).toBe('CGPA 4.53, First Class');
  });

  it('an F marks one carry-over and the announcement says so', () => {
    const slip = computeExampleSlip({ 'GST 311': 'F' });
    expect(slip.carryOvers).toBe(1);
    expect(slip.rows.find((row) => row.code === 'GST 311')?.weighted).toBe(0);
    expect(liveSlipAnnouncement(slip)).toMatch(/, 1 carry-over$/);
  });

  it('prints the prior record from the points: 331 over 74 units (CGPA 4.47)', () => {
    expect(priorRecordLine()).toBe('Before this semester: 331 points over 74 units (CGPA 4.47)');
  });

  it('keeps the hero copy word for word', () => {
    expect(HOME_HERO.title).toBe('Know your CGPA. Know your class.');
    expect(HOME_HERO.sentence).toBe(
      'AcadeGrade turns each semester’s result slip into your GPA, CGPA and degree class, then helps you plan the next one. Free for Nigerian university students.'
    );
    expect(HOME_HERO.primary).toBe('Start your free record');
    expect(HOME_HERO.primaryTouched).toBe('Save this semester');
    expect(HOME_HERO.signedIn).toBe('Open dashboard');
    expect(HOME_HERO.links.map((link) => link.href)).toEqual(['/calculator', '/app', '/login']);
  });
});

describe('Save this semester writes the existing calculator handoff', () => {
  it('turns the slip into five letter-grade rows the calculator handoff accepts', () => {
    const slip = computeExampleSlip({ 'MTH 301': 'A' });
    const courses = homeHandoffCourses(slip);
    expect(courses).toEqual([
      { code: 'CSC 301', units: 3, grade: 'A' },
      { code: 'CSC 303', units: 3, grade: 'B' },
      { code: 'MTH 301', units: 3, grade: 'A' },
      { code: 'CSC 305', units: 2, grade: 'A' },
      { code: 'GST 311', units: 2, grade: 'B' },
    ]);
    sessionStorage.clear();
    const now = 1_800_000_000_000;
    expect(saveCalculatorHandoff({ mode: 'grade', courses }, now)).toBe(true);
    expect(sessionStorage.getItem(CALCULATOR_HANDOFF_KEY)).not.toBeNull();
    expect(readCalculatorHandoff(now + CALCULATOR_HANDOFF_MAX_AGE_MS - 1)?.courses).toHaveLength(5);
    expect(readCalculatorHandoff(now + CALCULATOR_HANDOFF_MAX_AGE_MS + 1)).toBeNull();
  });
});

describe('Scale section bars (generated from lib/public/scales.ts)', () => {
  it('has seven bars with the grades open first and the class bands from the scale', () => {
    const bars = scaleBars();
    expect(bars).toHaveLength(7);
    expect(bars[0].name).toBe('Grades on the 5-point scale');
    expect(bars[0].rows).toEqual(['A 70–100 → 5', 'B 60–69 → 4', 'C 50–59 → 3', 'D 45–49 → 2', 'E 40–44 → 1', 'F 0–39 → 0']);
    expect(bars[1].rows).toEqual([
      'First Class 4.50–5.00',
      'Second Class Upper 3.50–4.49',
      'Second Class Lower 2.40–3.49',
      'Third Class 1.50–2.39',
      'Pass 1.00–1.49',
    ]);
  });

  it('works the GPA example out with the engine (54 ÷ 13 = 4.15) and PI from the scores', () => {
    const bars = scaleBars();
    expect(bars[2].text).toContain('The example above: 54 ÷ 13 = 4.15.');
    expect(bars[3].text).toContain('A 76 counts as 3.80, a 72 as 3.60.');
  });
});

describe('What one slip gives you (showcase slips)', () => {
  it('prints real outputs that add up', () => {
    const slips = showcaseSlips();
    expect(slips).toHaveLength(6);
    expect(slips[0].lines).toEqual(['2025/2026 First Semester', '13 units', 'GPA 4.15', 'PI 3.30']);
    expect(slips[1].lines).toEqual(['CGPA 4.43', '87 units', 'Second Class Upper', '0.07 to First Class']);
    expect(slips[3].lines).toEqual(['Aiming for First Class (4.50)', 'Remaining: 40 units', 'You need 4.67 average']);
  });

  it('rounds a required average up, so a student never aims too low: (4.50 × 127 − 385) ÷ 40 = 4.6625 → 4.67', () => {
    expect(requiredAverageRoundedUp({ currentCgpa: 385 / 87, completedUnits: 87, remainingUnits: 40, targetCgpa: 4.5 })).toBe(4.67);
    expect(requiredAverageRoundedUp({ currentCgpa: 4, completedUnits: 10, remainingUnits: 10, targetCgpa: 4.5 })).toBe(5);
    expect(requiredAverageRoundedUp({ currentCgpa: 4, completedUnits: 10, remainingUnits: 0, targetCgpa: 4.5 })).toBeNull();
  });
});

describe('home content blocks', () => {
  it('sorts results day into three moments and ends at about 5 minutes', () => {
    expect(HOME_ITINERARY.groups.map((group) => group.title)).toEqual(['Results day', 'That evening', 'Before next semester']);
    expect(HOME_ITINERARY.groups.flatMap((group) => group.rows)).toHaveLength(8);
    expect(HOME_ITINERARY.total).toEqual({ label: 'You hold: an up-to-date CGPA and a plan', value: 'about 5 minutes' });
  });

  it('has five sheets linking to the feature pages and tools', () => {
    expect(HOME_SHEETS.map((sheet) => sheet.href)).toEqual([
      '/features/result-scanner',
      '/features/ai-insights',
      '/features/timetable',
      '/features#transcript',
      '/tools',
    ]);
  });

  it('lists four facts and six questions', () => {
    expect(HOME_FACTS).toHaveLength(4);
    expect(HOME_FAQ.map((item) => item.question)).toEqual([
      'Is AcadeGrade free?',
      'Is this my official result?',
      'Which universities does it work for?',
      'What happens to my result slip when I scan it?',
      'Do I need the Android app?',
      'Can I delete my account?',
    ]);
  });

  it('names photo slots only, never a campus slug (owner decision, 20 Nov), and shows the app in the hero', () => {
    const slots = Object.values(HOME_PHOTO_SLOTS);
    expect(slots).toEqual(['home.showcase', 'home.faq-tall', 'home.faq-square']);
    const slugs = CAMPUS_PHOTOS.map((photo) => photo.id);
    const source = JSON.stringify({ slots, screens: HOME_HERO_SCREENS });
    for (const slug of slugs) expect(source).not.toContain(slug);
    expect(HOME_HERO_SCREENS.map((screen) => screen.id)).toEqual(['dashboard', 'semester', 'timetable']);
  });
});

describe('home media settings (config/about)', () => {
  it('accepts only https URLs and fails closed', () => {
    expect(pickHomeMedia(undefined)).toEqual({ founderPhotoUrl: null, scanVideoUrl: null });
    expect(pickHomeMedia({ founderPhotoUrl: 'http://example.org/a.jpg', scanVideoUrl: 42 })).toEqual({ founderPhotoUrl: null, scanVideoUrl: null });
    expect(pickHomeMedia({ founderPhotoUrl: ' https://res.cloudinary.com/x/joshua.jpg ', scanVideoUrl: 'https://cdn.example.org/scan.mp4' })).toEqual({
      founderPhotoUrl: 'https://res.cloudinary.com/x/joshua.jpg',
      scanVideoUrl: 'https://cdn.example.org/scan.mp4',
    });
  });
});

describe('home SEO', () => {
  it('uses the planned title and a 140 to 160 character description', () => {
    expect(HOME_TITLE).toBe('AcadeGrade: CGPA, GPA and degree class for Nigerian universities');
    expect(HOME_DESCRIPTION.length).toBeGreaterThanOrEqual(140);
    expect(HOME_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });

  it('builds Organization, SoftwareApplication and an FAQPage that matches the visible questions exactly', () => {
    const graph = homeJsonLd('https://acadegrade.vercel.app', null);
    expect(graph.map((node) => node['@type'])).toEqual(['Organization', 'SoftwareApplication', 'FAQPage']);
    const software = graph[1] as Record<string, unknown>;
    expect(software).toMatchObject({ operatingSystem: 'Android, Web', isAccessibleForFree: true, applicationCategory: 'EducationalApplication' });
    const faq = graph[2] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity.map((entry) => entry.name)).toEqual(HOME_FAQ.map((item) => item.question));
    expect(faq.mainEntity.map((entry) => entry.acceptedAnswer.text)).toEqual(HOME_FAQ.map((item) => item.answer));
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating/);
  });
});
