import { describe, expect, it, vi } from 'vitest';
import { buildDataExport, collectExportData, coursesToCsv, exportFileNames, type ExportReaders } from '@/lib/export';

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

const profile = {
  fullName: 'Ada Okafor',
  email: 'ada@example.com',
  matric: 'CSC/2021/001',
  fcmToken: 'secret-token',
  fcmTokens: ['a', 'b'],
  createdAt: ts('2024-01-02T03:04:05.000Z'),
};

const semesters = [
  {
    id: 's2', label: 'Second Semester', session: '2024/2025', level: 200, semester: 2, gpa: 4, pi: 3.9, creditLoaded: 3, isComplete: true,
    courses: [{ id: 'c3', code: 'CSC 202', title: 'Algorithms', units: 3, caScore: 22, examScore: 48, totalScore: 70, grade: 'A', gradePoint: 5, isAR: false }],
  },
  {
    id: 's1', label: 'First Semester', session: '2024/2025', level: 200, semester: 1, gpa: 3, pi: 3.1, creditLoaded: 5, isComplete: true,
    courses: [
      { id: 'c1', code: 'CSC 201', title: 'Data, "Structures"', units: 3, caScore: 20, examScore: 35, totalScore: 55, grade: 'C', gradePoint: 3 },
      { id: 'c2', code: 'GST 201', title: '=HYPERLINK("x")', units: 2, caScore: 25, examScore: null, totalScore: null, grade: null, gradePoint: 0, isAR: true },
    ],
  },
];

describe('buildDataExport', () => {
  it('includes profile, semesters with courses, insights and notifications, without push tokens', () => {
    const data = buildDataExport({
      uid: 'u1',
      profile,
      semesters,
      analytics: { lastInsight: { data: { degreeOutlook: 'Strong' } }, updatedAt: ts('2025-05-01T00:00:00.000Z') },
      notifications: [{ id: 'n1', title: 'Saved', createdAt: ts('2025-05-02T00:00:00.000Z') }],
      exportedAt: new Date('2025-06-01T10:00:00.000Z'),
    });

    expect(data.format).toBe('acadegrade-export');
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBe('2025-06-01T10:00:00.000Z');
    expect(data.profile).toMatchObject({ fullName: 'Ada Okafor', createdAt: '2024-01-02T03:04:05.000Z' });
    expect(data.profile).not.toHaveProperty('fcmToken');
    expect(data.profile).not.toHaveProperty('fcmTokens');
    expect(data.semesters.map((semester) => semester.id)).toEqual(['s1', 's2']);
    expect(data.semesters[0].courses).toHaveLength(2);
    expect(data.insights).toMatchObject({ lastInsight: { data: { degreeOutlook: 'Strong' } }, updatedAt: '2025-05-01T00:00:00.000Z' });
    expect(data.notifications[0]).toMatchObject({ id: 'n1', createdAt: '2025-05-02T00:00:00.000Z' });
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});

describe('coursesToCsv', () => {
  it('writes one row per course in semester order, escaped and safe for spreadsheets', () => {
    const csv = coursesToCsv(semesters);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('Level,Semester,Session,Semester label,Code,Title,Units,CA,Exam,Total,Grade,Grade point,Status');
    expect(lines[1]).toBe('200,1,2024/2025,First Semester,CSC 201,"Data, ""Structures""",3,20,35,55,C,3,Graded');
    expect(lines[2]).toBe('200,1,2024/2025,First Semester,GST 201,"\'=HYPERLINK(""x"")",2,25,,,,,Awaiting result');
    expect(lines[3]).toContain('CSC 202');
    expect(csv.startsWith('﻿')).toBe(false);
  });
});

describe('collectExportData', () => {
  it('reads semesters, courses, insights and notifications with the client SDK only', async () => {
    const queryCollection = vi.fn((path: string) => Promise.resolve(
      path === 'users/u1/semesters' ? [{ id: 's1', label: 'First', level: 100, semester: 1 }]
        : path === 'users/u1/semesters/s1/courses' ? [{ id: 'c1', code: 'MTH 101' }]
          : path === 'notifications/u1/items' ? [{ id: 'n1' }]
            : []
    ));
    const getDocument = vi.fn().mockResolvedValue({ lastInsight: {} });
    const data = await collectExportData('u1', { fullName: 'Ada' }, { queryCollection, getDocument } as unknown as ExportReaders);
    expect(data.semesters[0].courses).toEqual([{ id: 'c1', code: 'MTH 101' }]);
    expect(data.notifications).toEqual([{ id: 'n1' }]);
    expect(getDocument).toHaveBeenCalledWith('analytics/u1');
  });

  it('still exports when the optional insights and notifications cannot be read', async () => {
    const queryCollection = vi.fn((path: string) => (
      path.startsWith('notifications') ? Promise.reject(new Error('denied')) : Promise.resolve([])
    ));
    const getDocument = vi.fn().mockRejectedValue(new Error('denied'));
    const data = await collectExportData('u1', {}, { queryCollection, getDocument } as unknown as ExportReaders);
    expect(data.analytics).toBeNull();
    expect(data.notifications).toEqual([]);
  });
});

describe('exportFileNames', () => {
  it('dates the files', () => {
    expect(exportFileNames(new Date('2025-06-01T10:00:00Z'))).toEqual({
      json: 'acadegrade-data-2025-06-01.json',
      csv: 'acadegrade-courses-2025-06-01.csv',
    });
  });
});
