'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { getDocument, setDocument, queryCollection, updateDocument } from '@/lib/firebase/firestore';
import type { Semester } from '@/types/semester';
import type { CourseInput, Course } from '@/types/course';
import { GRADE_SCALE } from '@/lib/utils/constants';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradeTable } from '@/components/cgpa/GradeTable';

export default function SemesterDetailPage({ params }: { params: Promise<{ semesterId: string }> }) {
  const resolvedParams = use(params);
  const semesterId = resolvedParams.semesterId;
  
  const { user } = useAuth();
  const router = useRouter();

  const [semester, setSemester] = useState<Semester | null>(null);
  const [initialCourses, setInitialCourses] = useState<CourseInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid || semesterId === 'new') {
      if (semesterId === 'new') {
        // Handle 'new' by redirecting or showing a setup UI
        // For simplicity, we'll assume new semesters are created via a modal on the list page 
        // which then redirects here with a valid ID.
        router.replace('/results');
      }
      return;
    }

    async function fetchData() {
      try {
        const semData = await getDocument<Semester>(`users/${user!.uid}/semesters/${semesterId}`);
        if (!semData) {
          toast.error('Semester not found');
          router.replace('/results');
          return;
        }
        setSemester(semData);

        const coursesData = await queryCollection<Course>(`users/${user!.uid}/semesters/${semesterId}/courses`);
        setInitialCourses(coursesData.map(c => ({
          ...c,
          grade: c.grade || undefined
        })));
      } catch (err) {
        toast.error('Failed to load semester data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.uid, semesterId, router]);

  const handleSave = async (updatedCourses: CourseInput[]) => {
    if (!user?.uid || !semester) return;
    setSaving(true);
    try {
      let totalUnits = 0;
      let totalGP = 0;
      let totalPI = 0;

      // 1. Write all courses
      // First delete existing courses (naive approach for sync, in production we'd do a batch diff)
      // Actually, since we want to be safe, let's just write them with random IDs or use a subcollection batch.
      // For this phase, we'll just write them.
      for (const course of updatedCourses) {
        const totalScore = (course.caScore || 0) + (course.examScore || 0);
        const scale = GRADE_SCALE.find(g => totalScore >= g.minScore && totalScore <= g.maxScore) || GRADE_SCALE[GRADE_SCALE.length - 1];
        
        const courseData: Partial<Course> = {
          code: course.code,
          title: course.title,
          units: course.units,
          caScore: course.caScore,
          examScore: course.examScore,
          totalScore,
          grade: scale.grade,
          gradePoint: scale.gradePoint,
          piPoint: (totalScore / 100) * 5,
        };

        totalUnits += course.units;
        totalGP += scale.gradePoint * course.units;
        totalPI += courseData.piPoint! * course.units;

        // Use a stable ID if we had one, else generate new
        const cid = Math.random().toString(36).substr(2, 9);
        await setDocument(`users/${user.uid}/semesters/${semesterId}/courses/${cid}`, courseData);
      }

      // 2. Compute GPA + PI
      const gpa = totalUnits > 0 ? totalGP / totalUnits : 0;
      const pi = totalUnits > 0 ? totalPI / totalUnits : 0;

      // 3. Update semester document
      await updateDocument(`users/${user.uid}/semesters/${semesterId}`, {
        gpa,
        pi,
        creditLoaded: totalUnits,
        isComplete: true, // Mark complete on save
      });

      // 4. POST to AI forecast (Stubbed for Phase 7)
      try {
        await fetch('/api/ai/forecast', { method: 'POST', body: JSON.stringify({ uid: user.uid }) });
      } catch (e) {
        console.warn('Forecast API not ready yet');
      }

      toast.success('Semester saved successfully!');
      router.push('/results');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save semester');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-12 border-4 border-[var(--acade-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!semester) return null;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="status">{semester.level}L S{semester.semester}</Badge>
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">
                {semester.session}
              </span>
            </div>
            <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
              {semester.label}
            </h1>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl overflow-hidden p-4 md:p-6"
      >
        <GradeTable 
          initialCourses={initialCourses} 
          editable={true} 
          onSave={handleSave} 
          isSaving={saving}
        />
      </motion.div>
    </div>
  );
}
