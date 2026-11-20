import type { ReactNode } from 'react';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { computeExampleSlip } from '@/lib/public/example-student';
import { exampleDegreeGoal } from '@/lib/public/features-overview';
import { PASTE_SAMPLE, pasteResult, plateFigures, plateRows } from '@/lib/public/features-scanner';
import { exampleForecast } from '@/lib/public/features-academind';
import { planWorking } from '@/lib/public/features-timetable';
import { AcadeMindMark } from '@/components/public/Logo';
import { ArcGauge } from '@/components/site/ArcGauge';
import { FakeButton, GradePill, UiCard, UiCardHead } from './shared';

/**
 * Product screens rebuilt in HTML with the example student's data (brand v2).
 * Every figure comes from the lib/public/features-*.ts modules, which use the
 * real engine, so the pages cannot drift from the product.
 */

/* ---------------------------------------------------------------- forecast */

const CHART = { w: 340, h: 150, padX: 14, padTop: 14, padBottom: 14, min: 4.0, max: 4.9 } as const;

function chartPoint(index: number, value: number, count: number): [number, number] {
  const x = CHART.padX + (index * (CHART.w - CHART.padX * 2)) / (count - 1);
  const y = CHART.padTop + (1 - (value - CHART.min) / (CHART.max - CHART.min)) * (CHART.h - CHART.padTop - CHART.padBottom);
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

/** The forecast line: five real semesters, then two projected ones, dashed. Labelled with its own numbers. */
export function ForecastChart({ className = '' }: { className?: string }) {
  const forecast = exampleForecast();
  const all = [...forecast.history, ...forecast.projected];
  const points = all.map((value, index) => chartPoint(index, value, all.length));
  const past = points.slice(0, forecast.history.length);
  const ahead = points.slice(forecast.history.length - 1);
  const path = (list: [number, number][]) => list.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [, firstY] = chartPoint(0, 4.5, 2);
  return (
    <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} className={`block h-auto w-full ${className}`} role="img" aria-label={forecast.alt}>
      <defs>
        <linearGradient id="ag-forecast-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6B4EFF" />
          <stop offset="100%" stopColor="#9C6BE8" />
        </linearGradient>
      </defs>
      <line x1={CHART.padX} x2={CHART.w - CHART.padX} y1={firstY} y2={firstY} stroke="#FFB23F" strokeWidth={2} strokeDasharray="5 5" />
      <path d={path(past)} fill="none" stroke="url(#ag-forecast-line)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(ahead)} fill="none" stroke="#6E6A8E" strokeWidth={2.5} strokeDasharray="6 6" strokeLinecap="round" />
      {past.map(([x, y], index) => (
        <circle key={forecast.historyLabels[index]} cx={x} cy={y} r={5} fill="#6B4EFF" stroke="#fff" strokeWidth={2} />
      ))}
      {points.slice(forecast.history.length).map(([x, y], index) => (
        <circle key={`projected-${index}`} cx={x} cy={y} r={5.5} fill="#fff" stroke="#6E6A8E" strokeWidth={2.5} />
      ))}
    </svg>
  );
}

