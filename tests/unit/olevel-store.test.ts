import { beforeEach, describe, expect, it, vi } from 'vitest';

const fs = vi.hoisted(() => ({ setDocument: vi.fn(), updateDocument: vi.fn(), subscribeToDocument: vi.fn() }));
vi.mock('@/lib/firebase/firestore', () => fs);

import {
  admissionPath,
  aggregateInputFrom,
  defaultAdmissionRecord,
  olevelPath,
  parseStoredAdmissionRecord,
  pickAggregateGrades,
  RecordSaveError,
  saveAdmissionRecord,
  saveOlevelRecord,
  setRecordType,
  toAdmissionWrite,
  toOlevelWrite,
} from '@/lib/records/store';
import { computeAggregate } from '@/lib/records/admissionRules';
import type { OlevelRecord } from '@/lib/records/olevelRules';

const sitting = (id: string, subjects: [string, string, string][], exam = 'waec', year = 2024) => ({
  id,
  exam: exam as 'waec',
  year,
  subjects: subjects.map(([subjectId, name, grade]) => ({ subjectId, name, grade: grade as 'A1' })),
});

const record: OlevelRecord = {
  sittings: [
    sitting('s1', [
      ['english', 'English Language', 'C4'],
      ['mathematics', 'Mathematics', 'D7'],
      ['physics', 'Physics', 'B3'],
      ['chemistry', 'Chemistry', 'C5'],
      ['biology', 'Biology', 'C6'],
      ['economics', 'Economics', 'A1'],
    ]),
    sitting('s2', [
      ['mathematics', 'Mathematics', 'B2'],
      ['chemistry', 'Chemistry', 'B3'],
    ], 'neco', 2025),
  ],
};

beforeEach(() => {
  fs.setDocument.mockReset().mockResolvedValue(undefined);
  fs.updateDocument.mockReset().mockResolvedValue(undefined);
});

describe('paths', () => {
  it('uses the single current document under the user', () => {
    expect(olevelPath('u1')).toBe('users/u1/olevel/current');
    expect(admissionPath('u1')).toBe('users/u1/admission/current');
  });
});

describe('toOlevelWrite', () => {
  it('writes schemaVersion 1 and trimmed subject names', () => {
    const result = toOlevelWrite({ sittings: [sitting('s1', [['english', '  English Language ', 'A1']])] }, 2026);
    expect(result).toEqual({
      ok: true,
      data: { schemaVersion: 1, sittings: [{ id: 's1', exam: 'waec', year: 2024, subjects: [{ subjectId: 'english', name: 'English Language', grade: 'A1' }] }] },
    });
  });

  it('rejects a duplicate subject in one sitting and a future year', () => {
    const dup = toOlevelWrite({ sittings: [sitting('s1', [['english', 'English', 'A1'], ['english', 'Eng', 'B2']])] }, 2026);
    expect(dup.ok).toBe(false);
    const future = toOlevelWrite({ sittings: [sitting('s1', [['english', 'English', 'A1']], 'waec', 2027)] }, 2026);
    expect(future.ok).toBe(false);
  });

  it('stores course subjects as ids only (Firestore has no nested lists), deduped, at most 6', () => {
    const result = toOlevelWrite({
      sittings: [],
      targetCourse: { name: ' Medicine ', required: ['biology', ['physics', 'chemistry'], 'biology', 'a', 'b', 'c', 'd', 'e'] },
    }, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.targetCourse).toEqual({ name: 'Medicine', required: ['biology', 'physics', 'chemistry', 'a', 'b', 'c'] });
  });

  it('names the course "My course" when only subjects are picked, and drops an empty course', () => {
    const named = toOlevelWrite({ sittings: [], targetCourse: { name: '', required: ['physics'] } }, 2026);
    expect(named.ok && named.data.targetCourse).toEqual({ name: 'My course', required: ['physics'] });
    const empty = toOlevelWrite({ sittings: [], targetCourse: { name: '  ', required: [] } }, 2026);
    expect(empty.ok && 'targetCourse' in empty.data).toBe(false);
  });
});

