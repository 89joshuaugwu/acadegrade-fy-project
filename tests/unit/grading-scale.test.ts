import { describe, expect, it } from 'vitest';
import { SCALES, resolveGradingScale, validateCustomScale } from '@/lib/cgpa/academicRules';
import { classTone, scaleDegreeClass, classesWithTone, gradeTone } from '@/lib/cgpa/scale';
import { resolveDegreeClass } from '@/lib/cgpa/degreeClass';
import { DEGREE_CLASSES } from '@/lib/utils/constants';
import {
  customDraftFromScale,
  customDraftToInput,
  fieldErrors,
  readGradingScaleSetting,
  settingFor,
} from '@/lib/cgpa/scaleSetting';
import { previewScaleSwitch, rescoreCourse } from '@/lib/cgpa/scaleSwitch';

describe('class tone by rank', () => {
  it('maps NBTE classes to the five tones by rank, fail red', () => {
    const tones = SCALES.nbte4.classes.map((cls) => classTone(cls, SCALES.nbte4));
    expect(tones).toEqual(['1st', '2:1', '2:2', '3rd', 'Fail']);
  });

  it('keeps every ng5 class on its own tone', () => {
    expect(SCALES.ng5.classes.map((cls) => classTone(cls, SCALES.ng5))).toEqual(['1st', '2:1', '2:2', '3rd', 'Pass', 'Fail']);
  });

  it('caps long custom scales at the fifth tone, with the lowest class still red', () => {
    const result = validateCustomScale({
      maxPoint: 4,
      bands: [{ grade: 'A', minScore: 50, gradePoint: 4 }, { grade: 'F', minScore: 0, gradePoint: 0 }],
      classes: [4, 3.5, 3, 2.5, 2, 1.5, 1, 0].map((minCgpa, index) => ({ name: `Class ${index}`, minCgpa })),
    });
    if (!result.ok) throw new Error('expected a valid scale');
    const tones = result.scale.classes.map((cls) => classTone(cls, result.scale));
    expect(tones).toEqual(['1st', '2:1', '2:2', '3rd', 'Pass', 'Pass', 'Pass', 'Fail']);
  });

  it('lists classes with ranges and tones for the picker', () => {
    expect(classesWithTone(SCALES.nbte4)[0]).toMatchObject({ name: 'Distinction', minCgpa: 3.5, maxCgpa: 4, tone: '1st' });
  });
});

describe('scale-aware degree class entries', () => {
  it('gives exactly the existing ng5 entries', () => {
    expect(scaleDegreeClass(4.6, SCALES.ng5)).toEqual(DEGREE_CLASSES[0]);
    expect(scaleDegreeClass(0.5, SCALES.ng5)).toEqual(DEGREE_CLASSES[5]);
    expect(resolveDegreeClass(3.6)).toEqual(DEGREE_CLASSES[1]);
  });

  it('names NBTE classes with rank colours', () => {
    const upper = resolveDegreeClass(3.2, SCALES.nbte4);
    expect(upper.label).toBe('Upper Credit');
    expect(upper.colorToken).toBe('--class-2upper');
    expect(upper.minCGPA).toBe(3);
    expect(upper.maxCGPA).toBe(3.49);
    expect(resolveDegreeClass(1.2, SCALES.nbte4).colorToken).toBe('--class-fail');
  });
});

