import Link from 'next/link';
import { contactHref } from '@/lib/site/contact-email';

/** Link style for the admin preview of legal texts (student/admin design). */
export const legalLinkClass = 'font-semibold text-[var(--acade-primary)] underline underline-offset-4';

/**
 * The configured contact address as a mailto, or the support page when no
 * address is published. Never hard-codes an address. Public pages pass the
 * public text-link class (`pg-link`).
 */
export function LegalContact({ email, subject, className = legalLinkClass }: { email: string | null; subject?: string; className?: string }) {
  if (email) {
    return <a className={className} href={contactHref(email, subject)}>{email}</a>;
  }
  return <Link className={className} href="/support">the AcadeGrade support page</Link>;
}