/** The chart's key, in HTML so it stays readable at phone size. */
export function ForecastKey({ onDark = false }: { onDark?: boolean }) {
  const text = onDark ? 'text-ag-mist-night' : 'text-ag-mist';
  return (
    <ul className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] ${text}`} aria-hidden="true">
      <li className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-ag-violet" />
        100L to 300L
      </li>
      <li className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-ag-mist bg-white" />
        Projected
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0.5 w-4 rounded bg-ag-gold" />
        First Class, 4.50
      </li>
    </ul>
  );
}

export function ForecastCard({ className = '', float = false }: { className?: string; float?: boolean }) {
  const forecast = exampleForecast();
  return (
    <UiCard className={className} float={float}>
      <UiCardHead title="Cumulative GPA projection" sub="If your pattern holds" />
      <ForecastChart className="mt-4" />
      <ForecastKey />
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ag-haze px-4 py-3">
          <dt className="text-[0.8125rem] text-ag-mist">Projected next semester</dt>
          <dd className="ag-display ag-num text-[1.75rem] font-bold leading-tight">{forecast.next}</dd>
        </div>
        <div className="rounded-2xl bg-ag-haze px-4 py-3">
          <dt className="text-[0.8125rem] text-ag-mist">The semester after</dt>
          <dd className="ag-display ag-num text-[1.75rem] font-bold leading-tight">{forecast.after}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[0.875rem] text-ag-mist">{forecast.trend}</p>
    </UiCard>
  );
}

/* ------------------------------------------------------------- degree goal */

/** The degree goal / what-if numbers: First Class from 4.43 with 3 semesters of 13 units left needs 4.67. */
export function DegreeGoalCard({ className = '', title = 'Degree goal', float = false, children }: { className?: string; title?: string; float?: boolean; children?: ReactNode }) {
  const goal = exampleDegreeGoal();
  const fields = [
    { label: 'Target', value: `${goal.targetLabel} (${goal.target})` },
    { label: 'Semesters left', value: String(goal.semestersLeft) },
    { label: 'Units per semester', value: String(goal.unitsPerSemester) },
    { label: 'Units left', value: String(goal.semestersLeft * goal.unitsPerSemester) },
  ];
  const progress = (Number(goal.current) / 5) * 100;
  return (
    <UiCard className={className} float={float}>
      <UiCardHead title={title} sub={`Current CGPA ${goal.current}`} />
      <dl className="mt-4 grid grid-cols-2 gap-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-xl px-3 py-2 ring-1 ring-ag-ink/10">
            <dt className="text-[0.8125rem] text-ag-mist">{field.label}</dt>
            <dd className="text-[0.9375rem] font-semibold">{field.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <dt className="text-[0.8125rem] text-ag-mist">Required GPA</dt>
          <dd className="ag-display ag-num text-[3rem] font-bold leading-none text-ag-ink">{goal.required}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-ag-mist">Target average score</dt>
          <dd className="ag-display ag-num text-[1.75rem] font-bold leading-tight">about {goal.averageScore}%</dd>
        </div>
      </dl>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-ag-haze" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-ag-violet to-ag-gold" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-[0.8125rem] text-ag-mist">Rounded up, so you never aim too low.</p>
      {children}
    </UiCard>
  );
}

/* ------------------------------------------------------------- paste panel */

/** The Add results panel on its Paste text tab, with the example pasted and the parse result. */
export function PastePanelCard({ className = '', float = false }: { className?: string; float?: boolean }) {
  const result = pasteResult();
  return (
    <UiCard className={className} float={float}>
      <UiCardHead title="Add results" sub="2025/2026 First Semester" />
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-ag-haze p-1 text-center text-[0.8125rem] font-semibold">
        <span className="rounded-lg px-3 py-2 text-ag-mist">Scan or upload</span>
        <span className="rounded-lg bg-white px-3 py-2 text-ag-ink shadow-sm">Paste text</span>
      </div>
      <pre className="ag-num mt-3 overflow-hidden whitespace-pre rounded-xl bg-ag-haze/60 px-3 py-3 font-[family-name:var(--font-ag-text)] text-[0.8125rem] leading-relaxed text-ag-ink ring-1 ring-ag-ink/10 [mask-image:linear-gradient(to_right,black_85%,transparent)]">
        {PASTE_SAMPLE}
      </pre>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] font-semibold">{result.found}</p>
        <FakeButton>{result.action}</FakeButton>
      </div>
    </UiCard>
  );
}

/* ---------------------------------------------------------- build preview */

/** The Build with AcadeMind preview: the warning, the sessions per subject, Save. Rule-based; never called AI. */
export function BuildPreviewCard({ className = '', float = false }: { className?: string; float?: boolean }) {
  const working = planWorking();
  const rows = working.groups[0].rows;
  const max = Math.max(...rows.map((row) => Number(row.value)));
  return (
    <UiCard className={className} float={float}>
      <UiCardHead title="Exam reading plan" sub="Built with AcadeMind, before you save" />
      <p className="mt-4 rounded-xl bg-ag-gold/20 px-3 py-2.5 text-[0.8125rem] leading-snug text-ag-ink">
        <strong className="font-semibold">Check:</strong> {working.warnings[0]}
      </p>
      <p className="mt-4 text-[0.8125rem] font-semibold text-ag-mist">Sessions per subject</p>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[0.875rem]">
            <span className="truncate font-semibold">{row.label.split(' · ')[0]}</span>
            <span className="ag-num font-semibold">{row.value}</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ag-haze" aria-hidden="true">
              <span className="block h-full rounded-full bg-ag-violet" style={{ width: `${(Number(row.value) / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <FakeButton>Save plan</FakeButton>
        <FakeButton quiet>Change answers</FakeButton>
      </div>
    </UiCard>
  );
}

/* ------------------------------------------------------------ scanned rows */

/** "5 courses found. Check each one." The rows a scan returns (code, title, units, total, grade). */
export function ScanRowsCard({ className = '', float = false, compact = false }: { className?: string; float?: boolean; compact?: boolean }) {
  const rows = plateRows('checked');
  const figures = plateFigures(rows);
  return (
    <UiCard className={className} float={float}>
      <p className="text-[0.875rem] font-semibold">{rows.length} courses found. Check each one.</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <li key={row.code} className="flex items-center gap-3 text-[0.8125rem]">
            <span className="w-[4.25rem] shrink-0 font-semibold">{row.code}</span>
            <span className="min-w-0 flex-1 truncate text-ag-mist">{row.title}</span>
            {compact ? null : <span className="ag-num w-6 text-right text-ag-mist">{row.units}u</span>}
            <span className="ag-num w-6 text-right">{figures.rows[index].total}</span>
            <GradePill grade={figures.rows[index].grade} className="h-6 w-6 text-[0.8125rem]" />
          </li>
        ))}
      </ul>
      {compact ? null : (
        <p className="mt-3 border-t border-ag-ink/10 pt-3 text-[0.8125rem] font-semibold">
          {figures.units} units, GPA {figures.gpa}, PI {figures.pi}
        </p>
      )}
    </UiCard>
  );
}

