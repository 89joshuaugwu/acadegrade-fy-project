import { describe, expect, it } from 'vitest';

type Palette = Record<string, string>;

const light: Palette = {
  canvas: '#F5F7FC',
  surface: '#FFFFFF',
  text: '#141827',
  muted: '#5C6577',
  faint: '#636D80',
  primary: '#5148DD',
  onPrimary: '#FFFFFF',
  danger: '#C83232',
  onDanger: '#FFFFFF',
};

const dark: Palette = {
  canvas: '#080B16',
  surface: '#101626',
  text: '#F7F8FC',
  muted: '#A7B0C4',
  faint: '#7E899F',
  primary: '#7C74FF',
  onPrimary: '#080B16',
  danger: '#FF6B6B',
  onDanger: '#080B16',
};

function relativeLuminance(hex: string) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4)
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme contrast', (_name, palette) => {
  it.each([
    ['body text on canvas', 'text', 'canvas'],
    ['body text on surface', 'text', 'surface'],
    ['muted text on surface', 'muted', 'surface'],
    ['faint metadata on surface', 'faint', 'surface'],
    ['primary action label', 'onPrimary', 'primary'],
    ['danger action label', 'onDanger', 'danger'],
  ])('%s meets WCAG AA for normal text', (_label, foreground, background) => {
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(4.5);
  });
});

// Border tokens are intentionally omitted: they communicate grouping and control
// geometry, while labels, focus rings, and state text carry the semantic meaning.
