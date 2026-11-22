import {
  INSTALL_PARAGRAPH, INSTALL_PLAY_LINE, INSTALL_TOTAL, IPHONE_SECTION, appExtras, installSteps, metaLine, safetyQa, type AppRelease,
} from '@/lib/public/features-android';
import { notificationExample } from '@/lib/public/features-timetable';
import { Container, FaqList, Heading, PhoneFrame, Section, TextLinkV2, buttonClass } from '@/components/site/ui';
import { AppExtras } from './AppExtras';
import { AuthAction } from './AuthAction';
import { SafariShareSheet } from './ios';
import { DashboardScreen, phoneScreen } from './phone-screens';
import { NotificationCard } from './shared';
import { Parallax } from '@/components/motion/Parallax';

/** Sections of /app (the Android page) in brand v2 (content: docs/public-redesign/pages/android-app.md). */

/** The official "Get it on Google Play" artwork, unaltered, from Google's badge service. */
const PLAY_BADGE = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

const onDarkLink = 'ag-focus rounded font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-ag-gold';

/**
 * The hero's download: the APK button (plain <a>, because /app/download/android
 * is a route handler that redirects), or the Google Play badge first when a
 * Play link is set. Size and version show only when known.
 */
export function DownloadActions({ release }: { release: AppRelease }) {
  const parts = metaLine(release).split(' · ');
  return (
    <>
      {release.playUrl ? (
        <>
          <a href={release.playUrl} target="_blank" rel="noopener" aria-label="Get it on Google Play (opens Google Play)" className="ag-focus inline-block rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- Google's badge artwork, unaltered */}
            <img src={PLAY_BADGE} alt="" width={180} height={70} className="h-[64px] w-auto" />
          </a>
          <a href={release.apkHref} className={onDarkLink}>
            Or download the APK{release.sizeMb ? ` (${release.sizeMb} MB)` : ''}
          </a>
        </>
      ) : (
        <a href={release.apkHref} className={buttonClass('gold', 'lg')} aria-describedby="android-meta">
          Download for Android
        </a>
      )}
      <p id="android-meta" className="sr-only">
        {parts.join(', ')}
      </p>
      <ul className="flex basis-full flex-wrap gap-2" aria-hidden="true">
        {parts.map((part) => (
          <li key={part} className="rounded-full bg-white/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
            {part}
          </li>
        ))}
      </ul>
      <p className="flex basis-full flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
        <TextLinkV2 href="#install" onDark>
          How to install
        </TextLinkV2>
        <TextLinkV2 href="#iphone" onDark>
          On an iPhone?
        </TextLinkV2>
      </p>
    </>
  );
}

export function AndroidHeroPhone() {
  const note = notificationExample();
  return (
    <div className="relative mx-auto w-full max-w-[460px]" aria-hidden="true">
      <div className="absolute -inset-10 rounded-full bg-ag-violet/30 blur-3xl" />
      <PhoneFrame className="relative max-w-[320px]">
        <DashboardScreen />
      </PhoneFrame>
      <Parallax distance={64} className="relative -mt-28 w-[92%] sm:absolute sm:-left-2 sm:top-[46%] sm:mt-0 sm:w-[300px] lg:-left-10">
        <NotificationCard title={note.title} body={note.body} className="w-full" />
      </Parallax>
    </div>
  );
}

/* ------------------------------------------------------------ what it adds */

export function WhatTheAppAdds({ release }: { release: AppRelease }) {
  const extras = appExtras(release).map((extra) => ({
    id: extra.id,
    name: extra.name,
    fact: extra.fact,
    screenAlt: extra.screenAlt,
    screen: phoneScreen(extra.id, release.coinsPerAd),
  }));
  return (
    <Section tone="white" labelledBy="extras-title">
      <Container>
        <Heading id="extras-title" title="What the app adds" lead="Everything on the website, signed in with the same account, plus these on your Android phone." />
        <div className="mt-12">
          <AppExtras extras={extras} />
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ install */

export function InstallSection({ release }: { release: AppRelease }) {
  const groups = installSteps(release);
  let count = 0;
  return (
    <Section tone="haze" id="install" labelledBy="install-title" className="scroll-mt-16">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <Heading id="install-title" title="Install in about two minutes" lead={INSTALL_PARAGRAPH} />
          {release.playUrl ? <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist">{INSTALL_PLAY_LINE}</p> : null}
          <a href={release.apkHref} className={`${buttonClass('night', 'lg')} mt-8`}>
            Download the APK file
          </a>
        </div>
        <div className="rounded-[32px] bg-white p-6 sm:p-8">
          {groups.map((group) => {
            const start = count + 1;
            count += group.steps.length;
            return (
              <div key={group.name} className="mt-7 first:mt-0">
                <h3 className="text-[0.9375rem] font-semibold text-ag-mist">{group.name}</h3>
                <ol start={start} className="mt-3 space-y-2">
                  {group.steps.map((step, index) => (
                    <li key={step.step} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 rounded-2xl bg-ag-haze/70 px-3 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-center sm:px-4">
                      <span className="ag-display ag-num grid h-9 w-9 place-items-center rounded-full bg-ag-gold text-[1rem] font-bold text-ag-night" aria-hidden="true">
                        {start + index}
                      </span>
                      <span className="pt-1.5 text-[1rem] leading-snug text-ag-ink sm:pt-0">{step.step}</span>
                      <span className="col-start-2 mt-1 text-[0.8125rem] font-semibold text-ag-violet sm:col-start-auto sm:mt-0 sm:whitespace-nowrap sm:rounded-full sm:bg-white sm:px-3 sm:py-1">
                        {step.note}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
          <p className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-ag-night px-5 py-4 text-white">
            <span className="text-[0.9375rem]">{INSTALL_TOTAL.label}</span>
            <span className="ag-display text-[1.25rem] font-bold text-ag-gold">{INSTALL_TOTAL.value}</span>
          </p>
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------ installing safely */

export function SafetyFaq({ qa }: { qa: ReturnType<typeof safetyQa> }) {
  return (
    <Section tone="white" labelledBy="safely-title">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <Heading id="safely-title" title="Installing safely" lead="Straight answers about the APK, permissions, updates and data." />
        <FaqList items={qa.map((item) => ({ question: item.question, answer: item.answer }))} />
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ iPhone */

export function IphoneSection() {
  return (
    <Section tone="night" id="iphone" labelledBy="iphone-title" className="scroll-mt-16">
      <Container className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
        <div>
          <Heading id="iphone-title" onDark title={IPHONE_SECTION.heading} lead={IPHONE_SECTION.text} />
          <h3 className="mt-10 text-[1rem] font-semibold text-white">In Safari</h3>
          <ol className="mt-4 space-y-2">
            {IPHONE_SECTION.safari.map((step, index) => (
              <li key={step} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
                <span className="ag-display ag-num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ag-gold text-[0.9375rem] font-bold text-ag-night" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="text-[1rem] text-white">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ag-mist-night">{IPHONE_SECTION.other}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <AuthAction href="/register" label="Start on the website" signedIn={{ href: '/dashboard', label: 'Open dashboard' }} />
            <TextLinkV2 href="/app/download/ios" onDark>
              Full iPhone guide
            </TextLinkV2>
          </div>
        </div>
        <div aria-hidden="true">
          <SafariShareSheet />
        </div>
      </Container>
    </Section>
  );
}
