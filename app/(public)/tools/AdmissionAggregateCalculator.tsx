'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ButtonLink, Container, Heading } from '@/components/site/ui';
import { SelectV2 } from '@/components/site/Select';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { TField, textButtonClass } from '@/components/site/tools/controls';
import { Announcer, useQueryOnce, useTween } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows, type ReceiptGroup } from '@/components/site/tools/Receipt';
import { ClassPill, GaugeFigure, MiniArc, NightCard, SummaryStrip } from '@/components/site/tools/result';
import { NO_VALUE } from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';
import {
  DEFAULT_FORMULA,
  DEFAULT_POINT_TABLE,
  DEFAULT_POST_MAX,
  decodeAdmissionLink,
  encodeAdmissionLink,
  registerHref,
  type AdmissionLink,
  type PointTableChoice,
} from '@/components/public/tools/records-url';
import { AGGREGATE_FORMULAS, ESTIMATE_NOTE, OLEVEL_POINT_TABLES, type AggregateFormulaId } from '@/lib/records/admissionRules';
import { ChoiceCards, GradeChips, ShareLink } from './records-controls';
import { ADMISSION_EXAMPLE, ADMISSION_SLOTS, admissionView } from './records-model';

/**
 * The admission aggregate island (GRADING_AND_PROFILES_PLAN.md Phase 2,
 * public tools): a formula, the UTME score, an optional post-UTME score with
 * its maximum, five O-level grades when the formula counts them, and an
 * optional target. The working is shown step by step and every result says it
 * is an estimate. The address bar carries everything (records-url.ts).
 */

type Field = 'utme' | 'postScore' | 'postMax' | 'target' | 'weights';

const EMPTY: AdmissionLink = {
  formula: DEFAULT_FORMULA,
  utme: '',
  postScore: '',
  postMax: DEFAULT_POST_MAX,
  pointTable: DEFAULT_POINT_TABLE,
  grades: [null, null, null, null, null],
  target: '',
  weights: null,
};
const DEFAULT_WEIGHTS = { utme: '50', olevel: '20', postUtme: '30' };

const FORMULA_OPTIONS = AGGREGATE_FORMULAS.map((formula) => ({ value: formula.id, title: formula.name, summary: formula.summary }));
const TABLE_OPTIONS = OLEVEL_POINT_TABLES.map((table) => ({ value: table.id, label: table.name }));

