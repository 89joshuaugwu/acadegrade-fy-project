import type { ReactNode } from 'react';
import Link from 'next/link';
import { LegalContact, legalLinkClass } from '@/components/marketing/LegalContact';
import type { LegalSection } from '@/components/marketing/LegalPage';
import type { LegalBlock, LegalInline, LegalSectionData } from './markup';

export interface LegalRenderOptions {
  /** Class for every link in the text. Defaults to the admin preview's link style. */
  linkClassName?: string;
  /**
   * Open https:// links in a new tab. True by default (the admin preview, so a click never
   * leaves an unsaved draft); the public pages pass false (no new tabs on public pages).
   */
  externalLinksInNewTab?: boolean;
}

interface Context {
  email: string | null;
  linkClass: string;
  newTab: boolean;
}

function inlineText(inlines: readonly LegalInline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === 'link') return inline.label;
      if (inline.type === 'contact') return 'Contact';
      return inline.text;
    })
    .join('')
    .trim();
}

function renderInlines(inlines: readonly LegalInline[], context: Context): ReactNode[] {
  const { email, linkClass, newTab } = context;
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case 'bold':
        return <strong key={index}>{inline.text}</strong>;
      case 'contact':
        return <LegalContact key={index} email={email} subject={inline.subject ?? undefined} className={linkClass} />;
      case 'link':
        if (inline.href.startsWith('/')) {
          return <Link key={index} className={linkClass} href={inline.href}>{inline.label}</Link>;
        }
        if (inline.href.startsWith('#')) {
          return <a key={index} className={linkClass} href={inline.href}>{inline.label}</a>;
        }
        return newTab
          ? <a key={index} className={linkClass} href={inline.href} rel="noopener noreferrer" target="_blank">{inline.label}</a>
          : <a key={index} className={linkClass} href={inline.href} rel="noopener noreferrer">{inline.label}</a>;
      default:
        // React escapes text, so raw HTML typed by an admin is shown literally, never run.
        return inline.text;
    }
  });
}

function renderBlock(block: LegalBlock, index: number, context: Context): ReactNode {
  if (block.type === 'paragraph') return <p key={index}>{renderInlines(block.inlines, context)}</p>;
  if (block.type === 'list') {
    return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlines(item, context)}</li>)}</ul>;
  }
  // Each body cell carries its column heading, so phones can show the table as stacked pairs.
  const labels = block.head.map((cell) => inlineText(cell));
  return (
    <table key={index}>
      <thead>
        <tr>{block.head.map((cell, cellIndex) => <th key={cellIndex} scope="col">{renderInlines(cell, context)}</th>)}</tr>
      </thead>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => <td key={cellIndex} data-label={labels[cellIndex] ?? ''}>{renderInlines(cell, context)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Turns parsed legal markup into the sections the public LegalPage renders. */
export function renderLegalSections(sections: readonly LegalSectionData[], email: string | null, options: LegalRenderOptions = {}): LegalSection[] {
  const context: Context = {
    email,
    linkClass: options.linkClassName ?? legalLinkClass,
    newTab: options.externalLinksInNewTab ?? true,
  };
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    content: <>{section.blocks.map((block, index) => renderBlock(block, index, context))}</>,
  }));
}
