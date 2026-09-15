'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Calculator, LineChart, NotebookPen, ShieldCheck } from 'lucide-react';

const exampleCourses = [
  { code: 'CSC 415', title: 'Computer Graphics', score: 54, grade: 'C', units: 2, gradeClass: 'text-[var(--acade-gold)]' },
  { code: 'CSC 463', title: 'Software Engineering', score: 62, grade: 'B', units: 2, gradeClass: 'text-[var(--acade-primary)]' },
  { code: 'MTH 321', title: 'Numerical Analysis', score: 71, grade: 'A', units: 3, gradeClass: 'text-[var(--acade-success)]' },
] as const;

const STAGE_RESTING_OFFSETS = [0, 64, 128, 192] as const;
const STAGE_ENTER_POINTS = [0, 0.12, 0.35, 0.58] as const;
const STAGE_ENTER_DURATION = 0.22;
const ENTRY_OFFSET = 520;
const DECK_HEIGHT_CLASSES = ['lg:h-[25rem]', 'lg:h-[26rem]', 'lg:h-[29rem]', 'lg:h-[34rem]'] as const;

type DeckCardStyle = CSSProperties & {
  '--deck-card-y': string;
  '--deck-card-opacity': string;
  '--deck-card-scale': string;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOutQuint(value: number) {
  return 1 - Math.pow(1 - clamp(value), 5);
}

function getCardProgress(index: number, progress: number) {
  if (index === 0) return 1;
  return easeOutQuint((progress - STAGE_ENTER_POINTS[index]) / STAGE_ENTER_DURATION);
}

function getDeckCardStyle(index: number, progress: number): DeckCardStyle {
  const reveal = getCardProgress(index, progress);
  const y = ENTRY_OFFSET + (STAGE_RESTING_OFFSETS[index] - ENTRY_OFFSET) * reveal;

  return {
    '--deck-card-y': `${y.toFixed(2)}px`,
    '--deck-card-opacity': reveal.toFixed(3),
    '--deck-card-scale': (0.985 + reveal * 0.015).toFixed(3),
  };
}

export function AcademicProof() {
  const sectionRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLOListElement>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    let frame = 0;
    let targetProgress = 0;
    let renderedProgress = 0;
    let isAnimating = false;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const applyProgress = (progress: number) => {
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const style = getDeckCardStyle(index, progress);
        card.style.setProperty('--deck-card-y', style['--deck-card-y']);
        card.style.setProperty('--deck-card-opacity', style['--deck-card-opacity']);
        card.style.setProperty('--deck-card-scale', style['--deck-card-scale']);
      });

      const nextStage = [3, 2, 1].find((index) => getCardProgress(index, progress) >= 0.92) ?? 0;
      setActiveStage((current) => current === nextStage ? current : nextStage);
    };

    const render = () => {
      const delta = targetProgress - renderedProgress;
      renderedProgress = prefersReducedMotion ? targetProgress : renderedProgress + delta * 0.17;
      if (Math.abs(targetProgress - renderedProgress) < 0.001) renderedProgress = targetProgress;
      applyProgress(renderedProgress);

      if (Math.abs(targetProgress - renderedProgress) >= 0.001) {
        frame = requestAnimationFrame(render);
      } else {
        isAnimating = false;
      }
    };

    const updateProgress = () => {
      const section = sectionRef.current;
      const deck = deckRef.current;
      if (!section || !deck || window.innerWidth < 1024) return;

      const bounds = section.getBoundingClientRect();
      const availableTravel = section.offsetHeight - deck.offsetHeight - 128;
      const scrollSceneLength = Math.max(1, Math.min(window.innerHeight * 0.9, availableTravel));
      targetProgress = clamp((96 - bounds.top) / scrollSceneLength);

      if (!isAnimating) {
        isAnimating = true;
        frame = requestAnimationFrame(render);
      }
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      aria-labelledby="academic-proof-title"
      className="public-atmosphere-section scroll-mt-20 border-b border-[var(--acade-border-subtle)] lg:min-h-[170vh]"
    >
      <div className="mx-auto grid max-w-[1200px] items-start gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[170vh] lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-[var(--acade-primary)]">Calculation you can follow</p>
            <h2 id="academic-proof-title" className="mt-3 max-w-[13ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.25rem,4vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[var(--acade-text)]">
              A result becomes useful when its basis stays visible.
            </h2>
            <p className="mt-6 max-w-[48ch] leading-7 text-[var(--acade-text-muted)]">
              AcadeGrade keeps course inputs, credit weighting, GPA, PI and degree outlook connected—so a headline metric never floats free of the record behind it.
            </p>
            <div className="mt-8 border-l-2 border-[var(--acade-gold)] pl-5">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-[var(--acade-success)]" aria-hidden="true" />Honest by design</div>
              <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
                AcadeGrade calculates from the records you enter. It does not replace an official university record.
              </p>
            </div>
          </div>
        </div>

        <ol ref={deckRef} data-active-stage={activeStage + 1} aria-label="Illustrative calculation sequence" className={`academic-ledger-field academic-proof-deck min-w-0 space-y-8 rounded-[var(--radius-dialog)] border border-[var(--acade-border-subtle)] p-3 transition-[height] duration-500 sm:p-5 lg:sticky lg:top-24 lg:col-span-7 lg:space-y-0 lg:overflow-hidden ${DECK_HEIGHT_CLASSES[activeStage]}`}>
          <li ref={(node) => { cardRefs.current[0] = node; }} data-stage="1" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)]/95 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-7 lg:absolute lg:inset-x-5 lg:top-5 lg:z-10" style={getDeckCardStyle(0, 0)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-primary)]">01 · RESULT INPUT</p>
                <h3 className="mt-1 font-[family-name:var(--font-bricolage)] text-xl font-semibold">Record the semester evidence</h3>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--acade-text-faint)]">2025/2026 · FIRST SEMESTER · ILLUSTRATIVE</p>
              </div>
              <NotebookPen className="size-6 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
            </div>
            <ol aria-label="Illustrative courses on small screens" className="mt-6 divide-y divide-[var(--acade-border-subtle)] sm:hidden">
              {exampleCourses.map((course) => (
                <li key={course.code} className="grid min-w-0 grid-cols-[1fr_auto] gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">{course.code}</p><p className="mt-1 truncate text-sm text-[var(--acade-text-muted)]">{course.title}</p></div>
                  <div className="flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-sm"><span>{course.score}/100</span><span className={course.gradeClass}>{course.grade}</span><span>{course.units}u</span></div>
                </li>
              ))}
            </ol>
            <div className="mt-6 hidden min-w-0 overflow-x-auto sm:block">
              <table className="w-full min-w-[540px] text-left text-sm">
                <caption className="sr-only">Illustrative semester result inputs</caption>
                <thead className="text-xs text-[var(--acade-text-faint)]">
                  <tr className="border-b border-[var(--acade-border-subtle)]"><th scope="col" className="pb-3 font-semibold">Course</th><th scope="col" className="pb-3 text-right font-semibold">Score</th><th scope="col" className="pb-3 text-right font-semibold">Grade</th><th scope="col" className="pb-3 text-right font-semibold">Credits</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--acade-border-subtle)]">
                  {exampleCourses.map((course) => (
                    <tr key={course.code}>
                      <td className="py-4"><span className="font-[family-name:var(--font-geist-mono)] font-semibold">{course.code}</span><span className="ml-2 text-[var(--acade-text-muted)]">{course.title}</span></td>
                      <td className="py-4 text-right font-[family-name:var(--font-geist-mono)]">{course.score}</td>
                      <td className={`py-4 text-right font-[family-name:var(--font-geist-mono)] ${course.gradeClass}`}>{course.grade}</td>
                      <td className="py-4 text-right font-[family-name:var(--font-geist-mono)]">{course.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </li>

          <li ref={(node) => { cardRefs.current[1] = node; }} data-stage="2" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)]/95 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-7 lg:absolute lg:inset-x-5 lg:top-5 lg:z-20" style={getDeckCardStyle(1, 0)}>
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-gold)]">02 · CREDIT WEIGHTING</p>
                <h3 className="mt-1 font-[family-name:var(--font-bricolage)] text-xl font-semibold">Weight the result by its academic load</h3>
                <p className="mt-3 max-w-[45ch] text-sm leading-6 text-[var(--acade-text-muted)]">Every course keeps its contribution visible, so the total can always be traced back to the record.</p>
              </div>
              <div className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] px-6 py-5 text-center"><p className="text-xs font-semibold text-[var(--acade-text-faint)]">RECORDED CREDITS</p><p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-semibold">7</p></div>
            </div>
            <div className="mt-5 grid min-w-0 gap-3 rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]/80 p-4 font-[family-name:var(--font-geist-mono)] text-xs leading-5 text-[var(--acade-text-muted)] sm:grid-cols-2">
              <p className="min-w-0 whitespace-normal break-words">Quality points = grade point × credits</p>
              <p className="min-w-0 whitespace-normal break-words">Semester GPA = total quality points ÷ total credits</p>
            </div>
          </li>

          <li ref={(node) => { cardRefs.current[2] = node; }} data-stage="3" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7 lg:absolute lg:inset-x-5 lg:top-5 lg:z-30" style={getDeckCardStyle(2, 0)}>
            <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-primary)]">03 · GPA + PI</p>
            <div className="mt-4 grid gap-px overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-border)] sm:grid-cols-2">
              <div className="bg-[var(--acade-surface)] p-6"><p className="text-sm font-semibold text-[var(--acade-text-muted)]">Semester GPA</p><p className="mt-2 font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tracking-tight">4.14</p><p className="mt-3 text-xs text-[var(--acade-text-muted)]">Letter-grade points, credit weighted</p></div>
              <div className="bg-[var(--acade-gold-dim)] p-6"><p className="text-sm font-semibold text-[var(--acade-gold)]">Performance Index</p><p className="mt-2 font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tracking-tight text-[var(--acade-gold)]">3.18</p><p className="mt-3 text-xs text-[var(--acade-text-muted)]">Continuous raw-score signal when available</p></div>
            </div>
          </li>

          <li ref={(node) => { cardRefs.current[3] = node; }} data-stage="4" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-primary)] bg-[#17172E] p-5 text-white shadow-[0_24px_60px_rgba(20,24,39,.18)] sm:p-7 lg:absolute lg:inset-x-5 lg:top-5 lg:z-40" style={getDeckCardStyle(3, 0)}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div><p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[#AFAAFF]">04 · DEGREE OUTLOOK</p><h3 className="mt-1 font-[family-name:var(--font-bricolage)] text-2xl font-semibold">A trajectory, not just a total</h3></div>
              <div className="text-right"><p className="font-[family-name:var(--font-geist-mono)] text-3xl font-semibold">3.71</p><p className="text-xs text-[#B8BED0]">CGPA · after 117 credits</p></div>
            </div>
            <LineChart className="sr-only" aria-hidden="true" />
            <svg viewBox="0 0 600 180" role="img" aria-label="Illustrative CGPA trajectory rising over four semesters" className="mt-6 h-auto w-full">
              <g stroke="#34364D" strokeWidth="1"><path d="M24 32H576M24 78H576M24 124H576M24 164H576" /></g>
              <path d="M42 145 C120 140 152 132 210 116 S330 93 386 69 S480 48 558 30" fill="none" stroke="#8B84FF" strokeWidth="4" strokeLinecap="round" />
              <path d="M42 157 C135 150 161 150 210 142 S321 132 386 115 S493 105 558 96" fill="none" stroke="#F4B544" strokeWidth="2.5" strokeDasharray="7 7" />
              <g fill="#17172E" stroke="#8B84FF" strokeWidth="3"><circle cx="42" cy="145" r="5" /><circle cx="210" cy="116" r="5" /><circle cx="386" cy="69" r="5" /><circle cx="558" cy="30" r="7" /></g>
            </svg>
            <div className="mt-4 flex flex-wrap gap-5 text-xs text-[#B8BED0]"><span>Solid · CGPA</span><span>Dashed · PI</span><span className="ml-auto">Illustrative example</span></div>
          </li>
        </ol>
      </div>
    </section>
  );
}
