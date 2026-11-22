import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './client';
import { queryCollection } from './firestore';
import type { SemesterUnderScale, SwitchCourse, SwitchSemester } from '@/lib/cgpa/scaleSwitch';
import type { StoredGradingScale } from '@/lib/cgpa/scaleSetting';

/** Every semester with its courses, oldest first, for a scale switch preview. */
export async function loadSwitchSemesters(uid: string): Promise<SwitchSemester[]> {
  const semesters = await queryCollection<{ id: string; label?: string; level?: number; semester?: number }>(`users/${uid}/semesters`);
  semesters.sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0) || (Number(a.semester) || 0) - (Number(b.semester) || 0));
  return Promise.all(semesters.map(async (semester) => ({
    id: semester.id,
    label: semester.label ?? '',
    courses: await queryCollection<SwitchCourse>(`users/${uid}/semesters/${semester.id}/courses`),
  })));
}

/** Firestore allows 500 writes per batch; stay well under it. */
const WRITES_PER_BATCH = 400;

/**
 * Stores the new scale choice and the semester and course totals recalculated
 * on it (scores and letters are never changed except a scored course's letter,
 * which the score decides). The profile is written in the last batch, so a
 * failed switch leaves the old scale active and can simply be tried again.
 */
export async function applyGradingScaleSwitch(
  uid: string,
  setting: StoredGradingScale,
  semesters: readonly SemesterUnderScale[],
  /** The CGPA and class on the new scale, so the class-change alert compares like with like. */
  standing?: { cgpa: number; degreeClass: string }
): Promise<void> {
  type Write = (batch: ReturnType<typeof writeBatch>) => void;
  const writes: Write[] = [];
  for (const semester of semesters) {
    const semesterPath = `users/${uid}/semesters/${semester.id}`;
    for (const course of semester.courses) {
      const { id, ...fields } = course;
      writes.push((batch) => batch.update(doc(db, `${semesterPath}/courses/${id}`), { ...fields, updatedAt: serverTimestamp() }));
    }
    writes.push((batch) => batch.update(doc(db, semesterPath), {
      gpa: semester.gpa,
      pi: semester.pi,
      creditLoaded: semester.creditLoaded,
      updatedAt: serverTimestamp(),
    }));
  }
  writes.push((batch) => batch.set(doc(db, `analytics/${uid}`), { insightsStale: true, ...(standing ?? {}), updatedAt: serverTimestamp() }, { merge: true }));

  for (let start = 0; start < writes.length; start += WRITES_PER_BATCH) {
    const batch = writeBatch(db);
    for (const write of writes.slice(start, start + WRITES_PER_BATCH)) write(batch);
    await batch.commit();
  }
  const finalBatch = writeBatch(db);
  finalBatch.update(doc(db, `users/${uid}`), { gradingScale: setting, updatedAt: new Date().toISOString() });
  await finalBatch.commit();
}
