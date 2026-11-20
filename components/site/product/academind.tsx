import type { ReactNode } from 'react';
import {
  ACADEMIND_COPY, ANALYSIS_META, DATA_QA, STATEMENTS, exampleAnalysis, exampleWhatIf, freeEveryDay, tellBlocks, type TellBlock,
} from '@/lib/public/features-academind';
import { photoFor } from '@/lib/public/page-photos';
import { AcadeMindMark } from '@/components/public/Logo';
import type { PublicUsage } from '@/lib/public/usage-public';
import { Photo } from '@/components/site/Photo';
import { CheckList, Container, Heading, Panel, Section, TextLinkV2 } from '@/components/site/ui';
import { DegreeGoalCard, ForecastCard, MindTile } from './cards';
import { UiCard } from './shared';

/** Sections of /features/ai-insights, titled AcadeMind, in brand v2 (content: docs/public-redesign/pages/features-academind.md). */

/* ------------------------------------------------------------------ hero */

function Ask({ children }: { children: ReactNode }) {
  return <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-4 py-3 text-[0.9375rem] font-medium text-white">{children}</p>;
}

function Reply({ children }: { children: ReactNode }) {
  return <p className="max-w-[94%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[0.9375rem] leading-relaxed text-ag-ink">{children}</p>;
}

/** Bold every figure in a reply (4.62, 4.15, 0.07 and so on). */
function figures(text: string): ReactNode[] {
  return text.split(/(\d+\.\d{2})/).map((part, index) => (/^\d+\.\d{2}$/.test(part) ? <strong key={index}>{part}</strong> : part));
}

/** A short exchange built from the example analysis and what-if (every figure from the real engine). */
export function MindChat() {
  const [, concerns, recommendations, outlook] = exampleAnalysis();
  const whatIf = exampleWhatIf();
  const firstSentence = (text: string) => text.split('. ')[0] + '.';
  const afterFirst = (text: string) => text.split('. ').slice(1).join('. ');
  return (
    <figure className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-8 rounded-full bg-ag-violet/30 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-[32px] bg-ag-violet p-5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)] sm:p-7">
        <div className="flex items-center gap-3">
          <MindTile size={52} />
          <div>
            <p className="ag-display text-[1.5rem] font-bold leading-tight text-white">AcadeMind</p>
            <p className="text-[0.8125rem] text-white/75">Example: 300L Computer Science</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Ask>Where am I losing points?</Ask>
          <Reply>{figures(`${firstSentence(concerns.text)} ${afterFirst(recommendations.text)}`)}</Reply>
          <Ask>Can I still make a First Class?</Ask>
          <Reply>{figures(`${outlook.text} Second Class Upper stays safe as long as you average ${whatIf.upperFloor} or more.`)}</Reply>
        </div>
        <figcaption className="mt-5 text-[0.8125rem] leading-snug text-white/75">{ACADEMIND_COPY.disclaimer}</figcaption>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------- what it tells you */