describe('saveOlevelRecord', () => {
  it('replaces the document (merge false) at the current path', async () => {
    await saveOlevelRecord('u1', record, 2026);
    expect(fs.setDocument).toHaveBeenCalledWith('users/u1/olevel/current', expect.objectContaining({ schemaVersion: 1 }), { merge: false });
  });

  it('throws RecordSaveError and writes nothing for an invalid record', async () => {
    await expect(saveOlevelRecord('u1', { sittings: [sitting('s1', [['english', 'English', 'Z9']])] }, 2026)).rejects.toBeInstanceOf(RecordSaveError);
    expect(fs.setDocument).not.toHaveBeenCalled();
  });
});

describe('admission records', () => {
  it('defaults to UTME and post-UTME with grades from the O-level record', () => {
    expect(defaultAdmissionRecord()).toEqual({ formula: 'utme-post', olevelSource: 'record', pointTable: 'four-to-two' });
  });

  it('reads stored data tolerantly: junk is dropped, the formula falls back', () => {
    expect(parseStoredAdmissionRecord(null)).toEqual(defaultAdmissionRecord());
    expect(parseStoredAdmissionRecord({ formula: 'magic', utme: { score: '250' }, postUtme: { score: 60, max: 100 }, school: 'UNILAG', id: 'current' })).toEqual({
      formula: 'utme-post', olevelSource: 'record', pointTable: 'four-to-two', postUtme: { score: 60, max: 100 }, school: 'UNILAG',
    });
    expect(parseStoredAdmissionRecord({ formula: 'custom', weights: { utme: 60, olevel: 10, postUtme: 30 }, utme: { score: 280, year: 2025 }, olevelSource: 'manual', olevelGrades: [{ subjectId: 'english', grade: 'B3' }, { subjectId: 'x', grade: 'Q' }] })).toMatchObject({
      formula: 'custom', weights: { utme: 60, olevel: 10, postUtme: 30 }, utme: { score: 280, year: 2025 }, olevelSource: 'manual', olevelGrades: [{ subjectId: 'english', grade: 'B3' }],
    });
  });

  it('never writes undefined fields and trims the school', () => {
    const result = toAdmissionWrite({ ...defaultAdmissionRecord(), utme: { score: 245 }, school: '  University of Lagos ', course: '' });
    expect(result).toEqual({ ok: true, data: { schemaVersion: 1, formula: 'utme-post', olevelSource: 'record', pointTable: 'four-to-two', utme: { score: 245 }, school: 'University of Lagos' } });
    expect(JSON.stringify(result)).not.toContain('undefined');
  });

  it('rejects a UTME above 400, a post-UTME above its max and custom weights not adding to 100', () => {
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), utme: { score: 401 } }).ok).toBe(false);
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), postUtme: { score: 61, max: 60 } }).ok).toBe(false);
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), formula: 'custom', weights: { utme: 50, olevel: 20, postUtme: 20 } }).ok).toBe(false);
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), postUtme: { score: 30, max: 40.5 } }).ok).toBe(false);
  });

  it('drops weights and custom points that the chosen formula and table do not use', () => {
    const result = toAdmissionWrite({ ...defaultAdmissionRecord(), weights: { utme: 50, olevel: 20, postUtme: 30 }, customPoints: { A1: 4, B2: 3, B3: 2, C4: 1, C5: 1, C6: 1 } });
    expect(result.ok && result.data).not.toHaveProperty('weights');
    expect(result.ok && result.data).not.toHaveProperty('customPoints');
  });

  it('keeps a saved target aggregate from 0 to 100 and drops a broken one', () => {
    expect(parseStoredAdmissionRecord({ formula: 'utme-post', target: 70.5 })).toMatchObject({ target: 70.5 });
    expect(parseStoredAdmissionRecord({ formula: 'utme-post', target: 101 })).not.toHaveProperty('target');
    expect(parseStoredAdmissionRecord({ formula: 'utme-post', target: '70' })).not.toHaveProperty('target');
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), target: 72 })).toMatchObject({ ok: true, data: { target: 72 } });
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), target: 100.5 })).toEqual({ ok: false, errors: ['target'] });
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), target: 70.123 })).toEqual({ ok: false, errors: ['target'] });
  });

  it('stores a post-UTME "out of" total before the score is known', () => {
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), postUtme: { max: 60 } })).toMatchObject({ ok: true, data: { postUtme: { max: 60 } } });
    expect(toAdmissionWrite({ ...defaultAdmissionRecord(), postUtme: { max: 0 } }).ok).toBe(false);
    expect(parseStoredAdmissionRecord({ formula: 'utme-post', postUtme: { max: 60 } })).toMatchObject({ postUtme: { max: 60 } });
    expect(parseStoredAdmissionRecord({ formula: 'utme-post', postUtme: { max: 900 } })).not.toHaveProperty('postUtme');
    // The engine still treats the score as missing, but works out what is needed out of 60.
    const input = aggregateInputFrom({ ...defaultAdmissionRecord(), utme: { score: 240 }, postUtme: { max: 60 } }, null);
    expect(input.postUtme).toEqual({ score: null, max: 60 });
    expect(computeAggregate(input).missing).toEqual(['postUtme']);
  });

  it('saves with merge false', async () => {
    await saveAdmissionRecord('u1', { ...defaultAdmissionRecord(), utme: { score: 245 } });
    expect(fs.setDocument).toHaveBeenCalledWith('users/u1/admission/current', expect.objectContaining({ utme: { score: 245 } }), { merge: false });
  });
});

