import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { LegalContact } from '@/components/marketing/LegalContact';
import { ButtonLink, CheckList, Container, PageHero, Section, TextLinkV2, Trail } from '@/components/site/ui';
import { JsonLd } from '@/components/site/company/JsonLd';
import {
  ANDROID_STEPS,
  AUTOMATIC_COMPLETION_LINE,
  CANNOT_SIGN_IN,
  DELETED_ITEMS,
  DELETE_SETTINGS_HREF,
  DELETION_INTRO,
  DELETION_SUBJECT,
  KEPT_ITEMS,
  PERMANENT_LINE,
  PLAY_LINE,
  SHARE_LINK_LINE,
  WEB_STEPS,
  type StepPart,
} from '@/lib/public/account-deletion';
import { absoluteUrl, createPageMetadata, resolveSiteUrl } from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'Delete your account',
  description: "Delete your AcadeGrade account on Android or the web: the steps, what is deleted, what is kept for a short time and why, and what to do if you can't sign in.",
  path: '/account-deletion',
});

export const revalidate = 300;

const LINK_ON_DARK = 'ag-focus rounded font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-ag-gold';
const LINK_ON_LIGHT = 'ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet';

/** A step: plain text, a UI label (as the apps show it) or a link. */
function Step({ parts }: { parts: readonly StepPart[] }) {
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') return <span key={index}>{part}</span>;
        if ('ui' in part) {
          return (
            <span key={index} className="rounded-md bg-white/10 px-1.5 py-0.5 font-semibold text-white">
              {part.ui}
            </span>
          );
        }
        return (
          <Link key={index} href={part.href} className={LINK_ON_DARK}>
            {part.label}
          </Link>
        );
      })}
    </>
  );
}

