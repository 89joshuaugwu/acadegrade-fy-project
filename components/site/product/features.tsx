import Link from 'next/link';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { EXAMPLE_PRIOR_TOTALS, computeExampleSlip, exampleCourseMetrics } from '@/lib/public/example-student';
import { siteHost } from '@/lib/public/features-android';
import {
  CONTENTS_GROUPS, FEATURE_SHEETS, PRIVACY_ROWS, SMALL_POINTS, TRANSCRIPT_TICKET, workedRecord, type FeatureSheet,
} from '@/lib/public/features-overview';
import { notificationExample } from '@/lib/public/features-timetable';
import { ArcGauge } from '@/components/site/ArcGauge';
import { CheckList, Container, Heading, Panel, Section, TextLinkV2 } from '@/components/site/ui';
import { AuthAction } from './AuthAction';
import { BuildPreviewCard, CgpaGlassCard, DegreeGoalCard, ForecastCard, MindTile, PastePanelCard, ScanRowsCard } from './cards';
import { FactChips, FakeButton, NotificationCard, UiCard, UiCardHead } from './shared';

/** Sections of /features in brand v2 (content: docs/public-redesign/pages/features.md). */

/* ------------------------------------------------------------------ hero */

/** Three floating product cards: the CGPA on its arc, the rows a scan returns and a lecture reminder. */
export function FeaturesHeroCards() {
  const note = notificationExample();
  return (
    <figure className="relative mx-auto w-full max-w-[560px]">
      <figcaption className="sr-only">Example screens: a CGPA of 4.43 on the arc, five course rows from a scanned slip, and a lecture reminder.</figcaption>
      <div aria-hidden="true" className="relative flex flex-col sm:block sm:h-[480px]">
        <CgpaGlassCard className="w-[92%] sm:absolute sm:left-0 sm:top-0 sm:w-[70%]" />
        <ScanRowsCard float compact className="relative -mt-3 ml-auto w-[94%] sm:absolute sm:right-0 sm:top-[132px] sm:mt-0 sm:w-[62%]" />
        <NotificationCard title={note.title} body={note.body} className="relative -mt-4 w-[92%] sm:absolute sm:bottom-0 sm:left-[3%] sm:mt-0 sm:w-[62%]" />
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ contents */

export function ContentsIndex() {
  return (
    <Section tone="white" tight>
      <Container>
        <nav aria-labelledby="contents-title">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
            <Heading id="contents-title" size="md" title="What's in AcadeGrade" />
            <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist lg:justify-self-end">
              Where each part works and who can use it. All of it is free.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
            {CONTENTS_GROUPS.map((group) => (
              <div key={group.name} className="rounded-[24px] bg-ag-haze p-3 sm:p-4">
                <h3 className="px-3 pb-2 pt-2 text-[0.9375rem] font-semibold text-ag-mist">{group.name}</h3>
                <ul className="space-y-1">
                  {group.rows.map((row) => (
                    <li key={row.name}>
                      <a
                        href={row.href}
                        aria-label={`${row.name}, ${row.value}`}
                        className="ag-focus group block rounded-2xl px-3 py-3 transition hover:bg-white"
                      >
                        <span className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                          <span className="font-semibold text-ag-ink group-hover:text-ag-violet">{row.name}</span>
                          <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[0.8125rem] font-semibold text-ag-violet group-hover:bg-ag-haze">{row.value}</span>
                        </span>
                        <span className="mt-1 block text-[0.875rem] leading-snug text-ag-mist">{row.description}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------- the feature grid */

function ReceiptRow({ label, detail, value, strong = false }: { label: string; detail?: string; value: string; strong?: boolean }) {
  return (
    <tr className="align-top">
      <th scope="row" className={`border-b border-ag-ink/8 py-2.5 pr-4 text-left text-[0.9375rem] ${strong ? 'font-semibold text-ag-ink' : 'font-normal text-ag-ink'}`}>
        {label}
        {detail ? <span className="block text-[0.8125rem] font-normal text-ag-mist">{detail}</span> : null}
      </th>
      <td className={`ag-num whitespace-nowrap border-b border-ag-ink/8 py-2.5 text-right text-[0.9375rem] ${strong ? 'font-semibold text-ag-violet' : 'text-ag-ink'}`}>{value}</td>
    </tr>
  );
}

function GroupRow({ children }: { children: string }) {
  return (
    <tr>
      <th scope="colgroup" colSpan={2} className="pb-1 pt-5 text-left text-[0.8125rem] font-semibold text-ag-mist">
        {children}
      </th>
    </tr>
  );
}

/** How the example CGPA adds up: 331 + 54 = 385 points over 87 units, 4.43. */
export function ReceiptTable() {
  const record = workedRecord();
  const slip = computeExampleSlip();
  const scores = exampleCourseMetrics().map((metrics) => metrics.totalScore ?? 0);
  return (
    <table className="w-full border-separate border-spacing-0">
      <caption className="sr-only">How the example CGPA adds up</caption>
      <tbody>
        <GroupRow>Before this semester</GroupRow>
        <ReceiptRow label="100L and 200L, four semesters" detail={`${EXAMPLE_PRIOR_TOTALS.units} units`} value={`${EXAMPLE_PRIOR_TOTALS.points} points`} />
      </tbody>
      <tbody>
        <GroupRow>2025/2026 First Semester</GroupRow>
        {slip.rows.map((row) => (
          <ReceiptRow key={row.code} label={`${row.code} ${row.title}`} detail={`${row.units} units × ${row.grade} (${row.point})`} value={String(row.weighted)} />
        ))}
        <ReceiptRow strong label={`Semester: ${record.semesterPoints} points ÷ ${record.semesterUnits} units`} value={`GPA ${record.gpa}`} />
        <ReceiptRow strong label="Performance Index" detail={`From scores ${scores.join(', ')}`} value={`PI ${record.pi}`} />
      </tbody>
      <tbody>
        <GroupRow>Your record</GroupRow>
        <ReceiptRow label="All units" value={String(record.totalUnits)} />
        <ReceiptRow label="All points" value={String(record.totalPoints)} />
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2} className="pt-4">
            <span className="flex items-center justify-between gap-4 rounded-2xl bg-ag-night px-5 py-4 text-white">
              <span className="text-[1rem] font-semibold">{record.total.label}</span>
              <span className="ag-display ag-num text-[2rem] font-bold leading-none text-ag-gold">{record.total.value}</span>
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function SheetCopy({ sheet, onDark = false }: { sheet: FeatureSheet; onDark?: boolean }) {
  return (
    <>
      <p className={`mt-3 max-w-md text-[1rem] leading-relaxed ${onDark ? 'text-white/80' : 'text-ag-mist'}`}>{sheet.paragraph}</p>
      <FactChips items={sheet.facts} onDark={onDark} className="mt-5" />
      <TextLinkV2 href={sheet.link.href} onDark={onDark} className="mt-6 inline-block text-[0.9375rem]">
        {sheet.link.label}
      </TextLinkV2>
    </>
  );
}

export function FeatureGrid() {
  const sheets = Object.fromEntries(FEATURE_SHEETS.map((sheet) => [sheet.id, sheet])) as Record<FeatureSheet['id'], FeatureSheet>;
  const record = workedRecord();
  const slip = computeExampleSlip();
  return (
    <Section tone="haze" labelledBy="grid-title">
      <Container>
        <Heading
          id="grid-title"
          title="Your record, and the tools around it."
          lead="Every figure traced back to the courses behind it, then the tools for your next decision."
        />

        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
          {/* The record: every figure, worked out */}
          <Panel className="bg-white lg:col-span-12" as="article">
            <div id="record" className="scroll-mt-24 grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div className="flex flex-col">
                <h3 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Every figure, worked out</h3>
                <p className="mt-3 max-w-md text-[1rem] leading-relaxed text-ag-mist">
                  Your GPA and PI each semester, your CGPA and degree class, carry-overs and weighted average, all traced back to the
                  courses behind them.
                </p>
                <div className="mt-8">
                  <div className="relative w-full max-w-[19rem]">
                    <ArcGauge value={slip.cgpa} tone="light" className="block h-auto w-full" label={`CGPA ${record.cgpa} of 5.00, ${slip.classBand.label}`} />
                    <p className="ag-display ag-num absolute inset-0 grid place-items-center pb-2 text-[4.5rem] font-bold leading-none text-ag-ink sm:text-[5rem]" aria-describedby="record-caption">
                      {record.cgpa}
                    </p>
                  </div>
                  <p id="record-caption" className="mt-2 max-w-sm text-[1rem] leading-relaxed text-ag-ink">
                    CGPA after {record.totalUnits} units. <span className="font-semibold">{slip.classBand.label}</span>, {formatCgpa(slip.toFirstClass)} to First
                    Class.
                  </p>
                  <TextLinkV2 href="/calculator" className="mt-5 inline-block text-[0.9375rem]">
                    Check it yourself in the free calculator
                  </TextLinkV2>
                </div>
              </div>
              <div className="min-w-0 rounded-[24px] bg-ag-haze/60 p-5 ring-1 ring-ag-ink/5 sm:p-7">
                <p className="text-[0.875rem] font-semibold text-ag-ink">Example: 300L Computer Science</p>
                <ReceiptTable />
              </div>
            </div>
          </Panel>

          {/* Scanner */}
          <Panel className="bg-white lg:col-span-7" as="article">
            <div id="scanner" className="scroll-mt-24 flex h-full flex-col p-7 sm:p-9">
              <h3 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink">{sheets.scanner.name}</h3>
              <SheetCopy sheet={sheets.scanner} />
              <div className="mt-8 rounded-[24px] bg-ag-haze p-4 sm:p-6 lg:mt-auto" aria-hidden="true">
                <PastePanelCard float />
              </div>
            </div>
          </Panel>

          {/* AcadeMind */}
          <Panel className="bg-ag-violet text-white lg:col-span-5" as="article">
            <div id="academind" className="scroll-mt-24 flex h-full flex-col p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <MindTile />
                <h3 className="ag-display text-[1.75rem] font-bold leading-tight">{sheets.academind.name}</h3>
              </div>
              <SheetCopy sheet={sheets.academind} onDark />
              <div className="mt-8 lg:mt-auto">
                <ForecastCard float />
              </div>
            </div>
          </Panel>

          {/* Timetable (rule-based builder, never called AI) */}
          <Panel className="bg-ag-night text-white lg:col-span-5" as="article">
            <div id="timetable" className="scroll-mt-24 flex h-full flex-col p-7 sm:p-9">
              <h3 className="ag-display text-[1.75rem] font-bold leading-tight">{sheets.timetable.name}</h3>
              <SheetCopy sheet={sheets.timetable} onDark />
              <div className="mt-8 lg:mt-auto" aria-hidden="true">
                <BuildPreviewCard float />
              </div>
            </div>
          </Panel>

          {/* Planning */}
          <Panel className="bg-white lg:col-span-7" as="article">
            <div id="planning" className="scroll-mt-24 flex h-full flex-col p-7 sm:p-9">
              <h3 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink">{sheets.planning.name}</h3>
              <SheetCopy sheet={sheets.planning} />
              <div className="mt-8 rounded-[24px] bg-ag-haze p-4 sm:p-6 lg:mt-auto">
                <DegreeGoalCard float />
              </div>
            </div>
          </Panel>
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------ transcript */

const REGISTER = { href: '/register', label: 'Create your free record' };
const DASHBOARD = { href: '/dashboard', label: 'Open dashboard' };

function Segmented({ label, options, active }: { label: string; options: readonly string[]; active: string }) {
  return (
    <div>
      <p className="text-[0.8125rem] font-semibold text-ag-mist">{label}</p>
      <div className="mt-2 grid gap-1 rounded-xl bg-ag-haze p-1 text-center text-[0.875rem] font-semibold" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <span key={option} className={`rounded-lg px-2 py-2 ${option === active ? 'bg-ag-night text-white' : 'text-ag-mist'}`}>
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The share-link settings as the transcript page shows them: expiry 1, 7 or 30 days, summary only, PIN on. */
function ShareSettingsCard() {
  return (
    <UiCard float className="p-6 sm:p-7">
      <UiCardHead title="Share your record" sub="A link with a QR code, on your terms" />
      <div className="mt-6 space-y-5">
        <Segmented label="Link lasts" options={['1 day', '7 days', '30 days']} active="30 days" />
        <Segmented label="What they see" options={['Full record', 'Summary only']} active="Summary only" />
        <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-ag-ink/10">
          <span>
            <span className="block text-[0.9375rem] font-semibold">PIN to open</span>
            <span className="ag-num block text-[0.8125rem] tracking-[0.3em] text-ag-mist">● ● ● ●</span>
          </span>
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-ag-violet">
            <span className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white" />
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-ag-haze px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ag-mist">{siteHost()}/share/…</span>
          <span className="text-[0.8125rem] font-semibold text-ag-violet">Copy</span>
        </div>
      </div>
      <FakeButton className="mt-6 w-full py-3">Create share link</FakeButton>
    </UiCard>
  );
}

export function TranscriptSection() {
  const ticket = TRANSCRIPT_TICKET;
  return (
    <Section tone="night" id="transcript" labelledBy="transcript-title" className="scroll-mt-16">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
        <div>
          <Heading id="transcript-title" onDark title={ticket.heading} lead={ticket.under} />
          <CheckList onDark items={ticket.lines} className="mt-8" />
          <div className="mt-10">
            <AuthAction href={ticket.action.href} label={ticket.action.label} signedIn={{ href: ticket.action.signedInHref, label: ticket.action.label }} />
          </div>
        </div>
        <div className="min-w-0">
          <div aria-hidden="true">
            <ShareSettingsCard />
          </div>
          <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 text-[0.9375rem] text-ag-mist-night sm:grid-cols-2">
            {ticket.stubLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

/* ---------------------------------------------------------- small things */

export function SmallThings() {
  return (
    <Section tone="haze" labelledBy="small-title">
      <Container>
        <Heading id="small-title" title="Small things that help" lead="The details that make a semester easier to keep, on the website and in the Android app." />
        <ul className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {SMALL_POINTS.map((point) => (
            <li key={point.title} id={point.id} className="scroll-mt-24 border-t border-ag-ink/10 pt-5">
              <h3 className="flex items-center gap-3 text-[1.0625rem] font-semibold text-ag-ink">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ag-violet" aria-hidden="true" />
                {point.title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist">{point.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* --------------------------------------------------------------- privacy */

export function PrivacySection() {
  return (
    <Section tone="white" id="privacy" labelledBy="privacy-title" className="scroll-mt-16">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <Heading id="privacy-title" title="Your record stays yours" lead="Your own record. Your university's transcript stays the official one." />
          <CheckList
            className="mt-8"
            items={[
              'Private by default: only you see your record',
              'AcadeMind and scanning stay off until you allow them',
              'Classmates get course codes, never your scores',
              'We never sell your personal information',
            ]}
          />
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem]">
            <TextLinkV2 href="/privacy">Read the privacy notice</TextLinkV2>
            <TextLinkV2 href="/account-deletion">Delete your account</TextLinkV2>
          </p>
        </div>
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {PRIVACY_ROWS.map((row, index) => (
            <div key={row.figure} className={`rounded-[24px] p-6 sm:p-7 ${index === 0 ? 'bg-ag-night text-white' : 'bg-ag-haze text-ag-ink'}`}>
              <dt className={`ag-display ag-num text-[2.75rem] font-bold leading-none ${index === 0 ? 'text-ag-gold' : 'text-ag-ink'}`}>{row.figure}</dt>
              <dd className={`mt-4 text-[0.9375rem] leading-relaxed ${index === 0 ? 'text-white/80' : 'text-ag-mist'}`}>{row.text}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------ free tools */

const TOOLS = [
  { href: '/calculator', name: 'CGPA calculator', text: 'Your GPA and CGPA from grades or scores' },
  { href: '/tools/degree-class-checker', name: 'Degree class checker', text: 'Which class your CGPA falls in' },
  { href: '/tools/required-gpa', name: 'Required GPA', text: 'The GPA you need for the class you want' },
  { href: '/tools/carry-over-impact', name: 'Carry-over impact', text: 'What a carry-over does to your CGPA' },
  { href: '/tools/weighted-average', name: 'Weighted average', text: 'Your average mark, weighted by units' },
] as const;

export function ToolsStrip() {
  return (
    <Section tone="haze" tight labelledBy="tools-title">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <Heading id="tools-title" size="md" title="Free planning tools, no sign-up." />
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist lg:justify-self-end">
            Work out a target, a carry-over or your class in the browser. Nothing is saved unless you create a record.
          </p>
        </div>
        <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className="ag-focus group flex h-full flex-col rounded-[20px] bg-white p-5 ring-1 ring-ag-ink/5 transition hover:ring-ag-violet/40">
                <span className="font-semibold text-ag-ink group-hover:text-ag-violet">{tool.name}</span>
                <span className="mt-1.5 text-[0.875rem] leading-snug text-ag-mist">{tool.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export { REGISTER as FEATURES_REGISTER, DASHBOARD as FEATURES_DASHBOARD };
