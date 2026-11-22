'use client';

import { useId, useState } from 'react';
import { Check, Plus, Ruler, X } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  CUSTOM_SCALE_LIMITS,
  READY_SCALE_IDS,
  SCALES,
  formatCgpa,
  scaleBandRanges,
  validateCustomScale,
  validateNceClasses,
  type GradingScale,
  type GradingScaleId,
  type NceClassBoundaries,
} from '@/lib/cgpa/academicRules';
import { classesWithTone } from '@/lib/cgpa/scale';
import {
  customDraftFromScale,
  customDraftFromStored,
  customDraftToInput,
  fieldErrors,
  settingFor,
  storedCustomScale,
  type CustomScaleDraft,
  type StoredGradingScale,
} from '@/lib/cgpa/scaleSetting';
import { previewScaleSwitch, type ScaleSwitchPreview, type SemesterUnderScale, type SwitchSemester } from '@/lib/cgpa/scaleSwitch';
import { useGradingScale } from '@/hooks/useGradingScale';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';

export interface GradingScaleSectionProps {
  /** Every semester with its courses, oldest first. */
  loadSemesters: () => Promise<SwitchSemester[]>;
  /** Saves the choice and the recalculated totals. */
  onApply: (setting: StoredGradingScale, semesters: readonly SemesterUnderScale[]) => Promise<void>;
  disabled?: boolean;
}

type Choice = GradingScaleId;

interface Pending {
  setting: StoredGradingScale;
  scale: GradingScale;
}

const NCE_FIELDS = [
  { key: 'distinction', label: 'Distinction starts at' },
  { key: 'credit', label: 'Credit starts at' },
  { key: 'merit', label: 'Merit starts at' },
  { key: 'pass', label: 'Pass starts at' },
] as const;

/** "A 70+ = 5 · B 60+ = 4 · ... · F under 40 = 0" */
function bandsLine(scale: GradingScale): string {
  const ranges = scaleBandRanges(scale);
  return ranges
    .map((band, index) => (band.minScore > 0 || index === 0
      ? `${band.grade} ${band.minScore}+ = ${band.gradePoint}`
      : `${band.grade} under ${ranges[index - 1].minScore} = ${band.gradePoint}`))
    .join(' · ');
}

function classesLine(scale: GradingScale): string {
  return classesWithTone(scale)
    .filter((cls) => cls.minCgpa > 0)
    .map((cls) => `${cls.name} ${formatCgpa(cls.minCgpa)}`)
    .join(' · ');
}

const numberText = (value: number | undefined) => (value === undefined ? '' : String(value));

/**
 * Settings → Grading scale. A custom radio list of the ready-made scales (each
 * showing its bands and classes), a custom-scale editor and the NCE class
 * boundary editor. Every change is previewed (CGPA and class before and after,
 * letters the new scale does not have) and needs confirmation. Scores are never
 * changed, so switching back is always possible.
 */
