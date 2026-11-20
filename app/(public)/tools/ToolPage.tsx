import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { faqPageJsonLd } from '@/components/public/Accordion';
import { JsonLd, breadcrumbJsonLd, toolsMetadata, webApplicationJsonLd } from '@/components/public/tools/seo';
import { Container, Heading, TextLinkV2, Trail } from '@/components/site/ui';
import { ToolFaqSection, ToolHero } from '@/components/site/tools/frame';
import { OpenCue, ToolCard } from '@/components/site/tools/ToolCards';
import { ToolClosing } from '@/components/site/tools/ToolClosing';
import { DEFAULT_SCALE } from '@/lib/public/scales';
import '@/components/site/site.css';
import '@/components/site/tools/tools-v2.css';
import { TOOL_CONFIGS, getTool, type ToolSlug } from './tools-config';

export function toolMetadata(slug: ToolSlug): Metadata {
  const tool = getTool(slug);
  return toolsMetadata({ title: tool.title, description: tool.description, path: `/tools/${tool.slug}`, keywords: tool.keywords });
}

interface ToolPageProps {
  slug: ToolSlug;
  /** The tool island: the panel (inputs and the night result card) and its live "how it works" section. */
  children: ReactNode;
  /** Static reference sections after the island (the weighted average's comparison). */
  extra?: ReactNode;
  /** Tone of the last section before "More free tools", so the tones keep alternating. */
  lastTone?: 'white' | 'haze';
}

/** Every link from a tool page: the calculator and the other tools. */
export function moreToolLinks(current: string): { name: string; href: string; question: string }[] {
  const tools = TOOL_CONFIGS.map((tool) => ({ name: tool.menuName, href: `/tools/${tool.slug}`, question: tool.question }));
  return [{ name: 'CGPA calculator', href: '/calculator', question: "Work out a semester's GPA, PI and CGPA from your courses." }, ...tools].filter(
    (link) => link.href !== current,
  );
}

/**
 * The frame all four tools share, brand v2: a compact night hero with the
 * trail, the tool island (panel and "how it works"), any reference section,
 * More free tools, the FAQ (with FAQPage JSON-LD) and the gold close, plus
 * WebApplication and BreadcrumbList JSON-LD. The layout provides header,
 * main and footer.
 */
export function ToolPage({ slug, children, extra, lastTone = 'white' }: ToolPageProps) {
  const tool = getTool(slug);
  const path = `/tools/${tool.slug}`;
  const moreTone = lastTone === 'white' ? 'haze' : 'white';
  return (
    <div className="ag-site">
      <ToolHero
        trail={<Trail items={[{ label: 'Free tools', href: '/tools' }, { label: tool.menuName }]} />}
        title={tool.heading}
        sentence={tool.sentence}
        facts={['No account needed', 'Nothing you type is saved', DEFAULT_SCALE.line]}
      />
      {children}
      {extra}
      <section aria-labelledby="more-tools" className={`${moreTone === 'haze' ? 'bg-ag-haze' : 'bg-white'} py-20 sm:py-28`}>
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Heading id="more-tools" title="More free tools, same scale" lead="Each one works on the Nigerian university 5-point scale and saves nothing." />
            <TextLinkV2 href="/tools" className="shrink-0 text-[1rem]">
              All free tools
            </TextLinkV2>
          </div>
          <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moreToolLinks(path).map((link) => (
              <ToolCard key={link.href} name={link.name} href={link.href} tone={moreTone === 'haze' ? 'white' : 'haze'} footer={<OpenCue />}>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ag-mist">{link.question}</p>
              </ToolCard>
            ))}
          </ul>
        </Container>
      </section>
      <ToolFaqSection id="tool-questions" title={faqTitle(slug)} faqs={tool.faqs} tone={moreTone === 'haze' ? 'white' : 'haze'} />
      <ToolClosing title={tool.close} secondary={{ href: '/tools', label: 'All free tools' }} />
      <JsonLd
        data={[
          webApplicationJsonLd({ name: tool.title, path, description: tool.description }),
          faqPageJsonLd(tool.faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Free tools', path: '/tools' },
            { name: tool.title, path },
          ]),
        ]}
      />
    </div>
  );
}

function faqTitle(slug: ToolSlug): string {
  switch (slug) {
    case 'degree-class-checker':
      return 'Degree class questions';
    case 'required-gpa':
      return 'Planning questions';
    case 'carry-over-impact':
      return 'Carry-over questions';
    default:
      return 'Average score questions';
  }
}
