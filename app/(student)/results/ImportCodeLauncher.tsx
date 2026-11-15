'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normaliseImportCode, takePendingImportCode } from '@/app/(public)/c/import-link';
import type { SemesterWithId } from '@/types/semester';
import { pickImportTarget } from './import-target';

/**
 * H5: a share-code link (/results?importCode=XXXXXX, or a code remembered
 * before sign-in) opens the latest in-progress semester with the import
 * dialog ready. Nothing is imported until the student confirms there.
 */
export function ImportCodeLauncher({ semesters }: { semesters: SemesterWithId[] }) {
  const router = useRouter();
  const handled = useRef(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const fromUrl = normaliseImportCode(new URLSearchParams(window.location.search).get('importCode'));
    const code = fromUrl ?? takePendingImportCode();
    if (!code) return;
    const target = pickImportTarget(semesters);
    if (!target) {
      setNotice(true);
      return;
    }
    router.replace(`/results/${encodeURIComponent(target.id)}?importCode=${encodeURIComponent(code)}`);
  }, [semesters, router]);

  if (!notice) return null;
  return (
    <p role="status" className="mb-4 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/30 bg-[var(--acade-primary-dim)] px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
      You have no semester in progress to import into. Add a semester first, then use Import Code inside it.
    </p>
  );
}
