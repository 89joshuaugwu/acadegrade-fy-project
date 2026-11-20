import type { ReactNode } from 'react';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { computeExampleSlip } from '@/lib/public/example-student';
import type { ExtraId } from '@/lib/public/features-android';
import { scannerSlip } from '@/lib/public/features-scanner';
import { exampleWeek, notificationExample } from '@/lib/public/features-timetable';
import { AcadeGradeMark } from '@/components/public/Logo';
import { ArcGauge } from '@/components/site/ArcGauge';
import { FakeButton, GradePill, NotificationCard } from './shared';

/**
 * The Android app's screens rebuilt in HTML with the example student's data
 * (no screenshots, no real names), for PhoneFrame. Every screen has the same
 * height so the frame never jumps when a tab changes.
 */

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 pt-4 text-[0.8125rem] font-semibold ${dark ? 'text-white' : 'text-ag-ink'}`}>
      <span>09:00</span>
      <span className="h-5 w-20 rounded-full bg-[#05040F]" />
      <span>4G</span>
    </div>
  );
}

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-[560px] flex-col bg-ag-haze">
      <StatusBar />
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-4">
        <AcadeGradeMark size={24} />
        <span className="text-[1rem] font-semibold">{title}</span>
      </div>
      <div className="min-h-0 flex-1 px-4 pb-5">{children}</div>
    </div>
  );
}

export function DashboardScreen() {
  const slip = computeExampleSlip();
  return (
    <Screen title="Dashboard">
      <div className="rounded-[20px] bg-ag-night p-4 text-white">
        <div className="flex items-center gap-4">
          <div className="relative w-28 shrink-0">
            <ArcGauge value={slip.cgpa} className="block h-auto w-full" />
            <span className="ag-display ag-num absolute inset-0 grid place-items-center pb-1 text-[1.625rem] font-bold">{formatCgpa(slip.cgpa)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[0.8125rem] text-ag-mist-night">CGPA, {slip.totalUnits} units</p>
            <p className="mt-1 text-[0.875rem] font-semibold">{slip.classBand.label}</p>
            <p className="mt-1 text-[0.8125rem] text-ag-gold">{formatCgpa(slip.toFirstClass)} to First Class</p>
          </div>
        </div>
      </div>
      <p className="mt-4 px-1 text-[0.8125rem] font-semibold text-ag-mist">2025/2026 First Semester</p>
      <ul className="mt-2 space-y-2">
        {slip.rows.map((row) => (
          <li key={row.code} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-semibold">{row.code}</span>
              <span className="block truncate text-[0.8125rem] text-ag-mist">{row.title}</span>
            </span>
            <GradePill grade={row.grade} />
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function RemindersScreen() {
  const monday = exampleWeek()[0];
  const note = notificationExample();
  return (
    <Screen title="Timetable">
      <NotificationCard title={note.title} body={note.body} className="-mt-1 mb-4" />
      <p className="px-1 text-[0.8125rem] font-semibold text-ag-mist">{monday.long}</p>
      <ul className="mt-2 space-y-2">
        {monday.bands.map((band) => (
          <li key={band.id} className="flex gap-3 rounded-2xl bg-white p-3">
            <span className="ag-num w-11 shrink-0 text-[0.8125rem] font-semibold text-ag-violet">{band.start}</span>
            <span className="min-w-0">
              <span className="block truncate text-[0.875rem] font-semibold">{band.title}</span>
              <span className="block text-[0.8125rem] text-ag-mist">Reminder {band.reminder}</span>
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function ScannerScreen() {
  const slip = scannerSlip();
  return (
    <div className="flex h-[560px] flex-col bg-[#05040F] text-white">
      <StatusBar dark />
      <p className="px-5 pt-4 text-[1rem] font-semibold">Scan result slip</p>
      <div className="relative mx-4 mt-4 flex-1 rounded-[20px] bg-[#1C1840] p-4">
        <div className="absolute inset-3 rounded-[16px] border-2 border-ag-gold/80" />
        <div className="relative mt-6 rotate-[-2deg] rounded-lg bg-white p-3 text-ag-ink shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
          <p className="text-center text-[0.8125rem] font-semibold">{slip.heading}</p>
          <table className="mt-2 w-full text-[0.8125rem]" aria-hidden="true">
            <tbody className="ag-num">
              {slip.rows.map((row) => (
                <tr key={row.code} className="border-t border-ag-ink/10">
                  <td className="py-1 font-semibold">{row.code}</td>
                  <td className="py-1 text-right">{row.total}</td>
                  <td className="py-1 text-right font-semibold">{row.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="px-5 pt-4 text-center text-[0.8125rem] text-white/75">Hold steady. Lay the slip flat in good light.</p>
      <div className="flex justify-center px-5 pb-6 pt-4">
        <span className="grid h-16 w-16 place-items-center rounded-full ring-4 ring-white/80">
          <span className="h-12 w-12 rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}

function LockScreen() {
  return (
    <div className="flex h-[560px] flex-col items-center bg-ag-night text-center text-white">
      <div className="w-full">
        <StatusBar dark />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <span className="grid h-24 w-24 place-items-center rounded-[28px] bg-white/10">
          <AcadeGradeMark size={60} />
        </span>
        <p className="mt-6 text-[1.125rem] font-semibold">AcadeGrade is locked</p>
        <p className="mt-2 text-[0.875rem] text-ag-mist-night">Use your fingerprint, face or phone passcode.</p>
        <div className="mt-8 w-full space-y-2">
          <span className="block rounded-xl bg-ag-gold px-4 py-3 text-[0.9375rem] font-semibold text-ag-night">Unlock Now</span>
          <span className="block rounded-xl bg-white/10 px-4 py-3 text-[0.9375rem] font-semibold">Use Passcode</span>
        </div>
      </div>
    </div>
  );
}

function Toggle() {
  return (
    <span className="relative h-7 w-12 shrink-0 rounded-full bg-ag-violet">
      <span className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white" />
    </span>
  );
}

function PrivacyScreen() {
  return (
    <Screen title="Screen privacy">
      <div className="space-y-2">
        {[
          { title: 'Block screenshots and hide app preview', sub: 'Recent apps shows a blank card.' },
          { title: 'App Lock', sub: 'Fingerprint, face or passcode' },
        ].map((setting) => (
          <div key={setting.title} className="flex items-center gap-4 rounded-2xl bg-white p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold leading-snug">{setting.title}</span>
              <span className="mt-0.5 block text-[0.8125rem] text-ag-mist">{setting.sub}</span>
            </span>
            <Toggle />
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-white/60 p-4 ring-1 ring-ag-ink/5">
        <p className="text-[0.8125rem] font-semibold text-ag-mist">Recent apps</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <span className="h-36 rounded-xl bg-ag-night" />
          <span className="h-36 rounded-xl bg-ag-ink/10" />
        </div>
      </div>
    </Screen>
  );
}

function UpdatesScreen() {
  const slip = computeExampleSlip();
  return (
    <Screen title="Dashboard">
      <p className="px-1 text-[0.8125rem] text-ag-mist">CGPA</p>
      <p className="ag-display ag-num px-1 text-[2.75rem] font-bold leading-none">{formatCgpa(slip.cgpa)}</p>
      <div className="mt-24 rounded-[24px] bg-white p-5 shadow-[0_-12px_40px_-12px_rgba(14,11,43,0.25)]">
        <span className="mx-auto block h-1 w-10 rounded-full bg-ag-ink/15" />
        <p className="mt-4 text-[1rem] font-semibold">A new version is ready</p>
        <p className="mt-1 text-[0.875rem] leading-snug text-ag-mist">Download it from AcadeGrade and install it over this one. Your record stays.</p>
        <div className="mt-4 space-y-2">
          <FakeButton className="w-full">Get the update</FakeButton>
          <FakeButton quiet className="w-full">
            Later
          </FakeButton>
        </div>
      </div>
    </Screen>
  );
}

function CoinsScreen({ coinsPerAd }: { coinsPerAd: number }) {
  return (
    <Screen title="Coins">
      <div className="rounded-[20px] bg-ag-night p-5 text-white">
        <p className="text-[0.8125rem] text-ag-mist-night">Balance</p>
        <p className="ag-display ag-num text-[3rem] font-bold leading-none text-ag-gold">6</p>
      </div>
      <div className="mt-4 rounded-[20px] bg-white p-5">
        <p className="text-[1rem] font-semibold">Watch a short ad</p>
        <p className="mt-1 text-[0.875rem] text-ag-mist">Earn {coinsPerAd} coins for extra AcadeMind uses.</p>
        <FakeButton className="mt-4 w-full">Watch an ad</FakeButton>
      </div>
    </Screen>
  );
}

export function phoneScreen(id: ExtraId, coinsPerAd: number | null): ReactNode {
  switch (id) {
    case 'reminders':
      return <RemindersScreen />;
    case 'scanner':
      return <ScannerScreen />;
    case 'lock':
      return <LockScreen />;
    case 'privacy':
      return <PrivacyScreen />;
    case 'updates':
      return <UpdatesScreen />;
    default:
      return <CoinsScreen coinsPerAd={coinsPerAd ?? 2} />;
  }
}
