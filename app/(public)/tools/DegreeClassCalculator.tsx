'use client';

import { useEffect, useRef, useState } from 'react';
import { Container, Heading, TextLinkV2 } from '@/components/site/ui';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { TField, textButtonClass } from '@/components/site/tools/controls';
import { Announcer, useQueryOnce, useTween } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows } from '@/components/site/tools/Receipt';
import { ClassPill, GaugeFigure, NightCard } from '@/components/site/tools/result';
import { ScaleBar } from '@/components/site/tools/ScaleStrip';
import { DEFAULT_SCALE, toolScaleById, toolScaleParam, type PublicClassBand, type PublicScale } from '@/lib/public/scales';
import { ToolScaleSelect } from '@/components/site/tools/ToolScaleSelect';
import { NO_VALUE } from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';
import { checkDegreeClass, parseNumber, suggestDecimal } from './tool-math';

const cgpaError = (max: number) => `Enter a CGPA from 0.00 to ${max.toFixed(2)}.`;
const publicBand = (engineShort: string, scale: PublicScale): PublicClassBand =>
  scale.classBands.find((band) => band.engineShort === engineShort) ?? scale.classBands[scale.classBands.length - 1];
/** "&scale=nbte4" for links, nothing on the 5-point scale. */
const scaleQuery = (scale: PublicScale, first = false) => {
  const id = toolScaleParam(scale);
  return id ? `${first ? '?' : '&'}scale=${id}` : '';
};

/** The checker as plain data, for the result card, the receipt and tests. */
export function degreeClassView(text: string, scale: PublicScale = DEFAULT_SCALE) {
  const check = checkDegreeClass(parseNumber(text), scale.engine);
  if (!check) return null;
  const band = publicBand(check.band.shortLabel, scale);
  const next = check.next ? publicBand(check.next.shortLabel, scale) : null;
  const below = band === scale.classBands[scale.classBands.length - 1];
  const gap = check.gap ?? 0;
  const gapLine = next
    ? below
      ? `${gap.toFixed(2)} to a Pass, which starts at ${next.min.toFixed(2)}`
      : `${gap.toFixed(2)} to ${next.label}, which starts at ${next.min.toFixed(2)}`
    : 'The top class on this scale.';
  const closing = next ? `Next class up: ${next.label} at ${next.min.toFixed(2)}, ${gap.toFixed(2)} higher.` : 'You are in the top class.';
  const announce = `CGPA ${check.rounded.toFixed(2)}. ${band.label}.${next ? ` ${gap.toFixed(2)} to ${below ? 'a Pass' : next.label}.` : ''}`;
  return { rounded: check.rounded, band, next, gap, below, gapLine, closing, announce };
}

