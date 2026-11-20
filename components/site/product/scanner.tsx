import { EXAMPLE_STUDENT } from '@/lib/public/example-student';
import { dailyAllowance, coinsOn } from '@/lib/public/features-shared';
import { PLATE_COPY, SCAN_RECEIPT, STEP_LINES, UNDER_18_LINE, scannerSlip, waysIn } from '@/lib/public/features-scanner';
import { photoFor } from '@/lib/public/page-photos';
import type { PublicUsage } from '@/lib/public/usage-public';
import { AcadeGradeMark } from '@/components/public/Logo';
import { ScanLoop } from '@/components/public/home/ScanLoop';
import { Photo } from '@/components/site/Photo';
import { CheckList, Container, Heading, Section, TextLinkV2 } from '@/components/site/ui';
import { PastePanelCard, ScanRowsCard } from './cards';
import { CheckRows } from './CheckRows';
import { FakeButton, UiCard, UiCardHead } from './shared';

/** Sections of /features/result-scanner in brand v2 (content: docs/public-redesign/pages/features-result-scanner.md). */

/* ------------------------------------------------------------------ hero */

/** The owner's photo of a slip being scanned, with the rows the scan returns floating over it. */
export function ScannerHeroPicture() {
  const photo = photoFor('scanner.hero');
  return (
    <div className="relative mx-auto flex w-full max-w-[460px] flex-col sm:block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ag-night-2 ring-1 ring-white/10">
        {photo ? (
          <Photo photo={photo} sizes="(min-width: 1024px) 460px, (min-width: 640px) 460px, calc(100vw - 40px)" className="absolute inset-0" imgClassName="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ag-night/50 via-transparent to-transparent" />
      </div>
      <div aria-hidden="true" className="relative -mt-24 px-3 sm:absolute sm:-bottom-10 sm:-left-12 sm:mt-0 sm:w-[340px] sm:px-0 lg:-left-16">
        <ScanRowsCard float />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ how it goes */

function ScanPanelCard() {
  return (
    <UiCard float className="w-full">
      <UiCardHead title="Add results" sub="2025/2026 First Semester" />
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-ag-haze p-1 text-center text-[0.8125rem] font-semibold">
        <span className="rounded-lg bg-white px-3 py-2 text-ag-ink shadow-sm">Scan or upload</span>
        <span className="rounded-lg px-3 py-2 text-ag-mist">Paste text</span>
      </div>
      <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-ag-violet/25 px-5 py-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ag-haze">
          <AcadeGradeMark size={34} />
        </span>
        <p className="mt-4 text-[1rem] font-semibold">Photograph your result slip</p>
        <p className="mt-1 text-[0.875rem] text-ag-mist">JPG, PNG or PDF, up to 10 MB. Lay it flat in good light.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <FakeButton>Scan with camera</FakeButton>
          <FakeButton quiet>Choose image or PDF</FakeButton>
        </div>
      </div>
      <p className="mt-4 text-[0.8125rem] text-ag-mist">You check every row before anything is saved.</p>
    </UiCard>
  );
}

export function HowAScanGoes({ videoUrl }: { videoUrl: string | null }) {
  return (
    <Section tone="white" labelledBy="steps-title">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
        <div>
          <Heading id="steps-title" title="How a scan goes" lead="From a photo of your slip to rows you can check, while you wait." />
          <ol className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {STEP_LINES.map((step, index) => (
              <li key={step.line} className="rounded-[24px] bg-ag-haze p-6">
                <span className="ag-display grid h-10 w-10 place-items-center rounded-full bg-ag-gold text-[1.125rem] font-bold text-ag-night" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-[1.125rem] font-semibold leading-snug text-ag-ink">{step.line}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <figure className="mx-auto w-full max-w-[420px]">
          {videoUrl ? (
            <div className="mx-auto max-w-[300px] rounded-[40px] bg-[#05040F] p-3 shadow-[0_40px_90px_-30px_rgba(14,11,43,0.6)]">
              <div className="aspect-[9/16] overflow-hidden rounded-[30px] bg-ag-night [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
                <ScanLoop src={videoUrl} label="Scanning a slip in the Android app" />
              </div>
            </div>
          ) : (
            <div className="rounded-[32px] bg-ag-haze p-4 sm:p-6" aria-hidden="true">
              <ScanPanelCard />
            </div>
          )}
          <figcaption className="mt-4 text-center text-[0.875rem] text-ag-mist">
            {videoUrl ? 'Scanning a slip in the Android app' : 'The scan panel on the website'}
          </figcaption>
        </figure>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------- before and after */

/** A department's result slip, drawn as a clean table from the example data. */
function SlipCard() {
  const slip = scannerSlip();
  const foot = slip.foot.split(' · ').map((part) => {
    const [label, value] = part.split(' ');
    return { label, value };
  });
  const identity = [
    { label: 'Name', value: EXAMPLE_STUDENT.name },
    { label: 'Reg. no.', value: EXAMPLE_STUDENT.regNo },
    { label: 'Level', value: String(EXAMPLE_STUDENT.level) },
    { label: 'Session', value: `${EXAMPLE_STUDENT.session}, ${EXAMPLE_STUDENT.semester}` },
  ];
  return (
    <article aria-labelledby="slip-title" className="h-full rounded-[24px] bg-white p-5 text-ag-ink ring-1 ring-ag-ink/5 sm:p-7">
      <header className="border-b border-ag-ink/10 pb-4 text-center">
        <p id="slip-title" className="text-[1.0625rem] font-semibold">
          {slip.heading}
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-ag-mist">
          {EXAMPLE_STUDENT.faculty}, {EXAMPLE_STUDENT.department}
        </p>
      </header>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.8125rem] sm:grid-cols-4">
        {identity.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-ag-mist">{item.label}</dt>
            <dd className="truncate font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
      <table className="mt-5 w-full text-left text-[0.875rem]">
        <caption className="sr-only">Example result slip</caption>
        <thead>
          <tr className="border-b border-ag-ink/15 text-[0.8125rem] text-ag-mist">
            <th scope="col" className="hidden py-2 pr-2 font-medium sm:table-cell">S/N</th>
            <th scope="col" className="py-2 pr-2 font-medium">Code</th>
            <th scope="col" className="hidden py-2 pr-2 font-medium sm:table-cell">Course title</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Units</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">CA (30)</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Exam (70)</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Total</th>
            <th scope="col" className="py-2 text-right font-medium">Grade</th>
          </tr>
        </thead>
        <tbody className="ag-num">
          {slip.rows.map((row) => (
            <tr key={row.code} className="border-b border-ag-ink/8">
              <td className="hidden py-2.5 pr-2 text-ag-mist sm:table-cell">{row.sn}</td>
              <td className="whitespace-nowrap py-2.5 pr-2 font-semibold">{row.code}</td>
              <td className="hidden py-2.5 pr-2 sm:table-cell">{row.title}</td>
              <td className="py-2.5 pr-2 text-right">{row.units}</td>
              <td className="py-2.5 pr-2 text-right">{row.ca}</td>
              <td className="py-2.5 pr-2 text-right">{row.exam}</td>
              <td className="py-2.5 pr-2 text-right font-semibold">{row.total}</td>
              <td className="py-2.5 text-right font-semibold">{row.grade}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} className="pt-4">
              <span className="grid grid-cols-4 gap-2">
                {foot.map((item) => (
                  <span key={item.label} className="rounded-xl bg-ag-haze px-3 py-2 text-center">
                    <span className="block text-[0.8125rem] text-ag-mist">{item.label}</span>
                    <span className="ag-num block text-[1rem] font-semibold">{item.value}</span>
                  </span>
                ))}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-5 text-right text-[0.8125rem] text-ag-mist">Exams officer</p>
    </article>
  );
}

export function CheckSection() {
  return (
    <Section tone="haze" labelledBy="check-heading">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <Heading id="check-heading" title={PLATE_COPY.heading} />
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist lg:justify-self-end">{PLATE_COPY.description}</p>
        </div>
        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-3 text-[0.9375rem] font-semibold text-ag-ink">Your slip</p>
            <SlipCard />
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-[0.9375rem] font-semibold text-ag-ink">The rows AcadeGrade gives back</p>
            <CheckRows />
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------ three ways in */

const WAYS = [
  { key: 'scan', label: 'Scan a slip' },
  { key: 'paste', label: 'Paste from your portal' },
  { key: 'type', label: 'Type it in' },
] as const;

export function WaysIn({ usage }: { usage: PublicUsage | null }) {
  const rows = waysIn(usage);
  return (
    <Section tone="white" labelledBy="ways-heading">
      <Container>
        <Heading id="ways-heading" title="Three ways in" lead="Scanning is quickest. Pasting works for everyone, and nothing leaves your phone until you save." />
        <div className="mt-12">
          <table className="w-full border-separate border-spacing-0 text-left max-md:block">
            <caption className="sr-only">Three ways to get your results in</caption>
            <thead className="max-md:sr-only">
              <tr>
                <td className="w-[22%]" />
                {WAYS.map((way, index) => (
                  <th
                    key={way.key}
                    scope="col"
                    className={`px-5 pb-4 pt-5 text-[1.0625rem] font-semibold ${index === 0 ? 'rounded-t-[20px] bg-ag-night text-white' : 'text-ag-ink'}`}
                  >
                    {way.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="max-md:block max-md:space-y-3">
              {rows.map((row, rowIndex) => {
                const last = rowIndex === rows.length - 1;
                return (
                  <tr key={row.name} className="max-md:block max-md:rounded-[20px] max-md:bg-ag-haze max-md:p-4">
                    <th scope="row" className="border-t border-ag-ink/10 py-4 pr-4 align-top text-[0.9375rem] font-semibold text-ag-ink max-md:block max-md:border-0 max-md:p-0 max-md:pb-2">
                      {row.name}
                    </th>
                    {WAYS.map((way, index) => (
                      <td
                        key={way.key}
                        data-label={way.label}
                        className={`px-5 py-4 align-top text-[0.9375rem] leading-snug max-md:mt-1.5 max-md:block max-md:rounded-xl max-md:px-3 max-md:py-2 max-md:before:block max-md:before:text-[0.8125rem] max-md:before:font-semibold max-md:before:content-[attr(data-label)] ${
                          index === 0
                            ? `bg-ag-night text-white max-md:before:text-ag-gold md:border-t md:border-white/10 ${last ? 'md:rounded-b-[20px]' : ''}`
                            : 'border-t border-ag-ink/10 text-ag-mist max-md:border-0 max-md:bg-white max-md:before:text-ag-ink'
                        }`}
                      >
                        {row[way.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div className="rounded-[24px] bg-ag-haze p-7">
            <p className="text-[1.125rem] font-semibold text-ag-ink">{UNDER_18_LINE.lead}</p>
            <p className="mt-2 text-[1rem] leading-relaxed text-ag-ink">{UNDER_18_LINE.text}</p>
          </div>
          <figure className="min-w-0">
            <div aria-hidden="true">
              <PastePanelCard float />
            </div>
            <figcaption className="mt-3 text-[0.875rem] text-ag-mist">Pasting from a portal on the website</figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  );
}

/* --------------------------------------------------------- data handling */

export function SlipDataSection({ usage }: { usage: PublicUsage | null }) {
  const free = dailyAllowance(usage, 'ocr', {
    count: (n) => `${n} free scans in any 24 hours, for students 18 and over`,
    paused: 'Scanning is paused for everyone right now; pasting still works',
    unknown: 'Free scans every day, for students 18 and over',
  });
  const facts = [
    'Off until you allow AI processing in Settings',
    free,
    ...(coinsOn(usage, 'ocr') ? ['On Android, extra scans with coins from short ads'] : []),
    'Withdraw any time; your saved rows stay',
  ];
  return (
    <Section tone="night" labelledBy="slip-heading">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-20">
        <div>
          <Heading id="slip-heading" onDark title={SCAN_RECEIPT.heading} lead={SCAN_RECEIPT.paragraph} />
          <CheckList onDark items={facts} className="mt-8" />
          <TextLinkV2 href={SCAN_RECEIPT.link.href} onDark className="mt-8 inline-block">
            {SCAN_RECEIPT.link.label}
          </TextLinkV2>
        </div>
        <UiCard float className="p-6 sm:p-7">
          <UiCardHead title={SCAN_RECEIPT.name} sub="Every line matches the privacy notice" />
          <table className="mt-5 w-full text-left">
            <caption className="sr-only">What happens to your scan</caption>
            <tbody>
              {SCAN_RECEIPT.rows.map((row) => (
                <tr key={row.label} className="border-b border-ag-ink/8 align-top">
                  <th scope="row" className="py-2.5 pr-4 text-[0.875rem] font-normal text-ag-mist">
                    {row.label}
                  </th>
                  <td className="py-2.5 text-right text-[0.875rem] font-semibold">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-ag-night px-5 py-4 text-white">
            <span className="text-[1rem] font-semibold">{SCAN_RECEIPT.total.label}</span>
            <span className="ag-display ag-num text-[2.25rem] font-bold leading-none text-ag-gold">{SCAN_RECEIPT.total.value}</span>
          </p>
        </UiCard>
      </Container>
    </Section>
  );
}
