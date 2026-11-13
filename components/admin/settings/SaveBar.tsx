import { Button } from '@/components/ui/Button';

/** One save bar per settings tab: what is unsaved, Discard, Save. */
export function SaveBar({ label, dirtyParts, saving, error, note, onSave, onDiscard }: {
  /** The Save button's text, e.g. "Save access settings". */
  label: string;
  dirtyParts: string[];
  saving: boolean;
  error?: string | null;
  note?: string | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const dirty = dirtyParts.length > 0;
  return (
    <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-3 shadow-[var(--shadow-popover)]" style={{ zIndex: 'var(--z-sticky)' }}>
      <div className="mr-auto min-w-0 text-sm">
        {error && <p role="alert" className="text-[var(--acade-danger)]">{error}</p>}
        <p role="status" className="text-[var(--acade-text-muted)]">
          {note && <span className="mr-1 text-[var(--acade-text)]">{note}</span>}
          {dirty ? `Unsaved: ${dirtyParts.join(', ')}.` : 'All changes saved.'}
        </p>
      </div>
      <Button variant="ghost" disabled={!dirty || saving} onClick={onDiscard}>Discard changes</Button>
      <Button loading={saving} loadingLabel="Saving…" disabled={!dirty} onClick={onSave}>{label}</Button>
    </div>
  );
}
