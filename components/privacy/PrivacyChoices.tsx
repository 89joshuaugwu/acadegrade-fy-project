'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Download, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { CookieChoicesButton } from '@/components/privacy/CookieChoicesButton';
import {
  MINOR_NOTICE,
  fetchRequirementsState,
  openRequirements,
  readPrivacyState,
  type PrivacyState,
  submitAgeStatus,
  submitRequirementAnswers,
} from '@/lib/consent/requirements';
import { useDiscreetMode } from '@/lib/discreet';
import {
  buildDataExport,
  collectExportData,
  coursesToCsv,
  downloadText,
  exportFileNames,
  type ExportReaders,
} from '@/lib/export';

interface PrivacyChoicesProps {
  uid: string;
  profile: unknown;
  getToken: () => Promise<string>;
  /** Firestore readers for the export; defaults to the client SDK helpers. */
  readers?: ExportReaders;
}

async function defaultReaders(): Promise<ExportReaders> {
  const { queryCollection, getDocument } = await import('@/lib/firebase/firestore');
  return {
    queryCollection: <T,>(path: string) => queryCollection<T>(path),
    getDocument: <T,>(path: string) => getDocument<T>(path),
  };
}

type Pref = 'ai' | 'marketing';

function SettingRow({ titleId, title, description, children }: { titleId: string; title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 id={titleId} className="text-sm font-semibold text-[var(--acade-text)]">{title}</h3>
        <div className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Settings → "Privacy & AI choices" (anchor #privacy): consents, the
 * under-18 notice and upgrade, discreet mode, cookie choices and data export.
 */
export function PrivacyChoices({ uid, profile, getToken, readers }: PrivacyChoicesProps) {
  const ids = useId();
  // The server's recorded answers (`current`) win over the profile copy when available.
  const [serverState, setServerState] = useState<PrivacyState | null>(null);
  const state = serverState ?? readPrivacyState(profile);

  useEffect(() => {
    let active = true;
    // Fails soft: without the recorded answers the section falls back to the profile copy.
    void Promise.resolve()
      .then(() => getToken())
      .then((token) => fetchRequirementsState(token))
      .then((result) => { if (active && result?.current) setServerState(result.current); })
      .catch(() => undefined);
    return () => { active = false; };
    // Load once per account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
  const { enabled: discreet, setEnabled: setDiscreet } = useDiscreetMode();
  // A local value shown while saving, valid only while the profile still holds the value it replaced.
  const [override, setOverride] = useState<Partial<Record<Pref, { value: boolean; base: boolean }>>>({});
  const [pending, setPending] = useState<Pref | null>(null);
  const [error, setError] = useState<{ pref: Pref | 'age'; message: string } | null>(null);
  const [ageDialog, setAgeDialog] = useState(false);
  const [ageSaving, setAgeSaving] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  const ageStatus = upgraded ? 'adult' : state.ageStatus;
  const isMinor = ageStatus === 'minor';
  const stored: Record<Pref, boolean> = { ai: state.aiConsent === true, marketing: state.marketingConsent === true };
  const effective = (pref: Pref) => {
    const local = override[pref];
    return local && local.base === stored[pref] ? local.value : stored[pref];
  };
  const aiOn = effective('ai');
  const marketingOn = effective('marketing');

  const savePref = async (pref: Pref, value: boolean) => {
    setPending(pref);
    setError(null);
    setOverride((current) => ({ ...current, [pref]: { value, base: stored[pref] } }));
    try {
      const token = await getToken();
      const result = await submitRequirementAnswers(token, pref === 'ai' ? { aiConsent: value } : { marketingConsent: value });
      if (!result.ok) {
        setOverride((current) => { const next = { ...current }; delete next[pref]; return next; });
        setError({ pref, message: result.message });
        return;
      }
      if (result.current) {
        // The response is the new truth; without it the override holds until the profile catches up.
        setServerState(result.current);
        setOverride((current) => { const next = { ...current }; delete next[pref]; return next; });
      }
      toast.success(pref === 'ai'
        ? (value ? 'AI analysis and scanning allowed' : 'AI processing turned off')
        : (value ? 'Product news turned on' : 'Product news turned off'));
    } catch {
      setOverride((current) => { const next = { ...current }; delete next[pref]; return next; });
      setError({ pref, message: 'Your choice could not be saved. Check your connection and try again.' });
    } finally {
      setPending(null);
    }
  };

  const confirmAdult = async () => {
    setAgeSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await submitAgeStatus(token, 'adult');
      if (!result.ok) {
        setError({ pref: 'age', message: result.message });
        setAgeDialog(false);
        return;
      }
      setUpgraded(true);
      setServerState((current) => (current ? { ...current, ageStatus: 'adult' } : current));
      setAgeDialog(false);
      toast.success('Age updated. You can now choose whether to allow AI features.');
    } catch {
      setError({ pref: 'age', message: 'Your age could not be updated. Try again shortly.' });
      setAgeDialog(false);
    } finally {
      setAgeSaving(false);
    }
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const data = await collectExportData(uid, profile, readers ?? await defaultReaders());
      const now = new Date();
      const names = exportFileNames(now);
      const exported = buildDataExport({ ...data, exportedAt: now });
      downloadText(names.json, JSON.stringify(exported, null, 2), 'application/json');
      downloadText(names.csv, coursesToCsv(data.semesters), 'text/csv;charset=utf-8');
      setExportDialog(false);
      toast.success('Your data was downloaded');
    } catch {
      toast.error('Your data could not be prepared. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  const inlineError = (pref: Pref | 'age') => error?.pref === pref && (
    <p role="alert" className="mt-2 text-sm font-medium text-[var(--acade-danger)]">{error.message}</p>
  );

  return (
    <section
      id="privacy"
      aria-labelledby={`${ids}-title`}
      className="relative scroll-mt-24 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-6"
    >
      <h2 id={`${ids}-title`} className="flex items-center gap-2 text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">
        <ShieldCheck size={20} aria-hidden="true" /> Privacy &amp; AI choices
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
        Decide what AcadeGrade may do with your records. Changes apply to your account straight away.
      </p>

      {isMinor && (
        <p className="mt-5 rounded-[var(--radius-control)] border border-[var(--acade-info)]/30 bg-[var(--acade-info)]/10 px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
          {MINOR_NOTICE}
        </p>
      )}

      <div className="mt-2 divide-y divide-[var(--acade-border-subtle)]">
        {isMinor ? (
          <SettingRow
            titleId={`${ids}-age`}
            title="Your age"
            description={<>Your account is set up for someone under 18. If you have since turned 18, update it here.{inlineError('age')}</>}
          >
            <Button variant="outline" size="sm" onClick={() => setAgeDialog(true)}>I&apos;ve turned 18</Button>
          </SettingRow>
        ) : (
          <>
            {ageStatus === null && (
              <SettingRow
                titleId={`${ids}-age`}
                title="Confirm your age"
                description="AI features and result scanning need your age confirmed once."
              >
                <Button variant="outline" size="sm" onClick={() => openRequirements('ai')}>Confirm age</Button>
              </SettingRow>
            )}
            <SettingRow
              titleId={`${ids}-ai`}
              title="AI analysis and result scanning"
              description={<>
                Sends your results and scanned slips to AI providers (Google Gemini, Groq, OpenRouter) to write analysis and read result slips.
                Your name, email and matric number are not included in prompts, but a scanned slip may show them.
                {inlineError('ai')}
              </>}
            >
              <Switch aria-labelledby={`${ids}-ai`} checked={aiOn} pending={pending === 'ai'} onCheckedChange={(value) => void savePref('ai', value)} />
            </SettingRow>
          </>
        )}

        <SettingRow
          titleId={`${ids}-marketing`}
          title="Product news by email"
          description={<>Occasional emails about new AcadeGrade features. Off unless you turn it on.{inlineError('marketing')}</>}
        >
          <Switch aria-labelledby={`${ids}-marketing`} checked={marketingOn} pending={pending === 'marketing'} onCheckedChange={(value) => void savePref('marketing', value)} />
        </SettingRow>

        <SettingRow
          titleId={`${ids}-discreet`}
          title="Discreet mode on this device"
          description="Blurs your CGPA, GPA and grades until you tap them. Useful in lecture halls and on shared phones."
        >
          <Switch aria-labelledby={`${ids}-discreet`} checked={discreet} onCheckedChange={setDiscreet} />
        </SettingRow>

        <SettingRow
          titleId={`${ids}-cookies`}
          title="Cookies and ads"
          description="Choose whether advertising cookies may be used in this browser."
        >
          <CookieChoicesButton className="min-h-12 rounded-[var(--radius-control)] border border-[var(--acade-control-border)] px-4 no-underline hover:no-underline hover:bg-[var(--acade-overlay)]" />
        </SettingRow>

        <SettingRow
          titleId={`${ids}-export`}
          title="Download my data"
          description="A JSON file of your profile, semesters, courses, saved insights and notifications, plus a spreadsheet (CSV) of your courses."
        >
          <Button variant="outline" size="sm" onClick={() => setExportDialog(true)}>
            <Download size={16} className="mr-2" aria-hidden="true" /> Download my data
          </Button>
        </SettingRow>

        <div className="py-4">
          <h3 className="text-sm font-semibold text-[var(--acade-text)]">Documents and your account</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            Read the{' '}
            <Link href="/terms" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">Terms of Use</Link>
            {' '}and{' '}
            <Link href="/privacy" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">Privacy Policy</Link>.
            To delete your account and every record, use Delete in Security &amp; data below.
          </p>
        </div>
      </div>

      <Modal
        open={ageDialog}
        onClose={() => !ageSaving && setAgeDialog(false)}
        title="Confirm you are 18 or older"
        description="This changes your account to an adult account. It cannot be changed back without contacting support."
        size="confirm"
      >
        <p className="text-sm leading-6 text-[var(--acade-text-muted)]">
          After this, you can choose whether to allow AI analysis and result scanning.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setAgeDialog(false)} disabled={ageSaving}>Cancel</Button>
          <Button onClick={() => void confirmAdult()} loading={ageSaving}>Yes, I&apos;m 18 or older</Button>
        </div>
      </Modal>

      <Modal
        open={exportDialog}
        onClose={() => !exporting && setExportDialog(false)}
        title="Download your data"
        description="Two files will be saved to this device: your full record (JSON) and your courses (CSV)."
        size="confirm"
      >
        <p className="rounded-[var(--radius-control)] border border-[var(--acade-warning)]/30 bg-[var(--acade-gold-dim)] px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
          These files contain your grades and personal details. On a shared or public device, delete them from Downloads after you have saved them somewhere safe.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setExportDialog(false)} disabled={exporting}>Cancel</Button>
          <Button onClick={() => void runExport()} loading={exporting}>Download files</Button>
        </div>
      </Modal>
    </section>
  );
}