export function DegreeClassCalculator() {
  const [text, setText] = useState('');
  const [blurred, setBlurred] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const reported = useRef(false);
  const [scaleId, setScaleId] = useState('ng5');
  const scale = toolScaleById(scaleId);
  const max = scale.maxPoint;

  useQueryOnce((params) => {
    const linked = toolScaleById(params.get('scale'));
    setScaleId(linked.engine.id);
    const value = parseNumber(params.get('cgpa') ?? '');
    if (value !== null && value >= 0 && value <= linked.maxPoint) setText(String(params.get('cgpa')).trim());
  });

  const view = degreeClassView(text, scale);
  const invalid = text.trim() !== '' && !view;
  const suggestion = invalid ? suggestDecimal(text, scale.engine) : null;
  const shown = useTween(view ? view.rounded : null);

  useEffect(() => {
    if (view && !reported.current) {
      reported.current = true;
      trackToolEvent('tool_used', { tool: 'degree-class-checker' });
    }
  }, [view]);

  const error =
    blurred && invalid ? (
      <>
        {cgpaError(max)}
        {suggestion !== null ? (
          <>
            {' '}Did you mean{' '}
            <button
              type="button"
              className={textButtonClass()}
              onClick={() => {
                setText(suggestion.toFixed(2));
                setBlurred(false);
                fieldRef.current?.focus();
              }}
            >
              {suggestion.toFixed(2)}
            </button>
            ?
          </>
        ) : null}
      </>
    ) : null;

  const bands = scale.classBands;
  const tone = !view ? 'empty' : view.band === bands[0] ? 'gold' : view.below ? 'mark' : 'plain';

  return (
    <>
      <ToolStage
        label="Degree class checker"
        after={<UnderNote>A personal estimate, not an official result. Nothing you type is saved.</UnderNote>}
      >
        <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-x-10 lg:gap-y-0`}>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <h2 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Type your CGPA</h2>
            <p className="mt-1 text-[0.9375rem] text-ag-mist">{scale.line}</p>
            <ToolScaleSelect scale={scale} onChange={setScaleId} className="mt-4 w-full max-w-[20rem]" />
            <div className="mt-7 flex flex-wrap items-start gap-x-5 gap-y-3">
              <TField
                ref={fieldRef}
                label="Your CGPA"
                hint={`Two decimals, from 0.00 to ${max.toFixed(2)}`}
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="e.g. 4.43"
                className="w-full max-w-[16rem]"
                size="lg"
                value={text}
                error={error}
                onBlur={() => setBlurred(true)}
                onChange={(event) => {
                  setText(event.target.value);
                  if (blurred) setBlurred(false);
                }}
              />
              <button type="button" className={`${textButtonClass()} mt-0 min-h-11 text-[0.9375rem] sm:mt-[2.6rem]`} onClick={() => setText('4.43')}>
                Try 4.43
              </button>
            </div>
          </div>

          <aside aria-label="Your class" className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <NightCard>
              <GaugeFigure
                value={view ? view.rounded : null}
                figure={shown === null ? NO_VALUE : shown.toFixed(2)}
                caption="CGPA"
                label={view ? `CGPA ${view.rounded.toFixed(2)} of ${max.toFixed(2)}, ${view.band.label}` : 'No CGPA yet'}
                max={max}
                ticks={bands.slice(0, -2).map((band) => band.min)}
                intro
              />
              <div className="mt-1 text-center" key={view?.band.label ?? 'none'}>
                <ClassPill label={view ? view.band.label : 'Your class appears here'} tone={tone} />
                {view ? <p className="mx-auto mt-3 max-w-[17rem] text-[0.9375rem] leading-snug text-ag-mist-night">{view.gapLine}</p> : null}
              </div>
              <div className="mt-6 border-t border-white/10 pt-5 text-center">
                <TextLinkV2 href={view ? `/tools/required-gpa?current=${view.rounded.toFixed(2)}${scaleQuery(scale)}` : `/tools/required-gpa${scaleQuery(scale, true)}`} onDark className="text-[0.9375rem]">
                  What do I need to get there?
                </TextLinkV2>
              </div>
              <Announcer text={view ? view.announce : 'Your class appears here.'} />
            </NightCard>
          </aside>
          <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:pt-10">
            <ScaleBar
              compact
              scale={scale}
              caption={`Degree classes on the ${scale.name}, with your CGPA marked`}
              marker={view ? { value: view.rounded, title: `Your CGPA: ${view.rounded.toFixed(2)}`, sub: view.band.label } : null}
            />
            <noscript>
              <p className="mt-4 text-[0.9375rem] text-ag-mist">Turn on JavaScript to use the checker.</p>
            </noscript>
          </div>
        </div>
      </ToolStage>

      <section aria-labelledby="how-class-read" className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <Heading
              id="how-class-read"
              title="How your class is read"
              lead="Most Nigerian universities classify degrees on a 5-point CGPA. Your class is read from your CGPA rounded to two decimals, half up, the same way your result shows it."
            />
            <div className="mt-8 space-y-4 text-[1rem] leading-relaxed text-ag-mist">
              <p>
                So 4.495 shows as 4.50 and is First Class, while 4.494 shows as 4.49 and is Second Class Upper, 0.01 short.
              </p>
              <p>Some universities add conditions, such as no outstanding carry-overs for a First. Your handbook is the final word.</p>
            </div>
          </div>
          <ReceiptCard title="Your working" meta={view ? 'From the CGPA you typed' : 'Type a CGPA above'} tone="haze" className="min-w-0">
            <ReceiptRows
              groups={[
                {
                  lines: [
                    { label: 'You typed', value: text.trim() || NO_VALUE },
                    { label: 'Shown as (two decimals, half up)', value: view ? view.rounded.toFixed(2) : NO_VALUE },
                  ],
                },
                {
                  name: 'Where each class begins',
                  lines: bands.map((band) => ({
                    label: band.label,
                    value: band === bands[bands.length - 1] ? `under ${bands[bands.length - 2].min.toFixed(2)}` : `${band.min.toFixed(2)} to ${band.max.toFixed(2)}`,
                    inverted: view?.band === band,
                    note: view?.band === band ? 'Your class' : undefined,
                  })),
                },
              ]}
            />
            <p className="mt-5 text-[0.9375rem] font-medium text-ag-ink">{view ? view.closing : 'Type a CGPA to see where it falls.'}</p>
            <p className="mt-2 text-[0.875rem] text-ag-mist">Below {bands[bands.length - 2].min.toFixed(2)} there is no class on this scale.</p>
          </ReceiptCard>
        </Container>
      </section>
    </>
  );
}
