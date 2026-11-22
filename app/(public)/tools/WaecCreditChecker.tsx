'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ButtonLink, CheckIcon, Container, Heading } from '@/components/site/ui';
import { SelectV2 } from '@/components/site/Select';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { TButton, textButtonClass } from '@/components/site/tools/controls';
import { Announcer, useQueryOnce, useTween } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows } from '@/components/site/tools/Receipt';
import { ClassPill, GaugeFigure, NightCard } from '@/components/site/tools/result';
import { NO_VALUE } from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';
import { decodeOlevelLink, encodeOlevelLink, registerHref, REQUIRED_SUBJECTS_MAX, type OlevelLink } from '@/components/public/tools/records-url';
import { OLEVEL_EXAMS, OLEVEL_GRADES, OLEVEL_MAX_SUBJECTS, OLEVEL_MIN_YEAR, type OlevelExam, type OlevelGrade } from '@/lib/records/olevelRules';
import { ENGLISH_ID, MATHEMATICS_ID, OLEVEL_SUBJECTS, findOlevelSubject, subjectIdFor } from '@/lib/records/olevelSubjects';
import { GradeChips, RemoveButton, ShareLink, SubjectPicker } from './records-controls';
import { WAEC_EXAMPLE, waecView } from './records-model';

/**
 * The WAEC credit checker island (GRADING_AND_PROFILES_PLAN.md Phase 2,
 * public tools): up to two sittings of up to nine subjects, a grade chip row
 * per subject, the best grade per subject across both, and the "five credits
 * including English and Maths" check, with optional course subjects. The
 * address bar carries everything (records-url.ts), so the link is the share.
 */

interface RowState {
  key: number;
  text: string;
  grade: OlevelGrade | null;
  /** Left at least once: show this row's error. */
  touched: boolean;
}

interface SittingState {
  key: number;
  exam: OlevelExam;
  year: number | null;
  rows: RowState[];
}

const ORDINAL = ['first', 'second'] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - OLEVEL_MIN_YEAR + 1 }, (_, index) => {
  const year = String(CURRENT_YEAR - index);
  return { value: year, label: year };
});
const EXAM_OPTIONS = OLEVEL_EXAMS.map((exam) => ({ value: exam.id, label: exam.name }));
const subjectName = (id: string) => OLEVEL_SUBJECTS.find((subject) => subject.id === id)?.name ?? id;

let nextKey = 1;
const newRow = (text = '', grade: OlevelGrade | null = null): RowState => ({ key: nextKey++, text, grade, touched: false });
const freshSitting = (first: boolean): SittingState => ({
  key: nextKey++,
  exam: 'waec',
  year: null,
  rows: first ? [newRow('English Language'), newRow('Mathematics'), newRow(), newRow(), newRow()] : [newRow(), newRow(), newRow()],
});

/** The row's storage id: a catalogue id from a name or alias, `custom:<key>`, or ''. */
const rowId = (row: RowState) => subjectIdFor(row.text);
/** The catalogue name for a typed alias ("Eng Lang" → English Language), else the text as typed. */
const rowName = (row: RowState) => findOlevelSubject(row.text)?.name ?? row.text.trim();

function stateFromLink(link: OlevelLink): { sittings: SittingState[]; required: string[] } {
  const sittings = link.sittings.slice(0, 2).map((sitting) => ({
    key: nextKey++,
    exam: sitting.exam,
    year: sitting.year,
    rows: sitting.subjects.map((subject) => newRow(subject.name, subject.grade)),
  }));
  return { sittings: sittings.length ? sittings : [freshSitting(true)], required: link.required };
}

function linkFromState(sittings: readonly SittingState[], required: readonly string[]): OlevelLink {
  return {
    sittings: sittings.map((sitting) => {
      const seen = new Set<string>();
      return {
        exam: sitting.exam,
        year: sitting.year,
        subjects: sitting.rows.flatMap((row) => {
          const id = rowId(row);
          if (!id || seen.has(id)) return [];
          seen.add(id);
          return [{ subjectId: id, name: rowName(row), grade: row.grade }];
        }),
      };
    }),
    required: [...required],
  };
}

