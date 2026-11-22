'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Download, Printer, Link2, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { queryCollection, deleteDocument, where } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { Switch } from '@/components/ui/Switch';
import { ShareQr } from '@/components/transcript/ShareQr';
import { shortShareLink } from '@/lib/share/link';
import { ShareLinkDialog, type CreatedShareLink, type ShareLinkSettings } from '@/components/transcript/ShareLinkDialog';
import { SharedLinksList, type SharedLinkRow } from '@/components/transcript/SharedLinksList';
import { TranscriptPreview, type PreviewRequest } from '@/components/transcript/TranscriptPreview';
import { EmptyState, ErrorState } from '@/components/shared';
import { computeCumulativeCGPA, formatCgpa, weightedAverageScore } from '@/lib/cgpa/academicRules';
import { transcriptClassLabel } from '@/lib/cgpa/scale';
import { useGradingScale } from '@/hooks/useGradingScale';
import { DiscreetRevealButton, DiscreetScope, DiscreetValue } from '@/lib/discreet';
import { HelpButton } from '@/components/help/HelpDrawer';
import { STUDENT_HELP, studentHelpSource } from '@/lib/help/student-help';

import type { SemesterWithId, SemesterWithCourses } from '@/types/semester';
import type { CourseWithId } from '@/types/course';

