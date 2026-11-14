import { describe, expect, it } from 'vitest';
import { parseLegalMarkup } from '@/lib/legal/markup';

const doc = [
  '## Agreement and eligibility {#agreement}',
  '',
  'These terms apply to **everyone**. See the [Privacy notice](/privacy) or write to {{contact:Terms question}}.',
  'A second line joins the same paragraph.',
  '',
  '- First point',
  '- **Bold lead:** second point with [a link](https://example.org/page)',
  '',
  '| What | How long |',
  '| --- | --- |',
  '| Backups | 30 days |',
  '| Logs | 90 days |',
  '',
  '## Your rights',
  '',
  'Plain paragraph.',
].join('\n');

describe('parseLegalMarkup', () => {
  it('parses sections, paragraphs, bullets, bold, links, tables and the contact token', () => {
    const { sections, issues } = parseLegalMarkup(doc);
    expect(issues).toEqual([]);
    expect(sections.map((section) => section.id)).toEqual(['agreement', 'your-rights']);
    expect(sections[0].title).toBe('Agreement and eligibility');

    const [paragraph, list, table] = sections[0].blocks;
    expect(paragraph).toEqual({
      type: 'paragraph',
      inlines: [
        { type: 'text', text: 'These terms apply to ' },
        { type: 'bold', text: 'everyone' },
        { type: 'text', text: '. See the ' },
        { type: 'link', label: 'Privacy notice', href: '/privacy' },
        { type: 'text', text: ' or write to ' },
        { type: 'contact', subject: 'Terms question' },
        { type: 'text', text: '. A second line joins the same paragraph.' },
      ],
    });
    expect(list).toMatchObject({ type: 'list' });
    if (list.type !== 'list') throw new Error('expected a list');
    expect(list.items).toHaveLength(2);
    expect(list.items[1][0]).toEqual({ type: 'bold', text: 'Bold lead:' });
    expect(list.items[1][2]).toEqual({ type: 'link', label: 'a link', href: 'https://example.org/page' });

    if (table.type !== 'table') throw new Error('expected a table');
    expect(table.head).toHaveLength(2);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][1]).toEqual([{ type: 'text', text: '30 days' }]);
  });

  it('derives an id from the title when none is given', () => {
    const { sections } = parseLegalMarkup('## How long we keep information\n\nText.');
    expect(sections[0].id).toBe('how-long-we-keep-information');
  });

  it('supports a contact token without a subject', () => {
    const { sections, issues } = parseLegalMarkup('## A {#a}\n\nWrite to {{contact}}.');
    expect(issues).toEqual([]);
    const block = sections[0].blocks[0];
    if (block.type !== 'paragraph') throw new Error('expected a paragraph');
    expect(block.inlines[1]).toEqual({ type: 'contact', subject: null });
  });

  it('reports javascript: links, unknown tokens and duplicate ids, and never emits an unsafe link', () => {
    const { sections, issues } = parseLegalMarkup([
      '## One {#same}',
      '',
      'Click [here](javascript:alert(1)) or [data](data:text/html,hi) or [relative](//evil.example) and {{script}}.',
      '',
      '## Two {#same}',
      '',
      'Fine.',
    ].join('\n'));

    expect(issues.some((issue) => /unsupported link/i.test(issue))).toBe(true);
    expect(issues.some((issue) => /unknown token/i.test(issue))).toBe(true);
    expect(issues.some((issue) => /duplicate section id/i.test(issue))).toBe(true);

    const block = sections[0].blocks[0];
    if (block.type !== 'paragraph') throw new Error('expected a paragraph');
    expect(block.inlines.some((inline) => inline.type === 'link')).toBe(false);
  });

  it('reports text before the first heading, unsupported heading levels, empty sections and bad tables', () => {
    const { issues } = parseLegalMarkup([
      'Loose text first.',
      '',
      '## Empty section {#empty}',
      '',
      '### Too deep',
      '',
      '## Table {#table}',
      '',
      '| A | B |',
      '| 1 | 2 |',
    ].join('\n'));
    expect(issues.some((issue) => /before the first/i.test(issue))).toBe(true);
    expect(issues.some((issue) => /empty/i.test(issue))).toBe(true);
    expect(issues.some((issue) => /heading/i.test(issue))).toBe(true);
    expect(issues.some((issue) => /header separator/i.test(issue))).toBe(true);
  });

  it('keeps raw HTML as plain text (it is escaped when rendered)', () => {
    const { sections, issues } = parseLegalMarkup('## A {#a}\n\n<script>alert(1)</script> and <b>bold</b>');
    expect(issues).toEqual([]);
    const block = sections[0].blocks[0];
    if (block.type !== 'paragraph') throw new Error('expected a paragraph');
    expect(block.inlines).toEqual([{ type: 'text', text: '<script>alert(1)</script> and <b>bold</b>' }]);
  });

  it('handles Windows line endings and an empty document', () => {
    expect(parseLegalMarkup('## A {#a}\r\n\r\nText.\r\n').sections[0].blocks).toHaveLength(1);
    const empty = parseLegalMarkup('');
    expect(empty.sections).toEqual([]);
    expect(empty.issues.some((issue) => /no sections/i.test(issue))).toBe(true);
  });
});
