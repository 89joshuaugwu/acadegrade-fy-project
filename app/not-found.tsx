import type { Metadata } from 'next';
import Link from 'next/link';
import { IMPRINT_LINE } from '@/components/public/nav';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { Photo } from '@/components/site/Photo';
import { AuthLinkButton, InlineLink } from '@/components/site/auth/controls';
import { RequestedPath } from '@/components/site/system/RequestedPath';
import { creditsFor, formatImprintCredits } from '@/lib/public/credits';
import { photoFor } from '@/lib/public/page-photos';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * Shown for any URL that does not exist; Next.js sends the 404 status itself.
 * A friendly card in the minimal shell: what happened, a result row that
 * found no matching course, and three ways on (home, the calculator, the
 * dashboard), with the 'notfound' photo beside it from 768px. Static HTML
 * plus one tiny island for the requested path, so it renders when services
 * are down.
 */
export default function NotFound() {
  const photo = photoFor('notfound');
  const credit = photo?.creditId ? formatImprintCredits(creditsFor([photo.creditId])) : null;
  const year = new Date().getFullYear();

  return (
    <MinimalShell
      imprint={
        credit ? (
          <>
            <p>
              © {year} AcadeGrade. {IMPRINT_LINE}. {credit}
            </p>
            <Link href="/privacy" className="ag-focus self-start rounded underline decoration-ag-mist/40 underline-offset-4 hover:text-ag-ink sm:self-auto">
              Privacy notice
            </Link>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8 sm:py-16 lg:items-center">
        <section
          aria-labelledby="not-found-title"
          className="grid w-full max-w-[1080px] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[32px] bg-white ring-1 ring-ag-ink/[0.06] md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
        >
          <div className="p-7 sm:p-10 lg:p-14">
            <h1 id="not-found-title" className="ag-display text-[2.375rem] font-bold leading-[1.04] text-ag-ink sm:text-[3rem]">
              We can&apos;t find that page
            </h1>
            <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-ag-mist">
              The link may be mistyped, or the page may have moved. Your results are safe; nothing was changed.
            </p>

            <div className="mt-8 rounded-2xl bg-ag-haze p-4 sm:p-5">
              <table className="w-full text-left">
                <caption className="sr-only">Result for this address</caption>
                <thead>
                  <tr className="text-[0.8125rem] text-ag-mist">
                    <th scope="col" className="pb-2 font-medium">Code</th>
                    <th scope="col" className="pb-2 font-medium">Course title</th>
                    <th scope="col" className="pb-2 pr-3 text-right font-medium">Units</th>
                    <th scope="col" className="w-12 pb-2 text-right font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-middle">
                    <td className="ag-display ag-num pr-3 text-[1.25rem] font-bold text-ag-ink">404</td>
                    <td className="pr-3 text-[0.9375rem] font-medium text-ag-ink">No page at this address</td>
                    <td className="ag-num pr-3 text-right text-[0.9375rem] text-ag-ink">0</td>
                    <td className="text-right">
                      <span aria-hidden="true" className="ml-auto grid size-9 place-items-center rounded-full bg-white text-[0.875rem] font-semibold text-ag-mist ring-1 ring-ag-ink/10">
                        –
                      </span>
                      <span className="sr-only">no grade</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-ag-ink/10 pt-3 text-[0.875rem]">
                <span className="min-w-0 truncate text-ag-mist">
                  Requested: <RequestedPath />
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-ag-mist">Pages found</span>
                  <span className="ag-display ag-num text-[1.125rem] font-bold text-ag-ink">0</span>
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <AuthLinkButton href="/" className="w-full sm:w-auto">
                Go to the home page
              </AuthLinkButton>
              <InlineLink href="/calculator" className="inline-flex min-h-11 items-center">
                Open the CGPA calculator
              </InlineLink>
            </div>
            <p className="mt-2 text-[0.9375rem]">
              <InlineLink href="/dashboard" className="inline-flex min-h-11 items-center">
                Signed in? Go to your dashboard
              </InlineLink>
            </p>
          </div>

          {photo ? (
            <div className="relative hidden min-h-[30rem] md:block">
              <Photo
                photo={photo}
                sizes="(min-width: 1080px) 460px, 42vw"
                className="absolute inset-0 block"
                imgClassName="h-full w-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,11,43,0)_55%,rgba(14,11,43,0.35)_100%)]" />
            </div>
          ) : null}
        </section>
      </div>
    </MinimalShell>
  );
}
