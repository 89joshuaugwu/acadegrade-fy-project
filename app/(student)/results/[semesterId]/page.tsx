'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Save, ArrowLeft, Loader2, Upload, Share2, Download, Copy, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { increment } from 'firebase/firestore';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getDocument, setDocument, queryCollection, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import type { Semester } from '@/types/semester';
import type { CourseInput, Course } from '@/types/course';
import { GRADE_SCALE } from '@/lib/utils/constants';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradeTable } from '@/components/cgpa/GradeTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

const generateRandomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function SemesterDetailPage({ params }: { params: Promise<{ semesterId: string }> }) {
  const resolvedParams = use(params);
  const semesterId = resolvedParams.semesterId;
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  const [semester, setSemester] = useState<Semester | null>(null);
  const [initialCourses, setInitialCourses] = useState<CourseInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isImportSlipOpen, setIsImportSlipOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImportCodeOpen, setIsImportCodeOpen] = useState(false);
  
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [importingCode, setImportingCode] = useState(false);

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

      // Find which existing courses were deleted
      const updatedIds = updatedCourses.map(c => c.id).filter(Boolean);
      const coursesToDelete = initialCourses.filter(c => c.id && !updatedIds.includes(c.id));
      
      for (const course of coursesToDelete) {
        if (course.id) {
          await deleteDocument(`users/${user.uid}/semesters/${semesterId}/courses/${course.id}`);
        }
      }

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
        const cid = course.id || Math.random().toString(36).substr(2, 9);
        await setDocument(`users/${user.uid}/semesters/${semesterId}/courses/${cid}`, courseData);
      }

      const gpa = totalUnits > 0 ? totalGP / totalUnits : 0;
      const pi = totalUnits > 0 ? totalPI / totalUnits : 0;

      // 3. Update semester document
      await updateDocument(`users/${user.uid}/semesters/${semesterId}`, {
        gpa,
        pi,
        creditLoaded: totalUnits,
        isComplete: true, // Mark complete on save
      });

      // 4. Mark AI insights as stale so the user gets a red dot on the Insights tab
      await setDocument(`analytics/${user.uid}`, { insightsStale: true });

      // 5. Trigger Notifications
      const token = await user.getIdToken();
      // Push Notification
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          title: 'Semester Saved 📝',
          message: `Your results for ${semester?.label || 'this semester'} have been saved. GPA: ${gpa.toFixed(2)}`,
          type: 'success',
          event: 'semesterSaved'
        })
      }).catch(console.error);

      // Email Notification
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          type: 'email',
          event: 'semesterSaved',
          data: { name: profile?.fullName || 'Student', gpa, semester: semester?.label || 'Semester' }
        })
      }).catch(console.error);

      toast.success('Semester saved successfully!');
      router.push('/results');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save semester');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file');
      return;
    }

    setUploadingSlip(true);
    try {
      // Convert to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // get just the base64 part
        };
        reader.onerror = error => reject(error);
      });

      const res = await fetch('/api/results/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType: file.type })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Extraction failed');
      }

      const data = await res.json();
      if (!data.courses || data.courses.length === 0) {
        toast.error('No courses found in the document');
        return;
      }

      // Format extracted courses
      const mappedCourses: CourseInput[] = data.courses.map((c: any) => ({
        code: c.code || '',
        title: c.title || '',
        units: c.units || 3,
        caScore: c.caScore || null,
        examScore: c.examScore || null,
        isAR: c.isAR || false,
        estimated: c.isAR ? true : false,
      }));

      setInitialCourses(mappedCourses);
      toast.success(`Extracted ${mappedCourses.length} courses!`);
      setIsImportSlipOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to extract results');
    } finally {
      setUploadingSlip(false);
      // clear input
      e.target.value = '';
    }
  };

  const handleGenerateShareCode = async () => {
    if (!user) return;
    if (initialCourses.length < 3) {
      toast.error('Add at least 3 courses first to generate a share code');
      return;
    }

    try {
      const code = generateRandomCode();
      const codeData = {
        code,
        authorId: user.uid,
        useCount: 0,
        createdAt: new Date(),
        courses: initialCourses.map(c => ({
          code: c.code,
          title: c.title,
          units: c.units
        }))
      };

      await setDocument(`shareCodes/${code}`, codeData);
      setGeneratedCode(code);
      setIsShareModalOpen(true);
    } catch (err) {
      toast.error('Failed to generate share code');
    }
  };

  const handleImportCourseCode = async () => {
    if (!shareCodeInput.trim() || shareCodeInput.length !== 6) {
      toast.error('Enter a valid 6-character code');
      return;
    }
    
    setImportingCode(true);
    try {
      const codeDoc = await getDocument<any>(`shareCodes/${shareCodeInput.toUpperCase()}`);
      if (!codeDoc) {
        toast.error('Invalid share code');
        // trigger shake animation natively via DOM if we wanted to
        const el = document.getElementById('share-code-input');
        if (el) {
          el.classList.add('animate-shake');
          setTimeout(() => el.classList.remove('animate-shake'), 500);
        }
        return;
      }

      const importedCourses: CourseInput[] = codeDoc.courses.map((c: any) => ({
        ...c,
        caScore: null,
        examScore: null,
      }));

      setInitialCourses(importedCourses);
      toast.success(`${importedCourses.length} courses imported. Fill in your scores.`);
      setIsImportCodeOpen(false);
      setShareCodeInput('');

      // Increment use count safely using updateDocument with increment value
      await updateDocument(`shareCodes/${shareCodeInput.toUpperCase()}`, {
        useCount: increment(1)
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to import courses');
    } finally {
      setImportingCode(false);
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
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

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Button variant="outline" size="sm" onClick={() => setIsImportCodeOpen(true)} className="whitespace-nowrap">
            <Download size={16} className="mr-2" /> Import Code
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateShareCode} className="whitespace-nowrap">
            <Share2 size={16} className="mr-2" /> Share
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsImportSlipOpen(true)} className="whitespace-nowrap">
            <FileText size={16} className="mr-2" /> Import Result Slip
          </Button>
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

      {/* Modals */}
      <Modal open={isImportSlipOpen} onClose={() => setIsImportSlipOpen(false)} title="Import Result Slip">
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            Upload your official academic result slip (Image or PDF) and our AI will automatically extract your courses and scores.
          </p>
          <div className="relative border-2 border-dashed border-[var(--acade-border-subtle)] rounded-xl p-8 hover:border-[var(--acade-primary)] hover:bg-[var(--acade-overlay)] transition-colors flex flex-col items-center justify-center cursor-pointer">
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              onChange={handleFileUpload}
              disabled={uploadingSlip}
            />
            {uploadingSlip ? (
              <div className="flex flex-col items-center gap-3 text-[var(--acade-primary)]">
                <div className="size-8 border-4 border-[var(--acade-primary)] border-t-transparent rounded-full animate-spin" />
                <span className="text-[length:var(--text-sm)] font-bold">Extracting Results...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-[var(--acade-text-muted)]">
                <Upload size={32} />
                <span className="text-[length:var(--text-sm)] font-medium">Click or drag file here</span>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">JPG, PNG, PDF</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Course Code">
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            Share this code with your classmates so they can instantly import your course list (scores are kept private).
          </p>
          <div className="flex items-center gap-3 p-4 bg-[var(--acade-deep)] rounded-xl border border-[var(--acade-border)]">
            <div className="flex-1 text-center text-3xl font-bold tracking-[0.25em] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
              {generatedCode}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="p-2 h-auto"
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                toast.success('Code copied!');
              }}
            >
              <Copy size={18} />
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={isImportCodeOpen} onClose={() => setIsImportCodeOpen(false)} title="Import Courses">
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            Enter a 6-character share code from a classmate to quickly add courses to your semester.
          </p>
          <Input 
            id="share-code-input"
            placeholder="Enter 6-character code"
            value={shareCodeInput}
            onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center text-2xl tracking-[0.2em] uppercase font-[family-name:var(--font-geist-mono)] font-bold"
          />
          <Button 
            variant="primary" 
            className="w-full mt-2" 
            onClick={handleImportCourseCode}
            loading={importingCode}
            disabled={shareCodeInput.length !== 6}
          >
            Import Courses
          </Button>
        </div>
      </Modal>
    </div>
  );
}
