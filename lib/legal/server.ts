import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { readLegalVersions } from '@/lib/user/requirements';
import { BUILTIN_LEGAL } from './builtin';
import { LEGAL_VERSION_FIELD, type LegalDocumentId } from './versions';

export interface PublishedLegal {
  version: string;
  /** YYYY-MM-DD */
  effectiveDate: string;
  title: string;
  summary: string;
  body: string;
  /** 'published' when an admin published this text; 'builtin' when the built-in text is live. */
  source: 'published' | 'builtin';
}

function readVersionDocument(data: unknown): Omit<PublishedLegal, 'source'> | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  const { version, effectiveDate, title, summary, body } = value;
  if (typeof version !== 'string' || typeof effectiveDate !== 'string' || typeof title !== 'string' || typeof body !== 'string') return null;
  return { version, effectiveDate, title, summary: typeof summary === 'string' ? summary : '', body };
}

/**
 * The text the public Terms/Privacy page shows. Order: the version named by
 * `config/legal`, else the most recently published version, else the built-in text.
 * Any read error falls back to the built-in text, so the page never fails.
 */
export async function getPublishedLegal(document: LegalDocumentId): Promise<PublishedLegal> {
  try {
    const config = await adminDb.collection('config').doc('legal').get();
    const current = readLegalVersions(config.data())[LEGAL_VERSION_FIELD[document]];
    const versions = adminDb.collection('legal_documents').doc(document).collection('versions');

    const named = await versions.doc(current).get();
    let found = named.exists ? readVersionDocument(named.data()) : null;
    if (!found) {
      const latest = await versions.orderBy('publishedAt', 'desc').limit(1).get();
      found = latest.empty ? null : readVersionDocument(latest.docs[0].data());
    }
    if (found) return { ...found, source: 'published' };
  } catch {
    console.warn('[legal] could not read published text; showing the built-in text');
  }
  return { ...BUILTIN_LEGAL[document], source: 'builtin' };
}
