import type { ReactNode } from 'react';
import { CookieChoicesLink } from '@/components/public/CookieChoicesLink';
import { AcadeGradeMark } from '@/components/public/Logo';
import { Photo } from '@/components/site/Photo';
import { CheckIcon, Container, Heading, Section, TextLinkV2, buttonClass } from '@/components/site/ui';
import {
  ABOUT_CLOSE,
  ABOUT_FACTS,
  COMMITMENTS,
  FOUNDER_LINE,
  FOUNDER_LINKS,
  OPERATOR_FACTS,
  OPERATOR_NAME,
  OPERATOR_NOTE,
  WORKING_PRINCIPLES,
  WORKING_SHEET_NOTES,
  type CoverList,
  type PosterLine,
  type SheetGroup,
} from '@/lib/public/about';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { EXAMPLE_STUDENT, computeExampleSlip } from '@/lib/public/example-student';
import type { PagePhoto } from '@/lib/public/page-photos';
import { contactHref } from '@/lib/site/contact-email';
import { AuthAwareButton } from './AuthAwareButton';

/** Brand v2 sections for /about (docs/brand-v2/DESIGN.md; content from docs/public-redesign/pages/about.md). */

const ENQUIRY_SUBJECT = 'AcadeGrade enquiry';

// ------------------------------------------------------------------ Hero aside: the four facts

const FACT_ICONS: readonly ReactNode[] = [
  // Place
  <path key="pin" d="M10 18s-5.5-5.1-5.5-9.2a5.5 5.5 0 0 1 11 0C15.5 12.9 10 18 10 18zm0-7.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  // Universities
  <path key="cap" d="M2 7.5L10 4l8 3.5-8 3.5-8-3.5zm3.5 2v4c1.3 1.3 2.8 2 4.5 2s3.2-.7 4.5-2v-4" />,
  // Free
  <path key="tag" d="M3 10.5V4h6.5l7.5 7.5-6.5 6.5L3 10.5zm4-3.2h.01" />,
  // Web and Android
  <path key="phone" d="M7 2.5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1zm2.5 12.5h1" />,
];

