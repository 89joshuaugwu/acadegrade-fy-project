import type { ReactNode } from 'react';
import { faqPageJsonLd } from '@/components/public/Accordion';
import { encodeCalculation } from '@/components/public/tools/calculator-url';
import { exampleRows, toEncodedRows } from '@/components/public/tools/calculator-model';
import { JsonLd, breadcrumbJsonLd, toolsMetadata } from '@/components/public/tools/seo';
import { ButtonLink, CheckList, Container, Heading, TextLinkV2 } from '@/components/site/ui';
import { PANEL_CLASS, ToolFaqSection, ToolHero, ToolStage } from '@/components/site/tools/frame';
import { ClassPill, GaugeFigure, NightCard, Stat } from '@/components/site/tools/result';
import { ClassList, GradeList, ScaleBar } from '@/components/site/tools/ScaleStrip';
import { OpenCue, ToolCard } from '@/components/site/tools/ToolCards';
import { ToolClosing } from '@/components/site/tools/ToolClosing';
import { formatCgpa, GRADE_POINTS } from '@/lib/cgpa/academicRules';
import { EXAMPLE_COURSES, EXAMPLE_GRADES, EXAMPLE_STUDENT, exampleSemesterFromScores } from '@/lib/public/example-student';
import { DEFAULT_SCALE, publicClassFor } from '@/lib/public/scales';
import { absoluteUrl } from '@/lib/seo/site';
import '@/components/site/site.css';
import '@/components/site/tools/tools-v2.css';
import { HUB_COPY, HUB_FAQS, hubExample } from './hub-content';
import { carryOverImpact, checkDegreeClass, requiredGpa } from './tool-math';
import { toolsByGroup, type ToolSlug } from './tools-config';
import { reveal } from '@/components/motion/Reveal';
import { Words } from '@/components/motion/Words';
import { CountUpText } from '@/components/motion/CountUp';

export const metadata = toolsMetadata({
  title: HUB_COPY.title,
  description: HUB_COPY.description,
  path: '/tools',
  keywords: ['free CGPA tools', 'GPA calculator Nigeria', 'degree class checker', 'required GPA', 'carry-over CGPA'],
});

const semester = exampleSemesterFromScores();
const gpa = formatCgpa(semester.gpa);
const classLabel = publicClassFor(semester.gpa).label;
const exampleHref = `/calculator?${encodeCalculation({
  mode: 'score',
  rows: toEncodedRows(
    exampleRows(() => 'x'),
    'score',
  ),
})}`;

