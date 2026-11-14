/**
 * "Legal markup": the small, safe text format admins use to write the Terms and
 * Privacy pages. Nothing else is interpreted, so no HTML or script can be injected.
 *
 *   ## Heading {#optional-id}      starts a section
 *   blank line                     separates paragraphs
 *   - text                         bullet list item
 *   | A | B |  then  | --- | --- |  then rows       table (first row is the header)
 *   **bold**   [label](/path | #anchor | https://...)   {{contact}}  {{contact:Subject}}
 */

export type LegalInline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'contact'; subject: string | null };

export type LegalBlock =
  | { type: 'paragraph'; inlines: LegalInline[] }
  | { type: 'list'; items: LegalInline[][] }
  | { type: 'table'; head: LegalInline[][]; rows: LegalInline[][][] };

export interface LegalSectionData {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface ParsedLegalMarkup {
  sections: LegalSectionData[];
  issues: string[];
}

const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\{\{([^}]*)\}\}/g;
const HEADING = /^##\s+(.+?)\s*(?:\{#([A-Za-z0-9_-]+)\})?\s*$/;
const SEPARATOR_CELL = /^:?-{3,}:?$/;

/** Only site-relative paths, in-page anchors and https links are allowed. */
export function isSafeLegalHref(href: string): boolean {
  if (href.startsWith('//')) return false;
  return href.startsWith('/') || href.startsWith('#') || /^https:\/\/[^\s]+$/i.test(href);
}

export function slugifyLegalId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function parseInlines(text: string, issues: string[], where: string): LegalInline[] {
  const result: LegalInline[] = [];
  let last = 0;
  const push = (value: string) => {
    if (!value) return;
    const previous = result.at(-1);
    if (previous?.type === 'text') previous.text += value;
    else result.push({ type: 'text', text: value });
  };

  for (const match of text.matchAll(TOKEN)) {
    push(text.slice(last, match.index));
    last = (match.index ?? 0) + match[0].length;

    if (match[1] !== undefined) {
      result.push({ type: 'bold', text: match[1] });
    } else if (match[2] !== undefined) {
      if (isSafeLegalHref(match[3])) {
        result.push({ type: 'link', label: match[2], href: match[3] });
      } else {
        issues.push(`Unsupported link "${match[3]}" in ${where}. Use /path, #anchor or an https:// address.`);
        push(match[2]);
      }
    } else {
      const token = match[4].trim();
      const contact = /^contact(?::(.*))?$/.exec(token);
      if (contact && (contact[1] ?? '').trim().length <= 100) {
        result.push({ type: 'contact', subject: contact[1]?.trim() || null });
      } else {
        issues.push(`Unknown token {{${token}}} in ${where}. Only {{contact}} and {{contact:Subject}} are supported.`);
        push(match[0]);
      }
    }
  }
  push(text.slice(last));
  return result;
}

function splitRow(line: string): string[] {
  let inner = line.trim();
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  return inner.split('|').map((cell) => cell.trim());
}

export function parseLegalMarkup(body: string): ParsedLegalMarkup {
  const issues: string[] = [];
  const sections: LegalSectionData[] = [];
  const lines = body.replace(/\r\n?/g, '\n').split('\n');

  let section: LegalSectionData | null = null;
  let paragraph: string[] = [];
  let list: string[] | null = null;
  let table: string[] | null = null;
  let strayReported = false;

  const where = () => (section ? `section "${section.title}"` : 'the document');

  const flush = () => {
    if (!section) { paragraph = []; list = null; table = null; return; }
    if (paragraph.length) {
      section.blocks.push({ type: 'paragraph', inlines: parseInlines(paragraph.join(' '), issues, where()) });
      paragraph = [];
    }
    if (list) {
      section.blocks.push({ type: 'list', items: list.map((item) => parseInlines(item, issues, where())) });
      list = null;
    }
    if (table) {
      const rows = table.map(splitRow);
      const hasSeparator = rows.length >= 2 && rows[1].every((cell) => SEPARATOR_CELL.test(cell));
      if (!hasSeparator) {
        issues.push(`A table in ${where()} needs a header separator row such as | --- | --- | after its first row.`);
      } else {
        const head = rows[0];
        const body = rows.slice(2);
        if (body.some((row) => row.length !== head.length)) {
          issues.push(`A table in ${where()} has a row with a different number of cells than its header.`);
        }
        section.blocks.push({
          type: 'table',
          head: head.map((cell) => parseInlines(cell, issues, where())),
          rows: body.map((row) => row.map((cell) => parseInlines(cell, issues, where()))),
        });
      }
      table = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) { flush(); continue; }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const title = heading[1].trim();
      section = { id: heading[2] ?? slugifyLegalId(title), title, blocks: [] };
      sections.push(section);
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      issues.push(`Only "## " section headings are supported; "${line.slice(0, 40)}" is shown as plain text.`);
    }

    if (!section) {
      if (!strayReported) {
        issues.push('Text before the first "## " heading is ignored.');
        strayReported = true;
      }
      continue;
    }

    if (line.startsWith('|')) {
      if (paragraph.length || list) flush();
      (table ??= []).push(line);
    } else if (/^- /.test(line)) {
      if (paragraph.length || table) flush();
      (list ??= []).push(line.slice(2).trim());
    } else {
      if (list || table) flush();
      paragraph.push(line.trim());
    }
  }
  flush();

  if (sections.length === 0) issues.push('The text has no sections. Start with a "## Heading" line.');

  const seen = new Set<string>();
  for (const item of sections) {
    if (seen.has(item.id)) issues.push(`Duplicate section id "${item.id}". Give each section its own {#id}.`);
    seen.add(item.id);
    if (item.blocks.length === 0) issues.push(`Section "${item.title}" is empty.`);
  }

  return { sections, issues };
}