describe('pickAggregateGrades', () => {
  it('takes English, Maths, then the best three others (ties by name), using the best of both sittings', () => {
    const picked = pickAggregateGrades(record);
    expect(picked.map((row) => `${row.subjectId}:${row.grade}`)).toEqual([
      'english:C4', 'mathematics:B2', 'economics:A1', 'chemistry:B3', 'physics:B3',
    ]);
  });

  it('puts the course subjects first after English and Maths', () => {
    const picked = pickAggregateGrades({ ...record, targetCourse: { name: 'Medicine', required: ['biology'] } });
    expect(picked.map((row) => row.subjectId)).toEqual(['english', 'mathematics', 'biology', 'economics', 'chemistry']);
  });

  it('keeps an awaiting result so the aggregate stays incomplete', () => {
    const picked = pickAggregateGrades({ sittings: [sitting('s1', [['english', 'English', 'AR'], ['mathematics', 'Maths', 'B2']])] });
    expect(picked.map((row) => row.grade)).toEqual(['AR', 'B2']);
  });
});

describe('aggregateInputFrom', () => {
  it('feeds the engine from the O-level record', () => {
    const input = aggregateInputFrom({ ...defaultAdmissionRecord(), formula: 'utme-olevel-post', utme: { score: 280 }, postUtme: { score: 70, max: 100 } }, record);
    expect(input.olevelGrades).toEqual(['C4', 'B2', 'A1', 'B3', 'B3']);
    const result = computeAggregate(input);
    expect(result.complete).toBe(true);
    // 280/400*50 = 35; points 2.8+3.6+4+3.2+3.2 = 16.8 of 20 -> 16.8; 70/100*30 = 21.
    expect(result.aggregate).toBe(72.8);
  });

  it('uses the manual grades when the student chose them', () => {
    const input = aggregateInputFrom({ ...defaultAdmissionRecord(), olevelSource: 'manual', olevelGrades: [{ subjectId: 'english', grade: 'A1' }] }, record);
    expect(input.olevelGrades).toEqual(['A1']);
  });

  it('copes with no O-level record yet', () => {
    expect(aggregateInputFrom(defaultAdmissionRecord(), null).olevelGrades).toEqual([]);
  });
});

describe('setRecordType', () => {
  it('only writes the recordType field', async () => {
    await setRecordType('u1', 'olevel');
    expect(fs.updateDocument).toHaveBeenCalledWith('users/u1', { recordType: 'olevel' });
  });
});
