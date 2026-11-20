'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ValidityFields } from './fields';
import { extendValidity, localNowISO, formatEndsAt } from '@/lib/timetable/format';
import { TIMETABLE_LIMITS, UNITS } from '@/lib/timetable/validate';
import type { Timetable, ValidityUnit } from '@/lib/timetable/engine';

/** Asks how long to extend for, and returns the new validity. Weekly events keep repeating until the new end. */
export function ExtendPanel({
  timetable,
  saving,
  onConfirm,
  onCancel,
}: {
  timetable: Timetable;
  saving?: boolean;
  onConfirm: (validity: Timetable['validity']) => void;
  onCancel: () => void;
}) {
  const [unit, setUnit] = useState<ValidityUnit>(timetable.validity.unit);
  const [amount, setAmount] = useState<number>(timetable.validity.amount);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= TIMETABLE_LIMITS.maxAmount;
  const preview = valid ? extendValidity(timetable, unit, amount, localNowISO()) : null;
  return (
    <Card aria-label="Extend timetable" role="group" className="border-[var(--acade-gold)]/35">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--acade-gold-dim)] text-[var(--acade-gold)]">
          <CalendarClock className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">Extend this timetable</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            Weekly events keep repeating until the new end date. Nothing else changes.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <ValidityFields
          startsOn={timetable.validity.startsOn}
          unit={unit}
          amount={amount}
          units={UNITS}
          startLabel="Original start"
          lockStart
          onChange={(n) => {
            setUnit(n.unit);
            setAmount(n.amount);
          }}
        />
      </div>
      {preview && (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 rounded-2xl bg-[var(--acade-void)] px-4 py-3 text-sm text-[var(--acade-text-muted)]" role="note">
          New end:
          <span className="font-semibold tabular-nums text-[var(--acade-text)]">{formatEndsAt({ ...timetable, validity: preview })}</span>
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={!valid} loading={saving} loadingLabel="Extending" onClick={() => preview && onConfirm(preview)}>
          Extend timetable
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
