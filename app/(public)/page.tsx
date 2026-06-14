'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  BrainCircuit, BarChart3, BookOpen, FileText,
  Calculator, TrendingUp, Bell, WifiOff, Library,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { Navbar } from '@/components/layout/Navbar';
import { FEATURES, NIGERIAN_UNIVERSITIES } from '@/lib/utils/constants';

/* ─── Lazy-load Recharts (SSR: false) ─── */
const LazyLineChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.LineChart })),
  { ssr: false }
);
const LazyLine = dynamic(
  () => import('recharts').then((m) => ({ default: m.Line })),
  { ssr: false }
);
const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((m) => ({ default: m.ResponsiveContainer })),
  { ssr: false }
);

/* ─── Icon lookup from constants ─── */
const iconMap: Record<string, React.ReactNode> = {
  BrainCircuit: <BrainCircuit size={24} />,
  BarChart3: <BarChart3 size={24} />,
  BookOpen: <BookOpen size={24} />,
  FileText: <FileText size={24} />,
  Calculator: <Calculator size={24} />,
  TrendingUp: <TrendingUp size={24} />,
  Bell: <Bell size={24} />,
  WifiOff: <WifiOff size={24} />,
  Library: <Library size={24} />,
};

/* ─── Hero cycling words ─── */
const heroWords = ['Track Your CGPA.', 'Know Your Standing.', 'Ace Your Degree.'];

/* ─── Mock chart data ─── */
const cgpaMockData = [
  { sem: '1', val: 5.0 }, { sem: '2', val: 5.0 }, { sem: '3', val: 5.0 },
  { sem: '4', val: 5.0 }, { sem: '5', val: 5.0 }, { sem: '6', val: 5.0 },
];
const piMockData = [
  { sem: '1', val: 4.75 }, { sem: '2', val: 4.55 }, { sem: '3', val: 4.82 },
  { sem: '4', val: 4.30 }, { sem: '5', val: 4.60 }, { sem: '6', val: 3.95 },
];

/* ─── How It Works steps ─── */
const steps = [
  { num: 1, title: 'Create Account', desc: 'Sign up with your university details and pick your record mode.' },
  { num: 2, title: 'Enter Results', desc: 'Add courses with scores or letter grades — semester by semester.' },
  { num: 3, title: 'See Your CGPA', desc: 'Watch your CGPA & PI animate in real-time on the signature arc.' },
  { num: 4, title: 'Get AI Insights', desc: 'Gemini analyzes your trend and recommends actions to improve.' },
];

/* ─── AI mock text ─── */
const aiMockText = `Based on your academic trajectory, you're maintaining a strong 2:1 standing with a CGPA of 4.23. Your PI of 4.41 shows consistent high-scoring performance beyond what letter grades reveal.\n\nStrengths: Consistent A grades in core Computer Science courses. Your programming modules show particular excellence.\n\nRecommendation: Focus on MTH 301 and PHY 202 where scores dipped below 65%. A targeted 10% improvement in these courses could push your CGPA above the First Class threshold of 4.50.`;

/* ════════════════════════════════════════════════════
   STARFIELD CANVAS
   ════════════════════════════════════════════════════ */
