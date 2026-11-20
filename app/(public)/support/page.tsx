import type { Metadata } from 'next';
import Link from 'next/link';
import { faqPageJsonLd } from '@/components/public/Accordion';
import { Photo } from '@/components/site/Photo';
import { CheckIcon, ClosingBand, Container, FaqList, PageHero, Section, TextLinkV2, Trail, buttonClass } from '@/components/site/ui';
import { JsonLd } from '@/components/site/company/JsonLd';
import { SupportCoupon } from '@/components/site/company/SupportCoupon';
import { getPlatformSettings } from '@/lib/platform/settings-server';
import { photoFor } from '@/lib/public/page-photos';
import {
  SETTINGS_HELP_HREF,
  SUPPORT_RETENTION_LINE,
  SUPPORT_STATUS_WORDS,
  SUPPORT_SUBJECT,
  answerText,
  includeRows,
  quickFixGroups,
  type AnswerPart,
} from '@/lib/public/support';
import { readPublicUsage } from '@/lib/public/usage-public';
import { absoluteUrl, createPageMetadata } from '@/lib/seo/site';
import { contactHref, getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'Support',
  description: 'Fix sign-in, verification code, CGPA, scanner and sharing problems in a minute, or send us a request, with or without signing in. We reply by email.',
  path: '/support',
});

export const revalidate = 300;

async function supportIsOpen(): Promise<boolean> {
  try {
    return !(await getPlatformSettings()).disabledFeatures.includes('support');
  } catch {
    return true; // The API is the real gate.
  }
}

function Answer({ parts }: { parts: readonly AnswerPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? (
          <span key={index}>{part}</span>
        ) : (
          <TextLinkV2 key={index} href={part.href}>
            {part.label}
          </TextLinkV2>
        )
      )}
    </>
  );
}

const ROUTE_CARD = 'flex h-full flex-col rounded-[24px] bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-sm sm:p-7';

