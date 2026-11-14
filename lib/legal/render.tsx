import type { ReactNode } from 'react';
import Link from 'next/link';
import { LegalContact, legalLinkClass } from '@/components/marketing/LegalContact';
import type { LegalSection } from '@/components/marketing/LegalPage';
import type { LegalBlock, LegalInline, LegalSectionData } from './markup';

function renderInlines(inlines: readonly LegalInline[], email: string | null): ReactNode[] {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case 'bold':
        return <strong key={index}>{inline.text}</strong>;
      case 'contact':
        return <LegalContact key={index} email={email} subject={inline.subject ?? undefined} />;
      case 'link':
        if (inline.href.startsWith('/')) {
          return <Link key={index} className={legalLinkClass} href={inline.href}>{inline.label}</Link>;
        }
        if (inline.href.startsWith('#')) {
          return <a key={index} className={legalLinkClass} href={inline.href}>{inline.label}</a>;
        }
        return <a key={index} className={legalLinkClass} href={inline.href} rel="noopener noreferrer" target="_blank">{inline.label}</a>;
      default:
        // React escapes text, so raw HTML typed by an admin is shown literally, never run.
        return inline.text;
    }
  });
}

function renderBlock(block: LegalBlock, index: number, email: string | null): ReactNode {
  if (block.type === 'paragraph') return <p key={index}>{renderInlines(block.inlines, email)}</p>;
  if (block.type === 'list') {
    return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlines(item, email)}</li>)}</ul>;
  }
  return (
    <table key={index}>
      <thead>
        <tr>{block.head.map((cell, cellIndex) => <th key={cellIndex} scope="col">{renderInlines(cell, email)}</th>)}</tr>
      </thead>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInlines(cell, email)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/** Turns parsed legal markup into the sections the public LegalPage renders. */
export function renderLegalSections(sections: readonly LegalSectionData[], email: string | null): LegalSection[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    content: <>{section.blocks.map((block, index) => renderBlock(block, index, email))}</>,
  }));
}