export function GradingScaleSection({ loadSemesters, onApply, disabled = false }: GradingScaleSectionProps) {
  const headingId = useId();
  const { scale: active, setting } = useGradingScale();
  const activeId: Choice = active.id;
  const [selected, setSelected] = useState<Choice>(activeId);

  const [draft, setDraft] = useState<CustomScaleDraft>(() => (
    setting?.custom ? customDraftFromStored(setting.custom) : customDraftFromScale(active.id === 'custom' ? SCALES.ng5 : active)
  ));
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [nce, setNce] = useState<Record<keyof NceClassBoundaries, string>>(() => {
    const classes = SCALES.nce5.classes;
    return {
      distinction: numberText(setting?.nceClasses?.distinction ?? classes[0].minCgpa),
      credit: numberText(setting?.nceClasses?.credit ?? classes[1].minCgpa),
      merit: numberText(setting?.nceClasses?.merit ?? classes[2].minCgpa),
      pass: numberText(setting?.nceClasses?.pass ?? classes[3].minCgpa),
    };
  });
  const [nceErrors, setNceErrors] = useState<Record<string, string>>({});

  const [pending, setPending] = useState<Pending | null>(null);
  const [preview, setPreview] = useState<ScaleSwitchPreview | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [saving, setSaving] = useState(false);

  const keep = { custom: setting?.custom ?? null, nceClasses: setting?.nceClasses ?? null };

  const openPreview = async (next: Pending) => {
    setPending(next);
    setPreview(null);
    setPreviewError(false);
    try {
      const semesters = await loadSemesters();
      setPreview(previewScaleSwitch(semesters, active, next.scale));
    } catch {
      setPreviewError(true);
    }
  };

  const choose = (id: Choice) => {
    if (disabled) return;
    setSelected(id);
    if (id === 'custom' || id === activeId) return;
    if (id === 'nce5') {
      // The college's saved boundaries come back with it.
      const saved = validateNceClasses(setting?.nceClasses);
      void openPreview({ setting: settingFor('nce5', keep), scale: saved.ok ? saved.scale : SCALES.nce5 });
      return;
    }
    void openPreview({ setting: settingFor(id, keep), scale: SCALES[id as Exclude<Choice, 'custom'>] });
  };

  const previewCustom = () => {
    const input = customDraftToInput(draft);
    const result = validateCustomScale(input);
    if (!result.ok) {
      setCustomErrors(fieldErrors(result.errors));
      return;
    }
    setCustomErrors({});
    void openPreview({ setting: settingFor('custom', { ...keep, custom: storedCustomScale(result.scale) }), scale: result.scale });
  };

  const previewNce = () => {
    const values: NceClassBoundaries = {};
    for (const { key } of NCE_FIELDS) {
      const text = nce[key].trim();
      values[key] = text === '' ? Number.NaN : Number(text);
    }
    const result = validateNceClasses(values);
    if (!result.ok) {
      setNceErrors(fieldErrors(result.errors));
      return;
    }
    setNceErrors({});
    void openPreview({ setting: settingFor('nce5', { ...keep, nceClasses: values }), scale: result.scale });
  };

  const closePreview = () => {
    if (saving) return;
    setPending(null);
    setPreview(null);
    // A ready-made scale only stays picked once it is saved; editors stay open.
    if (selected !== 'custom' && !(selected === 'nce5' && activeId === 'nce5')) setSelected(activeId);
  };

  const confirm = async () => {
    if (!pending || !preview) return;
    setSaving(true);
    try {
      await onApply(pending.setting, preview.semesters);
      toast.success(`Grading scale changed to ${pending.scale.name}`);
      setSelected(pending.setting.id);
      setPending(null);
      setPreview(null);
    } catch {
      toast.error('Could not change your grading scale. Nothing was lost; try again.');
    } finally {
      setSaving(false);
    }
  };

  const options: { id: Choice; scale: GradingScale | null }[] = [
    ...READY_SCALE_IDS.map((id) => ({ id: id as Choice, scale: id === 'nce5' && active.id === 'nce5' ? active : SCALES[id] })),
    { id: 'custom', scale: active.id === 'custom' ? active : null },
  ];

  return (
    <section id="section-grading" aria-labelledby={headingId} className="relative scroll-mt-24 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-6">
      <h2 id={headingId} className="flex items-center gap-2 text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">
        <Ruler size={20} aria-hidden="true" /> Grading scale
      </h2>
      <p className="mt-1 max-w-prose text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]">
        Pick the scale your school uses. Your scores stay as they are; grades, points and classes follow the scale, and you can switch back at any time.
      </p>

      <div role="radiogroup" aria-label="Grading scale" className="mt-5 flex flex-col gap-2">
        {options.map(({ id, scale }) => {
          const checked = selected === id;
          const inUse = activeId === id;
          const name = scale?.name ?? (id === 'custom' ? 'Custom' : '');
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => choose(id)}
              className={cn(
                'flex min-h-14 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] disabled:cursor-not-allowed disabled:opacity-60',
                checked
                  ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)]'
                  : 'border-[var(--acade-border)] bg-[var(--acade-surface)] hover:border-[var(--acade-control-border)]'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                  checked ? 'border-[var(--acade-primary)] bg-[var(--acade-primary)] text-[var(--acade-on-primary)]' : 'border-[var(--acade-control-border)]'
                )}
              >
                {checked && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">{name}</span>
                  {scale && <span className="text-[0.8125rem] text-[var(--acade-text-muted)]">top point {scale.maxPoint}</span>}
                  {inUse && <span className="rounded-full bg-[var(--acade-gold-dim)] px-2 py-0.5 text-[0.75rem] font-semibold text-[var(--acade-warning)]">In use</span>}
                </span>
                {scale ? (
                  <>
                    <span className="mt-1 block text-[0.8125rem] leading-5 tabular-nums text-[var(--acade-text-muted)]">{bandsLine(scale)}</span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-5 tabular-nums text-[var(--acade-text-muted)]">{classesLine(scale)}</span>
                  </>
                ) : (
                  <span className="mt-1 block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Set your own grades, points and classes from your handbook.</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {selected === 'custom' && (
        <CustomScaleEditor
          draft={draft}
          errors={customErrors}
          disabled={disabled}
          onChange={(next) => { setDraft(next); if (Object.keys(customErrors).length) setCustomErrors(fieldErrors(validateResult(next))); }}
          onPreview={previewCustom}
        />
      )}

      {selected === 'nce5' && activeId === 'nce5' && (
        <fieldset aria-label="NCE class boundaries" className="mt-5 rounded-xl border border-[var(--acade-border-subtle)] p-4">
          <legend className="px-1 text-[length:var(--text-sm)] font-bold text-[var(--acade-text)]">Class boundaries</legend>
          <p className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Colleges set these differently. Use the lowest CGPA for each class from your college handbook.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NCE_FIELDS.map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                inputMode="decimal"
                value={nce[key]}
                disabled={disabled}
                error={nceErrors[key]}
                onChange={(event) => setNce((previous) => ({ ...previous, [key]: event.target.value }))}
              />
            ))}
          </div>
          {nceErrors.nceClasses && <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--acade-danger)]">{nceErrors.nceClasses}</p>}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={previewNce} disabled={disabled}>Preview change</Button>
          </div>
        </fieldset>
      )}

      <Modal
        open={pending !== null}
        onClose={closePreview}
        title={pending ? `Switch to ${pending.scale.name}?` : 'Switch grading scale?'}
        description="Your scores stay the same. Grades, points and classes are worked out again on the new scale."
      >
        <div aria-live="polite" className="mt-4 space-y-4">
          {previewError ? (
            <p role="alert" className="text-[length:var(--text-sm)] text-[var(--acade-danger)]">Your results could not be loaded for the preview. Check your connection and try again.</p>
          ) : !preview ? (
            <div aria-label="Working out the change" className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text)]">
                {preview.semesters.every((semester) => semester.creditLoaded === 0) ? (
                  <p>You have no graded results yet, so nothing changes now. New results will use this scale.</p>
                ) : (
                  <>
                    <p>
                      Your CGPA would change from <strong className="tabular-nums">{formatCgpa(preview.before.cgpa)}</strong> to{' '}
                      <strong className="tabular-nums">{formatCgpa(preview.after.cgpa)}</strong>.
                    </p>
                    <p className="mt-1">
                      {preview.before.className === preview.after.className
                        ? <>Your class stays <strong>{preview.after.className}</strong>.</>
                        : <>Your class would change from <strong>{preview.before.className}</strong> to <strong>{preview.after.className}</strong>.</>}
                    </p>
                  </>
                )}
              </div>
              {preview.unknownLetters.length > 0 && (
                <div className="rounded-xl border border-[var(--acade-warning)]/30 bg-[var(--acade-gold-dim)] p-4">
                  <p className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">
                    {preview.unknownLetters.length === 1 ? 'One course has a grade' : `${preview.unknownLetters.length} courses have grades`} this scale does not use
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">They count as 0 points until you add their scores or switch back. The letters are kept.</p>
                  <ul className="mt-2 space-y-1 text-[0.8125rem] text-[var(--acade-text)]">
                    {preview.unknownLetters.map((item) => (
                      <li key={`${item.semesterLabel}-${item.code}`}>
                        <span className="font-semibold">{item.code}</span> ({item.semesterLabel}): {item.grade} is not on this scale
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={closePreview} disabled={saving}>Keep current scale</Button>
          <Button size="sm" onClick={confirm} loading={saving} disabled={!preview || saving}>Switch scale</Button>
        </div>
      </Modal>
    </section>
  );
}

function validateResult(draft: CustomScaleDraft) {
  const result = validateCustomScale(customDraftToInput(draft));
  return result.ok ? [] : result.errors;
}

function CustomScaleEditor({ draft, errors, disabled, onChange, onPreview }: {
  draft: CustomScaleDraft;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (draft: CustomScaleDraft) => void;
  onPreview: () => void;
}) {
  const L = CUSTOM_SCALE_LIMITS;
  const setBand = (index: number, field: keyof CustomScaleDraft['bands'][number], value: string) => {
    onChange({ ...draft, bands: draft.bands.map((band, i) => (i === index ? { ...band, [field]: value } : band)) });
  };
  const setClass = (index: number, field: keyof CustomScaleDraft['classes'][number], value: string) => {
    onChange({ ...draft, classes: draft.classes.map((cls, i) => (i === index ? { ...cls, [field]: value } : cls)) });
  };
  const cell = 'min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-2.5 text-[length:var(--text-sm)] tabular-nums text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20 aria-[invalid=true]:border-[var(--acade-danger)]';
  const rowError = (prefix: string, fields: string[]) => fields.map((field) => errors[`${prefix}.${field}`]).find(Boolean) ?? errors[prefix];

  return (
    <div role="group" aria-label="Custom scale" className="mt-5 space-y-5 rounded-xl border border-[var(--acade-border-subtle)] p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Scale name (optional)" value={draft.name} maxLength={L.maxScaleNameLength} disabled={disabled} error={errors.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="e.g. My university" />
        <Input label="Top grade point" inputMode="decimal" value={draft.maxPoint} disabled={disabled} error={errors.maxPoint} onChange={(event) => onChange({ ...draft, maxPoint: event.target.value })} />
      </div>

      <div>
        <h4 className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)]">Grades</h4>
        <p className="mt-0.5 text-[0.8125rem] text-[var(--acade-text-muted)]">Lowest score for each grade. The grade that starts at 0 is the fail grade and is worth 0.</p>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 text-[0.75rem] font-medium text-[var(--acade-text-muted)]" aria-hidden="true">
          <span>Grade</span><span>From score</span><span>Points</span><span />
        </div>
        <ul className="mt-1 space-y-2">
          {draft.bands.map((band, index) => {
            const error = rowError(`bands[${index}]`, ['grade', 'minScore', 'gradePoint']);
            return (
              <li key={index}>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2">
                  <input aria-label={`Band ${index + 1} grade`} className={cell} maxLength={L.maxGradeLength} value={band.grade} disabled={disabled} aria-invalid={Boolean(errors[`bands[${index}].grade`])} onChange={(event) => setBand(index, 'grade', event.target.value)} />
                  <input aria-label={`Band ${index + 1} minimum score`} className={cell} inputMode="decimal" value={band.minScore} disabled={disabled} aria-invalid={Boolean(errors[`bands[${index}].minScore`])} onChange={(event) => setBand(index, 'minScore', event.target.value)} />
                  <input aria-label={`Band ${index + 1} grade points`} className={cell} inputMode="decimal" value={band.gradePoint} disabled={disabled} aria-invalid={Boolean(errors[`bands[${index}].gradePoint`])} onChange={(event) => setBand(index, 'gradePoint', event.target.value)} />
                  <button type="button" aria-label={`Remove band ${index + 1}`} disabled={disabled || draft.bands.length <= L.minBands} onClick={() => onChange({ ...draft, bands: draft.bands.filter((_, i) => i !== index) })} className="flex min-h-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-danger)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)] disabled:opacity-40">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {error && <p className="mt-1 text-[0.8125rem] text-[var(--acade-danger)]">{error}</p>}
              </li>
            );
          })}
        </ul>
        {errors.bands && <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--acade-danger)]">{errors.bands}</p>}
        <button type="button" disabled={disabled || draft.bands.length >= L.maxBands} onClick={() => onChange({ ...draft, bands: [...draft.bands, { grade: '', minScore: '', gradePoint: '' }] })} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-[length:var(--text-sm)] font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)] disabled:opacity-40">
          <Plus className="size-4" aria-hidden="true" /> Add grade
        </button>
      </div>

      <div>
        <h4 className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)]">Classes</h4>
        <p className="mt-0.5 text-[0.8125rem] text-[var(--acade-text-muted)]">Lowest CGPA for each class. One class must start at 0, usually Fail.</p>
        <div className="mt-2 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 text-[0.75rem] font-medium text-[var(--acade-text-muted)]" aria-hidden="true">
          <span>Class</span><span>Short name</span><span>From CGPA</span><span />
        </div>
        <ul className="mt-1 space-y-2">
          {draft.classes.map((cls, index) => {
            const error = rowError(`classes[${index}]`, ['name', 'shortLabel', 'minCgpa']);
            return (
              <li key={index}>
                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2">
                  <input aria-label={`Class ${index + 1} name`} className={cell} maxLength={L.maxClassNameLength} value={cls.name} disabled={disabled} aria-invalid={Boolean(errors[`classes[${index}].name`])} onChange={(event) => setClass(index, 'name', event.target.value)} />
                  <input aria-label={`Class ${index + 1} short name`} className={cell} maxLength={L.maxShortLabelLength} value={cls.shortLabel} placeholder="Optional" disabled={disabled} aria-invalid={Boolean(errors[`classes[${index}].shortLabel`])} onChange={(event) => setClass(index, 'shortLabel', event.target.value)} />
                  <input aria-label={`Class ${index + 1} minimum CGPA`} className={cell} inputMode="decimal" value={cls.minCgpa} disabled={disabled} aria-invalid={Boolean(errors[`classes[${index}].minCgpa`])} onChange={(event) => setClass(index, 'minCgpa', event.target.value)} />
                  <button type="button" aria-label={`Remove class ${index + 1}`} disabled={disabled || draft.classes.length <= L.minClasses} onClick={() => onChange({ ...draft, classes: draft.classes.filter((_, i) => i !== index) })} className="flex min-h-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-danger)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)] disabled:opacity-40">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {error && <p className="mt-1 text-[0.8125rem] text-[var(--acade-danger)]">{error}</p>}
              </li>
            );
          })}
        </ul>
        {errors.classes && <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--acade-danger)]">{errors.classes}</p>}
        <button type="button" disabled={disabled || draft.classes.length >= L.maxClasses} onClick={() => onChange({ ...draft, classes: [...draft.classes, { name: '', shortLabel: '', minCgpa: '' }] })} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-[length:var(--text-sm)] font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)] disabled:opacity-40">
          <Plus className="size-4" aria-hidden="true" /> Add class
        </button>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={disabled}>Preview change</Button>
      </div>
    </div>
  );
}