describe('stored setting', () => {
  it('reads a missing or broken setting as nothing (ng5)', () => {
    expect(readGradingScaleSetting(undefined)).toBeNull();
    expect(readGradingScaleSetting({ id: 'xyz' })).toBeNull();
    expect(readGradingScaleSetting('ng5')).toBeNull();
  });

  it('keeps a saved custom scale when switching to a ready-made one, so switching back is easy', () => {
    const custom = customDraftToInput(customDraftFromScale(SCALES.nbte4));
    const saved = settingFor('ng5', { custom });
    expect(saved).toEqual({ id: 'ng5', custom });
    expect(resolveGradingScale(saved)).toBe(SCALES.ng5);
  });

  it('never writes undefined fields', () => {
    expect(settingFor('nbte4', {})).toEqual({ id: 'nbte4' });
    expect(Object.values(settingFor('nce5', { nceClasses: { credit: 3.4 } }))).not.toContain(undefined);
  });

  it('prefills the custom editor from a scale and round-trips through validation', () => {
    const draft = customDraftFromScale(SCALES.nbte4);
    expect(draft.maxPoint).toBe('4');
    expect(draft.bands[1]).toEqual({ grade: 'AB', minScore: '70', gradePoint: '3.5' });
    const result = validateCustomScale(customDraftToInput(draft));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scale.bands).toEqual(SCALES.nbte4.bands);
  });

  it('turns blank inputs into errors on the right field', () => {
    const draft = customDraftFromScale(SCALES.ng5);
    draft.bands[0].minScore = '';
    const result = validateCustomScale(customDraftToInput(draft));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(fieldErrors(result.errors)['bands[0].minScore']).toMatch(/between 0 and 100/);
  });
});

describe('switch preview', () => {
  const semesters = [
    {
      id: 's1',
      label: '100L First',
      courses: [
        { id: 'c1', code: 'CSC 101', title: 'Intro', units: 3, caScore: 25, examScore: 47, totalScore: 72, grade: 'A' },
        { id: 'c2', code: 'MTH 101', title: 'Maths', units: 3, caScore: null, examScore: null, totalScore: null, grade: 'E', estimated: true },
        { id: 'c3', code: 'GST 101', title: 'English', units: 2, caScore: 10, examScore: null, totalScore: null, grade: null, isAR: true },
      ],
    },
  ];

  it('regrades scored courses and keeps letter-only courses', () => {
    expect(rescoreCourse(semesters[0].courses[0], SCALES.nbte4)).toEqual({ grade: 'AB', gradePoint: 3.5, piPoint: 2.88, estimated: false });
    // E is not on the no-E scale: the letter is kept so switching back restores it, but it counts 0.
    expect(rescoreCourse(semesters[0].courses[1], SCALES['ng5-noE'])).toEqual({ grade: 'E', gradePoint: 0, piPoint: 0, estimated: true });
    expect(rescoreCourse(semesters[0].courses[2], SCALES.nbte4)).toBeNull();
  });

  it('reports the CGPA and class before and after', () => {
    const preview = previewScaleSwitch(semesters, SCALES.ng5, SCALES.nbte4);
    expect(preview.before.cgpa).toBe(3);
    expect(preview.before.className).toBe('Second Class Lower (2:2)');
    expect(preview.after.cgpa).toBe(2.75);
    expect(preview.after.className).toBe('Lower Credit');
    expect(preview.unknownLetters).toEqual([]);
    expect(preview.semesters[0]).toMatchObject({ id: 's1', gpa: 2.75, creditLoaded: 6 });
    expect(preview.semesters[0].courses.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('lists letters that are not on the new scale', () => {
    const preview = previewScaleSwitch(semesters, SCALES.ng5, SCALES['ng5-noE']);
    expect(preview.unknownLetters).toEqual([{ semesterLabel: '100L First', code: 'MTH 101', grade: 'E' }]);
    expect(preview.after.cgpa).toBe(2.5);
  });
});

describe('grade colours by band rank', () => {
  it('keeps A-F on the 5-point scales', () => {
    expect(['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => gradeTone(grade, SCALES.ng5))).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(['A', 'D', 'F'].map((grade) => gradeTone(grade, SCALES['ng5-noE']))).toEqual(['A', 'D', 'F']);
  });

  it('spreads the nine NBTE bands over the five pass colours, F red', () => {
    expect(SCALES.nbte4.bands.map((band) => gradeTone(band.grade, SCALES.nbte4))).toEqual(['A', 'A', 'B', 'B', 'C', 'D', 'D', 'E', 'F']);
  });

  it('shows letters that are not on the scale in the fail colour', () => {
    expect(gradeTone('E', SCALES['ng5-noE'])).toBe('F');
  });
});