export function AboutFacts() {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <AcadeGradeMark size={36} />
        <p className="text-[0.9375rem] leading-snug text-ag-mist-night">
          <span className="block font-semibold text-white">AcadeGrade</span>A personal academic record, not an official result.
        </p>
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2">
        {ABOUT_FACTS.map((fact, index) => (
          <div
            key={fact.fact}
            className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 px-6 py-5 sm:block sm:px-8 sm:py-7 ${index > 0 ? 'border-t border-white/10' : ''} ${
              index === 1 ? 'sm:border-l sm:border-t-0' : ''
            } ${index === 3 ? 'sm:border-l' : ''}`}
          >
            <span className="row-span-2 mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-ag-gold/15 text-ag-gold sm:mb-5" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {FACT_ICONS[index % FACT_ICONS.length]}
              </svg>
            </span>
            <dt className="ag-display text-[1.25rem] font-bold leading-tight text-white sm:text-[1.375rem]">{fact.fact}</dt>
            <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ag-mist-night sm:mt-2">{fact.line}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ------------------------------------------------------------------ Mission beside the photo

export function MissionSection({ mission, photo, lists }: { mission: string; photo: PagePhoto | null; lists: readonly CoverList[] }) {
  const slip = computeExampleSlip();
  return (
    <Section tone="white" labelledBy="mission-title">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {photo ? (
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-ag-haze">
              <Photo photo={photo} sizes="(min-width: 1280px) 470px, (min-width: 1024px) 38vw, 92vw" eager={false} className="absolute inset-0" imgClassName="h-full w-full object-cover" />
            </div>
            {/* Real product UI over the photo (the example student's record), never a caption about the person pictured. */}
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 shadow-[0_18px_50px_-12px_rgba(23,19,58,0.45)] backdrop-blur sm:right-auto sm:min-w-[260px]" data-ui>
              <div className="flex items-center gap-3">
                <AcadeGradeMark size={30} />
                <p className="text-[0.8125rem] font-semibold text-ag-ink">Example record, {EXAMPLE_STUDENT.levelLabel}</p>
              </div>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="ag-display ag-num text-[2.25rem] font-bold leading-none text-ag-ink">{formatCgpa(slip.cgpa)}</p>
                <p className="text-right text-[0.8125rem] leading-snug text-ag-mist">
                  <span className="block font-semibold text-ag-ink">{slip.classBand.label}</span>
                  CGPA over {slip.totalUnits} units
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className={photo ? 'lg:pt-6' : 'lg:col-span-2'}>
          <h2 id="mission-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            Why AcadeGrade exists
          </h2>
          <p className="mt-6 text-[1.25rem] leading-[1.55] text-ag-ink sm:text-[1.375rem]">{mission}</p>
          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 sm:grid-cols-2">
            {lists.map((list) => (
              <div key={list.title} className="min-w-0">
                <h3 className="text-[1rem] font-semibold text-ag-ink">{list.title}</h3>
                <dl className="mt-3 divide-y divide-ag-ink/10 border-y border-ag-ink/10 text-[0.9375rem]">
                  {list.items.map((item) => (
                    <div key={item.name} className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="text-ag-ink">{item.name}</dt>
                      <dd className="ag-num text-right text-ag-mist">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

// ------------------------------------------------------------------ Founder story

const LINK_ICONS: Record<string, ReactNode> = {
  Portfolio: <path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm-7.5 7.5h15M10 2.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5z" />,
  GitHub: (
    <path d="M7.5 16.5c-3.6 1.1-3.6-1.8-5-2.2m10 4v-2.7c0-.8.1-1.4-.4-1.9 2.2-.3 4.4-1.1 4.4-4.8a3.8 3.8 0 0 0-1-2.6 3.5 3.5 0 0 0-.1-2.6s-.8-.3-2.7 1a9.3 9.3 0 0 0-4.9 0C5.9 3.4 5.1 3.7 5.1 3.7a3.5 3.5 0 0 0-.1 2.6 3.8 3.8 0 0 0-1 2.6c0 3.7 2.2 4.5 4.4 4.8-.5.5-.5 1-.4 1.9v2.7" />
  ),
  LinkedIn: <path d="M3.5 7.5v9m0-12.5v.01M8 16.5v-5.2c0-2.2 1.3-3.3 3-3.3s3 1.1 3 3.3v5.2M8 7.5v9" />,
};

export function FounderSection() {
  return (
    <Section tone="haze" labelledBy="who-title">
      <Container>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 rounded-[32px] bg-white p-7 sm:p-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:p-16">
          <div>
            <div className="ag-display grid h-28 w-28 place-items-center rounded-full bg-ag-night text-[2.5rem] font-bold text-ag-gold sm:h-32 sm:w-32" aria-hidden="true">
              JU
            </div>
            <p className="ag-display mt-6 text-[1.5rem] font-bold leading-tight text-ag-ink">Joshua Ugwu</p>
            <p className="mt-1 text-[1rem] text-ag-mist">Founder, AcadeGrade</p>
            <ul className="mt-7 flex flex-wrap gap-2 lg:flex-col lg:items-start" aria-label={`${OPERATOR_NAME} online`}>
              {FOUNDER_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} rel="me noopener" className={`${buttonClass('ghostOnLight')} !px-4 !py-2.5 text-[0.875rem]`}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ag-violet">
                      {LINK_ICONS[link.label]}
                    </svg>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <h2 id="who-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
              Who runs AcadeGrade
            </h2>
            <p className="mt-6 text-[1.125rem] leading-relaxed text-ag-ink">{FOUNDER_LINE}</p>
            <blockquote className="mt-6 border-l-2 border-ag-gold pl-5 text-[1.0625rem] leading-relaxed text-ag-mist">
              &ldquo;I watched friends add up grade points by hand every semester, then do it again because they weren&apos;t sure.
              AcadeGrade makes the arithmetic the easy part, and keeps your record private.&rdquo;
            </blockquote>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-ag-ink/10 pt-8 sm:grid-cols-4">
              {OPERATOR_FACTS.map((pair) => (
                <div key={pair.label} className="min-w-0">
                  <dt className="text-[0.875rem] text-ag-mist">{pair.label}</dt>
                  <dd className="mt-1 text-[1rem] font-semibold leading-snug text-ag-ink">{pair.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-[0.9375rem] leading-relaxed text-ag-mist">{OPERATOR_NOTE}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

// ------------------------------------------------------------------ How the numbers are made

function Principle({ body, links = [] }: { body: string; links?: readonly { text: string; href: string }[] }) {
  if (!links.length) return <>{body}</>;
  const parts: ReactNode[] = [];
  let rest = body;
  links.forEach((link, index) => {
    const at = rest.indexOf(link.text);
    if (at < 0) return;
    parts.push(
      rest.slice(0, at),
      <TextLinkV2 key={index} href={link.href}>
        {link.text}
      </TextLinkV2>
    );
    rest = rest.slice(at + link.text.length);
  });
  parts.push(rest);
  return <>{parts}</>;
}

function SheetRows({ group, onDark = false }: { group: SheetGroup; onDark?: boolean }) {
  return (
    <dl className={`divide-y ${onDark ? 'divide-white/10' : 'divide-ag-ink/[0.07]'}`}>
      {group.items.map((item) => (
        <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-3">
          <dt className={`text-[0.9375rem] font-medium ${onDark ? 'text-white' : 'text-ag-ink'}`}>{item.name}</dt>
          <dd className="ag-num text-right">
            {item.highlight ? (
              <span className="ag-display inline-block rounded-lg bg-ag-gold px-2.5 py-0.5 text-[1.5rem] font-bold leading-tight text-ag-night">{item.value}</span>
            ) : (
              <span className={`text-[0.9375rem] font-semibold ${onDark ? 'text-white' : 'text-ag-ink'}`}>{item.value}</span>
            )}
          </dd>
          {item.description ? (
            <dd className={`ag-num col-start-1 mt-1 text-[0.8125rem] leading-snug ${onDark ? 'text-ag-mist-night' : 'text-ag-mist'}`}>{item.description}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function WorkingSection({ groups }: { groups: readonly SheetGroup[] }) {
  const meta = `${EXAMPLE_STUDENT.levelLabel} ${EXAMPLE_STUDENT.programme}, ${EXAMPLE_STUDENT.session} ${EXAMPLE_STUDENT.semester}`;
  const last = groups.length - 1;
  return (
    // overflow visible so the explanation can stay in view (sticky) beside the working sheet
    <Section tone="white" labelledBy="working-title" className="!overflow-visible">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <Heading
            id="working-title"
            title="We show our working."
            lead="Every figure in AcadeGrade can be checked with a pen. Here is one semester for our example student, worked out the way your record shows it."
          />
          <ul className="mt-10 divide-y divide-ag-ink/10 border-y border-ag-ink/10">
            {WORKING_PRINCIPLES.map((principle) => (
              <li key={principle.title} className="flex gap-4 py-5">
                <CheckIcon className="mt-1 text-ag-violet" />
                <p className="text-[1rem] leading-relaxed text-ag-mist">
                  <span className="block font-semibold text-ag-ink">{principle.title}</span>
                  <Principle body={principle.body} links={principle.links} />
                </p>
              </li>
            ))}
          </ul>
        </div>

        <section aria-labelledby="sheet-title" className="rounded-[32px] bg-ag-haze p-4 sm:p-7">
          <div className="flex items-center gap-4 px-2 pb-5 pt-2 sm:px-2">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white">
              <AcadeGradeMark size={30} />
            </span>
            <div className="min-w-0">
              <h3 id="sheet-title" className="ag-display text-[1.5rem] font-bold leading-tight text-ag-ink">
                Working sheet
              </h3>
              <p className="text-[0.875rem] text-ag-mist">Example student: {meta}</p>
            </div>
          </div>
          <div className="space-y-3">
            {groups.map((group, index) => {
              const dark = index === last;
              return (
                <div key={group.title} className={`rounded-[20px] px-5 py-4 sm:px-7 sm:py-5 ${dark ? 'bg-ag-night text-white' : 'bg-white'}`}>
                  <h4 className={`text-[0.875rem] font-semibold ${dark ? 'text-ag-gold' : 'text-ag-violet'}`}>{group.title}</h4>
                  <SheetRows group={group} onDark={dark} />
                </div>
              );
            })}
          </div>
          <div className="space-y-1 px-2 pb-1 pt-5 text-[0.8125rem] leading-relaxed text-ag-mist">
            {WORKING_SHEET_NOTES.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </section>
      </Container>
    </Section>
  );
}

// ------------------------------------------------------------------ Privacy commitments

const WHERE_LINK = 'ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet';

export function CommitmentsSection({ trustStatement }: { trustStatement: string }) {
  return (
    <Section tone="haze" labelledBy="commit-title">
      <Container>
        <Heading id="commit-title" title="Your record is yours" lead={trustStatement} />
        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {COMMITMENTS.map((group) => (
            <div key={group.title} className="rounded-[24px] bg-white p-7 sm:p-8">
              <h3 className="ag-display text-[1.375rem] font-bold leading-tight text-ag-ink">{group.title}</h3>
              <ul className="mt-5 space-y-4">
                {group.rows.map((row) => (
                  <li key={row.text} className="flex items-start gap-3 text-ag-violet">
                    <CheckIcon className="mt-1" />
                    <span className="min-w-0 text-[1rem] leading-relaxed text-ag-ink">
                      {row.text}.
                      <span className="mt-0.5 block text-[0.875rem] text-ag-mist">
                        {row.cookieChoices ? (
                          <CookieChoicesLink className={WHERE_LINK}>{row.where}</CookieChoicesLink>
                        ) : row.href ? (
                          <TextLinkV2 href={row.href}>{row.where}</TextLinkV2>
                        ) : (
                          row.where
                        )}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 text-[1rem] text-ag-mist">
          The full detail is in the <TextLinkV2 href="/privacy">Privacy notice</TextLinkV2>.
        </p>
      </Container>
    </Section>
  );
}

// ------------------------------------------------------------------ What AcadeGrade is not

export function NotSection({ lines }: { lines: readonly PosterLine[] }) {
  return (
    <Section tone="night" labelledBy="not-title" className="ag-noise">
      <Container className="relative">
        <h2 id="not-title" className="ag-display max-w-xl text-[2.25rem] font-bold leading-[1.05] text-white sm:text-[3rem]">
          What AcadeGrade is not
        </h2>
        <ul className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-x-14 md:grid-cols-2">
          {lines.map((item) => {
            const [first, ...rest] = item.line.split(' ');
            return (
              <li key={item.line} className="border-t border-white/15 py-8">
                <p className="ag-display text-[2.5rem] font-bold leading-none sm:text-[3.25rem]">
                  <span className="text-ag-gold">{first}</span> {rest.join(' ')}
                </p>
                <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-ag-mist-night">{item.fact}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

// ------------------------------------------------------------------ Contact

export function WriteSection({ email }: { email: string | null }) {
  return (
    <Section tone="white" labelledBy="write-title">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <h2 id="write-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            Write to us
          </h2>
          <p className="mt-5 max-w-lg text-[1.25rem] leading-relaxed text-ag-ink">Something wrong for your university? Tell us.</p>
          <p className="mt-3 max-w-lg text-[1.0625rem] leading-relaxed text-ag-mist">
            A different grade band, a missing course or a figure that looks off: a person reads every message.
          </p>
        </div>
        <div className="rounded-[32px] bg-ag-haze p-7 sm:p-10">
          <p className="text-[1rem] font-semibold text-ag-ink">Write to a person</p>
          <ul className="mt-5 space-y-4 text-[1.0625rem]">
            {email ? (
              <>
                <li className="flex items-center gap-3">
                  <MailIcon />
                  <a href={contactHref(email, ENQUIRY_SUBJECT)} className={`${WHERE_LINK} [overflow-wrap:anywhere]`}>
                    {email}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <HelpIcon />
                  <TextLinkV2 href="/support">Get help on the support page</TextLinkV2>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-3">
                  <MailIcon />
                  <TextLinkV2 href="/support#request">Send us a request</TextLinkV2>
                </li>
                <li className="flex items-center gap-3">
                  <HelpIcon />
                  <TextLinkV2 href="/support#quick-fixes">Fix common problems</TextLinkV2>
                </li>
              </>
            )}
          </ul>
          <p className="mt-6 border-t border-ag-ink/10 pt-5 text-[0.9375rem] leading-relaxed text-ag-mist">
            {email
              ? 'Enugu State, Nigeria. We reply by email, or in your AcadeGrade inbox when you write from your account.'
              : 'Enugu State, Nigeria. We reply by email, and in your AcadeGrade inbox when you write from your account.'}
          </p>
        </div>
      </Container>
    </Section>
  );
}

function MailIcon() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ag-violet" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
        <path d="M3 5.5l7 5.5 7-5.5" />
      </svg>
    </span>
  );
}

function HelpIcon() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ag-violet" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7.8 7.8a2.3 2.3 0 1 1 3 2.2c-.5.2-.8.6-.8 1.1v.4M10 14.2v.01" />
      </svg>
    </span>
  );
}

// ------------------------------------------------------------------ Close

export function AboutClose() {
  return (
    <section className="bg-ag-gold" aria-labelledby="close-title">
      <Container className="flex flex-col items-start gap-8 py-20 sm:py-24 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 id="close-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-night sm:text-[3rem]">
            {ABOUT_CLOSE.headline}
          </h2>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ag-night/80">{ABOUT_CLOSE.sentence}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <AuthAwareButton href="/register" label="Start your free record" variant="night" />
          <TextLinkV2 href="/calculator" className="!text-ag-night decoration-ag-night/30 hover:decoration-ag-night">
            Try the calculator first
          </TextLinkV2>
        </div>
      </Container>
    </section>
  );
}