/** "English Language is already in this sitting." for the second copy of a subject. */
function duplicateError(rows: readonly RowState[], index: number): string | null {
  const id = rowId(rows[index]);
  if (!id) return null;
  const earlier = rows.slice(0, index).some((row) => rowId(row) === id);
  return earlier ? `${rowName(rows[index])} is already in this sitting.` : null;
}

export function WaecCreditChecker() {
  const { user } = useAuth();
  const [sittings, setSittings] = useState<SittingState[]>(() => [freshSitting(true)]);
  const [required, setRequired] = useState<string[]>([]);
  const [courseText, setCourseText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const reported = useRef(false);
  const focusAfter = useRef<string | null>(null);

  useQueryOnce((params) => {
    const decoded = decodeOlevelLink(params);
    if (decoded.unreadable) setNote('This link is from a newer version of the checker, so it could not be opened here.');
    else if (decoded.link) {
      const state = stateFromLink(decoded.link);
      setSittings(state.sittings);
      setRequired(state.required);
      if (decoded.partlyReset) setNote('Some values in the link were not recognised and were left out.');
    }
  }, false);
  useEffect(() => setReady(true), []);

  const link = useMemo(() => linkFromState(sittings, required), [sittings, required]);
  const view = useMemo(() => waecView(link), [link]);
  const shown = useTween(view.started ? view.credits : null);

  // The address bar always matches the fields, so "Share" and a refresh both keep them.
  useEffect(() => {
    if (!ready) return;
    const query = view.started || required.length ? encodeOlevelLink(link) : '';
    try {
      window.history.replaceState(window.history.state, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
    } catch {
      // The checker works the same without it.
    }
  }, [ready, link, view.started, required.length]);

  useEffect(() => {
    if (view.started && !reported.current) {
      reported.current = true;
      trackToolEvent('tool_used', { tool: 'waec-credit-checker' });
    }
  }, [view.started]);

  useEffect(() => {
    if (!focusAfter.current) return;
    const target = document.getElementById(focusAfter.current);
    focusAfter.current = null;
    (target?.querySelector<HTMLElement>('input[role="combobox"]') ?? target?.querySelector<HTMLElement>('button'))?.focus();
  });

  const updateSitting = (index: number, change: (sitting: SittingState) => SittingState) =>
    setSittings((current) => current.map((sitting, at) => (at === index ? change(sitting) : sitting)));
  const updateRow = (sittingIndex: number, rowIndex: number, change: Partial<RowState>) =>
    updateSitting(sittingIndex, (sitting) => ({ ...sitting, rows: sitting.rows.map((row, at) => (at === rowIndex ? { ...row, ...change } : row)) }));

  const loadExample = () => {
    const state = stateFromLink(WAEC_EXAMPLE);
    setSittings(state.sittings);
    setRequired(state.required);
    setNote(null);
  };
  const startAgain = () => {
    setSittings([freshSitting(true)]);
    setRequired([]);
    setCourseText('');
    setNote(null);
  };

  const pillTone = !view.started ? 'empty' : view.meets ? 'gold' : 'plain';
  const pillText = !view.started ? 'Your result appears here' : view.meets ? 'Five credits with English and Maths' : 'Not yet';
  const bySubject = new Map(view.rows.map((row) => [row.subjectId, row]));
  const checks = [ENGLISH_ID, MATHEMATICS_ID, ...required].map((id) => ({ id, name: subjectName(id), row: bySubject.get(id) ?? null }));
  const twoSittings = sittings.length === 2;

  return (
    <>
      <ToolStage label="WAEC credit checker" after={<UnderNote>A personal guide, not an official result. Nothing you type is saved.</UnderNote>}>
        <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-x-10`}>
          <div className="min-w-0">
            <h2 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Your O-level grades</h2>
            <p className="mt-1 max-w-[36rem] text-[0.9375rem] text-ag-mist">
              One row per subject, as it is on your result. Add a second sitting if you are combining two.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button type="button" className={`${textButtonClass()} min-h-11 text-[0.9375rem]`} onClick={loadExample}>
                Try an example
              </button>
              <button type="button" className={`${textButtonClass()} min-h-11 text-[0.9375rem]`} onClick={startAgain}>
                Start again
              </button>
            </div>
            {note ? (
              <p role="note" className="mt-3 rounded-xl bg-ag-haze px-4 py-3 text-[0.875rem] text-ag-ink">
                {note}
              </p>
            ) : null}

            <div className="mt-6 space-y-5">
              {sittings.map((sitting, sittingIndex) => {
                const ordinal = ORDINAL[sittingIndex];
                const usedIds = sitting.rows.map(rowId).filter(Boolean);
                return (
                  <section
                    key={sitting.key}
                    id={`sitting-${sitting.key}`}
                    aria-labelledby={`sitting-${sitting.key}-title`}
                    className="@container ag-row-in rounded-[20px] bg-ag-haze p-3 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 id={`sitting-${sitting.key}-title`} className="ag-display text-[1.25rem] font-bold text-ag-ink">
                        {sittingIndex === 0 ? 'First sitting' : 'Second sitting'}
                      </h3>
                      {sittingIndex === 1 ? <RemoveButton label="Remove the second sitting" onClick={() => setSittings((current) => current.slice(0, 1))} /> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 @md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                      <SelectV2
                        label={`Exam, ${ordinal} sitting`}
                        options={EXAM_OPTIONS}
                        value={sitting.exam}
                        onChange={(exam) => updateSitting(sittingIndex, (current) => ({ ...current, exam: exam as OlevelExam }))}
                      />
                      <SelectV2
                        label={`Year, ${ordinal} sitting`}
                        placeholder="Choose a year"
                        options={YEAR_OPTIONS}
                        value={sitting.year ? String(sitting.year) : ''}
                        onChange={(year) => updateSitting(sittingIndex, (current) => ({ ...current, year: Number(year) }))}
                      />
                    </div>

                    <ul className="mt-4 space-y-3">
                      {sitting.rows.map((row, rowIndex) => {
                        const name = rowName(row);
                        const duplicate = duplicateError(sitting.rows, rowIndex);
                        const resolved = findOlevelSubject(row.text);
                        const hint = resolved && resolved.name !== row.text.trim() ? `Counts as ${resolved.name}` : undefined;
                        return (
                          <li key={row.key} id={`row-${row.key}`} className="@container ag-row-in rounded-2xl bg-white p-3 sm:p-4">
                            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] @xl:items-start">
                              <div className="flex items-start gap-1">
                                <SubjectPicker
                                  label={`Subject ${rowIndex + 1}, ${ordinal} sitting`}
                                  hideLabel
                                  className="flex-1"
                                  value={row.text}
                                  exclude={usedIds.filter((id) => id !== rowId(row))}
                                  error={row.touched ? duplicate : null}
                                  hint={hint}
                                  onType={(text) => updateRow(sittingIndex, rowIndex, { text, touched: false })}
                                  onPick={(subject) => updateRow(sittingIndex, rowIndex, { text: subject.name, touched: false })}
                                  onBlur={() => updateRow(sittingIndex, rowIndex, { touched: true })}
                                />
                                <RemoveButton
                                  label={`Remove ${name || `subject ${rowIndex + 1}`}, ${ordinal} sitting`}
                                  onClick={() => updateSitting(sittingIndex, (current) => ({ ...current, rows: current.rows.filter((_, at) => at !== rowIndex) }))}
                                />
                              </div>
                              <GradeChips
                                name={`grade-${row.key}`}
                                label={`Grade for ${name || `subject ${rowIndex + 1}`}, ${ordinal} sitting`}
                                value={row.grade}
                                onChange={(grade) => updateRow(sittingIndex, rowIndex, { grade })}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                      {sitting.rows.length < OLEVEL_MAX_SUBJECTS ? (
                        <button
                          type="button"
                          className={`${textButtonClass()} min-h-11 text-[0.9375rem]`}
                          onClick={() => {
                            const row = newRow();
                            focusAfter.current = `row-${row.key}`;
                            updateSitting(sittingIndex, (current) => ({ ...current, rows: [...current.rows, row] }));
                          }}
                        >
                          Add a subject
                        </button>
                      ) : (
                        <p className="py-2 text-[0.875rem] text-ag-mist">Nine subjects is the most one sitting holds.</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {!twoSittings ? (
              <TButton
                variant="ghostOnLight"
                block
                className="mt-4"
                onClick={() => {
                  const sitting = freshSitting(false);
                  focusAfter.current = `sitting-${sitting.key}`;
                  setSittings((current) => [...current, sitting]);
                }}
              >
                Add a second sitting
              </TButton>
            ) : null}

            <div className="@container mt-8 border-t border-ag-ink/[0.08] pt-6">
              <h3 className="ag-display text-[1.25rem] font-bold text-ag-ink">Subjects your course asks for</h3>
              <p className="mt-1 max-w-[36rem] text-[0.9375rem] text-ag-mist">
                Optional. Add the subjects your course lists on top of English and Maths, and the checker looks for a credit in each.
              </p>
              {required.length ? (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Course subjects">
                  {required.map((id) => (
                    <li key={id} className="flex items-center gap-1 rounded-full bg-ag-haze py-1 pl-4 pr-1 text-[0.9375rem] font-medium text-ag-ink">
                      {subjectName(id)}
                      <button
                        type="button"
                        aria-label={`Remove ${subjectName(id)}`}
                        onClick={() => setRequired((current) => current.filter((entry) => entry !== id))}
                        className="ag-focus grid h-9 w-9 place-items-center rounded-full text-ag-mist transition hover:bg-white hover:text-[#C2361F]"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {required.length < REQUIRED_SUBJECTS_MAX ? (
                <SubjectPicker
                  label="Add a course subject"
                  className="mt-4 max-w-[22rem]"
                  placeholder="For example Physics"
                  value={courseText}
                  allowCustom={false}
                  clearOnPick
                  exclude={[ENGLISH_ID, MATHEMATICS_ID, ...required]}
                  onType={setCourseText}
                  onPick={(subject) => {
                    if (subject.id) setRequired((current) => (current.includes(subject.id) ? current : [...current, subject.id]));
                  }}
                />
              ) : (
                <p className="mt-3 text-[0.875rem] text-ag-mist">Four course subjects is the most the checker takes.</p>
              )}
            </div>
          </div>

          <aside aria-label="Your credits" className="min-w-0 lg:sticky lg:top-[92px] lg:self-start">
            <NightCard>
              <GaugeFigure
                value={view.started ? view.credits : null}
                figure={shown === null ? NO_VALUE : String(Math.round(shown))}
                caption="Credits"
                label={view.started ? `${view.credits} credits, A1 to C6` : 'No grades yet'}
                max={OLEVEL_MAX_SUBJECTS}
                ticks={[view.minCredits]}
                intro
              />
              <div className="mt-1 text-center" key={pillText}>
                <ClassPill label={pillText} tone={pillTone} />
                <p className="mx-auto mt-3 max-w-[18rem] text-[0.9375rem] leading-snug text-ag-mist-night">{view.verdict}</p>
              </div>
              <ul className="mt-5 space-y-2 border-t border-white/10 pt-4" aria-label="Subjects that must be credits">
                {checks.map((check) => {
                  const met = Boolean(check.row?.credit);
                  return (
                    <li key={check.id} className="flex items-center justify-between gap-3 text-[0.9375rem]">
                      <span className={`flex min-w-0 items-center gap-2 ${met ? 'text-white' : 'text-white/75'}`}>
                        {met ? (
                          <span className="text-ag-gold">
                            <CheckIcon />
                          </span>
                        ) : (
                          <span aria-hidden="true" className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ring-1 ring-inset ring-white/30" />
                        )}
                        <span className="truncate">{check.name}</span>
                        <span className="sr-only">{met ? ', credit' : ', no credit yet'}</span>
                      </span>
                      <span className={`ag-num shrink-0 font-semibold ${met ? 'text-ag-gold' : 'text-white/60'}`}>{check.row ? check.row.grade : NO_VALUE}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[0.8125rem] leading-snug text-ag-mist-night">Estimate only. Check your school's requirements.</p>
              <Announcer text={view.announce} />

              <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                {user ? (
                  <ButtonLink href="/dashboard" variant="gold" size="lg" block>
                    Open your dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href={registerHref('olevel')} variant="gold" size="lg" block>
                      Save to a free record
                    </ButtonLink>
                    <p className="text-[0.8125rem] leading-snug text-ag-mist-night">Sign up and choose WAEC or NECO results to keep these grades in your AcadeGrade record.</p>
                  </>
                )}
                <ShareLink tool="waec-credit-checker" label="Share these results" title="My O-level credits on AcadeGrade" />
                <p className="text-[0.8125rem] leading-snug text-ag-mist-night">Anyone with the link sees these grades. Nothing is stored on our side.</p>
              </div>
            </NightCard>
          </aside>
        </div>
      </ToolStage>

      <section aria-labelledby="how-credits" className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <Heading
              id="how-credits"
              title="How your credits are counted"
              lead="A credit is A1 to C6. For two sittings, the checker keeps your best grade in each subject, then counts the credits and looks for English Language and Mathematics among them."
            />
            <div className="mt-8 space-y-4 text-[1rem] leading-relaxed text-ag-mist">
              <p>
                So a D7 in Mathematics from WAEC and a C6 from NECO count as one credit in Mathematics. Most schools take results from no more than two
                sittings.
              </p>
              <p>Some courses need particular subjects as credits too. Add them under the course subjects, and check your school's brochure for the full list.</p>
            </div>
            <ReceiptCard title="What each grade counts as" tone="haze" className="mt-10">
              <ReceiptRows
                groups={[
                  {
                    lines: OLEVEL_GRADES.map((band) => ({
                      label: `${band.grade}, ${band.minScore} to ${band.maxScore}`,
                      value: band.kind === 'credit' ? 'Credit' : band.kind === 'pass' ? 'Pass' : 'Fail',
                    })),
                  },
                ]}
              />
            </ReceiptCard>
          </div>
          <ReceiptCard title="Your best grades" meta={view.started ? (twoSittings ? 'Best of both sittings' : 'From your sitting') : 'Pick some grades above'} className="min-w-0">
            {view.started ? (
              <ReceiptRows
                groups={[
                  {
                    lines: [
                      ...view.rows.map((row) => ({
                        label: (
                          <>
                            {row.name}
                            {twoSittings ? <span className="ml-2 text-[0.8125rem] font-normal text-ag-mist">{row.exam}</span> : null}
                          </>
                        ),
                        value: `${row.grade}${row.credit ? '' : row.kind === 'pass' ? ', pass' : ', fail'}`,
                      })),
                      { label: 'Credits', value: `${view.credits} of ${view.rows.length}`, inverted: true },
                    ],
                  },
                ]}
              />
            ) : (
              <p className="text-[0.9375rem] text-ag-mist">Your subjects appear here with their best grade, once you pick a grade for each.</p>
            )}
            <p className="mt-5 text-[0.9375rem] font-medium text-ag-ink">{view.verdict}</p>
          </ReceiptCard>
        </Container>
      </section>
    </>
  );
}
