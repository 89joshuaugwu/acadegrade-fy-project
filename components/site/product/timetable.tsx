import {
  COUPON, ICS_FILE, LENGTHS, LENGTH_LIMIT_LINE, LENGTH_NOTE, TIMETABLE_FAQ, exampleWeek, extendExample, kindFields, notificationExample, planWorking,
} from '@/lib/public/features-timetable';
import { photoFor } from '@/lib/public/page-photos';
import { AcadeMindMark } from '@/components/public/Logo';
import { Photo } from '@/components/site/Photo';
import { ButtonLink, CheckList, Container, FaqList, Heading, PhoneFrame, Section } from '@/components/site/ui';
import { AuthAction, type ActionTarget } from './AuthAction';
import { FakeButton, NotificationCard, UiCard, UiCardHead } from './shared';
import { WeekAgenda } from './WeekAgenda';
import { reveal } from '@/components/motion/Reveal';
import { CountUpText } from '@/components/motion/CountUp';

/**
 * Sections of /features/timetable in brand v2 (content: docs/public-redesign/pages/features-timetable.md).
 * The builder is rule-based: this page calls it "Build with AcadeMind" and never AI.
 */

export const TT_REGISTER: ActionTarget = { href: '/register', label: 'Create your free record' };
export const TT_OPEN: ActionTarget = { href: '/timetable', label: 'Open your timetables' };
export const TT_PAUSED: ActionTarget = { href: '/dashboard', label: 'Open dashboard' };

/* ------------------------------------------------------------------ hero */

