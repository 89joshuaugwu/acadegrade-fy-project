'use client';

import { Copy, ExternalLink, QrCode, ScanEye, Trash2 } from 'lucide-react';
import { expiryChipLabel, expiryDateText, shortShareLink, viewsLabel } from '@/lib/share/link';
import { IconAction } from './IconAction';
import { ShareChips } from './ShareChips';

/** One active share link as the page holds it (a shared_transcripts doc, or a just-created one). */
export interface SharedLinkRow {
  id: string;
  expiresAt?: unknown;
  shareLevel?: 'full' | 'summary';
  pinHash?: string;
  hasPin?: boolean;
  viewCount?: number;
  showPhoto?: boolean;
  avatarUrl?: string | null;
}

interface SharedLinksListProps {
  links: readonly SharedLinkRow[];
  origin: string;
  onCopy: (url: string) => void;
  onShowQr: (url: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
  now?: number;
}

export function sharedLinkUrl(origin: string, id: string): string {
  return `${origin}/share/${id}`;
}

export function SharedLinksList({ links, origin, onCopy, onShowQr, onPreview, onDelete, now = Date.now() }: SharedLinksListProps) {
  if (links.length === 0) {
    return (
      <p className="rounded-2xl bg-[var(--acade-overlay)] px-4 py-3.5 text-[0.9375rem] text-[var(--acade-text-muted)]">
        No active links. Choose Share a link to send your transcript without a file.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => {
        const url = sharedLinkUrl(origin, link.id);
        const short = shortShareLink(url);
        const photo = link.showPhoto === true && link.avatarUrl !== null;
        return (
          <li
            key={link.id}
            className="grid min-w-0 gap-3 rounded-2xl bg-[var(--acade-overlay)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4"
          >
            <div className="flex min-w-0 flex-col gap-2">
              <ShareChips
                expiry={expiryChipLabel(link.expiresAt, now)}
                expiryDate={expiryDateText(link.expiresAt)}
                summary={link.shareLevel === 'summary'}
                pin={Boolean(link.pinHash) || link.hasPin === true}
                photo={photo}
                views={viewsLabel(link.viewCount)}
              />
              <p className="min-w-0 text-[0.8125rem] font-medium tabular-nums text-[var(--acade-text)] [overflow-wrap:anywhere] sm:text-[0.9375rem]">
                <span className="sr-only">Link: </span>
                {short}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-self-end" role="group" aria-label={`Actions for ${short}`}>
              <IconAction label="Copy link" icon={<Copy size={18} />} onClick={() => onCopy(url)} />
              <IconAction label="Show QR code" icon={<QrCode size={18} />} onClick={() => onShowQr(url)} />
              <IconAction href={url} target="_blank" rel="noreferrer" label="Open link in a new tab" icon={<ExternalLink size={18} />} />
              <IconAction label="Preview here" icon={<ScanEye size={18} />} onClick={() => onPreview(link.id)} />
              <IconAction label="Delete link" tone="danger" align="end" icon={<Trash2 size={18} />} onClick={() => onDelete(link.id)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