/* --------------------------------------------------------------- CGPA card */

/** The example CGPA on the arc, as the dashboard shows it (dark glass, for night grounds). */
export function CgpaGlassCard({ className = '' }: { className?: string }) {
  const slip = computeExampleSlip();
  return (
    <div className={`rounded-[24px] bg-white/[0.07] p-5 text-white ring-1 ring-white/12 backdrop-blur-md ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative w-[7.5rem] shrink-0 sm:w-[9rem]">
          <ArcGauge value={slip.cgpa} className="block h-auto w-full" />
          <span className="ag-display ag-num absolute inset-0 grid place-items-center pb-1 text-[1.75rem] font-bold sm:text-[2.125rem]">{formatCgpa(slip.cgpa)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[0.8125rem] text-ag-mist-night">CGPA after {slip.totalUnits} units</p>
          <p className="mt-1 inline-block rounded-full bg-white/10 px-3 py-1 text-[0.875rem] font-semibold">{slip.classBand.label}</p>
          <p className="mt-2 text-[0.8125rem] text-ag-mist-night">{formatCgpa(slip.toFirstClass)} to First Class</p>
        </div>
      </div>
    </div>
  );
}

/** The AcadeMind mark on a soft tile, for violet and night grounds. */
export function MindTile({ size = 44 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-xl bg-white/15" style={{ width: size, height: size }}>
      <AcadeMindMark size={Math.round(size * 0.68)} />
    </span>
  );
}
