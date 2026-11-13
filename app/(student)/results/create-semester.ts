import { queryCollection, setDocument } from '@/lib/firebase/firestore';
import { slotKey, type AcademicSlot } from '@/lib/academic/timeline';
import type { SemesterWithId } from '@/types/semester';

export type CreateSemesterResult = { status: 'created'; id: string } | { status: 'duplicate' };

/**
 * Creates the semester document for a timeline slot (the one semester-creation
 * path, shared by /results/new and the calculator handoff). Refuses a slot that
 * already exists so a level and semester is never added twice.
 */
export async function createSemesterForSlot(uid: string, slot: AcademicSlot): Promise<CreateSemesterResult> {
  const collectionPath = `users/${uid}/semesters`;
  const latest = await queryCollection<SemesterWithId>(collectionPath);
  if (latest.some((semester) => slotKey(Number(semester.level), Number(semester.semester)) === slot.key)) {
    return { status: 'duplicate' };
  }
  const id = `slot_${slot.level}_${slot.semester}`;
  await setDocument(`${collectionPath}/${id}`, {
    label: slot.label,
    session: slot.session,
    level: slot.level,
    semester: slot.semester,
    gpa: 0,
    pi: 0,
    creditLoaded: 0,
    isComplete: false,
  });
  return { status: 'created', id };
}

/**
 * Where handed-off calculator rows go: the earliest existing semester that has
 * no courses yet, otherwise a new semester for the next empty timeline slot.
 */
export async function semesterForHandoff(
  uid: string,
  semesters: SemesterWithId[],
  nextSlot: AcademicSlot | null
): Promise<{ id: string } | { error: string }> {
  const candidates = semesters.filter((semester) => !semester.isComplete && !Number(semester.creditLoaded));
  for (const semester of candidates) {
    const courses = await queryCollection(`users/${uid}/semesters/${semester.id}/courses`);
    if (courses.length === 0) return { id: semester.id };
  }
  if (!nextSlot) {
    return { error: 'Add your entry session and programme length in Settings first, then try again.' };
  }
  const created = await createSemesterForSlot(uid, nextSlot);
  if (created.status === 'duplicate') {
    return { error: 'That semester already exists. Refresh the page and try again.' };
  }
  return { id: created.id };
}
