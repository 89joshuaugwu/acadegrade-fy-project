import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './client';
import type { PreparedCourse, PreparedSemesterSave } from '@/lib/results/semester-save';

interface CommitSemesterRecordInput {
  uid: string;
  semesterId: string;
  courses: PreparedCourse[];
  removedCourseIds: string[];
  summary: PreparedSemesterSave['summary'];
}

/**
 * Commits course replacements, semester totals, and insight invalidation as one
 * Firestore operation. Either every write succeeds or the previous record stays intact.
 */
export async function commitSemesterRecord({
  uid,
  semesterId,
  courses,
  removedCourseIds,
  summary,
}: CommitSemesterRecordInput): Promise<void> {
  const batch = writeBatch(db);
  const semesterPath = `users/${uid}/semesters/${semesterId}`;
  const coursesPath = `${semesterPath}/courses`;

  for (const courseId of removedCourseIds) {
    batch.delete(doc(db, `${coursesPath}/${courseId}`));
  }

  for (const course of courses) {
    const { id, ...courseData } = course;
    const courseRef = id
      ? doc(db, `${coursesPath}/${id}`)
      : doc(collection(db, coursesPath));

    batch.set(courseRef, {
      ...courseData,
      ...(id ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  batch.update(doc(db, semesterPath), {
    ...summary,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, `analytics/${uid}`), {
    insightsStale: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await batch.commit();
}
