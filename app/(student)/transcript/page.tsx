'use client';

import { useState, useEffect } from 'react';
import { Download, Share2, Printer, Link2, Copy, Check, X, ImageIcon, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { queryCollection, deleteDocument, where } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

import type { SemesterWithId, SemesterWithCourses } from '@/types/semester';
import type { CourseWithId } from '@/types/course';

export default function TranscriptPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [semesters, setSemesters] = useState<SemesterWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPhoto, setShowPhoto] = useState(true);
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const sems = await queryCollection<SemesterWithId>(`users/${user.uid}/semesters`);
      const semsWithCourses: SemesterWithCourses[] = [];
      
      for (const sem of sems) {
        if (!sem.isComplete) continue;
        const courses = await queryCollection<CourseWithId>(`users/${user.uid}/semesters/${sem.id}/courses`);
        semsWithCourses.push({ ...sem, courses });
      }
      
      semsWithCourses.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.semester - b.semester;
      });
      
      setSemesters(semsWithCourses);

      // Load active shared links
      try {
        const links = await queryCollection<any>('shared_transcripts', where('uid', '==', user.uid));
        // filter out expired locally just in case
        const activeLinks = links.filter(link => {
          const expiresAt = link.expiresAt?.toDate?.() || link.expiresAt;
          return new Date(expiresAt) > new Date();
        });
        setSharedLinks(activeLinks);
      } catch (e) {
        console.error('Failed to load shared links', e);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transcript data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user) return;
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
      a.download = `Transcript_${user.uid}.pdf`;
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
    window.print();
  };

  const handleShareLink = async () => {
    if (!user) return;
    setSharing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/transcript/share', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ showPhoto }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create share link');
      }

      const { shareUrl: url } = await res.json();
      setShareUrl(url);
      setShareModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create share link');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyLinkText = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
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
      toast.success('Shared transcript deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete shared transcript');
    }
  };

  // Resolve user photo URL — prioritise profile avatarUrl, fallback to Firebase Auth photoURL
  const userPhotoUrl = profile?.avatarUrl || user?.photoURL || null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="size-10 border-4 border-[var(--acade-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate Cumulative
  let totalCredits = 0;
  let totalPoints = 0;
  semesters.forEach(s => {
    totalCredits += s.creditLoaded || 0;
    totalPoints += (s.gpa || 0) * (s.creditLoaded || 0);
  });
  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  
  const cgpaNum = parseFloat(cgpa);
  let degreeClass = '';
  if (cgpaNum >= 4.5) degreeClass = 'First Class Honours';
  else if (cgpaNum >= 3.5) degreeClass = 'Second Class Honours (Upper Division)';
  else if (cgpaNum >= 2.4) degreeClass = 'Second Class Honours (Lower Division)';
  else if (cgpaNum >= 1.5) degreeClass = 'Third Class Honours';
  else degreeClass = 'Fail';

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Actions Toolbar - Hidden when printing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
            Unofficial Transcript
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
            HTML preview. Use the buttons below to export.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Photo Toggle */}
          <button
            type="button"
            onClick={() => setShowPhoto(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[length:var(--text-xs)] font-medium transition-all",
              showPhoto
                ? "border-[var(--acade-primary)] bg-[var(--acade-primary)]/10 text-[var(--acade-primary)]"
                : "border-[var(--acade-border)] bg-[var(--acade-surface)] text-[var(--acade-text-muted)]"
            )}
            title={showPhoto ? "Click to hide your photo from the transcript" : "Click to show your photo on the transcript"}
          >
            <ImageIcon size={14} />
            {showPhoto ? 'Photo On' : 'Photo Off'}
          </button>

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareLink} disabled={sharing}>
            <Link2 size={16} className={cn("mr-2", sharing && "animate-spin")} />
            {sharing ? 'Creating...' : 'Share Link'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download size={16} className={cn("mr-2", downloading && "animate-bounce")} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Active Shared Links */}
      {sharedLinks.length > 0 && (
        <div className="mb-8 print:hidden bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-xl p-4">
          <h3 className="text-[length:var(--text-sm)] font-bold mb-3 flex items-center gap-2">
            <Link2 size={16} className="text-[var(--acade-primary)]" />
            Active Shared Transcripts
          </h3>
          <div className="space-y-2">
            {sharedLinks.map(link => {
              const url = `${window.location.origin}/share/${link.id}`;
              const expiresAt = link.expiresAt?.toDate?.() || new Date(link.expiresAt);
              return (
                <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--acade-deep)] p-3 rounded-lg border border-[var(--acade-border-subtle)]">
                  <div className="flex-1 truncate">
                    <div className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-1">
                      Expires: {new Date(expiresAt).toLocaleDateString()}
                    </div>
                    <a href={url} target="_blank" rel="noreferrer" className="text-[length:var(--text-sm)] font-mono text-[var(--acade-text)] hover:text-[var(--acade-primary)] truncate block">
                      {url}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleCopyLinkText(url)}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteShare(link.id)} className="text-[var(--acade-danger)]">
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {shareModalOpen && shareUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" style={{ zIndex: 9999 }}>
          <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--acade-primary)]/10 flex items-center justify-center mx-auto">
                <Share2 size={24} className="text-[var(--acade-primary)]" />
              </div>
              <h3 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)]">
                Transcript Shared!
              </h3>
              <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
                Anyone with this link can view your transcript. The link expires in 30 days.
              </p>

              {/* QR Code */}
              <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=4f46e5`}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="mx-auto"
                />
              </div>

              {/* Link + Copy */}
              <div className="flex items-center gap-2 bg-[var(--acade-deep)] rounded-xl p-2 border border-[var(--acade-border-subtle)]">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-[length:var(--text-sm)] text-[var(--acade-text)] px-2 outline-none truncate"
                />
                <Button variant="primary" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" style={{ zIndex: 9999 }}>
          <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="absolute top-4 right-4 text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[var(--acade-danger)]/10 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} className="text-[var(--acade-danger)]" />
              </div>
              <div>
                <h3 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">
                  Delete Shared Link?
                </h3>
                <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-2">
                  This transcript will be permanently unshared. Anyone with the link will no longer have access.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-[var(--acade-danger)] hover:bg-[var(--acade-danger)]/90 text-white border-transparent"
                  onClick={confirmDeleteShare}
                >
                  Delete Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Paper Preview */}
      <div className="transcript-paper bg-white text-black p-4 sm:p-8 md:p-12 rounded-xl shadow-xl border border-[var(--acade-border-subtle)] mx-auto max-w-full lg:max-w-[210mm] min-h-[297mm] print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full overflow-hidden">
        
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
          <h2 className="text-base sm:text-xl md:text-2xl font-bold font-serif mb-1 uppercase tracking-tight">
            Enugu State University of Science and Technology
          </h2>
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-700">Agbani, Enugu State</p>
          <div className="mt-4 inline-block bg-gray-100 px-4 py-1 border border-gray-300 font-bold text-sm tracking-widest">
            STUDENT UNOFFICIAL TRANSCRIPT
          </div>
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
                      <td className="border border-gray-400 p-1.5 text-center">{course.caScore ?? '-'}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{course.examScore ?? '-'}</td>
                      <td className="border border-gray-400 p-1.5 text-center font-semibold">{course.totalScore ?? '-'}</td>
                      <td className="border border-gray-400 p-1.5 text-center font-bold">{course.grade ?? '-'}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{course.gradePoint ?? '-'}</td>
                      <td className="border border-gray-400 p-1.5 text-center">{((course.units || 0) * (course.gradePoint || 0))}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={2} className="border border-gray-400 p-1.5 text-right">SEMESTER SUMMARY</td>
                    <td className="border border-gray-400 p-1.5 text-center">{sem.creditLoaded}</td>
                    <td colSpan={5} className="border border-gray-400 p-1.5"></td>
                    <td className="border border-gray-400 p-1.5 text-center">{sem.pi}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><span className="font-bold inline-block w-40">Cumulative CGPA:</span> <span className="font-bold text-lg">{cgpa}</span> / 5.00</p>
              <p className="mt-1"><span className="font-bold inline-block w-40">Total Credits Earned:</span> {totalCredits}</p>
            </div>
            <div>
              <p><span className="font-bold inline-block w-44">Projected Degree Class:</span> {degreeClass}</p>
            </div>
          </div>
        </div>

        {/* Footer with logo */}
        <div className="mt-12 text-center text-xs text-gray-500 font-serif border-t border-gray-300 pt-4 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="AcadeGrade" className="w-4 h-4 object-contain" />
            <span className="font-semibold text-gray-600">AcadeGrade</span>
          </div>
          <span>Generated by AcadeGrade · Not an official university document</span>
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
  );
}
