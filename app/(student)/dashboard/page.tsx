'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import CountUp from 'react-countup';
import { Share, FileText, BrainCircuit, Plus, RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCGPA } from '@/hooks/useCGPA';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { updateDocument } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils/cn';

import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { DegreeClassBadge } from '@/components/cgpa/DegreeClassBadge';
import { TrendChart } from '@/components/charts/TrendChart';

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { cgpa, pi, degreeClass, semesterHistory, totalCredits, totalCourses, loading: cgpaLoading } = useCGPA();
  const shouldReduceMotion = useReducedMotion();

  // Primary mode state: false = CGPA, true = PI
  const [isPIMode, setIsPIMode] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Sync state with user preference on mount
  useEffect(() => {
    if (profile?.gradeMode) {
      setIsPIMode(profile.gradeMode === 'pi');
    }
  }, [profile?.gradeMode]);

  // Handle grade mode toggle
  const handleModeChange = async (checked: boolean) => {
    setIsPIMode(checked);
    if (user?.uid) {
      try {
        await updateDocument(`users/${user.uid}`, { gradeMode: checked ? 'pi' : 'cgpa' });
      } catch (e) {
        console.error('Failed to save preference', e);
      }
    }
  };

  // Fetch AI summary stub
  const fetchAiSummary = async () => {
    setAiLoading(true);
    // Stub for Phase 7 implementation
    setTimeout(() => {
      setAiSummary("Your recent performance indicates a stable upward trend. If you maintain this trajectory, you're projected to hit First Class in two semesters. Focus on pulling up your lower grades in core courses.");
      setAiLoading(false);
    }, 2000);
  };

  useEffect(() => {
    fetchAiSummary();
  }, []);

  // Web Share API
  const handleShare = async () => {
    const text = `I'm tracking my academic performance on AcadeGrade! My current ${isPIMode ? 'PI' : 'CGPA'} is ${isPIMode ? pi.toFixed(2) : cgpa.toFixed(2)}.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My AcadeGrade Progress',
          text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Progress copied to clipboard!');
    }
  };

  // Stats calculation
  const currentSemGPA = useMemo(() => {
    if (semesterHistory.length === 0) return 0;
    const lastSem = semesterHistory[semesterHistory.length - 1];
    return isPIMode ? lastSem.pi : lastSem.gpa;
  }, [semesterHistory, isPIMode]);

  // Mock quick stats
  const coursesDone = totalCourses || semesterHistory.length * 6; // Rough estimate for now
  const atRiskCount = 0; // Requires full courses data which we don't fetch at this level

  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';

  if (cgpaLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-12 border-4 border-[var(--acade-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto pb-10">
      
      {/* HEADER ARC ROW */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card variant="glass" padding="lg" className="relative overflow-hidden group">
          {/* Subtle background glow based on degree class */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000"
            style={{ 
              background: `radial-gradient(circle at 50% -20%, ${degreeClass.colorToken} 0%, transparent 70%)` 
            }} 
          />
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start order-2 md:order-1">
              <h1 className="text-[length:var(--text-3xl)] md:text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-2">
                Good {timeOfDay}, {profile?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Student'} <span className="inline-block animate-[wave_2.5s_ease-in-out_infinite] origin-bottom-right">👋</span>
              </h1>
              <p className="text-[length:var(--text-base)] text-[var(--acade-text-muted)] mb-6 max-w-md font-[family-name:var(--font-dm-sans)]">
                {semesterHistory.length === 0 
                  ? "Welcome to AcadeGrade! Add your first semester results to generate your insights."
                  : "Here is a quick overview of your academic standing."}
              </p>
              
              <div className="flex items-center gap-4">
                <Toggle 
                  checked={isPIMode} 
                  onChange={handleModeChange} 
                  leftLabel="CGPA" 
                  rightLabel="PI" 
                />
              </div>

              <div className="mt-8">
                <DegreeClassBadge cgpa={isPIMode ? pi : cgpa} animated={true} />
              </div>
            </div>

            <div className="shrink-0 order-1 md:order-2">
              <CGPAArc 
                cgpa={isPIMode ? pi : cgpa} 
                pi={isPIMode ? cgpa : pi} 
                size="lg" 
                animateOnMount={true} 
                showParticles={true} 
              />
              <div className="mt-2 text-center text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-geist-mono)]">
                {isPIMode ? 'Primary: PI' : 'Primary: CGPA'}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* QUICK STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Credits', value: totalCredits, suffix: ' CU' },
          { label: 'Current Sem', value: currentSemGPA, decimals: 2 },
          { label: 'Courses Done', value: coursesDone },
          { label: 'At Risk', value: atRiskCount, highlight: atRiskCount > 0 },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
          >
            <Card variant="default" padding="md" className="h-full flex flex-col justify-between">
              <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">
                {stat.label}
              </span>
              <div className={cn(
                "text-[length:var(--text-2xl)] md:text-[length:var(--text-3xl)] font-bold mt-2 font-[family-name:var(--font-geist-mono)]",
                stat.highlight ? "text-[var(--acade-danger)]" : "text-[var(--acade-text)]"
              )}>
                <CountUp 
                  end={stat.value} 
                  decimals={stat.decimals || 0} 
                  duration={shouldReduceMotion ? 0 : 2} 
                  separator=","
                />
                {stat.suffix && <span className="text-[length:var(--text-lg)] text-[var(--acade-text-faint)] ml-1">{stat.suffix}</span>}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        
        {/* TREND CHART (Left Column on Desktop) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card variant="glass" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                    Performance Trend
                  </h2>
                  <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">
                    Comparing Official CGPA vs True Mastery (PI)
                  </p>
                </div>
              </div>
              <TrendChart semesters={semesterHistory} metric="both" showForecast={false} />
            </Card>
          </motion.div>

          {/* AI SUMMARY CARD */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card variant="glass" padding="lg" className="border-[var(--acade-primary)]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--acade-primary)]/10 rounded-full blur-3xl" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2 text-[var(--acade-primary-glow)] font-bold font-[family-name:var(--font-bricolage)] text-[length:var(--text-lg)]">
                  <BrainCircuit size={20} />
                  Gemini Insight
                </div>
                <button 
                  onClick={fetchAiSummary}
                  disabled={aiLoading}
                  className="p-2 text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors rounded-full hover:bg-[var(--acade-overlay)] disabled:opacity-50"
                  aria-label="Refresh Insight"
                >
                  <RefreshCw size={16} className={cn(aiLoading && "animate-spin")} />
                </button>
              </div>

              <div className="relative z-10 min-h-[60px]">
                {aiLoading ? (
                  <div className="flex flex-col gap-2">
                    <div className="h-4 bg-[var(--acade-border)] rounded w-full animate-pulse" />
                    <div className="h-4 bg-[var(--acade-border)] rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-[var(--acade-border)] rounded w-4/6 animate-pulse" />
                  </div>
                ) : (
                  <p className="text-[length:var(--text-sm)] md:text-[length:var(--text-base)] text-[var(--acade-text)] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                    {aiSummary || "Add more results to generate personalized insights."}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between relative z-10">
                <span className="text-[10px] text-[var(--acade-text-faint)] font-[family-name:var(--font-geist-mono)]">
                  POWERED BY GEMINI 3.1 FLASH-LITE
                </span>
                <Link 
                  href="/insights"
                  className="flex items-center gap-1 text-[length:var(--text-sm)] font-bold text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] transition-colors"
                >
                  Degree Outlook <ChevronRight size={16} />
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:col-span-4 flex flex-col gap-6">
          
          {/* QUICK ACTIONS */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card variant="default" padding="md">
              <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-col gap-2">
                <Link href="/results" className="flex items-center gap-3 p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] hover:border-[var(--acade-primary)] hover:bg-[var(--acade-primary)]/5 transition-all text-[length:var(--text-sm)] font-medium text-[var(--acade-text)]">
                  <Plus size={18} className="text-[var(--acade-primary)]" />
                  Add Results
                </Link>
                <Link href="/insights" className="flex items-center gap-3 p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] hover:border-[var(--acade-gold)] hover:bg-[var(--acade-gold)]/5 transition-all text-[length:var(--text-sm)] font-medium text-[var(--acade-text)]">
                  <BrainCircuit size={18} className="text-[var(--acade-gold)]" />
                  View Insights
                </Link>
                <Link href="/transcript" className="flex items-center gap-3 p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] hover:border-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] transition-all text-[length:var(--text-sm)] font-medium text-[var(--acade-text)]">
                  <FileText size={18} className="text-[var(--acade-text-muted)]" />
                  Export PDF
                </Link>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] hover:border-[var(--acade-success)] hover:bg-[var(--acade-success)]/5 transition-all text-[length:var(--text-sm)] font-medium text-[var(--acade-text)] w-full text-left"
                >
                  <Share size={18} className="text-[var(--acade-success)]" />
                  Share Progress
                </button>
              </div>
            </Card>
          </motion.div>

          {/* RECENT ACTIVITY STUB */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                  Recent Results
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {semesterHistory.length > 0 ? (
                  <div className="flex flex-col gap-3">
                     <div className="p-3 bg-[var(--acade-deep)] rounded-xl border border-[var(--acade-border)] flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="bg-[var(--acade-success)]/20 p-2 rounded-lg">
                           <BookOpen size={16} className="text-[var(--acade-success)]" />
                         </div>
                         <div>
                           <div className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">CSC 401</div>
                           <div className="text-[10px] text-[var(--acade-text-faint)]">400L First Semester</div>
                         </div>
                       </div>
                       <Badge variant="grade-a">A</Badge>
                    </div>
                    {/* Stubbed second item */}
                    <div className="p-3 bg-[var(--acade-deep)] rounded-xl border border-[var(--acade-border)] flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="bg-[var(--acade-primary)]/20 p-2 rounded-lg">
                           <BookOpen size={16} className="text-[var(--acade-primary)]" />
                         </div>
                         <div>
                           <div className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">CSC 403</div>
                           <div className="text-[10px] text-[var(--acade-text-faint)]">400L First Semester</div>
                         </div>
                       </div>
                       <Badge variant="grade-b">B</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
                    No recent activity yet.
                  </div>
                )}
                <Link href="/results" className="text-center text-[length:var(--text-sm)] font-semibold text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] transition-colors mt-2">
                  View all results →
                </Link>
              </div>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