/** The calculator, featured: what it does on the left, the example student's semester on the right. */
function FeaturedCalculator() {
  return (
    <ToolStage label="CGPA calculator">
      <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12`}>
        <div className="min-w-0 lg:pl-2">
          <h2 {...reveal('words')} id="hub-slip-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            <Words>{"CGPA calculator"}</Words>
          </h2>
          <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-ag-mist">
            Enter the courses on your result slip and see your semester GPA, PI and CGPA, with your class, as you type.
          </p>
          <CheckList
            className="mt-7"
            items={['Letter grades or scores out of 100', 'Add your CGPA so far for your class', 'Share a link without signing in']}
          />
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ButtonLink href="/calculator" variant="night" size="lg">
              Open the CGPA calculator
            </ButtonLink>
            <TextLinkV2 href={exampleHref} className="text-[1rem]">
              Open this example
            </TextLinkV2>
          </div>
        </div>

        <NightCard className="min-w-0">
          <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-7">
            <GaugeFigure
              value={Number(gpa)}
              figure={gpa}
              caption="Semester GPA"
              size="md"
              label={`Semester GPA ${gpa} of ${DEFAULT_SCALE.maxPoint.toFixed(2)}, ${classLabel}`}
              intro
            />
            <div className="text-center sm:text-left">
              <ClassPill label={classLabel} />
              <p className="mt-3 text-[0.9375rem] text-ag-mist-night">Class at this GPA: {classLabel}</p>
              <dl className="mt-5 flex justify-center gap-8 sm:justify-start">
                <Stat label="PI" value={formatCgpa(semester.pi)} />
                <Stat label="Units" value={semester.creditLoaded} />
              </dl>
            </div>
          </div>
          <table className="mt-6 w-full border-separate border-spacing-y-1 text-left">
            <caption className="sr-only">Example result slip from the CGPA calculator</caption>
            <thead>
              <tr className="text-[0.8125rem] text-ag-mist-night">
                <th scope="col" className="pb-1 font-medium">
                  {EXAMPLE_STUDENT.levelLabel} {EXAMPLE_STUDENT.programme}
                </th>
                <th scope="col" className="w-12 pb-1 text-right font-medium">
                  Units
                </th>
                <th scope="col" className="w-14 pb-1 text-right font-medium">
                  Score
                </th>
                <th scope="col" className="w-14 pb-1 text-right font-medium">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_COURSES.map((course) => {
                const grade = EXAMPLE_GRADES[course.code];
                return (
                  <tr key={course.code} className="align-middle">
                    <th scope="row" className="max-w-0 pr-2 text-left font-normal">
                      <span className="block whitespace-nowrap text-[0.9375rem] font-semibold text-white">{course.code}</span>
                      <span className="block truncate text-[0.8125rem] text-ag-mist-night">{course.title}</span>
                    </th>
                    <td className="ag-num text-right text-[0.9375rem] text-white/80">{course.units}</td>
                    <td className="ag-num text-right text-[0.9375rem] text-white/80">{course.ca + course.exam}</td>
                    <td className="text-right">
                      <span
                        className={`ag-display inline-grid h-8 w-8 place-items-center rounded-full text-[0.875rem] font-bold ${
                          grade === 'A' ? 'bg-ag-gold text-ag-night' : 'bg-white text-ag-night'
                        }`}
                      >
                        {grade}
                        <span className="sr-only">, {GRADE_POINTS[grade]} points</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </NightCard>
      </div>
    </ToolStage>
  );
}

/** The worked example on each tool's card, drawn from tool-math so it matches the tool (pinned in tests). */
function ExampleTile({ slug }: { slug: ToolSlug }) {
  let body: ReactNode = null;
  switch (slug) {
    case 'degree-class-checker': {
      const check = checkDegreeClass(4.43)!;
      const band = publicClassFor(check.rounded);
      body = (
        <div className="flex items-center gap-4">
          <GaugeFigure value={check.rounded} figure={check.rounded.toFixed(2)} size="sm" className="!mx-0 w-24 shrink-0" />
          <div className="min-w-0">
            <p className="text-[1.0625rem] font-semibold leading-snug text-white">{band.label}</p>
            <p className="mt-1 text-[0.8125rem] text-ag-mist-night">{check.gap?.toFixed(2)} to First Class</p>
          </div>
        </div>
      );
      break;
    }
    case 'weighted-average': {
      const value = hubExample('weighted-average').value;
      body = (
        <div>
          <p className="flex items-baseline gap-2">
            <span className="ag-display ag-num text-[2.75rem] font-bold leading-none"><CountUpText text={String(value)} /></span>
            <span className="text-[0.875rem] text-ag-mist-night">out of 100</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-ag-violet via-[#C77BB8] to-ag-gold" style={{ width: `${Number(value)}%` }} />
          </div>
          <p className="mt-2 text-[0.8125rem] text-ag-mist-night">Five courses, 13 units</p>
        </div>
      );
      break;
    }
    case 'required-gpa': {
      const outcome = requiredGpa({ currentCgpa: 3.38, completedUnits: 90, remainingUnits: 60, targetCgpa: 3.5 });
      const needed = outcome.status === 'needed' ? outcome.required.toFixed(2) : '';
      body = (
        <div>
          <p className="flex items-baseline gap-2">
            <span className="ag-display ag-num text-[2.75rem] font-bold leading-none"><CountUpText text={needed} /></span>
            <span className="text-[0.875rem] text-ag-mist-night">needed</span>
          </p>
          <p className="mt-3 text-[0.8125rem] leading-snug text-ag-mist-night">From 3.38 after 90 units, with 60 left, to reach 3.50</p>
        </div>
      );
      break;
    }
    case 'carry-over-impact': {
      const impact = carryOverImpact({ currentCgpa: 3, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' })!;
      body = (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <p>
              <span className="ag-display ag-num block text-[2.25rem] font-bold leading-none">{impact.bothAttemptsCount.toFixed(2)}</span>
              <span className="mt-1 block text-[0.8125rem] leading-snug text-ag-mist-night">Added as extra units</span>
            </p>
            <p>
              <span className="ag-display ag-num block text-[2.25rem] font-bold leading-none text-ag-gold">{impact.replacesFailure.toFixed(2)}</span>
              <span className="mt-1 block text-[0.8125rem] leading-snug text-ag-mist-night">Replaces the F</span>
            </p>
          </div>
          <p className="mt-3 text-[0.8125rem] text-ag-mist-night">From 3.00, with an A on a 3-unit retake</p>
        </div>
      );
      break;
    }
  }
  return (
    <div className="ag-hero-sky mb-6 flex min-h-[9.5rem] flex-col justify-center rounded-[18px] p-5 text-white" aria-hidden="true">
      {body}
    </div>
  );
}

function FourQuickAnswers() {
  return (
    <section aria-labelledby="four-answers" className="bg-white py-20 sm:py-28">
      <Container>
        <Heading id="four-answers" title="Four quick answers" lead="Each figure is a worked example from the tool. Open one and put in your own numbers." />
        <ul {...reveal('stagger')} className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {toolsByGroup().flatMap((group) =>
            group.tools.map((tool) => (
              <ToolCard
                key={tool.slug}
                name={tool.menuName}
                href={`/tools/${tool.slug}`}
                ariaLabel={`${tool.menuName}: ${tool.question.charAt(0).toLowerCase()}${tool.question.slice(1)}`}
                tone="haze"
                top={<ExampleTile slug={tool.slug} />}
                footer={<OpenCue />}
              >
                <p className="mt-2 text-[1rem] leading-relaxed text-ag-mist">{tool.question}</p>
                <p className="mt-3 text-[0.8125rem] font-medium text-ag-violet">{group.group}</p>
                <span className="sr-only">{hubExample(tool.slug).spoken}</span>
              </ToolCard>
            )),
          )}
        </ul>
      </Container>
    </section>
  );
}

function ScaleBehind() {
  return (
    <section aria-labelledby="scale-behind" className="bg-ag-haze py-20 sm:py-28">
      <Container>
        <Heading id="scale-behind" title="The scale behind every tool" lead={`Most Nigerian universities use these bands. ${DEFAULT_SCALE.handbookNote}`} />
        <div className="mt-12 rounded-[28px] bg-white p-5 sm:p-8">
          <ScaleBar caption="Degree classes on the Nigerian university 5-point scale" />
        </div>
        <div {...reveal('stagger')} className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
          <div className="min-w-0 rounded-[24px] bg-white p-4 sm:p-7">
            <h3 className="ag-display px-4 pb-3 text-[1.375rem] font-bold text-ag-ink">Classes</h3>
            <ClassList />
            <div className="mx-4 mt-5 rounded-2xl bg-ag-haze px-4 py-4">
              <p className="text-[0.9375rem] font-semibold text-ag-ink">Performance Index (PI)</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-ag-mist">Score ÷ 100 × {DEFAULT_SCALE.maxPoint}, averaged by units, shown beside your GPA.</p>
            </div>
          </div>
          <div className="min-w-0 rounded-[24px] bg-white p-4 sm:p-7">
            <h3 className="ag-display px-4 pb-3 text-[1.375rem] font-bold text-ag-ink">Grades</h3>
            <GradeList />
          </div>
        </div>
      </Container>
    </section>
  );
}

export default function ToolsHubPage() {
  const groups = toolsByGroup();
  const items = [
    { name: 'CGPA calculator', path: '/calculator' },
    ...groups.flatMap((group) =>
      group.tools.map((tool) => ({
        name: tool.title,
        path: `/tools/${tool.slug}`,
      })),
    ),
  ];
  return (
    <div className="ag-site">
      <ToolHero title={HUB_COPY.h1} sentence={HUB_COPY.sentence} facts={HUB_COPY.facts} titleId="hub-title" />
      <FeaturedCalculator />
      <FourQuickAnswers />
      <ScaleBehind />
      <ToolFaqSection id="hub-questions" title="Questions about the tools" faqs={HUB_FAQS} />
      <ToolClosing title={HUB_COPY.close} secondary={{ href: '/login', label: 'Sign in' }} />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Free CGPA tools',
            url: absoluteUrl('/tools'),
            description: HUB_COPY.description,
            isPartOf: {
              '@type': 'WebSite',
              name: 'AcadeGrade',
              url: absoluteUrl('/'),
            },
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                url: absoluteUrl(item.path),
              })),
            },
          },
          faqPageJsonLd(HUB_FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Free tools', path: '/tools' },
          ]),
        ]}
      />
    </div>
  );
}
