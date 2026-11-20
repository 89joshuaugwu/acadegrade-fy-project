import { AcadeGradeMark } from '@/components/public/Logo';
import { ArcGauge } from '@/components/site/ArcGauge';
import { formatCgpa, resolveDegreeClass, roundCgpa } from '@/lib/cgpa/academicRules';
import {
  MADE_WITH_LINE,
  NOT_OFFICIAL_LINE,
  POINTS_CAPTION,
  SELF_REPORTED_NOTICE,
  SUMMARY_ONLY_LEAD,
  SUMMARY_ONLY_REST,
  UNOFFICIAL_RECORD_HEADING,
  coursePoints,
  expiryLine,
  isFailGrade,
  plural,
  resolveUniversityName,
  semesterUnits,
  totalPoints,
} from './record-labels';
import { resolveSharedStanding } from './shared-standing';
import type { SharedCourse, SharedSemester, SharedTranscript } from './types';
import './record.css';

/**
 * The shared record as a clean document card (brand v2): a night header band
 * with the logo, the heading and the student's own university; the
 * self-reported notice; the student block; the cumulative summary with the
 * arc gauge and the big numbers; one table per semester (or the summary
 * table); and a foot. record.css turns it into ink on paper for printing.
 */

function Dash() {
  return (
    <span className="text-ag-mist/70">–</span>
  );
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : <Dash />;
}

function score(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : <Dash />;
}

function plainScore(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '–';
}

const TH = 'pb-2.5 pt-1 text-[0.8125rem] font-medium text-ag-mist';
const NUM = 'ag-num text-right';
/** Columns that fold into the line under the title on phones. */
const WIDE = 'ag-col-wide hidden sm:table-cell';

function StudentBlock({ transcript }: { transcript: SharedTranscript }) {
  const level = typeof transcript.currentLevel === 'string' && transcript.currentLevel.trim() ? `${transcript.currentLevel.trim()}L` : null;
  const showPhoto = Boolean(transcript.showPhoto && transcript.avatarUrl);
  const items: { label: string; value: React.ReactNode; wide?: boolean }[] = [
    { label: 'Name', value: text(transcript.studentName), wide: true },
    { label: 'Matric number', value: text(transcript.matric) },
    { label: 'Level', value: level ?? <Dash /> },
    { label: 'Department', value: text(transcript.department) },
    { label: 'Programme', value: text(transcript.programme) },
  ];
  return (
    <section className="flex items-start gap-6" aria-label="Student">
      <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className={`min-w-0 ${item.wide ? 'col-span-2 sm:col-span-1' : ''}`}>
            <dt className="text-[0.8125rem] text-ag-mist">{item.label}</dt>
            <dd className="mt-1 break-words text-[1rem] font-semibold text-ag-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
      {showPhoto ? (
        // The student's own passport photograph is the document's content: shown in its own colours.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={transcript.avatarUrl ?? undefined}
          alt={`Photograph of ${transcript.studentName}`}
          className="h-32 w-24 shrink-0 rounded-xl object-cover ring-1 ring-ag-ink/10"
          crossOrigin="anonymous"
        />
      ) : null}
    </section>
  );
}

function GradePill({ grade, fail }: { grade?: string; fail: boolean }) {
  if (!grade) return <Dash />;
  return (
    <span
      className={`inline-grid h-7 min-w-7 place-items-center rounded-full px-2 text-[0.8125rem] font-semibold ${
        fail ? 'bg-[#C2361F]/10 text-[#C2361F]' : grade.trim().toUpperCase() === 'A' ? 'bg-ag-gold/25 text-ag-ink' : 'bg-ag-haze text-ag-ink'
      }`}
    >
      {grade}
    </span>
  );
}