function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const stars: { x: number; y: number; r: number; speed: number; alpha: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.5 + Math.random() * 1.5,
        speed: 0.15 + Math.random() * 0.35,
        alpha: 0.3 + Math.random() * 0.5,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < -5) {
          s.y = canvas!.height + 5;
          s.x = Math.random() * canvas!.width;
        }
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(99,102,241,${s.alpha})`;
        ctx!.fill();
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, enabled]);
}

/* ════════════════════════════════════════════════════
   TYPING ANIMATION HOOK
   ════════════════════════════════════════════════════ */
function useTypingAnimation(text: string, speed: number = 18, startDelay: number = 500) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  const start = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [started, text, speed, startDelay]);

  return { displayed, start };
}

/* ════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ════════════════════════════════════════════════════ */
export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wordIndex, setWordIndex] = useState(0);

  useStarfield(canvasRef, !shouldReduceMotion);

  // Cycle hero words
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // AI typing hook
  const { displayed: aiText, start: startTyping } = useTypingAnimation(aiMockText, 12);

  const stagger = {
    hidden: {},
    visible: shouldReduceMotion
      ? {}
      : { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };

  const fadeUp = shouldReduceMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
      };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Navbar />

      {/* Sentinel for IntersectionObserver */}
      <div id="hero-sentinel" className="absolute top-0 h-1 w-full" />

      {/* ═══════════ SECTION 1 — HERO ═══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-20 pb-16">
        {/* Starfield canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Radial glow behind arc */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--acade-primary) 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Cycling headline */}
          <div className="h-[4.5rem] md:h-[6rem] flex items-center justify-center mb-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.h1
                key={wordIndex}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -30, filter: 'blur(8px)' }}
                transition={{ duration: 0.45 }}
                className="text-[length:var(--text-hero)] font-extrabold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] leading-tight"
              >
                {heroWords[wordIndex]}
              </motion.h1>
            </AnimatePresence>
          </div>

          <p className="text-[length:var(--text-lg)] text-[var(--acade-text-muted)] max-w-lg mb-8 text-pretty font-[family-name:var(--font-dm-sans)]">
            The AI-powered CGPA tracker built for Nigerian university students.
            Dual-metric analysis. Real academic clarity.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <Button variant="primary" size="lg" onClick={() => window.location.href = '/register'}>
              Get Started Free <ArrowRight size={18} />
            </Button>
            <Button variant="ghost" size="lg" onClick={() => window.location.href = '/calculator'}>
              Try Calculator
            </Button>
          </div>

          {/* Demo CGPAArc */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 -m-6 rounded-full bg-[var(--acade-primary)]/8 animate-[pulse-glow_3s_ease-in-out_infinite] pointer-events-none" />
            <CGPAArc cgpa={4.72} pi={4.81} size="md" animateOnMount showParticles={false} />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ SECTION 2 — MARQUEE ═══════════ */}
      <section className="py-8 border-y border-[var(--acade-border-subtle)] overflow-hidden">
        <div className="marquee-container">
          <div className="marquee-track flex gap-12 whitespace-nowrap">
            {[...NIGERIAN_UNIVERSITIES, ...NIGERIAN_UNIVERSITIES].map((uni, i) => (
              <span
                key={`${uni}-${i}`}
                className="text-[length:var(--text-lg)] font-semibold text-[var(--acade-text-faint)] font-[family-name:var(--font-bricolage)] tracking-wide"
              >
                {uni}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 3 — DUAL METRIC ═══════════ */}
      <section className="py-20 md:py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeUp}
              className="text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-3"
            >
              Why Two Metrics?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[length:var(--text-base)] text-[var(--acade-text-muted)] max-w-lg mx-auto"
            >
              CGPA tells you the grade. PI tells you the truth.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CGPA Card */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card variant="glass" padding="lg">
                <h3 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-primary)] font-[family-name:var(--font-bricolage)] mb-2">
                  Official CGPA
                </h3>
                <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-4">
                  Letter-grade discretized. 71% and 95% both yield an A = 5.00.
                  Your transcript shows perfection — but is it?
                </p>
                <div className="h-28">
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyLineChart data={cgpaMockData}>
                      <LazyLine type="monotone" dataKey="val" stroke="var(--acade-primary)" strokeWidth={2} dot={false} />
                    </LazyLineChart>
                  </LazyResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* PI Card */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card variant="glass" padding="lg">
                <h3 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-gold)] font-[family-name:var(--font-bricolage)] mb-2">
                  Performance Index
                </h3>
                <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-4">
                  Detects when 71% and 95% both print as A — but represent very different mastery.
                  PI uses your raw scores for a continuous 0–5.00 metric.
                </p>
                <div className="h-28">
                  <LazyResponsiveContainer width="100%" height="100%">
                    <LazyLineChart data={piMockData}>
                      <LazyLine type="monotone" dataKey="val" stroke="var(--acade-gold)" strokeWidth={2} dot={false} />
                    </LazyLineChart>
                  </LazyResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 4 — FEATURES GRID ═══════════ */}
      <section id="features" className="py-20 md:py-28 px-5 bg-[var(--acade-deep)]/50">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] text-center mb-12"
          >
            Everything You Need
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
              >
                <Card variant="hover" padding="md" className="h-full">
                  <div className="size-10 rounded-xl bg-[var(--acade-primary)]/10 flex items-center justify-center text-[var(--acade-primary)] mb-4">
                    {iconMap[feature.icon]}
                  </div>
                  <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ SECTION 5 — HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-20 md:py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] text-center mb-14"
          >
            How It Works
          </motion.h2>

          <div className="relative flex flex-col md:flex-row gap-8 md:gap-6">
            {/* Dashed connector line (desktop only) */}
            <div className="hidden md:block absolute top-7 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px border-t-2 border-dashed border-[var(--acade-border)]" />

            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="flex-1 flex flex-col items-center text-center relative"
              >
                <div className="size-14 rounded-full bg-[var(--acade-primary)] text-white flex items-center justify-center text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] mb-4 relative z-10">
                  {step.num}
                </div>
                <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] mb-1.5">
                  {step.title}
                </h3>
                <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] max-w-[220px]">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 6 — AI PREVIEW ═══════════ */}
      <section className="py-20 md:py-28 px-5 bg-[var(--acade-deep)]/50">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] text-center mb-4"
          >
            AI-Powered Analysis
          </motion.h2>
          <p className="text-[length:var(--text-base)] text-[var(--acade-text-muted)] text-center mb-10 max-w-lg mx-auto">
            Gemini reads your entire academic history and delivers personalized insights.
          </p>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onViewportEnter={() => startTyping()}
          >
            <Card variant="default" padding="lg" className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-[var(--acade-gold)]" />
                <span className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">
                  Written Analysis
                </span>
              </div>
              <div className="min-h-[180px]">
                <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] whitespace-pre-line leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {shouldReduceMotion ? aiMockText : aiText}
                  {!shouldReduceMotion && aiText.length < aiMockText.length && (
                    <span className="inline-block w-0.5 h-4 bg-[var(--acade-primary)] ml-0.5 animate-[typing-blink_0.8s_infinite]" />
                  )}
                </p>
              </div>
              <div className="absolute bottom-4 right-4">
                <Badge variant="status" icon={<Sparkles size={12} />}>
                  Gemini 2.5 Flash-Lite
                </Badge>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-[var(--acade-border)] py-10 px-5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/about" className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors">
              About
            </Link>
            <Link href="/calculator" className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors">
              Calculator
            </Link>
            <Link href="/login" className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors">
              Register
            </Link>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-dm-sans)]">
            © 2026 AcadeGrade · Built by Joshuazaza · CSC 499 · ESUT, Agbani
          </p>
        </div>
      </footer>
    </div>
  );
}