export function TimetableHeroPicture() {
  const photo = photoFor('timetable.reminders');
  const note = notificationExample();
  const monday = exampleWeek()[0];
  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-ag-night-2 ring-1 ring-white/10 sm:aspect-[16/11]">
        {photo ? (
          <Photo photo={photo} sizes="(min-width: 1024px) 580px, calc(100vw - 40px)" eager className="absolute inset-0" imgClassName="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ag-night/70 via-ag-night/10 to-transparent" />
      </div>
      <div aria-hidden="true" className="relative -mt-16 space-y-3 px-3 sm:absolute sm:-bottom-8 sm:-left-8 sm:mt-0 sm:w-[360px] sm:px-0 lg:-left-12">
        <NotificationCard title={note.title} body={note.body} />
        <div className="hidden rounded-[20px] bg-white/10 p-4 text-white ring-1 ring-white/15 backdrop-blur-md sm:block">
          <p className="text-[0.8125rem] text-ag-mist-night">{monday.long}</p>
          <ul className="mt-2 space-y-1.5">
            {monday.bands.slice(1).map((band) => (
              <li key={band.id} className="flex items-center gap-3 text-[0.875rem]">
                <span className="ag-num w-11 shrink-0 font-semibold text-ag-gold">{band.start}</span>
                <span className="truncate">{band.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ week */

export function WeekSection() {
  const kinds = kindFields();
  return (
    <Section tone="white" labelledBy="week-title">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <Heading id="week-title" title="Your whole week, with its reminders." />
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ag-mist lg:justify-self-end">
            Lectures from your fixed timetable and sessions from your reading plan, side by side. Pick a day to see it.
          </p>
        </div>
        <div className="mt-12">
          <WeekAgenda days={exampleWeek()} />
        </div>
        <h3 className="sr-only">Three kinds of timetable</h3>
        <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          {kinds.map((kind, index) => (
            <li
              key={kind.name}
              className={`flex flex-col rounded-[24px] p-6 sm:p-7 ${
                index === 0 ? 'bg-ag-night text-white' : index === 1 ? 'bg-ag-violet text-white' : 'bg-ag-gold text-ag-night'
              }`}
            >
              <p className="text-[1.125rem] font-semibold">{kind.name}</p>
              <p className={`mt-2 text-[0.9375rem] leading-relaxed ${index === 2 ? 'text-ag-night/80' : 'text-white/80'}`}>{kind.sentence}</p>
              <p className="ag-display ag-num mt-6 text-[2.75rem] font-bold leading-none"><CountUpText text={kind.figure} /></p>
              <p className={`mt-2 text-[0.875rem] ${index === 2 ? 'text-ag-night/75' : 'text-white/70'}`}>{kind.caption}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------ Build with AcadeMind */

function QuestionsCard() {
  return (
    <UiCard className="h-full p-6 sm:p-7">
      <UiCardHead
        title={COUPON.heading}
        sub="Six questions, your answers"
        icon={
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ag-night">
            <AcadeMindMark size={22} />
          </span>
        }
      />
      <dl className="mt-5 space-y-3">
        {COUPON.answers.map((answer, index) => (
          <div key={answer.question} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
            <span className="ag-num mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-ag-haze text-[0.8125rem] font-semibold text-ag-violet" aria-hidden="true">
              {index + 1}
            </span>
            <div className="min-w-0">
              <dt className="text-[0.8125rem] font-semibold text-ag-mist">{answer.question}</dt>
              <dd className="mt-1 rounded-xl px-3 py-2 text-[0.9375rem] leading-snug ring-1 ring-ag-ink/12">
                {answer.answer.split(' · ').map((part) => (
                  <span key={part} className="block">
                    {part}
                  </span>
                ))}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <FakeButton className="mt-6 w-full py-3">Build my plan</FakeButton>
    </UiCard>
  );
}

function WorkingCard() {
  const working = planWorking();
  return (
    <UiCard className="h-full p-6 sm:p-7">
      <UiCardHead title="Exam reading plan" sub="What it gave back, before you save" />
      <table className="mt-5 w-full text-left">
        <caption className="sr-only">Why the example plan looks this way</caption>
        {working.groups.map((group) => (
          <tbody key={group.name}>
            <tr>
              <th scope="colgroup" colSpan={2} className="pb-1 pt-4 text-[0.8125rem] font-semibold text-ag-mist first:pt-0">
                {group.name}
              </th>
            </tr>
            {group.rows.map((row) => {
              const [name, detail] = row.label.split(' · ');
              const heads = group.name === 'Heads-up';
              return (
                <tr key={row.label} className="align-top">
                  <th scope="row" className={`border-b border-ag-ink/8 py-2 pr-4 text-[0.875rem] font-normal ${heads ? 'text-[#8A5300]' : 'text-ag-ink'}`}>
                    <span className={heads ? 'font-semibold' : ''}>{name}</span>
                    {detail ? <span className="block text-[0.8125rem] text-ag-mist">{detail}</span> : null}
                  </th>
                  <td className="ag-num whitespace-nowrap border-b border-ag-ink/8 py-2 text-right text-[0.875rem] font-semibold">{row.value}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-4">
              <span className="flex items-center justify-between gap-4 rounded-2xl bg-ag-night px-4 py-3 text-white">
                <span className="text-[0.9375rem] font-semibold">{working.totalRow.label}</span>
                <span className="ag-display ag-num whitespace-nowrap text-[1.5rem] font-bold text-ag-gold">{working.totalRow.value}</span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </UiCard>
  );
}

export function BuildSection() {
  return (
    <Section tone="haze" labelledBy="build-title">
      <Container>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
          <Heading id="build-title" title={COUPON.heading} lead={COUPON.body} />
          <div className="lg:justify-self-end lg:text-right">
            <p className="max-w-md text-[1rem] leading-relaxed text-ag-ink lg:ml-auto">{COUPON.free}</p>
            <div className="mt-5">
              <AuthAction
                variant="night"
                href="/register"
                label={COUPON.action}
                signedIn={{ href: '/timetable/build', label: COUPON.action }}
                timetableOff={TT_PAUSED}
              />
            </div>
          </div>
        </div>
        <div {...reveal('stagger')} className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
          <QuestionsCard />
          <WorkingCard />
        </div>
        <p className="mt-6 max-w-3xl text-[0.9375rem] leading-relaxed text-ag-mist">{COUPON.under}</p>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------- validity, extend */

function ExtendCard() {
  const example = extendExample();
  return (
    <UiCard float className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          <UiCardHead title={example.title} sub={example.kindLine} />
        </div>
        <span className="shrink-0 rounded-full bg-ag-gold/25 px-3 py-1 text-[0.8125rem] font-semibold text-ag-ink">{example.status}</span>
      </div>
      <p className="mt-4 text-[0.9375rem]">{example.validity}</p>
      <div className="mt-5 rounded-2xl bg-ag-haze p-4 sm:p-5">
        <p className="text-[1rem] font-semibold">Extend this timetable</p>
        <p className="mt-1 text-[0.875rem] text-ag-mist">Weekly events keep repeating until the new end date. Nothing else changes.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-ag-ink/10">
            <span className="block text-[0.8125rem] text-ag-mist">Add</span>
            <span className="ag-num block text-[0.9375rem] font-semibold">{example.extended.amount}</span>
          </span>
          <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-ag-ink/10">
            <span className="block text-[0.8125rem] text-ag-mist">Unit</span>
            <span className="block text-[0.9375rem] font-semibold">Weeks</span>
          </span>
        </div>
        <p className="mt-4 text-[0.9375rem] font-semibold">New end: {example.newEnd}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <FakeButton>Extend timetable</FakeButton>
          <FakeButton quiet>Cancel</FakeButton>
        </div>
      </div>
    </UiCard>
  );
}

export function LengthSection() {
  return (
    <Section tone="white" labelledBy="length-title">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
        <div>
          <Heading id="length-title" title="As long as you need it" lead={LENGTH_NOTE} />
          <dl {...reveal('stagger')} className="mt-10 grid grid-cols-2 gap-3">
            {LENGTHS.map((length) => (
              <div key={length.unit} className="rounded-[20px] bg-ag-haze p-5">
                <dt className="ag-display text-[1.5rem] font-bold text-ag-ink">{length.unit}</dt>
                <dd className="mt-1 text-[0.9375rem] leading-snug text-ag-mist">{length.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[0.9375rem] text-ag-ink">{LENGTH_LIMIT_LINE}</p>
        </div>
        <figure className="min-w-0">
          <div aria-hidden="true" className="rounded-[32px] bg-ag-haze p-4 sm:p-6">
            <ExtendCard />
          </div>
          <figcaption className="mt-3 text-center text-[0.875rem] text-ag-mist">Extending a reading plan on the website</figcaption>
        </figure>
      </Container>
    </Section>
  );
}

/* --------------------------------------------------------------- reminders */

function LockScreen() {
  const note = notificationExample();
  const later = exampleWeek()[0].bands.slice(1);
  return (
    <PhoneFrame className="max-w-[320px]">
      <div className="bg-gradient-to-b from-ag-night via-[#2A1E6B] to-[#6A3F7A] px-4 pb-10 pt-4 text-white">
        <div className="flex items-center justify-between px-2 text-[0.8125rem] font-semibold">
          <span>08:50</span>
          <span className="h-5 w-20 rounded-full bg-[#05040F]" />
          <span>No signal</span>
        </div>
        <p className="mt-8 text-center text-[0.875rem] text-white/80">Monday, 30 November</p>
        <p className="ag-display ag-num text-center text-[4rem] font-bold leading-none">08:50</p>
        <div {...reveal('stagger')} className="mt-8 space-y-2.5">
          <NotificationCard title={note.title} body={note.body} />
          <div className="rounded-[20px] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-md">
            <p className="text-[0.8125rem] font-semibold text-white/80">Next reminders, already on your phone</p>
            <ul className="mt-2 space-y-1.5">
              {later.map((band) => (
                <li key={band.id} className="flex items-center gap-3 text-[0.875rem]">
                  <span className="ag-num w-11 shrink-0 font-semibold text-ag-gold">{band.reminder}</span>
                  <span className="truncate">{band.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function RemindersSection() {
  return (
    <Section tone="night" labelledBy="reminders-title">
      <Container>
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            <Heading id="reminders-title" onDark title="A reminder before every class" lead="Set on your phone by the Android app, so it arrives with no data and no signal." />
            <CheckList
              onDark
              className="mt-8"
              items={[
                'Up to 3 reminders per event',
                '10 minutes before, unless you change it',
                'Arrives offline on Android',
                'The next two weeks are always ready; open the app once a fortnight to top them up',
              ]}
            />
            <div className="mt-8 rounded-[24px] bg-white/[0.06] p-6 ring-1 ring-white/10">
              <p className="text-[1rem] font-semibold text-white">Battery tip</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist-night">{TIMETABLE_FAQ[1].answer.split('. ').slice(0, 2).join('. ')}.</p>
            </div>
            <div className="mt-8">
              <ButtonLink href="/app" size="lg">
                Get the Android app
              </ButtonLink>
            </div>
          </div>
          <div aria-hidden="true">
            <LockScreen />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-[32px] bg-white/[0.06] p-6 ring-1 ring-white/10 sm:p-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <h3 className="ag-display text-[1.5rem] font-bold leading-tight text-white sm:text-[1.75rem]">On the website or an iPhone, your calendar reminds you</h3>
            <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-ag-mist-night">
              Download your timetable as a calendar file (.ics) and open it in Google Calendar or your phone&apos;s calendar. Your reminder times come with it.
            </p>
          </div>
          <div className="rounded-[20px] bg-white p-4 text-ag-ink lg:justify-self-end" aria-hidden="true">
            <FakeButton quiet className="w-full">
              Download calendar (.ics)
            </FakeButton>
            <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-ag-mist">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ag-violet/10 text-ag-violet">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Downloaded {ICS_FILE}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --------------------------------------------------------------------- FAQ */

export function TimetableFaq() {
  return (
    <Section tone="white" labelledBy="ttfaq-title">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <Heading id="ttfaq-title" title="Timetable questions" />
        <FaqList items={TIMETABLE_FAQ.map((qa) => ({ question: qa.question, answer: qa.answer }))} />
      </Container>
    </Section>
  );
}