function CourseRow({ course }: { course: SharedCourse }) {
  const failing = isFailGrade(course.grade);
  const fail = failing ? 'true' : undefined;
  return (
    <tr className="align-middle">
      <td data-col="course" className="py-3 pr-3">
        <span className="block text-[0.9375rem] font-semibold text-ag-ink">{course.code}</span>
        <span className="block break-words text-[0.8125rem] leading-snug text-ag-mist">{text(course.title)}</span>
        <span className="ag-sub mt-0.5 block text-[0.8125rem] text-ag-mist sm:hidden" aria-hidden="true">
          {`CA ${plainScore(course.caScore)}, exam ${plainScore(course.examScore)}, total ${plainScore(course.totalScore)}`}
        </span>
      </td>
      <td data-col="units" className={`${NUM} py-3 pr-3 text-[0.9375rem]`}>{course.units}</td>
      <td data-col="ca" className={`${NUM} ${WIDE} py-3 pr-3 text-[0.9375rem]`}>{score(course.caScore)}</td>
      <td data-col="exam" className={`${NUM} ${WIDE} py-3 pr-3 text-[0.9375rem]`}>{score(course.examScore)}</td>
      <td data-col="total" className={`${NUM} ${WIDE} py-3 pr-3 text-[0.9375rem] font-medium`}>{score(course.totalScore)}</td>
      <td data-col="grade" className="py-3 pr-3 text-right" data-fail={fail}>
        <GradePill grade={course.grade} fail={failing} />
      </td>
      <td data-col="point" className={`${NUM} ${WIDE} py-3 pr-3 text-[0.9375rem] ${failing ? 'font-semibold text-[#C2361F]' : ''}`} data-fail={fail}>
        {score(course.gradePoint)}
      </td>
      <td data-col="points" className={`${NUM} py-3 text-[0.9375rem] font-semibold`}>{coursePoints(course)}</td>
    </tr>
  );
}

