'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Target } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface WhatIfCalculatorProps {
  currentCGPA: number;
  totalCredits: number;
  initialRemainingSemesters?: number;
  initialCreditLoad?: number;
}

export function WhatIfCalculator({
  currentCGPA,
  totalCredits,
  initialRemainingSemesters = 2,
  initialCreditLoad = 18,
}: WhatIfCalculatorProps) {
  const shouldReduceMotion = useReducedMotion();
  
  const [targetCGPA, setTargetCGPA] = useState(Math.min(5.0, currentCGPA + 0.2));
  const [remainingSemesters, setRemainingSemesters] = useState(initialRemainingSemesters);
  const [creditLoad, setCreditLoad] = useState(initialCreditLoad);
  
  const [requiredGPA, setRequiredGPA] = useState<number>(0);
  const [requiredAvgScore, setRequiredAvgScore] = useState<number>(0);
  const [feasibilityNote, setFeasibilityNote] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  
  // Client-side math computation
  useEffect(() => {
    const futureCredits = remainingSemesters * creditLoad;
    if (futureCredits > 0) {
      const requiredTotalGP = (targetCGPA * (totalCredits + futureCredits)) - (currentCGPA * totalCredits);
      const reqGPA = requiredTotalGP / futureCredits;
      setRequiredGPA(reqGPA);
      setRequiredAvgScore((reqGPA / 5) * 100);
    }
  }, [targetCGPA, remainingSemesters, creditLoad, currentCGPA, totalCredits]);

  // Cooldown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Debounced API call for AI note
  useEffect(() => {
    if (cooldown > 0) return; // Skip if in cooldown

    setCountdown(5);
    
    // UI countdown interval
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(async () => {
      setCountdown(null);
      setLoading(true);
      try {
        const res = await fetch('/api/ai/whatif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad })
        });
        
        if (!res.ok) {
          if (res.status === 429) toast.error('Rate limited. Please wait.');
          else console.error('WhatIf failed:', res.status);
          return;
        }
        
        const data = await res.json();
        if (data.feasibilityNote) {
          setIsTyping(false);
          setTimeout(() => {
            setFeasibilityNote(data.feasibilityNote);
            setIsTyping(true);
            setCooldown(30); // Start 30s cooldown after success
          }, 50);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 5000); // 5 seconds debounce

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [targetCGPA, remainingSemesters, creditLoad, currentCGPA, totalCredits]);

  return (
    <div className="bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      {/* Top Section - Controls */}
      <div className="p-6 md:p-8 border-b border-[var(--acade-border-subtle)] space-y-8">
        
        {/* Slider Area */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[length:var(--text-xs)] uppercase tracking-wider font-bold text-[var(--acade-text-faint)]">Target CGPA</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {targetCGPA.toFixed(2)}
                </span>
                <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">/ 5.00</span>
              </div>
            </div>
            <div className="bg-[var(--acade-surface)] px-3 py-1.5 rounded-lg border border-[var(--acade-border)]">
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-medium">Current: {currentCGPA.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="relative w-full h-12 flex items-center group">
            <input 
              type="range" 
              min={currentCGPA} 
              max={5.0} 
              step={0.01} 
              value={targetCGPA}
              onChange={(e) => setTargetCGPA(parseFloat(e.target.value))}
              disabled={cooldown > 0 || loading}
              className={cn("absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10", (cooldown > 0 || loading) && "cursor-not-allowed")}
            />
            {/* Custom Track */}
            <div className="absolute inset-x-0 h-2 bg-[var(--acade-surface)] rounded-full overflow-hidden border border-[var(--acade-border-subtle)] pointer-events-none">
              <motion.div 
                className="h-full bg-gradient-to-r from-[var(--acade-primary)] to-[var(--acade-primary-glow)]"
                style={{ width: `${((targetCGPA - currentCGPA) / (5.0 - currentCGPA)) * 100}%` }}
                layout
              />
            </div>
            {/* Custom Thumb */}
            <motion.div 
              className="absolute h-6 w-6 bg-white rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] border-2 border-[var(--acade-primary)] pointer-events-none flex items-center justify-center"
              style={{ left: `${((targetCGPA - currentCGPA) / (5.0 - currentCGPA)) * 100}%` }}
              animate={{ scale: loading ? 0.9 : 1 }}
              whileHover={{ scale: 1.1 }}
            >
              <div className="w-1.5 h-1.5 bg-[var(--acade-primary)] rounded-full" />
            </motion.div>
          </div>
          {cooldown > 0 && (
            <div className="text-center mt-2">
              <span className="text-[10px] text-[var(--acade-danger)] font-bold tracking-wider uppercase">
                Analysis locked. Cooldown: {cooldown}s
              </span>
            </div>
          )}
        </div>

        {/* Number Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider">Remaining Semesters</label>
            <input 
              type="number" 
              min={1} 
              max={10} 
              value={remainingSemesters}
              onChange={(e) => setRemainingSemesters(parseInt(e.target.value) || 1)}
              disabled={cooldown > 0 || loading}
              className={cn("w-full bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-xl px-4 py-3 text-[length:var(--text-base)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums focus:outline-none focus:border-[var(--acade-primary)] transition-colors", (cooldown > 0 || loading) && "opacity-50 cursor-not-allowed")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider">Units per Semester</label>
            <input 
              type="number" 
              min={1} 
              max={30} 
              value={creditLoad}
              onChange={(e) => setCreditLoad(parseInt(e.target.value) || 18)}
              disabled={cooldown > 0 || loading}
              className={cn("w-full bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-xl px-4 py-3 text-[length:var(--text-base)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums focus:outline-none focus:border-[var(--acade-primary)] transition-colors", (cooldown > 0 || loading) && "opacity-50 cursor-not-allowed")}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Results */}
      <div className="p-6 md:p-8 bg-[var(--acade-surface)]/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex flex-col">
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-bold uppercase mb-1">Required GPA</span>
              <AnimatePresence mode="popLayout">
                <motion.span 
                  key={requiredGPA > 5 ? 'impossible' : requiredGPA.toFixed(2)}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-geist-mono)] tabular-nums",
                    requiredGPA > 5 ? "text-[var(--acade-danger)]" : "text-[var(--acade-primary)]"
                  )}
                >
                  {requiredGPA > 5 ? '>5.00' : Math.max(0, requiredGPA).toFixed(2)}
                </motion.span>
              </AnimatePresence>
            </div>
            
            <div className="w-px h-12 bg-[var(--acade-border)]" />
            
            <div className="flex flex-col">
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-bold uppercase mb-1">Target Avg Score</span>
              <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums">
                {requiredGPA > 5 ? 'Impossible' : `~${Math.max(0, requiredAvgScore).toFixed(0)}%`}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-[var(--acade-overlay)] rounded-xl p-4 border border-[var(--acade-border-subtle)] min-h-[80px] flex items-center relative w-full">
            <div className="absolute -top-3 -right-3">
               <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-full p-1.5 shadow-sm">
                 <Sparkles size={14} className="text-[var(--acade-gold)]" />
               </div>
            </div>
            
            {loading ? (
              <div className="flex items-center gap-2 text-[var(--acade-text-muted)] text-[length:var(--text-sm)]">
                <Loader2 size={16} className="animate-spin" />
                <span>AcadeMind is analyzing feasibility...</span>
              </div>
            ) : countdown !== null && countdown > 0 ? (
              <div className="flex items-center gap-2 text-[var(--acade-warning)] text-[length:var(--text-sm)]">
                <Loader2 size={16} className="animate-spin" />
                <span>Finalizing points... ({countdown}s)</span>
              </div>
            ) : (
              <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] leading-relaxed italic">
                "{feasibilityNote || 'Adjust the slider to see AI analysis.'}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
