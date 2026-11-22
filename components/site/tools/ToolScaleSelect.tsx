'use client';

import { SelectV2 } from '@/components/site/Select';
import { TOOL_SCALES, type PublicScale } from '@/lib/public/scales';

const OPTIONS = TOOL_SCALES.map((scale) => ({
  value: scale.engine.id,
  label: scale.name,
  hint: `Top grade point ${scale.maxPoint}`,
}));

/**
 * "Grading scale" picker for the calculator and the tools (custom dropdown,
 * never a native select). The 5-point scale is the default; the choice goes
 * into the page's link so a shared result opens on the same scale.
 */
export function ToolScaleSelect({
  scale,
  onChange,
  className,
  tone = 'light',
}: {
  scale: PublicScale;
  onChange: (id: string) => void;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <SelectV2
      label="Grading scale"
      options={OPTIONS}
      value={scale.engine.id}
      onChange={onChange}
      tone={tone}
      className={className}
    />
  );
}