/** The written analysis, all four sections, as the app shows it. */
export function AnalysisCard() {
  return (
    <article aria-label="Example written analysis" className="rounded-[20px] bg-white p-5 text-ag-ink shadow-[0_24px_60px_-24px_rgba(14,11,43,0.35)] ring-1 ring-ag-ink/5 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ag-night">
          <AcadeMindMark size={26} />
        </span>
        <div className="min-w-0">
          <p className="text-[1rem] font-semibold">Written analysis</p>
          <p className="text-[0.8125rem] text-ag-mist">{ANALYSIS_META.split(' · ').join(', ')}</p>
        </div>
      </header>
      <div className="mt-5 space-y-4">
        {exampleAnalysis().map((section) => (
          <section key={section.heading}>
            <h4 className="text-[0.9375rem] font-semibold text-ag-violet">{section.heading}</h4>
            <p className="mt-1 text-[0.9375rem] leading-relaxed">{section.text}</p>
          </section>
        ))}
      </div>
      <footer className="mt-5 border-t border-ag-ink/10 pt-4">
        <p className="text-[0.8125rem] text-ag-mist">{ACADEMIND_COPY.disclaimer}</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[0.8125rem] font-semibold" aria-hidden="true">
          {['Helpful', 'Not helpful', 'Report'].map((label) => (
            <li key={label} className="rounded-full bg-ag-haze px-3 py-1.5">
              {label}
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}

function TellCopy({ block, onDark = false }: { block: TellBlock; onDark?: boolean }) {
  return (
    <>
      <h3 className="ag-display text-[1.75rem] font-bold leading-tight">{block.title}</h3>
      <CheckList onDark={onDark} items={block.lines} className="mt-5 text-[0.9375rem]" />
    </>
  );
}

export function WhatItTellsYou({ usage }: { usage: PublicUsage | null }) {
  const [analysis, forecast, whatif] = tellBlocks(usage);
  const note = exampleWhatIf().note;
  return (
    <Section tone="haze" labelledBy="tells-title">
      <Container>
        <Heading id="tells-title" title="What it tells you" lead="Three ways AcadeMind helps you read your record. The numbers are the engine's; AcadeMind adds the words." />
        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
          <Panel className="bg-white text-ag-ink lg:col-span-7">
            <div className="grid gap-8 p-7 sm:p-9">
              <div>
                <TellCopy block={analysis} />
              </div>
              <div className="rounded-[24px] bg-ag-haze p-3 sm:p-5">
                <AnalysisCard />
              </div>
            </div>
          </Panel>

          <Panel className="bg-ag-violet text-white lg:col-span-5">
            <div className="flex h-full flex-col p-7 sm:p-9">
              <TellCopy block={forecast} onDark />
              <div className="mt-8 lg:mt-auto">
                <ForecastCard float />
              </div>
            </div>
          </Panel>

          <Panel className="bg-ag-night text-white lg:col-span-12">
            <div className="grid gap-10 p-7 sm:p-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14">
              <div>
                <TellCopy block={whatif} onDark />
              </div>
              <DegreeGoalCard float title="What-if">
                <div className="mt-5 rounded-2xl bg-ag-haze p-4">
                  <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-ag-violet">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-ag-night">
                      <AcadeMindMark size={18} />
                    </span>
                    AcadeMind note
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed">{note}</p>
                  <p className="mt-2 text-[0.8125rem] text-ag-mist">{ACADEMIND_COPY.disclaimer}</p>
                </div>
              </DegreeGoalCard>
            </div>
          </Panel>
        </div>
      </Container>
    </Section>
  );
}

/* --------------------------------------------------- guidance, not a verdict */

export function GuidanceSection() {
  const [first, ...rest] = STATEMENTS;
  return (
    <Section tone="night" labelledBy="guidance-title">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <Heading id="guidance-title" onDark title={first.phrase} lead={first.text} />
        <CheckList
          onDark
          className="text-[1.0625rem] [&_li]:gap-4 [&_li+li]:mt-7 lg:pt-3"
          items={rest.map((statement) => (
            <span key={statement.phrase}>
              <span className="block text-[1.125rem] font-semibold text-white">{statement.phrase}</span>
              <span className="mt-1 block leading-relaxed text-ag-mist-night">{statement.text}</span>
            </span>
          ))}
        />
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------ free every day */

export function FreeEveryDay({ usage }: { usage: PublicUsage | null }) {
  const menu = freeEveryDay(usage);
  const photo = photoFor('academind.free');
  const today = menu.groups[0];
  return (
    <Section tone="white" id="free-uses" labelledBy="free-heading" className="scroll-mt-16">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="relative mx-auto flex w-full max-w-[440px] flex-col lg:mx-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ag-haze">
            {photo ? (
              <Photo photo={photo} sizes="(min-width: 1024px) 440px, calc(100vw - 40px)" eager={false} className="absolute inset-0" imgClassName="h-full w-full object-cover" />
            ) : null}
          </div>
          <div aria-hidden="true" className="relative -mt-20 px-4 sm:px-6">
            <UiCard float>
              <p className="text-[0.9375rem] font-semibold">Free uses today</p>
              <p className="text-[0.8125rem] text-ag-mist">They come back within 24 hours</p>
              <ul className="mt-3 space-y-2">
                {today.items.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3 text-[0.875rem]">
                    <span className="truncate">{item.name}</span>
                    <span className="ag-num shrink-0 rounded-full bg-ag-haze px-2.5 py-0.5 font-semibold text-ag-violet">{item.value}</span>
                  </li>
                ))}
              </ul>
            </UiCard>
          </div>
        </div>

        <div>
          <Heading id="free-heading" title="Free every day" lead="Free uses come back every day. The maths behind every answer is always free, with no limit." />
          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-10 md:grid-cols-2">
            {menu.groups.map((group) => (
              <div key={group.name}>
                <h3 className="text-[1.125rem] font-semibold text-ag-ink">{group.name}</h3>
                <dl className="mt-4 space-y-4">
                  {group.items.map((item) => (
                    <div key={item.name} data-allowance="" className="border-t border-ag-ink/10 pt-3">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="font-semibold text-ag-ink">{item.name}</dt>
                        <dd className="ag-num shrink-0 font-semibold text-ag-violet">{item.value}</dd>
                      </div>
                      <dd className="mt-1 text-[0.875rem] leading-snug text-ag-mist">{item.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[0.9375rem] text-ag-ink">{menu.closing}</p>
          <div className="mt-8 rounded-[24px] bg-ag-night p-6 text-white sm:p-7">
            <p className="text-[1.0625rem] font-semibold">18 and over, and only when you allow it</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">
              AcadeMind stays off until you allow AI processing, and you can withdraw in Settings at any time. Under 18? AcadeMind, scanning and coins stay
              off for your account; everything else, from your CGPA to your timetables, works the same.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --------------------------------------------------------- data, plain words */

export function DataInPlainWords() {
  return (
    <Section tone="haze" id="data" labelledBy="data-heading" className="scroll-mt-16">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <Heading id="data-heading" title="Your data, in plain words" />
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist lg:justify-self-end">
            What AcadeMind sees, who reads it and how to switch it off.{' '}
            <TextLinkV2 href="/privacy#ai-and-scanning">Read the AI section of the privacy notice</TextLinkV2>
          </p>
        </div>
        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DATA_QA.map((qa) => (
            <div key={qa.question} className="rounded-[24px] bg-white p-6 sm:p-7">
              <h3 className="text-[1.125rem] font-semibold leading-snug text-ag-ink">{qa.question}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ag-mist">{qa.answer}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
