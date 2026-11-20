'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Save, ArrowLeft, Loader2, Upload, Share2, Download, Copy, FileText, CheckCircle2, AlertCircle, RefreshCw, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getDocument, setDocument, queryCollection } from '@/lib/firebase/firestore';
import { db } from '@/lib/firebase/client';
import { commitSemesterRecord } from '@/lib/firebase/semester';
import { prepareSemesterSave, SemesterSaveValidationError } from '@/lib/results/semester-save';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { mapExtractedCourse } from './import-mapping';
import type { Semester } from '@/types/semester';
import type { CourseInput, Course } from '@/types/course';
import { GRADE_SCALE } from '@/lib/utils/constants';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { readCreditLoadRange } from '@/lib/planning/creditLoadRange';
import { useSemesters } from '@/hooks/useSemesters';
import { SemesterPreview } from '@/components/cgpa/SemesterPreview';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradeTable } from '@/components/cgpa/GradeTable';
import { useCourseCatalog } from '@/components/cgpa/courseCatalog';
import { clearDraft } from '@/lib/drafts';
import { fetchAiEligibility, type AiEligibilityView } from '@/lib/consent/requirements';
import { AiAccessNotice } from '@/components/privacy/AiAccessNotice';
import { HelpButton } from '@/components/help/HelpDrawer';
import { STUDENT_HELP, studentHelpSource } from '@/lib/help/student-help';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsPanel, TabsTrigger } from '@/components/ui/Tabs';
import { PortalPastePanel } from './PortalPastePanel';
import { Input } from '@/components/ui/Input';
import { ResultsTour } from '@/components/onboarding/ResultsTour';
import { FeatureCredits } from '@/components/ai/FeatureCredits';
import { normaliseImportCode, shareCodeLinkPath } from '@/app/(public)/c/import-link';

const generateRandomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function SemesterDetailPage({ params }: { params: Promise<{ semesterId: string }> }) {
  const resolvedParams = use(params);
  const semesterId = resolvedParams.semesterId;
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const { isFeatureDisabled } = usePlatformSettings();
  const { semesters: allSemesters, loading: semestersLoading, error: semestersError } = useSemesters();
  const creditLoadRange = useMemo(() => readCreditLoadRange(profile?.creditLoadRange), [profile?.creditLoadRange]);

  const [semester, setSemester] = useState<Semester | null>(null);
  const [initialCourses, setInitialCourses] = useState<CourseInput[]>([]);
  // Imports (share code, slip scan) merge into the table; each request has a fresh id.
  const [importRequest, setImportRequest] = useState<{ id: number; rows: CourseInput[] } | undefined>(undefined);
  const requestImport = (rows: CourseInput[]) => setImportRequest({ id: Date.now(), rows });
  const handleImportResult = ({ added, skipped }: { added: number; skipped: number }) => {
    if (added === 0 && skipped > 0) toast.success(`Nothing new to add. ${skipped} already in this semester.`);
    else if (skipped > 0) toast.success(`${added} added, ${skipped} already in this semester. Fill in your scores.`);
    else toast.success(`${added} course${added === 1 ? '' : 's'} added. Fill in your scores.`);
  };
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isImportSlipOpen, setIsImportSlipOpen] = useState(false);
  const [slipTab, setSlipTab] = useState<'scan' | 'paste'>('scan');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // H5: arriving from a share-code link (/results?importCode= forwards here). The dialog opens
  // with the code filled in; nothing is imported until the student presses Import Courses.
  const [linkedCode] = useState(() => (
    typeof window === 'undefined' ? null : normaliseImportCode(new URLSearchParams(window.location.search).get('importCode'))
  ));
  const [isImportCodeOpen, setIsImportCodeOpen] = useState(() => Boolean(linkedCode) && !isFeatureDisabled('share_code'));

  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [shareCodeInput, setShareCodeInput] = useState(linkedCode ?? '');
  const [generatedCode, setGeneratedCode] = useState('');
  const [importingCode, setImportingCode] = useState(false);

  // Arriving from the calculator handoff: its rows wait as a draft to review. Read once on the client.
  const [fromCalculator] = useState(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'calculator'
  ));

  // Scanner eligibility (age / AI consent). Unknown when the check fails: the scanner stays available.
  const [aiEligibility, setAiEligibility] = useState<AiEligibilityView | null>(null);
  useEffect(() => {
    if (!isImportSlipOpen || !user) return;
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => user.getIdToken())
      .then((token) => fetchAiEligibility(token, fetch, controller.signal))
      .then((result) => { if (!controller.signal.aborted) setAiEligibility(result); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isImportSlipOpen, user]);
  const scannerBlocked = aiEligibility?.aiAllowed === false;

  // A10: catalogue suggestions for this department, level and semester (cached per session).
  const catalog = useCourseCatalog(semester ? {
    department: profile?.department ?? null,
    level: Number(semester.level),
    semester: Number(semester.semester),
  } : null);

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
      setLoading(true);
      setLoadError(false);
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
        setLoadError(true);
        toast.error('Failed to load semester data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.uid, semesterId, router, loadAttempt]);

  const handleSave = async (updatedCourses: CourseInput[]) => {
    if (!user?.uid || !semester) return;
    setSaving(true);
    try {
      const prepared = prepareSemesterSave(updatedCourses);
      const updatedIds = prepared.courses.map((course) => course.id).filter((id): id is string => Boolean(id));
      const coursesToDelete = initialCourses.filter(c => c.id && !updatedIds.includes(c.id));

      await commitSemesterRecord({
        uid: user.uid,
        semesterId,
        courses: prepared.courses,
        removedCourseIds: coursesToDelete.map((course) => course.id).filter((id): id is string => Boolean(id)),
        summary: prepared.summary,
      });
      // D3: the record is saved, so the local draft is no longer needed.
      clearDraft(user.uid, semesterId);

      const { gpa } = prepared.summary;

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
      // C3: the results list opens a one-time recap for this (now complete) semester.
      router.push(`/results?recap=${encodeURIComponent(semesterId)}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof SemesterSaveValidationError ? err.message : 'Failed to save semester');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      toast.error('Please sign in again before scanning a result.');
      return;
    }

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

      const token = await user.getIdToken();

      const res = await fetch('/api/results/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base64Data, mimeType: file.type })
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('Retry-After') || err.retryAfterSeconds || 60);
          toast.error(err.error || `Scan limit reached. Try again in ${retryAfter} seconds.`);
          return;
        }
        throw new Error(err.error || 'Extraction failed');
      }

      const data = await res.json();
      if (!data.courses || data.courses.length === 0) {
        toast.error('No courses found in the document');
        return;
      }

      // Format extracted courses (a score of 0 is a real score), then merge into the table.
      const mappedCourses: CourseInput[] = data.courses.map(mapExtractedCourse);
      requestImport(mappedCourses);
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

      requestImport(importedCourses);
      setIsImportCodeOpen(false);
      const importedCode = shareCodeInput.toUpperCase();
      setShareCodeInput('');

      // The rules allow only { useCount } on a share code. updateDocument adds updatedAt,
      // which the rules reject, so write the counter directly. A counter failure must
      // never turn a successful import into an error.
      try {
        await updateDoc(doc(db, 'shareCodes', importedCode), { useCount: increment(1) });
      } catch (counterError) {
        console.warn('Share code use count not recorded', counterError);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to import courses');
    } finally {
      setImportingCode(false);
    }
  };

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading semester" className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-28 rounded-full" />
          <div className="skeleton h-10 w-72 max-w-full" />
        </div>
        <div className="skeleton h-[26rem] rounded-[var(--radius-surface)]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10">
        <div
          role="alert"
          className="w-full rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-6 py-10 text-center md:px-10"
        >
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]">
            <AlertCircle className="size-6" aria-hidden="true" />
          </span>
          <h1 className="app-display text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)]">
            Semester could not be loaded
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]">
            We could not retrieve this semester and its courses. Check your connection, then retry without losing your place.
          </p>
          <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => router.push('/results')}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Results
            </Button>
            <Button variant="primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!semester) return null;

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-6xl pb-10">
      <ResultsTour />
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/results')} className="-ml-2 shrink-0 px-2.5" aria-label="Back to results">
            <ArrowLeft size={20} aria-hidden="true" />
          </Button>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Badge variant="status">{semester.level}L S{semester.semester}</Badge>
              <span className="text-sm tabular-nums text-[var(--acade-text-muted)]">
                {semester.session}
              </span>
            </div>
            <h1 className="app-display mt-2 text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">
              {semester.label}
            </h1>
          </div>
        </div>

        <div
          role="toolbar"
          aria-label="Semester actions"
          className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-end"
        >
          <HelpButton entryId={STUDENT_HELP.semester} source={studentHelpSource} className="col-span-2 justify-center md:col-span-1" />
          <Button id="tour-import-code" variant="outline" size="sm" onClick={() => setIsImportCodeOpen(true)} className="w-full whitespace-nowrap md:w-auto" disabled={isFeatureDisabled('share_code')} title={isFeatureDisabled('share_code') ? "Temporarily disabled for maintenance" : ""}>
            <Download size={16} aria-hidden="true" /> Import Code
          </Button>
          <Button id="tour-share-code" variant="outline" size="sm" onClick={handleGenerateShareCode} className="w-full whitespace-nowrap md:w-auto" disabled={isFeatureDisabled('share_code')} title={isFeatureDisabled('share_code') ? "Temporarily disabled for maintenance" : ""}>
            <Share2 size={16} aria-hidden="true" /> Share
          </Button>
          <Button id="tour-import-slip" variant="primary" size="sm" onClick={() => setIsImportSlipOpen(true)} className="col-span-2 w-full whitespace-nowrap md:w-auto" disabled={isFeatureDisabled('extract_slip')} title={isFeatureDisabled('extract_slip') ? "Temporarily disabled for maintenance" : ""}>
            <FileText size={16} aria-hidden="true" /> Import Result Slip
          </Button>
        </div>
      </header>

      {fromCalculator && (
        <p role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--acade-primary)]/25 bg-[var(--acade-primary-dim)] px-4 py-3.5 text-sm leading-6 text-[var(--acade-text)]">
          <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
          <span>These courses came from the calculator and are not saved yet. Add each course title, enter CA and exam scores where a grade is marked with a question mark, then save the semester.</span>
        </p>
      )}

      <motion.div
        id="tour-grade-table"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-w-0 overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 sm:p-5 lg:p-6"
      >
        <GradeTable
          initialCourses={initialCourses}
          editable={true}
          onSave={handleSave}
          isSaving={saving}
          catalog={catalog}
          draft={user ? { uid: user.uid, semesterId } : undefined}
          restoreDraftOnMount={fromCalculator}
          importRequest={importRequest}
          onImportResult={handleImportResult}
          creditLoadRange={creditLoadRange}
        />
      </motion.div>

      {/* A3: what-if preview for courses awaiting a result. Device-only; never saved. */}
      {user && !semestersLoading && !semestersError && (
        <div className="mt-6">
          <SemesterPreview uid={user.uid} semesterId={semesterId} courses={initialCourses} semesters={allSemesters} />
        </div>
      )}

      {/* Modals */}
      <Modal open={isImportSlipOpen} onClose={() => setIsImportSlipOpen(false)} title="Import Result Slip">
        <Tabs value={slipTab} onValueChange={(value) => setSlipTab(value === 'paste' ? 'paste' : 'scan')}>
        <TabsList aria-label="How to import">
          <TabsTrigger value="scan">Scan or upload</TabsTrigger>
          <TabsTrigger value="paste">Paste text</TabsTrigger>
        </TabsList>
        <TabsPanel value="paste" className="mt-4">
          {/* A11: rule-based, not AI, so it stays open to minors and when AI is unavailable. */}
          <PortalPastePanel
            onImport={(rows) => {
              requestImport(rows);
              setIsImportSlipOpen(false);
            }}
          />
        </TabsPanel>
        <TabsPanel value="scan" className="mt-4">
        {isImportSlipOpen && !scannerBlocked && <FeatureCredits feature="ocr" refreshKey={String(uploadingSlip)} />}
        {scannerBlocked && aiEligibility ? (
          <AiAccessNotice eligibility={aiEligibility} />
        ) : (
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            Scan your result slip with your phone camera, or choose an existing image or PDF. AcadeGrade will extract the courses and scores for you to review.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--acade-primary)]/30 bg-[var(--acade-primary-dim)] p-5 text-center transition-colors hover:border-[var(--acade-primary)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Scan with camera"
                className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                onChange={handleFileUpload}
                disabled={uploadingSlip}
              />
              <span className="flex size-12 items-center justify-center rounded-full bg-[var(--acade-primary)] text-[var(--acade-on-primary)]">
                <Camera size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[0.9375rem] font-semibold text-[var(--acade-text)]">Scan with camera</span>
                <span className="mt-1 block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Open your rear camera and take a clear photo</span>
              </span>
            </label>

            <label className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--acade-control-border)]/60 bg-[var(--acade-surface)] p-5 text-center transition-colors hover:border-[var(--acade-primary)] hover:bg-[var(--acade-void)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              <input
                type="file"
                accept="image/*,application/pdf"
                aria-label="Choose image or PDF"
                className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                onChange={handleFileUpload}
                disabled={uploadingSlip}
              />
              <span className="flex size-12 items-center justify-center rounded-full bg-[var(--acade-overlay)] text-[var(--acade-primary)]">
                <Upload size={21} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[0.9375rem] font-semibold text-[var(--acade-text)]">Choose image or PDF</span>
                <span className="mt-1 block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Select an existing JPG, PNG, or PDF file</span>
              </span>
            </label>
          </div>

          {uploadingSlip && (
            <div role="status" className="flex items-center justify-center gap-3 rounded-xl bg-[var(--acade-overlay)] px-4 py-3 text-[var(--acade-primary)]">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-[length:var(--text-sm)] font-bold">Extracting results...</span>
            </div>
          )}
        </div>
        )}
        </TabsPanel>
        </Tabs>
      </Modal>

      <Modal open={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Course Code">
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            Share this code with your classmates so they can instantly import your course list (scores are kept private).
          </p>
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--acade-void)] p-4">
            <div className="app-num min-w-0 flex-1 text-center text-[2rem] font-bold tracking-[0.22em] text-[var(--acade-text)]">
              {generatedCode}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 px-3"
              aria-label="Copy share code"
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                toast.success('Code copied!');
              }}
            >
              <Copy size={18} aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[0.8125rem] text-[var(--acade-text-muted)]">Or send this link. It shows only course codes, titles and units.</p>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-2 pl-4">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--acade-text)]">
                {typeof window === 'undefined' ? '' : `${window.location.origin}${shareCodeLinkPath(generatedCode)}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 px-3"
                aria-label="Copy share link"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${shareCodeLinkPath(generatedCode)}`);
                  toast.success('Link copied!');
                }}
              >
                <Copy size={18} />
              </Button>
            </div>
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
            autoComplete="off"
            className="app-num text-center text-2xl font-bold uppercase tracking-[0.2em]"
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
