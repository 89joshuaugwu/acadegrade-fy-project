import Link from 'next/link';
import { AcadeGradeMark } from '@/components/public/Logo';
import { COOKIE_CHOICES_HREF, FOOTER_GROUPS, IMPRINT_LINE } from '@/components/public/nav';
import { getContactEmail } from '@/lib/site/contact';

/** Brand v2 footer (server). The full link set, so every public page is two clicks away. */
export async function SiteFooter() {
  let contactEmail: string | null = null;
  try {
    contactEmail = await getContactEmail();
  } catch {
    contactEmail = null;
  }
  const year = new Date().getFullYear();

  return (
    <footer className="ag-site bg-ag-night text-white">
      <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Link href="/" className="ag-focus inline-flex items-center gap-2.5 rounded-lg">
              <AcadeGradeMark size={34} />
              <span className="ag-display text-[1.375rem] font-bold text-white">AcadeGrade</span>
            </Link>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-ag-mist-night">
              Your GPA, CGPA and degree class, worked out from your results. Made in Enugu for Nigerian university students.
            </p>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="ag-focus mt-5 inline-block rounded text-[0.9375rem] font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-ag-gold">
                {contactEmail}
              </a>
            ) : (
              <Link href="/support" className="ag-focus mt-5 inline-block rounded text-[0.9375rem] font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-ag-gold">
                Contact support
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <nav key={group.id} aria-labelledby={`footer-${group.id}`}>
                <h2 id={`footer-${group.id}`} className="text-[0.875rem] font-semibold text-white">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      {link.href === COOKIE_CHOICES_HREF ? (
                        <a href={link.href} className="ag-focus rounded text-[0.9375rem] text-ag-mist-night transition-colors hover:text-white">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="ag-focus rounded text-[0.9375rem] text-ag-mist-night transition-colors hover:text-white">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-[0.8125rem] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} AcadeGrade</p>
          <p>{IMPRINT_LINE}.</p>
        </div>
      </div>
    </footer>
  );
}
