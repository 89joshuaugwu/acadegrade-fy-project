'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { ValidityFields, PageNotice } from './fields';
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
    <Card aria-label="Extend timetable" role="group">
      <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Extend this timetable</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
        Weekly events keep repeating until the new end date. Nothing else changes.
      </p>
      <div className="mt-4">
        <ValidityFields
          startsOn={timetable.validity.startsOn}
          unit={unit}
          amount={amount}
          units={UNITS}
          startLabel="Original start"
          onChange={(n) => {
            setUnit(n.unit);
            setAmount(n.amount);
          }}
        />
      </div>
      {preview && (
        <div className="mt-4">
          <PageNotice>New end: {formatEndsAt({ ...timetable, validity: preview })}</PageNotice>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
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
