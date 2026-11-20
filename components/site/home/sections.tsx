import Link from 'next/link';
import type { ReactNode } from 'react';
import { photoFor } from '@/lib/public/page-photos';
import { HOME_FAQ } from '@/lib/public/home';
import type { PublicTestimonial } from '@/lib/public/proof';
import { AcadeMindMark } from '@/components/public/Logo';
import { Photo } from '@/components/site/Photo';
import { HeroLive } from './HeroLive';
import { HeroAction } from './HeroAction';

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1240px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <circle cx="9" cy="9" r="9" fill="currentColor" opacity="0.16" />
      <path d="M5.2 9.3l2.4 2.3 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ Hero

export function Hero() {
  return (
    <section className="ag-hero-sky ag-noise relative overflow-hidden text-white" aria-labelledby="hero-title">
      <Container className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pb-28 lg:pt-20">
        <div className="max-w-xl">
          <h1 id="hero-title" className="ag-display ag-rise text-[2.75rem] font-bold leading-[1.02] sm:text-[3.75rem] lg:text-[4.25rem]">
            Know exactly where your degree stands.
          </h1>
          <p className="ag-rise ag-rise-2 mt-6 max-w-[34rem] text-[1.125rem] leading-relaxed text-ag-mist-night sm:text-[1.1875rem]">
            AcadeGrade turns your results into GPA, CGPA and degree class in seconds, then shows what it takes to reach
            the class you want. Free for Nigerian university students.
          </p>
          <div className="ag-rise ag-rise-3 mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <HeroAction />
            <Link href="/calculator" className="ag-focus rounded text-[1rem] font-medium text-white underline decoration-white/30 underline-offset-[6px] transition hover:decoration-ag-gold">
              Try the CGPA calculator
            </Link>
          </div>
          <ul className="ag-rise ag-rise-4 mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem] text-white/80">
            {['Free for students', 'Web and Android', 'Private by default'].map((fact) => (
              <li key={fact} className="flex items-center gap-2 text-ag-gold">
                <Check />
                <span className="text-white/80">{fact}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ag-rise ag-rise-3">
          <HeroLive />
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Scale

const CLASS_ZONES = [
  { label: 'Below a Pass', short: 'Fail', from: 0, to: 1, tone: 'bg-[#E4E0F5] text-ag-mist' },
  { label: 'Pass', short: 'Pass', from: 1, to: 1.5, tone: 'bg-[#CFC6FF] text-ag-ink' },
  { label: 'Third Class', short: '3rd', from: 1.5, to: 2.4, tone: 'bg-[#B3A4FF] text-ag-ink' },
  { label: 'Second Class Lower', short: '2:2', from: 2.4, to: 3.5, tone: 'bg-[#8E74FF] text-white' },
  { label: 'Second Class Upper', short: '2:1', from: 3.5, to: 4.5, tone: 'bg-ag-violet text-white' },
  { label: 'First Class', short: '1st', from: 4.5, to: 5, tone: 'bg-ag-gold text-ag-night' },
];

const GRADE_BANDS = [
  { grade: 'A', range: '70–100', point: 5 },
  { grade: 'B', range: '60–69', point: 4 },
  { grade: 'C', range: '50–59', point: 3 },
  { grade: 'D', range: '45–49', point: 2 },
  { grade: 'E', range: '40–44', point: 1 },
  { grade: 'F', range: '0–39', point: 0 },
];

export function ScaleSection() {
  const example = 4.43;
  return (
    <section className="bg-white py-24 sm:py-32" aria-labelledby="scale-title">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <h2 id="scale-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            Built on the 5&#8209;point scale your university uses.
          </h2>
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist lg:justify-self-end">
            Every grade, unit and class boundary follows the Nigerian university system. AcadeGrade shows your PI beside
            your GPA, tracks carry-overs and handles direct entry and spill-over. Your handbook is still the final word.
          </p>
        </div>

        <figure className="mt-14">
          <figcaption className="sr-only">Degree classes on the 5-point scale, with the example student at 4.43</figcaption>
          <div className="relative">
            <div className="flex h-16 overflow-hidden rounded-2xl sm:h-20">
              {CLASS_ZONES.map((zone) => (
                <div
                  key={zone.label}
                  className={`flex flex-col justify-center px-2 sm:px-3 ${zone.tone}`}
                  style={{ width: `${((zone.to - zone.from) / 5) * 100}%` }}
                >
                  <span className="hidden text-[0.8125rem] font-semibold leading-tight lg:block">{zone.label}</span>
                  <span className="text-[0.8125rem] font-semibold leading-tight lg:hidden">{zone.short}</span>
                </div>
              ))}
            </div>
            <div className="absolute -top-3 bottom-[-0.75rem] w-0.5 rounded bg-ag-night" style={{ left: `${(example / 5) * 100}%` }} aria-hidden="true" />
            <div className="ag-num mt-3 flex justify-between text-[0.8125rem] text-ag-mist">
              {[0, 1, 2, 3, 4, 5].map((tick) => (
                <span key={tick}>{tick.toFixed(2)}</span>
              ))}
            </div>
            <p className="mt-3 text-right text-[0.875rem] text-ag-ink" style={{ marginRight: `${100 - (example / 5) * 100}%` }}>
              <span className="font-semibold">Example student: 4.43</span>
              <span className="block text-ag-mist">Second Class Upper, 0.07 from a First</span>
            </p>
          </div>
        </figure>

        <dl className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {GRADE_BANDS.map((band) => (
            <div key={band.grade} className="rounded-2xl bg-ag-haze px-4 py-4">
              <dt className="ag-display text-[2rem] font-bold leading-none text-ag-ink">{band.grade}</dt>
              <dd className="ag-num mt-2 text-[0.875rem] text-ag-mist">
                {band.range}
                <span className="block font-semibold text-ag-ink">{band.point} points</span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Everything after results day

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`relative overflow-hidden rounded-[32px] ${className}`}>{children}</article>;
}

const SCAN_ROWS = [
  ['CSC 301', 'Data Structures', '76', 'A'],
  ['CSC 303', 'Operating Systems', '65', 'B'],
  ['MTH 301', 'Numerical Analysis', '56', 'C'],
  ['CSC 305', 'Computer Networks', '72', 'A'],
];

export function FeaturesSection() {
  const scanner = photoFor('scanner.hero');
  const timetable = photoFor('timetable.reminders');
  return (
    <section className="bg-ag-haze py-24 sm:py-32" aria-labelledby="features-title">
      <Container>
        <div className="max-w-2xl">
          <h2 id="features-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            Everything after results day, in one place.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ag-mist">
            Scan your result slip, see your class, plan the next semester and share your record when you need to.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          {/* Scanner: the biggest panel */}
          <Panel className="bg-white lg:col-span-7">
            <div className="p-7 sm:p-9">
              <h3 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink">Scan your result slip</h3>
              <p className="mt-3 max-w-md text-[1rem] leading-relaxed text-ag-mist">
                Photograph the slip or paste from your portal. AcadeGrade reads each course and you check every line before
                anything is saved.
              </p>
              <Link href="/features/result-scanner" className="ag-focus mt-5 inline-block rounded text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet">
                How scanning works
              </Link>
            </div>
            <div className="relative mx-5 mb-5 h-[300px] overflow-hidden rounded-[24px] sm:mx-7 sm:mb-7 sm:h-[360px]">
              {scanner ? (
                <Photo photo={scanner} sizes="(min-width: 1024px) 620px, 92vw" eager={false} className="absolute inset-0" imgClassName="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-ag-violet/20" />
              )}
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-[0_18px_50px_-12px_rgba(23,19,58,0.45)] backdrop-blur sm:left-auto sm:w-[330px]" data-ui>
                <p className="text-[0.8125rem] font-semibold text-ag-ink">5 courses found. Check each one.</p>
                <ul className="mt-3 space-y-2">
                  {SCAN_ROWS.map(([code, title, score, grade]) => (
                    <li key={code} className="flex items-center gap-3 text-[0.8125rem]">
                      <span className="w-16 font-semibold text-ag-ink">{code}</span>
                      <span className="min-w-0 flex-1 truncate text-ag-mist">{title}</span>
                      <span className="ag-num text-ag-ink">{score}</span>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-ag-haze font-semibold text-ag-violet">{grade}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          {/* AcadeMind */}
          <Panel className="bg-ag-violet text-white lg:col-span-5">
            <div className="flex h-full flex-col p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
                  <AcadeMindMark size={30} />
                </span>
                <h3 className="ag-display text-[1.75rem] font-bold leading-tight">AcadeMind</h3>
              </div>
              <p className="mt-4 text-[1rem] leading-relaxed text-white/80">
                Reads your record and writes back in plain English: where you are strong, what is slipping and what would
                move your class.
              </p>
              <div className="mt-8 space-y-3" data-ui>
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-4 py-3 text-[0.9375rem]">
                  What do I need for a First Class?
                </p>
                <p className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[0.9375rem] leading-relaxed text-ag-ink">
                  You are at <strong>4.43</strong>. Averaging <strong>4.67</strong> over your last 40 units gets you there.
                  Raising MTH 301 is your quickest win.
                </p>
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-4 py-3 text-[0.9375rem]">
                  And if I keep my current pace?
                </p>
                <p className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[0.9375rem] leading-relaxed text-ag-ink">
                  You finish around <strong>4.41</strong>, a strong Second Class Upper, 0.09 short of a First.
                </p>
              </div>
              <Link href="/features/ai-insights" className="ag-focus mt-auto inline-block self-start rounded pt-8 text-[0.9375rem] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-ag-gold">
                Meet AcadeMind
              </Link>
            </div>
          </Panel>

          {/* Timetable */}
          <Panel className="min-h-[340px] bg-ag-night text-white lg:col-span-5">
            {timetable ? (
              <Photo photo={timetable} sizes="(min-width: 1024px) 480px, 92vw" eager={false} className="absolute inset-0" imgClassName="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-ag-night via-ag-night/55 to-transparent" />
            <div className="relative flex h-full min-h-[340px] flex-col justify-end p-7 sm:p-9">
              <div className="mb-auto self-start rounded-2xl bg-white/90 px-4 py-3 text-ag-ink shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)]" data-ui>
                <p className="text-[0.75rem] font-semibold text-ag-violet">In 10 minutes</p>
                <p className="text-[0.9375rem] font-semibold">CSC 401 Software Engineering</p>
                <p className="text-[0.8125rem] text-ag-mist">9:00 · Lecture Theatre 2</p>
              </div>
              <h3 className="ag-display mt-8 text-[1.75rem] font-bold leading-tight">Timetable with reminders</h3>
              <p className="mt-2 max-w-sm text-[1rem] leading-relaxed text-white/80">
                Lectures, reading and exams, with reminders on your phone even when you have no data.
              </p>
            </div>
          </Panel>

          {/* What you need */}
          <Panel className="bg-white lg:col-span-4">
            <div className="flex h-full flex-col p-7 sm:p-9">
              <h3 className="ag-display text-[1.5rem] font-bold leading-tight text-ag-ink">Know what you need next</h3>
              <p className="ag-display ag-num mt-6 text-[4.5rem] font-bold leading-none text-ag-ink">4.67</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ag-mist">
                The average the example student needs over 40 units to finish with a First Class.
              </p>
              <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-ag-haze" aria-hidden="true">
                <div className="h-full w-[88.6%] rounded-full bg-gradient-to-r from-ag-violet to-ag-gold" />
              </div>
              <Link href="/tools/required-gpa" className="ag-focus mt-6 inline-block self-start rounded text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet">
                Work out yours
              </Link>
            </div>
          </Panel>

          {/* Transcript */}
          <Panel className="bg-white lg:col-span-3">
            <div className="flex h-full flex-col p-7 sm:p-9">
              <h3 className="ag-display text-[1.5rem] font-bold leading-tight text-ag-ink">Share your transcript safely</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ag-mist">A clean record, shared on your terms.</p>
              <ul className="mt-6 flex flex-wrap gap-2 text-[0.8125rem] font-semibold" data-ui>
                <li className="rounded-full bg-ag-haze px-3 py-1.5 text-ag-ink">Expires in 7 days</li>
                <li className="rounded-full bg-ag-haze px-3 py-1.5 text-ag-ink">Summary only</li>
                <li className="rounded-full bg-ag-gold/25 px-3 py-1.5 text-ag-ink">PIN on</li>
              </ul>
              <Link href="/features#transcript" className="ag-focus mt-auto inline-block self-start rounded pt-6 text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet">
                See the transcript
              </Link>
            </div>
          </Panel>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Results day story

const STEPS = [
  { title: 'Scan or paste your slip', detail: 'About 30 seconds' },
  { title: 'Check every course', detail: 'About a minute' },
  { title: 'See your CGPA and class', detail: 'Instantly' },
];

export function StorySection() {
  const photo = photoFor('home.showcase');
  return (
    <section id="how-it-works" className="relative isolate overflow-hidden bg-ag-night text-white" aria-labelledby="story-title">
      {photo ? <Photo photo={photo} sizes="100vw" className="absolute inset-0 -z-10" imgClassName="h-full w-full object-cover" /> : null}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ag-night via-ag-night/80 to-ag-night/20" />
      <Container className="py-28 sm:py-36">
        <h2 id="story-title" className="ag-display max-w-xl text-[2.5rem] font-bold leading-[1.02] sm:text-[3.5rem]">
          Results day, sorted.
        </h2>
        <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-white/80">
          No more adding grade points on the back of a page. Three steps and you know where you stand.
        </p>
        <ol className="mt-12 grid gap-4 sm:grid-cols-3 lg:max-w-4xl">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur-md">
              <span className="ag-display grid h-10 w-10 place-items-center rounded-full bg-ag-gold text-[1.125rem] font-bold text-ag-night">
                {index + 1}
              </span>
              <p className="mt-5 text-[1.125rem] font-semibold">{step.title}</p>
              <p className="mt-1 text-[0.9375rem] text-white/70">{step.detail}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Android

export function AndroidSection() {
  return (
    <section className="ag-hero-sky relative overflow-hidden text-white" aria-labelledby="android-title">
      <Container className="grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-2">
        <div className="max-w-lg">
          <h2 id="android-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] sm:text-[3rem]">
            Reminders that work when the network doesn&apos;t.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ag-mist-night">
            The Android app adds offline reminders for lectures, reading and exams, the result scanner on your camera and
            an app lock for your record.
          </p>
          <ul className="mt-8 space-y-3 text-[1rem]">
            {['Up to three reminders for every class', 'Build a reading plan with AcadeMind', 'Works on Android 7 and newer'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-ag-gold">
                <Check />
                <span className="text-white/85">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/app" className="ag-focus rounded-xl bg-ag-gold px-6 py-3.5 text-[1rem] font-semibold text-ag-night transition hover:brightness-105">
              Get the Android app
            </Link>
            <p className="text-[0.9375rem] text-ag-mist-night">On iPhone? The website works in Safari.</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[340px]" aria-hidden="true">
          <div className="absolute -inset-10 rounded-full bg-ag-violet/30 blur-3xl" />
          <div className="relative rounded-[44px] bg-[#05040F] p-3 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
            <div className="overflow-hidden rounded-[34px] bg-ag-haze text-ag-ink">
              <div className="flex items-center justify-between px-6 pt-4 text-[0.75rem] font-semibold">
                <span>8:50</span>
                <span className="h-5 w-20 rounded-full bg-[#05040F]" />
                <span>4G</span>
              </div>
              <div className="px-5 pb-6 pt-5">
                <p className="text-[0.8125rem] text-ag-mist">Monday, 11 January</p>
                <p className="ag-display mt-1 text-[1.5rem] font-bold">Today</p>
                <div className="mt-4 rounded-2xl bg-ag-violet p-4 text-white">
                  <p className="text-[0.75rem] font-semibold text-ag-gold">Starts in 10 minutes</p>
                  <p className="mt-1 text-[1rem] font-semibold">CSC 401 Software Engineering</p>
                  <p className="text-[0.8125rem] text-white/75">9:00 to 11:00 · Lecture Theatre 2</p>
                </div>
                {[
                  ['11:00', 'CSC 403 Compiler Construction', 'Lab 1'],
                  ['14:00', 'Reading: MTH 301', 'Built with AcadeMind'],
                  ['16:00', 'GST 411 Entrepreneurship', 'Hall B'],
                ].map(([time, title, place]) => (
                  <div key={title} className="mt-3 flex gap-3 rounded-2xl bg-white p-3.5">
                    <span className="ag-num w-11 shrink-0 text-[0.8125rem] font-semibold text-ag-violet">{time}</span>
                    <span>
                      <span className="block text-[0.875rem] font-semibold">{title}</span>
                      <span className="block text-[0.75rem] text-ag-mist">{place}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Voices (only real, approved quotes in production)

export function VoicesSection({ testimonials }: { testimonials: readonly PublicTestimonial[] }) {
  return (
    <section className="bg-white py-24 sm:py-32" aria-labelledby="voices-title">
      <Container>
        <h2 id="voices-title" className="ag-display max-w-xl text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
          What students say.
        </h2>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.slice(0, 3).map((item) => (
            <li key={item.id} className="flex flex-col rounded-[28px] bg-ag-haze p-7">
              <blockquote className="text-[1.125rem] leading-relaxed text-ag-ink">&ldquo;{item.quote}&rdquo;</blockquote>
              <p className="mt-auto pt-6 text-[0.875rem] text-ag-mist">
                <span className="font-semibold text-ag-ink">{item.firstName}</span>, {item.level} {item.department}
                {item.university ? `, ${item.university}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Founder

export function FounderSection() {
  return (
    <section className="bg-white py-24 sm:py-28" aria-labelledby="founder-title">
      <Container>
        <div className="grid gap-10 rounded-[32px] bg-ag-haze p-8 sm:p-12 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-14">
          <div className="ag-display grid h-24 w-24 place-items-center rounded-full bg-ag-night text-[2rem] font-bold text-ag-gold" aria-hidden="true">
            JU
          </div>
          <div className="max-w-2xl">
            <h2 id="founder-title" className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2.25rem]">
              Built by a student who has lived through results day.
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-ag-mist">
              I studied Computer Science at ESUT and watched friends add up grade points by hand every semester, then do it
              again because they weren&apos;t sure. AcadeGrade makes the arithmetic the easy part, and keeps your record
              private.
            </p>
            <p className="mt-5 text-[0.9375rem] text-ag-ink">
              <span className="font-semibold">Joshua Ugwu</span>, founder ·{' '}
              <Link href="/about" className="ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet">
                Read our story
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ FAQ

export function FaqSection() {
  return (
    <section className="bg-white pb-24 sm:pb-32" aria-labelledby="faq-title">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div>
          <h2 id="faq-title" className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            Questions, answered.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ag-mist">
            Anything else?{' '}
            <Link href="/support" className="ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet">
              Ask support
            </Link>
          </p>
        </div>
        <div className="divide-y divide-ag-ink/10 border-y border-ag-ink/10">
          {HOME_FAQ.map((item) => (
            <details key={item.id} className="ag-faq group">
              <summary className="ag-focus flex items-center justify-between gap-6 rounded py-6 text-[1.125rem] font-semibold text-ag-ink">
                {item.question}
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="ag-faq-icon shrink-0 text-ag-violet">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </summary>
              <p className="max-w-2xl pb-6 text-[1rem] leading-relaxed text-ag-mist">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ Closing

export function ClosingSection() {
  return (
    <section className="bg-ag-gold" aria-labelledby="closing-title">
      <Container className="flex flex-col items-start gap-8 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
        <h2 id="closing-title" className="ag-display max-w-2xl text-[2.25rem] font-bold leading-[1.05] text-ag-night sm:text-[3rem]">
          Your next result is coming. Know what it means the moment it lands.
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link href="/register" className="ag-focus rounded-xl bg-ag-night px-6 py-4 text-[1rem] font-semibold text-white transition hover:bg-ag-night-2">
            Start your free record
          </Link>
          <Link href="/app" className="ag-focus rounded text-[1rem] font-semibold text-ag-night underline decoration-ag-night/30 underline-offset-[6px] hover:decoration-ag-night">
            Get the Android app
          </Link>
        </div>
      </Container>
    </section>
  );
}