export function AdmissionAggregateCalculator() {
  const { user } = useAuth();
  const [link, setLink] = useState<AdmissionLink>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const reported = useRef(false);

  useQueryOnce((params) => {
    const decoded = decodeAdmissionLink(params);
    if (decoded.unreadable) setNote('This link is from a newer version of the calculator, so it could not be opened here.');
    else if (decoded.link) {
      setLink(decoded.link);
      setTouched({ utme: true, postScore: true, postMax: true, target: true, weights: true });
      if (decoded.partlyReset) setNote('Some values in the link were not recognised and were reset.');
    }
  }, false);
  useEffect(() => setReady(true), []);

  const view = useMemo(() => admissionView(link), [link]);
  const headline = view.aggregate ?? (view.started ? view.partial : null);
  const shown = useTween(headline);

  const hasInput = Boolean(link.utme.trim() || link.postScore.trim() || link.target.trim() || link.grades.some(Boolean) || link.formula !== DEFAULT_FORMULA);
  useEffect(() => {
    if (!ready) return;
    const query = hasInput ? encodeAdmissionLink(link) : '';
    try {
      window.history.replaceState(window.history.state, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
    } catch {
      // The calculator works the same without it.
    }
  }, [ready, link, hasInput]);

  useEffect(() => {
    if (view.started && !reported.current) {
      reported.current = true;
      trackToolEvent('tool_used', { tool: 'admission-aggregate' });
    }
  }, [view.started]);

  const set = (change: Partial<AdmissionLink>, field?: Field) => {
    setLink((current) => ({ ...current, ...change }));
    if (field && touched[field]) setTouched((current) => ({ ...current, [field]: false }));
  };
  const blur = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));
  const errorFor = (field: Field) => (touched[field] ? view.errors[field] : undefined);

  const setFormula = (formula: AggregateFormulaId) =>
    setLink((current) => ({ ...current, formula, weights: formula === 'custom' ? (current.weights ?? DEFAULT_WEIGHTS) : null }));

  const complete = view.aggregate !== null;
  const pill = complete ? 'Out of 100' : view.started ? 'So far' : 'Your aggregate appears here';

  const receipt: ReceiptGroup[] = view.steps.map((step) => ({
    name: `${step.label}, worth ${step.weight}`,
    lines: [
      ...(step.subjects ?? []).map((subject) => ({ label: `${subject.slot}: ${subject.grade}`, value: `${subject.points} points` })),
      { label: step.working, value: step.value },
    ],
  }));
  if (view.started) {
    receipt.push({
      lines: [{ label: complete ? 'Aggregate out of 100' : 'So far, out of 100', value: (view.aggregate ?? view.partial).toFixed(2), inverted: true }],
    });
  }

  return (
    <>
      <ToolStage label="Admission aggregate" after={<UnderNote>A personal estimate, not an official result. Nothing you type is saved.</UnderNote>}>
        <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-x-10`}>
          <div className="@container min-w-0">
            <SummaryStrip>
              <MiniArc value={headline} max={100} />
              <p className="min-w-0 text-[0.9375rem] leading-snug">
                <span className="ag-num font-semibold">{headline === null ? 'No aggregate yet' : `${headline.toFixed(2)} of 100`}</span>
                <span className="block text-[0.8125rem] text-ag-mist-night">{complete ? 'Aggregate, an estimate' : view.started ? 'So far' : 'Add your UTME score'}</span>
              </p>
            </SummaryStrip>
            <h2 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Your scores</h2>
            <p className="mt-1 max-w-[36rem] text-[0.9375rem] text-ag-mist">Pick the formula your school uses, then add your scores. Leave out what you don't have yet.</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                className={`${textButtonClass()} min-h-11 text-[0.9375rem]`}
                onClick={() => {
                  setLink(ADMISSION_EXAMPLE);
                  setNote(null);
                }}
              >
                Try an example
              </button>
              <button
                type="button"
                className={`${textButtonClass()} min-h-11 text-[0.9375rem]`}
                onClick={() => {
                  setLink(EMPTY);
                  setTouched({});
                  setNote(null);
                }}
              >
                Start again
              </button>
            </div>
            {note ? (
              <p role="note" className="mt-3 rounded-xl bg-ag-haze px-4 py-3 text-[0.875rem] text-ag-ink">
                {note}
              </p>
            ) : null}

            <h3 id="formula-title" className="mt-7 text-[0.875rem] font-medium text-ag-ink">
              Formula
            </h3>
            <ChoiceCards name="formula" label="Formula" options={FORMULA_OPTIONS} value={link.formula} onChange={setFormula} className="mt-2" />

            {link.formula === 'custom' ? (
              <div className="mt-4 rounded-[20px] bg-ag-haze p-4">
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ['utme', 'UTME share'],
                      ['olevel', 'O-level share'],
                      ['postUtme', 'Post-UTME share'],
                    ] as const
                  ).map(([key, label]) => (
                    <TField
                      key={key}
                      label={label}
                      inputMode="numeric"
                      autoComplete="off"
                      size="sm"
                      value={link.weights?.[key] ?? ''}
                      aria-invalid={errorFor('weights') ? true : undefined}
                      onBlur={() => blur('weights')}
                      onChange={(event) => set({ weights: { ...(link.weights ?? DEFAULT_WEIGHTS), [key]: event.target.value } }, 'weights')}
                    />
                  ))}
                </div>
                <p className={`mt-2 text-[0.8125rem] leading-snug ${errorFor('weights') ? 'font-medium text-[#C2361F]' : 'text-ag-mist'}`}>
                  {errorFor('weights') ?? "Each part's share of the 100, from your school's admission notice."}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 @lg:grid-cols-3">
              <TField
                label="UTME score"
                hint="Out of 400"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="next"
                placeholder="e.g. 268"
                value={link.utme}
                error={errorFor('utme')}
                onBlur={() => blur('utme')}
                onChange={(event) => set({ utme: event.target.value }, 'utme')}
              />
              {view.usesPost ? (
                <>
                  <TField
                    label="Post-UTME score"
                    hint="Leave empty if you haven't written it"
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="e.g. 62"
                    value={link.postScore}
                    error={errorFor('postScore')}
                    onBlur={() => blur('postScore')}
                    onChange={(event) => set({ postScore: event.target.value }, 'postScore')}
                  />
                  <TField
                    label="Post-UTME out of"
                    hint="Often 100; some schools use 30 or 50"
                    inputMode="numeric"
                    autoComplete="off"
                    value={link.postMax}
                    error={errorFor('postMax')}
                    onBlur={() => blur('postMax')}
                    onChange={(event) => set({ postMax: event.target.value }, 'postMax')}
                  />
                </>
              ) : null}
            </div>

            {view.usesOlevel ? (
              <section aria-labelledby="olevel-title" className="@container mt-7 rounded-[20px] bg-ag-haze p-3 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h3 id="olevel-title" className="ag-display text-[1.25rem] font-bold text-ag-ink">
                      Five O-level grades
                    </h3>
                    <p className="mt-1 text-[0.875rem] text-ag-mist">English, Maths and the three subjects your course asks for.</p>
                  </div>
                  <SelectV2
                    label="O-level points"
                    options={TABLE_OPTIONS}
                    value={link.pointTable}
                    onChange={(value) => set({ pointTable: value as PointTableChoice })}
                    className="w-full @lg:w-[16rem]"
                  />
                </div>
                <ul className="mt-4 space-y-3">
                  {ADMISSION_SLOTS.map((slot, index) => (
                    <li key={slot} className="@container rounded-2xl bg-white p-3 sm:p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 @xl:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] @xl:items-center">
                        <p className="text-[0.9375rem] font-semibold text-ag-ink" aria-hidden="true">
                          {slot}
                        </p>
                        <GradeChips
                          name={`slot-${index}`}
                          label={`Grade for ${slot}`}
                          value={link.grades[index] ?? null}
                          onChange={(grade) => set({ grades: link.grades.map((current, at) => (at === index ? grade : current)) })}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-7 max-w-[16rem]">
              <TField
                label="Target aggregate"
                hint="Optional, out of 100"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="e.g. 70"
                value={link.target}
                error={errorFor('target')}
                onBlur={() => blur('target')}
                onChange={(event) => set({ target: event.target.value }, 'target')}
              />
            </div>
          </div>

          <aside aria-label="Your aggregate" className="min-w-0 lg:sticky lg:top-[92px] lg:self-start">
            <NightCard>
              <GaugeFigure
                value={headline}
                figure={shown === null ? NO_VALUE : shown.toFixed(2)}
                caption={complete ? 'Aggregate' : view.started ? 'So far' : 'Aggregate'}
                label={headline === null ? 'No aggregate yet' : `${complete ? 'Aggregate' : 'So far'} ${headline.toFixed(2)} out of 100`}
                max={100}
                ticks={[]}
                intro
              />
              <div className="mt-1 text-center" key={pill}>
                <ClassPill label={pill} tone={complete ? 'gold' : view.started ? 'plain' : 'empty'} />
                {view.missingLine ? <p className="mx-auto mt-3 max-w-[18rem] text-[0.9375rem] leading-snug text-ag-mist-night">{view.missingLine}</p> : null}
              </div>
              {view.targetLine ? (
                <p className="mt-5 rounded-2xl bg-white/[0.06] px-4 py-3 text-[0.9375rem] leading-snug text-white">{view.targetLine}</p>
              ) : null}
              <p className="mt-4 text-center text-[0.8125rem] leading-snug text-ag-mist-night">{ESTIMATE_NOTE}</p>
              <Announcer text={view.announce} />

              <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                {user ? (
                  <ButtonLink href="/dashboard" variant="gold" size="lg" block>
                    Open your dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href={registerHref('admission')} variant="gold" size="lg" block>
                      Save to a free record
                    </ButtonLink>
                    <p className="text-[0.8125rem] leading-snug text-ag-mist-night">Sign up and choose JAMB and admission to keep your scores and target in your AcadeGrade record.</p>
                  </>
                )}
                <ShareLink tool="admission-aggregate" label="Share this estimate" title="My admission aggregate on AcadeGrade" />
                <p className="text-[0.8125rem] leading-snug text-ag-mist-night">Anyone with the link sees these scores. Nothing is stored on our side.</p>
              </div>
            </NightCard>
          </aside>
        </div>
      </ToolStage>

      <section aria-labelledby="how-aggregate" className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <Heading
              id="how-aggregate"
              title="How your aggregate is worked out"
              lead="Each part is scaled to its share of the 100: your score, divided by what it is out of, times its share. Then the parts are added up."
            />
            <div className="mt-8 space-y-4 text-[1rem] leading-relaxed text-ag-mist">
              <p>UTME ÷ 400 × 50 is the same as UTME ÷ 8. So 268 in UTME gives 33.50 of the 50.</p>
              <p>O-level grades become points from the table you pick; D7, E8 and F9 earn none. Five A1s on the default table make 20.</p>
              <p>Schools change their formulas, and some add other parts. Your school's admission notice is the final word.</p>
            </div>
          </div>
          <ReceiptCard title="Your working" meta={view.started ? 'From the scores you typed' : 'Add a score above'} tone="haze" className="min-w-0">
            {view.started ? <ReceiptRows groups={receipt} /> : <p className="text-[0.9375rem] text-ag-mist">Each step appears here as you type.</p>}
            {view.targetLine ? <p className="mt-5 text-[0.9375rem] font-medium text-ag-ink">{view.targetLine}</p> : null}
            <p className="mt-3 text-[0.875rem] text-ag-mist">{ESTIMATE_NOTE}</p>
          </ReceiptCard>
        </Container>
      </section>
    </>
  );
}
