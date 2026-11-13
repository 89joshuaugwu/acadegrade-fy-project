'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { postAdminSettings, settingsCapabilities } from './api';
import { SaveBar } from './SaveBar';
import { LegalVersions } from './LegalVersions';

export interface AccessValues {
  maintenanceMode: boolean;
  disableSignups: boolean;
  disabledFeatures: string[];
  /** `config/settings.ageGate.enforceUnknown`; the server treats a missing value as on. */
  ageGateEnforce: boolean;
}

/**
 * `server: true` ids are refused by the API (503 FEATURE_DISABLED), so they
 * stop the Android app too. The others gate direct Firestore writes the
 * server cannot see, so only the website honours them.
 */
const BASE_FEATURES = [
  { id: 'ai_insights', label: 'Written Analysis', server: true },
  { id: 'extract_slip', label: 'Import result slip', server: true },
  { id: 'add_semester', label: 'Add semester', server: false },
  { id: 'share_code', label: 'Share and import course codes', server: false },
  { id: 'edit_profile', label: 'Edit profile', server: false },
];
/** Shown only when the settings schema accepts them. */
const NEW_FEATURES = [
  { id: 'ai_forecast', label: 'Forecast', server: true },
  { id: 'ai_whatif', label: 'What-If guidance', server: true },
  { id: 'transcript_pdf', label: 'Transcript PDF', server: true },
  { id: 'transcript_share', label: 'Transcript links', server: true },
];

type Confirmation = 'maintenance' | 'signups' | 'ageGate';

const CONFIRMATIONS: Record<Confirmation, { title: string; description: string; label: string }> = {
  maintenance: {
    title: 'Turn on maintenance mode?',
    description: 'Every student is blocked on the website, the Android app and the student APIs until you turn it off. Admins can still sign in.',
    label: 'Turn on maintenance mode and save',
  },
  signups: {
    title: 'Pause new sign-ups?',
    description: 'Nobody can create an account on the website or the Android app until you turn this off. Existing students can still sign in.',
    label: 'Pause sign-ups and save',
  },
  ageGate: {
    title: 'Turn off the age and consent check?',
    description: 'Accounts that have not confirmed their age or allowed AI processing will be able to use AI and scanning. Under-18s and users who declined stay blocked. Turn it back on after the rollout.',
    label: 'Turn off and save',
  },
};