function Route({ title, steps }: { title: string; steps: readonly StepPart[][] }) {
  return (
    <div>
      <h3 className="text-[1rem] font-semibold text-ag-gold">{title}</h3>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-4">
            <span className="ag-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[0.9375rem] font-bold text-white" aria-hidden="true">
              {index + 1}
            </span>
            <span className="min-w-0 pt-1 text-[0.9375rem] leading-relaxed text-white/85 sm:text-[1rem]">
              <Step parts={step} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepCard({ number, title, children }: { number: number; title: ReactNode; children: ReactNode }) {
  return (
    <li className="flex flex-col rounded-[24px] bg-white p-7">
      <span className="ag-display grid h-10 w-10 place-items-center rounded-full bg-ag-night text-[1.125rem] font-bold text-ag-gold" aria-hidden="true">
        {number}
      </span>
      <h3 className="ag-display mt-5 text-[1.375rem] font-bold leading-tight text-ag-ink">{title}</h3>
      <div className="mt-2 text-[1rem] leading-relaxed text-ag-mist">{children}</div>
    </li>
  );
}

/** Delete your account (Google Play data-deletion page), brand v2. The layout provides header, main and footer. */
export default async function AccountDeletionPage() {
  const email = await getContactEmail();
  const site = resolveSiteUrl();

  return (
    <div className="ag-site">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Delete your AcadeGrade account',
          url: absoluteUrl('/account-deletion'),
          inLanguage: 'en-NG',
          publisher: { '@id': `${site}/#organization` },
        }}
      />

      <PageHero
        titleId="deletion-title"
        trail={<Trail items={[{ label: 'Home', href: '/' }, { label: 'Delete your account' }]} />}
        title="Delete your AcadeGrade account"
        sentence={DELETION_INTRO}
        actions={
          <>
            <ButtonLink href={DELETE_SETTINGS_HREF} size="lg">
              Go to Settings
            </ButtonLink>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem]">
              <a href="#cannot-sign-in" className={LINK_ON_DARK}>
                Can&apos;t sign in?
              </a>
              <a href="#what-is-kept" className={LINK_ON_DARK}>
                What is kept, and for how long
              </a>
            </div>
            <p className="w-full max-w-md text-[0.875rem] leading-relaxed text-ag-mist-night">{PLAY_LINE}</p>
          </>
        }
        aside={
          <section id="how-to-delete" aria-labelledby="how-to-delete-title" className="scroll-mt-24 rounded-[28px] bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-sm sm:p-8">
            <h2 id="how-to-delete-title" className="ag-display text-[1.5rem] font-bold leading-tight text-white sm:text-[1.75rem]">
              How to delete your account
            </h2>
            <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-8">
              <Route title="In the Android app" steps={ANDROID_STEPS} />
              <div className="border-t border-white/10 pt-7">
                <Route title="On the website" steps={WEB_STEPS} />
              </div>
            </div>
            <div className="mt-7 space-y-2 rounded-2xl bg-ag-night/70 p-5 text-[0.875rem] leading-relaxed text-ag-mist-night ring-1 ring-white/10">
              <p>
                <span className="font-semibold text-white">Your account and its records are deleted, permanently.</span> {AUTOMATIC_COMPLETION_LINE}
              </p>
              <p>
                Want a copy first? Use <span className="font-semibold text-white">Download my data</span> in{' '}
                <Link href="/settings#privacy" className={LINK_ON_DARK}>
                  Settings, Privacy &amp; AI choices
                </Link>{' '}
                before you delete.
              </p>
            </div>
          </section>
        }
      />

      <Section tone="white">
        <Container>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <section id="what-is-deleted" aria-labelledby="what-is-deleted-title" className="scroll-mt-24 rounded-[32px] bg-ag-haze p-7 sm:p-10">
              <h2 id="what-is-deleted-title" className="ag-display text-[2rem] font-bold leading-[1.05] text-ag-ink sm:text-[2.5rem]">
                What is deleted
              </h2>
              <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist">Everything linked to your account, in the app and on the website.</p>
              <CheckList className="mt-7" items={DELETED_ITEMS.map((item) => item.text)} />
            </section>

            <section id="what-is-kept" aria-labelledby="what-is-kept-title" className="scroll-mt-24 rounded-[32px] bg-ag-night p-7 text-white sm:p-10">
              <h2 id="what-is-kept-title" className="ag-display text-[2rem] font-bold leading-[1.05] sm:text-[2.5rem]">
                What may be kept for a while, and why
              </h2>
              <dl className="mt-7 divide-y divide-white/10 border-y border-white/10">
                {KEPT_ITEMS.map((item) => (
                  <div key={item.item} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-4">
                    <dt className="text-[1rem] font-semibold">{item.item}</dt>
                    <dd className="ag-num text-right text-[0.875rem] font-semibold text-ag-gold">{item.period}</dd>
                    <dd className="col-span-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">{item.reason}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
            <p className="rounded-[24px] border border-ag-ink/10 p-6 text-[1rem] leading-relaxed text-ag-ink sm:p-7">{SHARE_LINK_LINE}</p>
            <p className="rounded-[24px] border border-ag-ink/10 p-6 text-[1rem] font-semibold leading-relaxed text-ag-ink sm:p-7">{PERMANENT_LINE}</p>
          </div>
        </Container>
      </Section>

      <Section tone="haze" id="cannot-sign-in" labelledBy="cannot-sign-in-title">
        <Container>
          <div className="max-w-2xl">
            <h2 id="cannot-sign-in-title" tabIndex={-1} className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
              {CANNOT_SIGN_IN.reset.line}
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ag-mist sm:text-[1.125rem]">
              {CANNOT_SIGN_IN.reset.before}
              <TextLinkV2 href={CANNOT_SIGN_IN.reset.link.href}>{CANNOT_SIGN_IN.reset.link.label}</TextLinkV2>
              {CANNOT_SIGN_IN.reset.after}
            </p>
          </div>
          <ol className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
            <StepCard number={1} title={CANNOT_SIGN_IN.write.line}>
              {email ? (
                <p>
                  Email <LegalContact email={email} subject={DELETION_SUBJECT} className={`${LINK_ON_LIGHT} [overflow-wrap:anywhere]`} />
                  {` with the subject “${DELETION_SUBJECT}” and the email address on your account.`}
                </p>
              ) : (
                <p>
                  <TextLinkV2 href="/support#request">Send us a request without signing in</TextLinkV2>, from the address on your account. Choose
                  &ldquo;Privacy or my data&rdquo; and say you want your account deleted.
                </p>
              )}
            </StepCard>
            <StepCard number={2} title={CANNOT_SIGN_IN.verify.line}>
              <p>{CANNOT_SIGN_IN.verify.sentence}</p>
            </StepCard>
            <StepCard number={3} title={CANNOT_SIGN_IN.done.line}>
              <p>{CANNOT_SIGN_IN.done.sentence}</p>
            </StepCard>
          </ol>
          <p className="mt-10 text-[1rem] text-ag-mist">
            More about your data and rights is in the <TextLinkV2 href="/privacy">Privacy notice</TextLinkV2>.
          </p>
        </Container>
      </Section>
    </div>
  );
}
