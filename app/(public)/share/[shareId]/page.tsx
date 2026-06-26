'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { FileText, Download, AlertCircle, Clock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CGPAArc } from '@/components/cgpa/CGPAArc';

interface SharedCourse {
  id: string;
  code: string;
  title: string;
  units: number;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  grade?: string;
  gradePoint?: number;
}

interface SharedSemester {
  id: string;
  label: string;
  session: string;
  level: number;
  semester: number;
  gpa: number;
  pi: number;
  creditLoaded: number;
  courses: SharedCourse[];
}

interface SharedTranscript {
  studentName: string;
  matric: string;
  department: string;
  programme: string;
  currentLevel: string;
  avatarUrl?: string | null;
  showPhoto?: boolean;
  semesters: SharedSemester[];
  createdAt: any;
}

export default function ShareTranscriptPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [transcript, setTranscript] = useState<SharedTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;

    fetch(`/api/transcript/share?id=${shareId}`)
      .then(async r => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error || 'Failed to load transcript');
        }
        return r.json();
      })
      .then(json => setTranscript(json.transcript))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  const handlePrint = () => window.print();

  // Calculate cumulative
  let totalCredits = 0;
  let totalPoints = 0;
  if (transcript) {
    transcript.semesters.forEach(s => {
      totalCredits += s.creditLoaded || 0;
      totalPoints += (s.gpa || 0) * (s.creditLoaded || 0);
    });
  }
  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  const cgpaNum = parseFloat(cgpa);
  let degreeClass = '';
  if (cgpaNum >= 4.5) degreeClass = 'First Class Honours';
  else if (cgpaNum >= 3.5) degreeClass = 'Second Class Honours (Upper Division)';
  else if (cgpaNum >= 2.4) degreeClass = 'Second Class Honours (Lower Division)';
  else if (cgpaNum >= 1.5) degreeClass = 'Third Class Honours';
  else degreeClass = 'Fail';

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-96" />
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 pb-20 px-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 max-w-md"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--acade-danger)]/10 flex items-center justify-center mx-auto">
              {error.includes('expired') ? (
                <Clock size={32} className="text-[var(--acade-gold)]" />
              ) : (
                <AlertCircle size={32} className="text-[var(--acade-danger)]" />
              )}
            </div>
            <h1 className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-bricolage)]">
              {error.includes('expired') ? 'Link Expired' : 'Transcript Not Found'}
            </h1>
            <p className="text-[var(--acade-text-muted)]">
              {error.includes('expired')
                ? 'This shared transcript link has expired. Ask the student to generate a new one.'
                : 'This transcript link is invalid or has been removed.'}
            </p>
            <Button variant="primary" onClick={() => (window.location.href = '/')}>
              Go to AcadeGrade
            </Button>
          </motion.div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (!transcript) return null;

  return (
    <>
      <Navbar />

      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Actions bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 print:hidden"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={20} className="text-[var(--acade-primary)]" />
                <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                  Shared Transcript
                </h1>
              </div>
              <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
                {transcript.studentName}&apos;s academic results — shared via AcadeGrade
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <FileText size={16} className="mr-2" /> Print
              </Button>
              <Button variant="primary" size="sm" onClick={handlePrint}>
                <Download size={16} className="mr-2" /> Download PDF
              </Button>
            </div>
          </motion.div>

          {/* Transcript Paper */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white text-black p-4 sm:p-8 md:p-12 rounded-xl shadow-xl border border-[var(--acade-border-subtle)] mx-auto max-w-full lg:max-w-[210mm] min-h-[297mm] print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full overflow-hidden relative"
          >
            {/* Holographic Watermark */}
            <div className="absolute inset-0 pointer-events-none print:hidden z-0 overflow-hidden mix-blend-multiply opacity-50">
               <div className="w-full h-full holographic-seal" />
            </div>

            {/* Header with Logo */}
            <div className="text-center mb-6 sm:mb-8 border-b-2 border-black pb-4 relative z-10">
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
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-700">
                Agbani, Enugu State
              </p>
              <div className="mt-4 inline-block bg-gray-100 px-4 py-1 border border-gray-300 font-bold text-sm tracking-widest">
                STUDENT UNOFFICIAL TRANSCRIPT
              </div>
            </div>

            {/* Student Info */}
            <div className="border-2 border-black p-4 mb-8 flex gap-4 text-sm font-serif relative z-10 bg-white/60 backdrop-blur-sm print:bg-transparent">
              {/* Photo column */}
              {transcript.showPhoto && transcript.avatarUrl && (
                <div className="shrink-0">
                  <img
                    src={transcript.avatarUrl}
                    alt={transcript.studentName}
                    className="w-20 h-24 object-cover border-2 border-gray-400 bg-gray-100"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
              {/* Info columns */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    <span className="font-bold inline-block w-24">Name:</span>{' '}
                    {transcript.studentName}
                  </p>
                  <p className="mt-2">
                    <span className="font-bold inline-block w-24">Matric No:</span>{' '}
                    {transcript.matric || 'N/A'}
                  </p>
                  <p className="mt-2">
                    <span className="font-bold inline-block w-24">Level:</span>{' '}
                    {transcript.currentLevel || 'N/A'}L
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-bold inline-block w-28">Department:</span>{' '}
                    {transcript.department || 'N/A'}
                  </p>
                  <p className="mt-2">
                    <span className="font-bold inline-block w-28">Programme:</span>{' '}
                    {transcript.programme || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Semesters */}
            <div className="space-y-8 font-serif relative z-10">
              {transcript.semesters.map(sem => (
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
                        </tr>
                      </thead>
                      <tbody>
                        {sem.courses.map(course => (
                          <tr key={course.id}>
                            <td className="border border-gray-400 p-1.5 font-semibold">
                              {course.code}
                            </td>
                            <td className="border border-gray-400 p-1.5">{course.title}</td>
                            <td className="border border-gray-400 p-1.5 text-center">
                              {course.units}
                            </td>
                            <td className="border border-gray-400 p-1.5 text-center">
                              {course.caScore ?? '-'}
                            </td>
                            <td className="border border-gray-400 p-1.5 text-center">
                              {course.examScore ?? '-'}
                            </td>
                            <td className="border border-gray-400 p-1.5 text-center font-semibold">
                              {course.totalScore ?? '-'}
                            </td>
                            <td className="border border-gray-400 p-1.5 text-center font-bold">
                              {course.grade ?? '-'}
                            </td>
                            <td className="border border-gray-400 p-1.5 text-center">
                              {course.gradePoint ?? '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="border border-gray-400 p-1.5 text-right">
                            SEMESTER SUMMARY
                          </td>
                          <td className="border border-gray-400 p-1.5 text-center">
                            {sem.creditLoaded}
                          </td>
                          <td colSpan={3} className="border border-gray-400 p-1.5">
                            GPA: {sem.gpa?.toFixed(2) || '0.00'}
                          </td>
                          <td colSpan={2} className="border border-gray-400 p-1.5 text-center">
                            PI: {sem.pi?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Cumulative */}
            <div className="mt-8 border-2 border-black p-4 text-sm font-serif break-inside-avoid relative z-10 bg-white/70 backdrop-blur-md print:bg-transparent">
              <h3 className="font-bold text-base mb-3 border-b border-gray-400 pb-1">
                CUMULATIVE SUMMARY
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="shrink-0 scale-90 sm:scale-100 print:hidden">
                   {/* Dramatic CGPA Reveal! */}
                   <CGPAArc cgpa={cgpaNum} pi={Math.max(0, cgpaNum - 0.5)} size="sm" animateOnMount />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div>
                    <p>
                      <span className="font-bold inline-block w-40">Cumulative CGPA:</span>{' '}
                      <span className="font-bold text-lg">{cgpa}</span> / 5.00
                    </p>
                    <p className="mt-1">
                      <span className="font-bold inline-block w-40">Total Credits Earned:</span>{' '}
                      {totalCredits}
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-bold inline-block w-44">Projected Degree Class:</span>{' '}
                      <span className="font-bold text-[var(--acade-primary)] print:text-black">{degreeClass}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center text-xs text-gray-500 font-serif border-t border-gray-300 pt-4 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <img src="/logo.png" alt="AcadeGrade" className="w-4 h-4 object-contain" />
                <span className="font-semibold text-gray-600">AcadeGrade</span>
              </div>
              <span>Generated by AcadeGrade · Not an official university document · Shared link valid for 30 days</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Print & Holographic styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .holographic-seal {
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(79, 70, 229, 0.15) 30%,
            rgba(245, 158, 11, 0.25) 40%,
            rgba(79, 70, 229, 0.15) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: shimmer 8s infinite linear;
        }

        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .bg-white.text-black, .bg-white.text-black * { visibility: visible; }
          .bg-white.text-black { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `,
        }}
      />

      <PublicFooter />
    </>
  );
}