export default function TranscriptPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { scale } = useGradingScale();
  
  const [semesters, setSemesters] = useState<SemesterWithCourses[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [downloading, setDownloading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);
  const [sharedLinks, setSharedLinks] = useState<SharedLinkRow[]>([]);
  const [previewRequest, setPreviewRequest] = useState<PreviewRequest | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const sems = await queryCollection<SemesterWithId>(`users/${user.uid}/semesters`);
      const completedSemesters = sems.filter((semester) => semester.isComplete);
      const semsWithCourses = await Promise.all(
        completedSemesters.map(async (semester): Promise<SemesterWithCourses> => {
          const courses = await queryCollection<CourseWithId>(`users/${user.uid}/semesters/${semester.id}/courses`);
          return { ...semester, courses };
        }),
      );
      
      semsWithCourses.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.semester - b.semester;
      });
      
      setSemesters(semsWithCourses);

      // Load active shared links
      try {
        const links = await queryCollection<SharedLinkRow & { expiresAt?: any }>('shared_transcripts', where('uid', '==', user.uid));
        // filter out expired locally just in case
        const activeLinks = links.filter(link => {
          const expiresAt = link.expiresAt?.toDate?.() || link.expiresAt;
          return new Date(expiresAt) > new Date();
        });
        setSharedLinks(activeLinks);
      } catch (e) {
        console.error('Failed to load shared links', e);
      }
      setLoadStatus('ready');
    } catch (err) {
      console.error(err);
      setSemesters([]);
      setSharedLinks([]);
      setLoadStatus('error');
      toast.error('Failed to load transcript data');
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadData();
  }, [loadData, user]);

  const handleDownload = async () => {
    if (!user || loadStatus !== 'ready' || semesters.length === 0) return;
    setDownloading(true);
    const toastId = toast.loading('Generating PDF...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/transcript/generate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ showPhoto }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(profile?.fullName || 'Student').replace(/\s+/g, '_')}_Transcript.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download complete!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error generating PDF. Try using the Print button.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (loadStatus !== 'ready' || semesters.length === 0) return;
    window.print();
  };

  /** Creates a link from the dialog's settings. The PIN is only in this request body. */
  const handleShareLink = async ({ expiresInDays, level, pin }: ShareLinkSettings): Promise<CreatedShareLink | null> => {
    if (!user || loadStatus !== 'ready' || semesters.length === 0) return null;
    const body: Record<string, unknown> = { showPhoto, expiresInDays, level };
    if (pin) body.pin = pin;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/transcript/share', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create share link');
      }

      const created = await res.json();
      const days = typeof created.expiresInDays === 'number' ? created.expiresInDays : expiresInDays;
      const expiresAt = typeof created.expiresAt === 'string' ? new Date(created.expiresAt) : new Date(Date.now() + days * 86_400_000);
      const result: CreatedShareLink = {
        shareUrl: created.shareUrl,
        expiresInDays: days,
        expiresAt,
        level: created.level === 'summary' || created.level === 'full' ? created.level : level,
        hasPin: typeof created.hasPin === 'boolean' ? created.hasPin : Boolean(pin),
        showPhoto: showPhoto && Boolean(userPhotoUrl),
      };
      // Show the new link in "Shared links" without another read.
      if (typeof created.shareId === 'string') {
        setSharedLinks((prev) => [
          {
            id: created.shareId, expiresAt, shareLevel: result.level, hasPin: result.hasPin, viewCount: 0,
            showPhoto: result.showPhoto, avatarUrl: result.showPhoto ? userPhotoUrl : null,
          },
          ...prev.filter((link) => link.id !== created.shareId),
        ]);
      }
      return result;
    } catch (err: any) {
      // Never log the request body: it may hold the PIN.
      console.error('Share link failed');
      toast.error(err.message || 'Failed to create share link');
      return null;
    }
  };

  const handleCopyLinkText = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDeleteShare = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteShare = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await deleteDocument(`shared_transcripts/${id}`);
      setSharedLinks(prev => prev.filter(link => link.id !== id));
      toast.success('Link deleted');
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete the link. Try again.");
    }
  };

  // Resolve user photo URL — prioritise profile avatarUrl, fallback to Firebase Auth photoURL
  const userPhotoUrl = profile?.avatarUrl || user?.photoURL || null;

  if (loadStatus === 'loading') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-10" aria-busy="true" aria-label="Loading transcript">
        <div className="space-y-3">
          <div className="skeleton h-9 w-72 max-w-full rounded-xl" />
          <div className="skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="skeleton h-40 rounded-[var(--radius-surface)]" />
        <div className="skeleton h-[28rem] rounded-[var(--radius-surface)]" />
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="mb-8">
          <h1 className="app-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">
            We couldn&apos;t load your transcript
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
            Transcript unavailable
          </p>
        </div>
        <ErrorState
          title="Your academic record is temporarily unavailable"
          description="The transcript preview and export tools are disabled until your completed semesters load successfully. Your saved results have not been changed."
          retryLabel="Retry loading transcript"
          onRetry={() => {
            setLoadStatus('loading');
            void loadData();
          }}
        />
      </div>
    );
  }

  if (semesters.length === 0) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="mb-6">
          <h1 className="app-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">
            Unofficial Transcript
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
            Your transcript will be created from semesters marked as complete.
          </p>
        </div>
        <div className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]">
          <EmptyState
            icon={<FileText className="size-8" aria-hidden="true" />}
            title="No completed semesters yet"
            description="Complete a semester in Results before previewing, printing, sharing, or downloading an unofficial transcript."
          />
          <div className="flex justify-center px-6 pb-10">
            <Link
              href="/results"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-6 text-[0.9375rem] font-semibold text-[var(--acade-on-primary)] transition-colors hover:bg-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
            >
              Go to Results
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Cumulative CGPA & PI (shared academic rules)
  const cumulative = computeCumulativeCGPA(semesters);
  const totalCredits = cumulative.totalCredits;
  const cgpa = formatCgpa(cumulative.cgpa);
  const cumulativePI = cumulative.pi.toFixed(2);

  const cgpaNum = parseFloat(cgpa);
  const piNum = parseFloat(cumulativePI);
  // Classified from the same rounded CGPA that is displayed
  const degreeClass = transcriptClassLabel(cumulative.cgpa, scale);
  const maxText = formatCgpa(scale.maxPoint);
  const universityName = profile?.university?.trim() || 'University not specified';
  // Credit-weighted mean of the course scores. Not a CGPA, not official, no 4.0 conversion.
  const weighted = weightedAverageScore(semesters.flatMap((sem) => sem.courses));
  const weightedNote = weighted.excludedEstimated > 0
    ? `; ${weighted.excludedEstimated} grade-only ${weighted.excludedEstimated === 1 ? 'course' : 'courses'} left out.`
    : '.';

  const hide = (label: string, value: React.ReactNode) => <DiscreetValue label={label}>{value}</DiscreetValue>;

  const openPreview = (id: string) => setPreviewRequest((prev) => ({ id, key: (prev?.key ?? 0) + 1 }));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <DiscreetScope>
    <div className="max-w-4xl mx-auto pb-10">
      {/* Page heading - hidden when printing */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="min-w-0">
          <h1 className="app-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">
            Unofficial Transcript
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
            Save it as a PDF, or send a private link that you control.
          </p>
          <p className="max-w-2xl text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
            Transcript CGPA covers completed semesters only.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <HelpButton entryId={STUDENT_HELP.transcript} source={studentHelpSource} />
          <DiscreetRevealButton label="Transcript values" className="border border-[var(--acade-border)]" />
        </div>
      </header>

      {/* Summary and the main actions - hidden when printing */}
      <section aria-labelledby="transcript-summary-title" className="mb-6 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] print:hidden">
        <h2 id="transcript-summary-title" className="sr-only">Summary</h2>
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center md:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--acade-text-muted)]">Cumulative CGPA</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="app-display text-[2.75rem] font-bold leading-none tabular-nums text-[var(--acade-text)]">{hide('CGPA', cgpa)}</span>
              <span className="text-[0.9375rem] text-[var(--acade-text-muted)]">of {maxText}</span>
            </p>
            <p className="mt-2 text-[1.0625rem] font-semibold text-[var(--acade-text)]">{hide('Degree class', degreeClass)}</p>
          </div>
          <dl className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-4">
            <div className="min-w-0">
              <dt className="text-[0.8125rem] text-[var(--acade-text-muted)]">Completed semesters</dt>
              <dd className="mt-0.5 text-[1.0625rem] font-semibold tabular-nums text-[var(--acade-text)]">{semesters.length}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[0.8125rem] text-[var(--acade-text-muted)]">Units earned</dt>
              <dd className="mt-0.5 text-[1.0625rem] font-semibold tabular-nums text-[var(--acade-text)]">{totalCredits}</dd>
            </div>
            <div className="col-span-2 min-w-0">
              <dt className="text-[0.8125rem] text-[var(--acade-text-muted)]">Grading scale</dt>
              <dd className="mt-0.5 break-words text-[1.0625rem] font-semibold text-[var(--acade-text)]">{scale.name}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--acade-border-subtle)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Export and share" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="primary" size="sm" onClick={handleDownload} loading={downloading} loadingLabel="Making PDF…" className="col-span-2 sm:col-span-1">
              <Download size={16} className="shrink-0" aria-hidden="true" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
              <Link2 size={16} className="shrink-0" aria-hidden="true" />
              Share a link
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint}>
              <Printer size={16} className="shrink-0" aria-hidden="true" />
              Print
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--acade-overlay)] py-1 pl-4 pr-1 lg:min-w-[17rem]">
            <div className="min-w-0 py-1.5">
              <p id="transcript-photo-label" className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">Include my photo</p>
              <p className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
                {userPhotoUrl ? 'On the PDF, the printout and new links.' : 'Add a profile photo to use this.'}
              </p>
            </div>
            <Switch checked={showPhoto} onCheckedChange={setShowPhoto} aria-labelledby="transcript-photo-label" />
          </div>
        </div>
      </section>

      {/* Shared links - hidden when printing */}
      <section aria-labelledby="shared-links-title" className="mb-6 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 sm:p-6 print:hidden">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="shared-links-title" className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">
            Shared links
            {sharedLinks.length > 0 ? (
              <span className="ml-2 text-[0.9375rem] font-medium tabular-nums text-[var(--acade-text-muted)]">{sharedLinks.length}</span>
            ) : null}
          </h2>
          <p className="text-[0.8125rem] text-[var(--acade-text-muted)]">Links stop working when they expire or you delete them.</p>
        </div>
        <SharedLinksList
          links={sharedLinks}
          origin={origin}
          onCopy={(url) => void handleCopyLinkText(url)}
          onShowQr={setQrUrl}
          onPreview={openPreview}
          onDelete={handleDeleteShare}
        />
      </section>

      {/* Preview a transcript - hidden when printing */}
      <section aria-labelledby="preview-title" className="mb-8 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 sm:p-6 print:hidden">
        <h2 id="preview-title" className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">Preview a transcript</h2>
        <p className="mb-4 mt-1 max-w-2xl text-[0.9375rem] leading-6 text-[var(--acade-text-muted)]">
          Paste a share link or its ID to see the record exactly as the person opening it does.
        </p>
        <TranscriptPreview request={previewRequest} />
      </section>

      <ShareLinkDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        showPhoto={showPhoto}
        onShowPhotoChange={setShowPhoto}
        hasPhoto={Boolean(userPhotoUrl)}
        onCreate={handleShareLink}
      />

      <Modal
        open={Boolean(qrUrl)}
        onClose={() => setQrUrl(null)}
        title="QR code for this link"
        description="Let someone scan it to open your shared transcript."
        size="confirm"
        className="print:hidden"
      >
        {qrUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4">
              <ShareQr url={qrUrl} size={200} />
            </div>
            <p className="max-w-full break-all text-center text-[0.9375rem] font-medium text-[var(--acade-text)]">{shortShareLink(qrUrl)}</p>
            <Button variant="primary" size="sm" fullWidth onClick={() => void handleCopyLinkText(qrUrl)}>
              Copy link
            </Button>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete this link?"
        description="The link stops working straight away for everyone who has it. This can't be undone."
        confirm={{ label: 'Delete link', onConfirm: () => void confirmDeleteShare() }}
        className="print:hidden"
      >
        <div className="flex items-start gap-3 rounded-xl border border-[var(--acade-danger)]/25 bg-[var(--acade-danger-dim)] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--acade-danger)]" aria-hidden="true" />
          <p className="text-left text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]">
            To share again later, make a new link. Its address will be different.
          </p>
        </div>
      </Modal>

      {/* Transcript Paper Preview */}
      <div className="transcript-paper mx-auto min-h-[297mm] max-w-full overflow-hidden rounded-[var(--radius-surface)] bg-white p-4 text-black shadow-[0_30px_70px_-40px_rgba(23,19,58,0.45)] ring-1 ring-[var(--acade-border)] sm:p-8 md:p-12 lg:max-w-[210mm] print:m-0 print:max-w-full print:rounded-none print:p-0 print:shadow-none print:ring-0">
        
        {/* Header with Logo */}
        <div className="text-center mb-6 sm:mb-8 border-b-2 border-black pb-4">
          {/* AcadeGrade Logo */}
          <div className="flex justify-center mb-3">
            <img
              src="/logo.png"
              alt="AcadeGrade Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          {/* The student's own, self-reported university as plain text */}
          <h2 className="text-base sm:text-xl md:text-2xl font-bold font-serif mb-1 tracking-tight">
            {universityName}
          </h2>
          <h3 className="mt-4 inline-block bg-gray-100 px-4 py-1 border border-gray-300 font-bold text-sm tracking-wide">
            Unofficial Academic Record — generated by AcadeGrade
          </h3>
        </div>

        {/* Student Box with optional photo */}
        <div className="border-2 border-black p-4 mb-8 flex gap-4 text-sm font-serif">
          {/* Photo column */}
          {showPhoto && userPhotoUrl && (
            <div className="shrink-0">
              <img
                src={userPhotoUrl}
                alt={profile?.fullName || 'Student'}
                className="w-20 h-24 object-cover border-2 border-gray-400 bg-gray-100"
                crossOrigin="anonymous"
              />
            </div>
          )}
          {/* Info columns */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><span className="font-bold inline-block w-24">Name:</span> {profile?.fullName}</p>
              <p className="mt-2"><span className="font-bold inline-block w-24">Matric No:</span> {profile?.matric || 'N/A'}</p>
              <p className="mt-2"><span className="font-bold inline-block w-24">Level:</span> {profile?.currentLevel || 'N/A'}L</p>
            </div>
            <div>
              <p><span className="font-bold inline-block w-28">Department:</span> {profile?.department || 'N/A'}</p>
              <p className="mt-2"><span className="font-bold inline-block w-28">Programme:</span> {profile?.programme || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Semesters */}
        <div className="space-y-8 font-serif">
          {semesters.map((sem) => (
            <div key={sem.id} className="break-inside-avoid">
              <h3 className="font-bold text-sm bg-gray-200 px-2 py-1 mb-2 border border-gray-400">
                {sem.label} ({sem.session})
              </h3>
              <div className="overflow-x-auto pb-2">
                <table className="w-full min-w-[600px] text-xs text-left border-collapse border border-gray-400">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-400 p-1.5 w-24">Code</th>
                    <th className="border border-gray-400 p-1.5">Title</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">Units</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">CA</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">Exam</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">Total</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">Grade</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">GP</th>
                    <th className="border border-gray-400 p-1.5 w-12 text-center">PI</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.courses.map((course) => (
                    <tr key={course.id}>
                      <td className="border border-gray-400 p-1.5 font-semibold">{course.code}</td>
                      <td className="border border-gray-400 p-1.5">{course.title}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{course.units}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{hide('CA', course.caScore ?? '-')}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{hide('Exam', course.examScore ?? '-')}</td>
                      <td className="border border-gray-400 p-1.5 text-center font-semibold">{hide('Total', course.totalScore ?? '-')}</td>
                      <td className="border border-gray-400 p-1.5 text-center font-bold">{hide('Grade', course.grade ?? '-')}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{hide('Grade point', course.gradePoint ?? '-')}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{hide('PI', (course.units || 0) * (course.gradePoint || 0))}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={2} className="border border-gray-400 p-1.5 text-right">SEMESTER SUMMARY</td>
                    <td className="border border-gray-400 p-1.5 text-center">{sem.creditLoaded}</td>
                    <td colSpan={5} className="border border-gray-400 p-1.5"></td>
                    <td className="border border-gray-400 p-1.5 text-center">{hide('Semester PI', sem.pi?.toFixed(2) ?? '-')}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          ))}
        </div>

        {/* Cumulative */}
        <div className="mt-8 border-2 border-black p-4 text-sm font-serif break-inside-avoid">
          <h3 className="font-bold text-base mb-3 border-b border-gray-400 pb-1">CUMULATIVE SUMMARY</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 scale-90 sm:scale-100 print:hidden">
               <DiscreetValue label="CGPA gauge" block>
                 <CGPAArc cgpa={cgpaNum} pi={piNum} size="sm" animateOnMount />
               </DiscreetValue>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div>
                <p><span className="font-bold inline-block w-40">Cumulative CGPA:</span> <span className="font-bold text-lg">{hide('CGPA', cgpa)}</span> / {maxText}</p>
                <p className="mt-1"><span className="font-bold inline-block w-40">Cumulative PI:</span> <span className="font-bold text-lg">{hide('PI', cumulativePI)}</span> / {maxText}</p>
                <p className="mt-1"><span className="font-bold inline-block w-40">Total Credits Earned:</span> {totalCredits}</p>
              </div>
              <div>
                <p><span className="font-bold inline-block w-44">Projected Degree Class:</span> {hide('Degree class', degreeClass)}</p>
                <p className="mt-1"><span className="font-bold inline-block w-44">Grading scale:</span> {scale.name}</p>
              </div>
            </div>
          </div>
          {weighted.average !== null && (
            <p className="mt-4 border-t border-gray-300 pt-3 text-xs leading-5 text-gray-700">
              Weighted average score {hide('Average score', `${weighted.average.toFixed(1)}%`)}: credit-weighted over {weighted.includedUnits} {weighted.includedUnits === 1 ? 'unit' : 'units'}{weightedNote}
            </p>
          )}
        </div>

        {/* Footer with logo */}
        <div className="mt-12 text-center text-xs text-gray-500 font-serif border-t border-gray-300 pt-4 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="AcadeGrade" className="w-4 h-4 object-contain" />
            <span className="font-semibold text-gray-600">AcadeGrade</span>
          </div>
          <span>Self-reported by the student. Not issued or verified by any university.</span>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .transcript-paper, .transcript-paper * {
            visibility: visible;
          }
          .transcript-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
    </DiscreetScope>
  );
}
