import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader, PublicFooter } from '@/components/layout/PublicShell';
import { LinkButton } from '@/components/ui/LinkButton';
import { createPageMetadata } from '@/lib/seo/site';
import { TOOL_CONFIGS, faqJsonLd, getTool, type ToolConfig } from './tools-config';

export function toolMetadata(slug: ToolConfig['slug']): Metadata {
  const tool = getTool(slug);
  return createPageMetadata({
    title: tool.title,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    keywords: tool.keywords,
  });
}

/** Shared frame for the free tool pages: heading, the calculator, an honest note, FAQ, FAQ JSON-LD. */
export function ToolPage({ slug, children }: { slug: ToolConfig['slug']; children: React.ReactNode }) {
  const tool = getTool(slug);
  const others = TOOL_CONFIGS.filter((entry) => entry.slug !== slug);
  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <PublicHeader />
      <main className="mx-auto max-w-[44rem] px-4 pb-20 pt-[calc(var(--shell-header-height)+2.5rem)] sm:px-6">
        <h1 className="font-[family-name:var(--font-bricolage)] text-[clamp(1.875rem,4.5vw,3rem)] font-bold leading-[1.08] tracking-[-0.03em]">
          {tool.heading}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">{tool.description}</p>

        <section aria-label={`${tool.title}`} className="mt-8 rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-5 ring-1 ring-[var(--acade-border)] sm:p-6">
          {children}
        </section>

        <p className="mt-4 text-sm leading-6 text-[var(--acade-text-muted)]">
          This is a quick estimate for planning, not an official result. Your school&apos;s published grading rules and records decide your actual CGPA and class. Nothing you type here is saved or sent anywhere.
        </p>

        <section aria-labelledby="tool-faq" className="mt-12">
          <h2 id="tool-faq" className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-bold">
            Common questions
          </h2>
          <dl className="mt-4 divide-y divide-[var(--acade-border-subtle)]">
            {tool.faqs.map((faq) => (
              <div key={faq.question} className="py-4">
                <dt className="font-semibold">{faq.question}</dt>
                <dd className="mt-1 leading-7 text-[var(--acade-text-muted)]">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label="More free tools" className="mt-12">
          <h2 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-xl)] font-bold">More free tools</h2>
          <ul className="mt-3 grid gap-1">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/tools/${entry.slug}`} className="inline-flex min-h-11 items-center font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline">
                  {entry.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/calculator" className="inline-flex min-h-11 items-center font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline">
                Full CGPA calculator
              </Link>
            </li>
          </ul>
          <div className="mt-6">
            <LinkButton href="/register" variant="outline" size="md">Track your results for free</LinkButton>
          </div>
        </nav>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(tool.faqs)).replace(/</g, '\\u003c') }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
