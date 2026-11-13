'use client';

import { useCallback, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Modal, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

const MAX_LENGTH = 30_000;

/**
 * Written Analysis system prompt. Storage is unchanged from its old home in
 * Settings: `config/settings.aiSystemPrompt`, through the settings API.
 */
export function CustomInstructions() {
  const { user } = useAuth();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const response = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
      const body = await response.json().catch(() => null) as { settings?: { aiSystemPrompt?: unknown } } | null;
      if (!response.ok || !body) throw new Error('load');
      const value = typeof body.settings?.aiSystemPrompt === 'string' ? body.settings.aiSystemPrompt : '';
      setSaved(value);
      setDraft(value);
    } catch {
      setLoadError('The instructions could not be loaded. Nothing has been changed.');
    }
  }, [user]);

  const toggle = () => {
    setOpen((current) => !current);
    if (!requested) { setRequested(true); void load(); }
  };

  const save = async (value: string) => {
    if (!user) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ field: 'aiSystemPrompt', value }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null;
        throw new Error(typeof body?.error === 'string' ? body.error : 'The instructions could not be saved.');
      }
      setSaved(value);
      setDraft(value);
      setNotice(value ? 'Instructions saved. New Written Analysis requests use them.' : 'Built-in instructions restored.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The instructions could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = saved !== null && draft !== saved;

  return (
    <div className="border-t border-[var(--acade-border-subtle)] pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-semibold text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
      >
        Custom instructions (system prompt)
        <ChevronDown className={cn('size-4 shrink-0 text-[var(--acade-text-muted)] transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="mt-2 space-y-3">
          {loadError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--acade-danger-dim)] px-3 py-2 text-sm text-[var(--acade-text)]">
              {loadError}
              <Button variant="outline" size="sm" onClick={() => void load()}>Try again</Button>
            </div>
          ) : saved === null ? (
            <p role="status" className="text-sm text-[var(--acade-text-muted)]">Loading instructions…</p>
          ) : (
            <>
              <Textarea
                label="Written Analysis instructions"
                value={draft}
                maxLength={MAX_LENGTH}
                rows={8}
                onChange={(event) => { setDraft(event.target.value); setNotice(null); setError(null); }}
                placeholder="Empty: the built-in instructions are used."
                hint={`${draft.length.toLocaleString()} of ${MAX_LENGTH.toLocaleString()} characters. Used by Written Analysis only.`}
                className="text-sm"
              />
              {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
              {notice && <p role="status" className="text-sm text-[var(--acade-text-muted)]">{notice}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" disabled={saving || saved === ''} onClick={() => setConfirmRestore(true)}>Restore built-in instructions</Button>
                <Button variant="outline" size="sm" loading={saving} loadingLabel="Saving instructions…" disabled={!dirty} onClick={() => void save(draft)}>Save instructions</Button>
              </div>
            </>
          )}
        </div>
      )}
      <Modal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title="Restore the built-in instructions?"
        description="Your custom instructions are deleted. New Written Analysis requests use the built-in wording."
        confirm={{ label: 'Restore built-in instructions', loading: saving, onConfirm: () => { setConfirmRestore(false); void save(''); } }}
      >
        <p className="text-sm text-[var(--acade-text-muted)]">Analyses students already have are not changed.</p>
      </Modal>
    </div>
  );
}
