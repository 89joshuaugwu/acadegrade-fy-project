import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { DEGREE_CLASSES, GRADE_SCALE } from '@/lib/utils/constants';

const cell = 'px-3 py-2 text-left';
const head = 'px-3 py-2 text-left text-xs font-medium text-[var(--acade-text-muted)]';

/**
 * Settings → Advanced. The grade scale is shown read-only: both calculators use
 * the built-in 5-point scale and nothing reads `config/settings.gradeScale`, so
 * any stored value is left untouched and not shown as if it applied.
 */
export function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <Card padding="lg">
        <section aria-labelledby="grading-title" className="space-y-4">
          <div>
            <h2 id="grading-title" className="text-lg font-semibold text-[var(--acade-text)]">Grading used by the apps</h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Display only. Calculations use the standard 5-point scale; editable grading profiles are planned.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <table className="w-full text-sm tabular-nums text-[var(--acade-text)]" aria-labelledby="grading-title">
              <thead className="border-b border-[var(--acade-border)]">
                <tr><th scope="col" className={head}>Grade</th><th scope="col" className={head}>Score</th><th scope="col" className={`${head} text-right`}>Grade point</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--acade-border-subtle)]">
                {GRADE_SCALE.map((row) => (
                  <tr key={row.grade}>
                    <th scope="row" className={`${cell} font-semibold`}>{row.grade}</th>
                    <td className={cell}>{row.minScore}–{row.maxScore}</td>
                    <td className={`${cell} text-right`}>{row.gradePoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full text-sm tabular-nums text-[var(--acade-text)]" aria-label="Degree classes">
              <thead className="border-b border-[var(--acade-border)]">
                <tr><th scope="col" className={head}>Degree class</th><th scope="col" className={`${head} text-right`}>CGPA from</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--acade-border-subtle)]">
                {DEGREE_CLASSES.map((row) => (
                  <tr key={row.shortLabel}>
                    <th scope="row" className={`${cell} font-medium`}>{row.label}</th>
                    <td className={`${cell} text-right`}>{row.minCGPA.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Card>

      <Card padding="lg">
        <section aria-labelledby="legacy-list-title">
          <h2 id="legacy-list-title" className="text-lg font-semibold text-[var(--acade-text)]">Legacy data</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
            <Link href="/admin/courses" className="font-medium text-[var(--acade-primary)] underline underline-offset-2">Legacy course list (not used by the apps)</Link>
            {' '}is an old list of course codes kept for reference.
          </p>
        </section>
      </Card>
    </div>
  );
}
