import { Suspense } from 'react';
import { LegalEditor } from '@/components/admin/legal/LegalEditor';

export default function AdminLegalPage() {
  // The editor reads ?doc= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LegalEditor />
    </Suspense>
  );
}