/** Support, brand v2 "Gold hour" (docs/brand-v2/DESIGN.md). The layout provides header, main and footer. */
export default async function SupportPage() {
  const [email, supportOpen, usage] = await Promise.all([getContactEmail(), supportIsOpen(), readPublicUsage()]);
  const coinsEnabled = usage?.coins.enabled === true;
  const groups = quickFixGroups({ coinsEnabled });
  const faq = groups.flatMap((group) => group.items.map((item) => ({ question: item.question, answer: answerText(item.answer) })));
  const photo = photoFor('support.fixes');

  return (
    <div className="ag-site">
      <JsonLd data={faqPageJsonLd(faq)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'AcadeGrade support',
          url: absoluteUrl('/support'),
          inLanguage: 'en-NG',
        }}
      />

      <PageHero
        titleId="support-title"
        trail={<Trail items={[{ label: 'Home', href: '/' }, { label: 'Support' }]} />}
        title="Tell us what went wrong."
        sentence="Most problems take a minute to fix with the quick fixes below. If yours does not, send us a request."
        aside={
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2" aria-label="Two ways to reach us">
            <li className={ROUTE_CARD}>
              <span className="ag-display grid h-10 w-10 place-items-center rounded-xl bg-ag-gold text-[1.125rem] font-bold text-ag-night" aria-hidden="true">
                1
              </span>
              <h2 className="ag-display mt-5 text-[1.375rem] font-bold leading-tight text-white">Signed in?</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">
                Send it from Help and support in Settings. Our replies arrive in your AcadeGrade inbox and by email.
              </p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">
                In the Android app, open <span className="font-semibold text-white">Profile</span>, then{' '}
                <span className="font-semibold text-white">Help and support</span>.
              </p>
              <div className="mt-auto pt-6">
                <Link href={SETTINGS_HELP_HREF} className={buttonClass('gold')}>
                  Go to Settings
                </Link>
              </div>
            </li>
            <li className={ROUTE_CARD}>
              <span className="ag-display grid h-10 w-10 place-items-center rounded-xl bg-white text-[1.125rem] font-bold text-ag-night" aria-hidden="true">
                2
              </span>
              <h2 className="ag-display mt-5 text-[1.375rem] font-bold leading-tight text-white">Can&apos;t sign in?</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">
                Reset your password from{' '}
                <TextLinkV2 href="/forgot-password" onDark>
                  Forgot password?
                </TextLinkV2>{' '}
                first. The code we email you expires after 5 minutes.
              </p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">
                {email ? (
                  <>
                    Still locked out? Use the form below, or email{' '}
                    <a href={contactHref(email, SUPPORT_SUBJECT)} className="ag-focus rounded font-semibold text-white [overflow-wrap:anywhere] underline decoration-white/35 underline-offset-4 hover:decoration-ag-gold">
                      {email}
                    </a>{' '}
                    from the address on your account.
                  </>
                ) : (
                  <>Still locked out? Use the form below: it works without signing in.</>
                )}
              </p>
              <div className="mt-auto pt-6">
                <a href="#request" className={buttonClass('ghostOnDark')}>
                  Write to us below
                </a>
              </div>
            </li>
          </ol>
        }
      />

      <Section tone="haze" id="request">
        <Container className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <div className="rounded-[32px] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(23,19,58,0.35)] sm:p-10">
            <SupportCoupon email={email} supportOpen={supportOpen} />
          </div>

          <div id="before-you-write" className="scroll-mt-24 lg:pt-4">
            <h2 className="ag-display text-[1.75rem] font-bold leading-[1.1] text-ag-ink sm:text-[2.25rem]">Never send your password.</h2>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-ag-mist">
              We will never ask for your password or for a code we sent you. Tell us what happened instead: the more exact, the faster we can fix it.
            </p>
            <h3 className="mt-9 text-[1rem] font-semibold text-ag-ink">What to include</h3>
            <dl className="mt-3 divide-y divide-ag-ink/10 border-y border-ag-ink/10" aria-label="What to include">
              {includeRows({ coinsEnabled }).map((row) => (
                <div key={row.category} className="py-3.5">
                  <dt className="text-[0.875rem] font-semibold text-ag-violet">{row.label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] leading-relaxed text-ag-ink">{row.include}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-9 text-[1rem] font-semibold text-ag-ink">What happens next</h3>
            <dl className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed" aria-label="What happens next">
              {Object.entries(SUPPORT_STATUS_WORDS).map(([status, entry]) => (
                <div key={status} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3">
                  <dt className="flex items-start gap-2.5 font-semibold text-ag-ink">
                    <CheckIcon className="mt-1 text-ag-violet" />
                    {entry.word}
                  </dt>
                  <dd className="text-ag-mist">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[0.875rem] leading-relaxed text-ag-mist">{SUPPORT_RETENTION_LINE}</p>
          </div>
        </Container>
      </Section>

      {/* overflow visible so the heading and photo can stay in view (sticky) beside the answers */}
      <Section tone="white" id="quick-fixes" labelledBy="quick-fixes-title" className="!overflow-visible">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <div className="lg:sticky lg:top-28">
              <h2 id="quick-fixes-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
                Quick fixes
              </h2>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-ag-mist">Fourteen common problems, answered.</p>
              {photo ? (
                <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-[32px] bg-ag-haze lg:aspect-square">
                  <Photo photo={photo} sizes="(min-width: 1280px) 360px, (min-width: 1024px) 30vw, 92vw" eager={false} className="absolute inset-0" imgClassName="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-w-0 space-y-12">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-[0.9375rem] font-semibold text-ag-violet">{group.title}</h3>
                <div className="mt-2">
                  <FaqList
                    items={group.items.map((item) => ({
                      id: item.question,
                      question: item.question,
                      answer: <Answer parts={item.answer} />,
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {supportOpen || email ? (
        <ClosingBand
          id="still-stuck-title"
          title="Still stuck? Send us a request and we will look at it with you."
          actions={
            <>
              {supportOpen ? (
                <a href="#request" className={buttonClass('night', 'lg')}>
                  Send a request
                </a>
              ) : (
                <a href={contactHref(email, SUPPORT_SUBJECT)} className={buttonClass('night', 'lg')}>
                  Email support
                </a>
              )}
              <Link href="/privacy" className="ag-focus rounded text-[1rem] font-semibold text-ag-night underline decoration-ag-night/30 underline-offset-[6px] hover:decoration-ag-night">
                Read the Privacy notice
              </Link>
            </>
          }
        />
      ) : null}
    </div>
  );
}