function SemesterTable({ semester }: { semester: SharedSemester }) {
  const courses = semester.courses ?? [];
  const units = semesterUnits(semester);
  const points = totalPoints(courses);
  const headingId = `semester-${String(semester.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <section className="ag-record-section">
      <h2 id={headingId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="ag-display text-[1.375rem] font-bold text-ag-ink">{semester.label}</span>{' '}
        <span className="ag-num text-[0.9375rem] font-medium text-ag-mist">{semester.session}</span>
      </h2>
      <table className="mt-3 w-full border-collapse text-left" aria-labelledby={headingId}>
        <thead className="border-b border-ag-ink/10">
          <tr>
            <th scope="col" className={TH}>
              Course
            </th>
            <th scope="col" className={`${TH} ${NUM} w-12 pr-3 sm:w-[4.25rem]`}>Units</th>
            <th scope="col" className={`${TH} ${NUM} ${WIDE} w-[4.25rem] pr-3`}>CA</th>
            <th scope="col" className={`${TH} ${NUM} ${WIDE} w-[4.25rem] pr-3`}>Exam</th>
            <th scope="col" className={`${TH} ${NUM} ${WIDE} w-[4.25rem] pr-3`}>Total</th>
            <th scope="col" className={`${TH} ${NUM} w-14 pr-3 sm:w-[4.5rem]`}>Grade</th>
            <th scope="col" className={`${TH} ${NUM} ${WIDE} w-[4.25rem] pr-3`}>Point</th>
            <th scope="col" className={`${TH} ${NUM} w-14 sm:w-[4.25rem]`}>Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ag-ink/[0.07]">
          {courses.map((course, index) => (
            <CourseRow key={course.id ?? `${course.code}-${index}`} course={course} />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} className="pt-3">
              <span className="ag-record-total flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-ag-haze px-4 py-3 text-[0.875rem] text-ag-ink">
                <span className="font-semibold">Semester total</span>
                <span className="ag-num">{plural(units, 'unit')}</span>
                <span className="ag-num">{plural(points, 'point')}</span>
                <span className="ag-num font-semibold">{`GPA ${formatCgpa(semester.gpa)}`}</span>
                <span className="ag-num">{`PI ${typeof semester.pi === 'number' ? formatCgpa(semester.pi) : '–'}`}</span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function SummaryTable({ semesters }: { semesters: readonly SharedSemester[] }) {
  return (
    <section className="ag-record-section">
      <p className="rounded-xl bg-ag-haze px-4 py-3 text-[0.9375rem] text-ag-ink">
        <span className="font-semibold">{SUMMARY_ONLY_LEAD}</span> {SUMMARY_ONLY_REST}
      </p>
      <table className="mt-4 w-full border-collapse text-left">
        <caption className="sr-only">Semester totals</caption>
        <thead className="border-b border-ag-ink/10">
          <tr>
            <th scope="col" className={TH}>Semester</th>
            <th scope="col" className={TH}>Session</th>
            <th scope="col" className={`${TH} ${NUM} pr-3`}>Units</th>
            <th scope="col" className={`${TH} ${NUM} pr-3`}>GPA</th>
            <th scope="col" className={`${TH} ${NUM}`}>PI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ag-ink/[0.07]">
          {semesters.map((semester) => (
            <tr key={semester.id}>
              <td className="py-3 pr-3 text-[0.9375rem] font-semibold text-ag-ink">{semester.label}</td>
              <td className="ag-num py-3 pr-3 text-[0.9375rem] text-ag-mist">{semester.session}</td>
              <td className={`${NUM} py-3 pr-3 text-[0.9375rem]`}>{semesterUnits(semester)}</td>
              <td className={`${NUM} py-3 pr-3 text-[0.9375rem] font-semibold`}>{formatCgpa(semester.gpa)}</td>
              <td className={`${NUM} py-3 text-[0.9375rem]`}>{typeof semester.pi === 'number' ? formatCgpa(semester.pi) : <Dash />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Cumulative({ transcript }: { transcript: SharedTranscript }) {
  // The server snapshot's CGPA (shared academic rules) is authoritative; old snapshots are recomputed.
  const standing = resolveSharedStanding(transcript);
  const cgpa = formatCgpa(standing.cgpa);
  const degreeClass = resolveDegreeClass(standing.cgpa).transcriptLabel;
  return (
    <section
      className="ag-record-summary grid grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-[24px] bg-ag-haze p-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 sm:p-7"
      aria-label="Cumulative summary"
    >
      <div className="relative mx-auto w-full max-w-[11rem]">
        <ArcGauge value={roundCgpa(standing.cgpa)} tone="light" className="ag-gauge-intro block h-auto w-full" label={`CGPA ${cgpa} of 5.00, ${degreeClass}`} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2" aria-hidden="true">
          <span className="text-[0.8125rem] font-medium text-ag-mist">CGPA</span>
          <span className="ag-display ag-num text-[2.5rem] font-bold leading-none text-ag-ink">{cgpa}</span>
          <span className="mt-1 text-[0.8125rem] text-ag-mist">of 5.00</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2">
          <dt className="text-[0.8125rem] text-ag-mist">Projected class</dt>
          <dd className="ag-display mt-1 text-[1.375rem] font-bold leading-tight text-ag-ink sm:text-[1.5rem]">{degreeClass}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-ag-mist">PI</dt>
          <dd className="mt-1 flex items-baseline gap-1.5">
            <span className="ag-display ag-num text-[1.75rem] font-bold leading-none text-ag-ink">{formatCgpa(standing.pi)}</span>
            <span className="text-[0.8125rem] text-ag-mist">of 5.00</span>
          </dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-ag-mist">Total units</dt>
          <dd className="ag-display ag-num mt-1 text-[1.75rem] font-bold leading-none text-ag-ink">{String(standing.totalCredits)}</dd>
        </div>
      </dl>
    </section>
  );
}

interface RecordCardProps {
  transcript: SharedTranscript;
  /** "30 November 2026", or null when the link has no end date. */
  expiry: string | null;
}

export function RecordCard({ transcript, expiry }: RecordCardProps) {
  const isSummary = transcript.shareLevel === 'summary';
  return (
    <article className="ag-record overflow-hidden rounded-[28px] bg-white ring-1 ring-ag-ink/[0.06]" aria-labelledby="record-title">
      <header className="ag-record-head relative overflow-hidden bg-ag-night px-6 pb-9 pt-7 text-white sm:px-10 sm:pb-11 sm:pt-9">
        <div
          aria-hidden="true"
          className="ag-record-glow absolute inset-0 bg-[radial-gradient(55%_90%_at_95%_100%,rgba(255,178,63,0.22),transparent_70%),radial-gradient(45%_80%_at_0%_0%,rgba(107,78,255,0.42),transparent_70%)]"
        />
        <div className="relative flex items-center gap-2.5">
          <AcadeGradeMark size={28} />
          <span className="ag-display text-[1.125rem] font-bold tracking-[-0.02em]">AcadeGrade</span>
        </div>
        <h1 id="record-title" className="ag-display relative mt-8 text-[2.125rem] font-bold leading-[1.05] sm:text-[2.875rem]">
          {UNOFFICIAL_RECORD_HEADING}
        </h1>
        <p className="relative mt-3 text-[0.9375rem] leading-relaxed text-ag-mist-night">
          University (as entered by the student): <strong className="font-semibold text-white">{resolveUniversityName(transcript)}</strong>
        </p>
      </header>

      <div className="ag-record-body flex flex-col gap-10 px-6 py-8 sm:px-10 sm:py-10">
        <p role="note" className="ag-record-note flex items-start gap-3 rounded-2xl bg-ag-gold/20 px-4 py-3.5 text-[0.9375rem] font-medium leading-snug text-ag-ink">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mt-px shrink-0 text-[#9A5B00]">
            <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M9 8v4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="9" cy="5.3" r="1" fill="currentColor" />
          </svg>
          <span>{SELF_REPORTED_NOTICE}</span>
        </p>

        <StudentBlock transcript={transcript} />

        <Cumulative transcript={transcript} />

        {isSummary ? (
          <SummaryTable semesters={transcript.semesters} />
        ) : (
          <div className="flex flex-col gap-10">
            {transcript.semesters.map((semester) => (
              <SemesterTable key={semester.id} semester={semester} />
            ))}
            <p className="-mt-4 text-[0.8125rem] text-ag-mist">{POINTS_CAPTION}</p>
          </div>
        )}
      </div>

      <footer className="ag-record-foot flex flex-col gap-1.5 border-t border-ag-ink/[0.08] px-6 py-6 text-[0.8125rem] leading-relaxed text-ag-mist sm:px-10">
        <span className="flex items-center gap-2 font-semibold text-ag-ink">
          <AcadeGradeMark size={18} />
          AcadeGrade
        </span>
        <span>{SELF_REPORTED_NOTICE}</span>
        <span>
          {MADE_WITH_LINE}. {NOT_OFFICIAL_LINE}.{expiry ? ` ${expiryLine(expiry)}.` : ''}
        </span>
      </footer>
    </article>
  );
}

/** The card's shape while the record loads: no shimmer, no shift when it lands. */
export function RecordSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-ag-ink/[0.06]" aria-hidden="true">
      <div className="bg-ag-night px-6 pb-9 pt-7 sm:px-10 sm:pb-11 sm:pt-9">
        <div className="flex items-center gap-2.5">
          <AcadeGradeMark size={28} />
          <span className="h-4 w-28 rounded-full bg-white/15" />
        </div>
        <span className="mt-8 block h-10 w-3/4 max-w-[28rem] rounded-xl bg-white/10" />
        <span className="mt-4 block h-4 w-1/2 max-w-[20rem] rounded-full bg-white/10" />
      </div>
      <div className="flex flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10">
        <span className="block h-12 rounded-2xl bg-ag-haze" />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className="block h-11 rounded-xl bg-ag-haze" />
          ))}
        </div>
        <span className="block h-44 rounded-[24px] bg-ag-haze" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="block h-10 rounded-lg bg-ag-haze/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
