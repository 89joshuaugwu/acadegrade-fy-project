'use client';

import { useState, useEffect } from 'react';
import { Download, Share2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { queryCollection } from '@/lib/firebase/firestore';
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
        headers: { 'Authorization': `Bearer ${token}` }
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

  const handleShare = async () => {
    if (!navigator.share) {
      toast.error('Sharing not supported on this browser');
      return;
    }
    
    setDownloading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/transcript/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], 'AcadeGrade_Transcript.pdf', { type: 'application/pdf' });
        await navigator.share({
          title: 'My Unofficial Transcript',
          files: [file]
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to share');
    } finally {
      setDownloading(false);
    }
  };

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
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 size={16} className="mr-2" />
            Share
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download size={16} className={cn("mr-2", downloading && "animate-bounce")} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Transcript Paper Preview */}
      <div className="bg-white text-black p-4 sm:p-8 md:p-12 rounded-xl shadow-xl border border-[var(--acade-border-subtle)] mx-auto max-w-full lg:max-w-[210mm] min-h-[297mm] print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 border-b-2 border-black pb-4">
          <h2 className="text-base sm:text-xl md:text-2xl font-bold font-serif mb-1 uppercase tracking-tight">
            Enugu State University of Science and Technology
          </h2>
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-700">Agbani, Enugu State</p>
          <div className="mt-4 inline-block bg-gray-100 px-4 py-1 border border-gray-300 font-bold text-sm tracking-widest">
            STUDENT UNOFFICIAL TRANSCRIPT
          </div>
        </div>

        {/* Student Box */}
        <div className="border-2 border-black p-4 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-serif">
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

        <div className="mt-12 text-center text-xs text-gray-500 font-serif border-t border-gray-300 pt-4">
          Generated by AcadeGrade · Not an official university document
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
          .bg-white.text-black.p-8, .bg-white.text-black.p-8 * {
            visibility: visible;
          }
          .bg-white.text-black.p-8 {
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
