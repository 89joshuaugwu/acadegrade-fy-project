import { describe, expect, it } from 'vitest';
import { SCALES } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE, LIVE_SCALES, TOOL_SCALES, classTicks, publicClassFor, toolScaleById, toolScaleParam } from '@/lib/public/scales';

describe('scales offered on the calculator and tools', () => {
  it('keeps the live site scale list unchanged and offers the four ready-made scales on the tools', () => {
    expect(LIVE_SCALES).toHaveLength(1);
    expect(TOOL_SCALES.map((scale) => scale.engine.id)).toEqual(['ng5', 'ng5-noE', 'nbte4', 'nce5']);
    expect(TOOL_SCALES[0]).toBe(DEFAULT_SCALE);
  });

  it('reads a scale from a link value, defaulting to the 5-point scale', () => {
    expect(toolScaleById('nbte4').engine).toBe(SCALES.nbte4);
    expect(toolScaleById(null)).toBe(DEFAULT_SCALE);
    expect(toolScaleById('custom')).toBe(DEFAULT_SCALE);
    expect(toolScaleParam(DEFAULT_SCALE)).toBeUndefined();
    expect(toolScaleParam(toolScaleById('nce5'))).toBe('nce5');
  });

  it('classifies on the chosen scale', () => {
    const nbte = toolScaleById('nbte4');
    expect(nbte.maxPoint).toBe(4);
    expect(publicClassFor(3.2, nbte).label).toBe('Upper Credit');
    expect(publicClassFor(1.2, nbte).label).toBe('Below a Pass');
    expect(classTicks(nbte).map((tick) => tick.value)).toEqual([2.5, 3, 3.5]);
    expect(publicClassFor(4.6).label).toBe('First Class');
    expect(classTicks().map((tick) => tick.value)).toEqual([1.5, 2.4, 3.5, 4.5]);
  });
});