export function AccessSettings({ initial, getToken }: { initial: AccessValues; getToken: () => Promise<string> }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Confirmation[]>([]);

  const supportsAgeGate = useMemo(() => settingsCapabilities.ageGate(), []);
  const features = useMemo(() => {
    const all = [...BASE_FEATURES, ...NEW_FEATURES.filter((feature) => settingsCapabilities.feature(feature.id))];
    return [...all.filter((feature) => feature.server), ...all.filter((feature) => !feature.server)];
  }, []);

  const featuresChanged = draft.disabledFeatures.length !== saved.disabledFeatures.length
    || draft.disabledFeatures.some((id) => !saved.disabledFeatures.includes(id));
  const changes = {
    maintenanceMode: draft.maintenanceMode !== saved.maintenanceMode,
    disableSignups: draft.disableSignups !== saved.disableSignups,
    ageGate: supportsAgeGate && draft.ageGateEnforce !== saved.ageGateEnforce,
    disabledFeatures: featuresChanged,
  };
  const dirtyParts = [
    changes.maintenanceMode && 'maintenance mode',
    changes.disableSignups && 'sign-ups',
    changes.ageGate && 'age and consent check',
    changes.disabledFeatures && 'feature switches',
  ].filter((part): part is string => Boolean(part));

  function edit(patch: Partial<AccessValues>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
    setNote(null);
  }

  function requestSave() {
    const needed: Confirmation[] = [];
    if (changes.maintenanceMode && draft.maintenanceMode) needed.push('maintenance');
    if (changes.disableSignups && draft.disableSignups) needed.push('signups');
    if (changes.ageGate && !draft.ageGateEnforce) needed.push('ageGate');
    if (needed.length) setPending(needed);
    else void save();
  }

  function confirmOne() {
    const rest = pending.slice(1);
    setPending(rest);
    if (rest.length === 0) void save();
  }

  async function save() {
    const submitted = draft;
    const writes: Array<{ part: string; body: unknown; apply: (current: AccessValues) => AccessValues }> = [];
    if (changes.maintenanceMode) writes.push({ part: 'Maintenance mode', body: { field: 'maintenanceMode', value: submitted.maintenanceMode }, apply: (c) => ({ ...c, maintenanceMode: submitted.maintenanceMode }) });
    if (changes.disableSignups) writes.push({ part: 'Sign-ups', body: { field: 'disableSignups', value: submitted.disableSignups }, apply: (c) => ({ ...c, disableSignups: submitted.disableSignups }) });
    if (changes.ageGate) writes.push({ part: 'Age and consent check', body: { field: 'ageGate', value: { enforceUnknown: submitted.ageGateEnforce } }, apply: (c) => ({ ...c, ageGateEnforce: submitted.ageGateEnforce }) });
    if (changes.disabledFeatures) writes.push({ part: 'Feature switches', body: { field: 'disabledFeatures', value: submitted.disabledFeatures }, apply: (c) => ({ ...c, disabledFeatures: submitted.disabledFeatures }) });

    setSaving(true); setError(null); setNote(null);
    const failures: string[] = [];
    try {
      const token = await getToken();
      for (const write of writes) {
        try {
          await postAdminSettings(token, write.body);
          setSaved(write.apply);
        } catch (cause) {
          failures.push(`${write.part}: ${cause instanceof Error ? cause.message : 'not saved'}`);
        }
      }
    } catch {
      failures.push('Your admin session is unavailable. Nothing was saved.');
    } finally {
      setSaving(false);
    }
    if (failures.length) setError(failures.join(' '));
    else setNote('Saved.');
  }

  const confirmation = pending[0] ? CONFIRMATIONS[pending[0]] : null;

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <section aria-labelledby="access-platform-title" className="space-y-1">
          <h2 id="access-platform-title" className="text-lg font-semibold text-[var(--acade-text)]">Platform access</h2>
          <div className="divide-y divide-[var(--acade-border-subtle)]">
            <SwitchRow
              label="Maintenance mode"
              chip="Web + Android + APIs"
              description="Blocks the website, the Android app and student APIs. Admins can still sign in."
              checked={draft.maintenanceMode}
              onChange={(value) => edit({ maintenanceMode: value })}
            />
            <SwitchRow
              label="Pause new sign-ups"
              chip="Web + Android"
              description="Stops new accounts. Existing students can still sign in."
              checked={draft.disableSignups}
              onChange={(value) => edit({ disableSignups: value })}
            />
            {supportsAgeGate && (
              <SwitchRow
                label="Require age confirmation and AI consent for AI"
                chip="Web + Android + APIs"
                description="Accounts that haven't confirmed their age or allowed AI processing can't use AI or scanning until they do. Under-18s and users who declined are always blocked. Turn off temporarily during the Android update rollout if needed."
                checked={draft.ageGateEnforce}
                onChange={(value) => edit({ ageGateEnforce: value })}
                warning="Installed Android apps older than the coming update can't ask these questions, so their users will be blocked from AI until they update. Pair this with a required update notice, or turn it off until most users have updated."
              />
            )}
          </div>
        </section>
      </Card>

      <Card padding="lg">
        <section aria-labelledby="access-features-title">
          <h2 id="access-features-title" className="text-lg font-semibold text-[var(--acade-text)]">Feature switches</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Web + API switches are refused by the server, so they stop the Android app too. Web only switches hide website buttons; the Android app ignores them.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {features.map((feature) => {
              const on = !draft.disabledFeatures.includes(feature.id);
              return (
                <li key={feature.id} className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-[var(--acade-overlay)] px-4 py-2">
                  <span className="min-w-0 text-sm font-medium text-[var(--acade-text)]">
                    {feature.label}
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-normal">
                      <span className={feature.server ? 'rounded-full bg-[var(--acade-primary-dim)] px-2 py-0.5 text-[var(--acade-primary)]' : 'rounded-full bg-[var(--acade-overlay)] px-2 py-0.5 text-[var(--acade-text-muted)] ring-1 ring-[var(--acade-border)]'}>
                        {feature.server ? 'Web + API' : 'Web only'}
                      </span>
                      <span className={on ? 'text-[var(--acade-text-muted)]' : 'font-semibold text-[var(--acade-danger)]'}>{on ? 'On' : 'Off'}</span>
                    </span>
                  </span>
                  <Switch
                    aria-label={feature.label}
                    checked={on}
                    onCheckedChange={(value) => edit({
                      disabledFeatures: value
                        ? draft.disabledFeatures.filter((id) => id !== feature.id)
                        : [...draft.disabledFeatures, feature.id],
                    })}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </Card>

      <SaveBar label="Save access settings" dirtyParts={dirtyParts} saving={saving} error={error} note={note} onSave={requestSave} onDiscard={() => { setDraft(saved); setError(null); setNote(null); }} />

      <LegalVersions getToken={getToken} />

      <Modal
        open={confirmation !== null}
        onClose={() => setPending([])}
        title={confirmation?.title ?? ''}
        description={confirmation?.description}
        confirm={confirmation ? { label: confirmation.label, onConfirm: confirmOne, loading: saving } : undefined}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">This takes effect as soon as it saves.</p>
      </Modal>
    </div>
  );
}

function SwitchRow({ label, chip, description, warning, checked, onChange }: {
  label: string;
  chip: string;
  description: string;
  warning?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--acade-text)]">
          {label}
          <span className="rounded-full bg-[var(--acade-primary-dim)] px-2 py-0.5 text-xs font-medium text-[var(--acade-primary)]">{chip}</span>
        </p>
        <p className="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--acade-text-muted)]">{description}</p>
        {warning && <p className="mt-2 max-w-[65ch] rounded-lg bg-[var(--acade-warning)]/10 px-3 py-2 text-sm leading-6 text-[var(--acade-text)]">{warning}</p>}
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}
