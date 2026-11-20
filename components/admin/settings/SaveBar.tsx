import { CircleCheck, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

/** One save bar per settings tab: what is unsaved, Discard, Save. It sticks to the bottom while there is something to save. */
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
    <div
      className={cn(
        'sticky bottom-3 flex flex-col gap-3 rounded-[20px] border bg-[var(--acade-surface)] p-3 sm:flex-row sm:items-center sm:gap-4 sm:pl-5',
        dirty
          ? 'border-[color-mix(in_srgb,var(--acade-primary)_40%,transparent)] shadow-[0_12px_32px_-20px_rgba(14,11,43,0.45)]'
          : 'border-[var(--acade-border-subtle)]',
      )}
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5 text-sm">
        {dirty
          ? <CircleDot className="mt-0.5 size-4 shrink-0 text-[var(--acade-warning)]" aria-hidden="true" />
          : <CircleCheck className="mt-0.5 size-4 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />}
        <div className="min-w-0">
          {error && <p role="alert" className="font-medium text-[var(--acade-danger)]">{error}</p>}
          <p role="status" className="text-[var(--acade-text-muted)]">
            {note && <span className="mr-1 font-medium text-[var(--acade-text)]">{note}</span>}
            {dirty ? `Unsaved: ${dirtyParts.join(', ')}.` : 'All changes saved.'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" disabled={!dirty || saving} onClick={onDiscard}>Discard changes</Button>
        <Button size="sm" className="flex-1 sm:flex-none" loading={saving} loadingLabel="Saving…" disabled={!dirty} onClick={onSave}>{label}</Button>
      </div>
    </div>
  );
}
