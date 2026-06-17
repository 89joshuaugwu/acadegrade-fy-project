import { AlertTriangle } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[var(--acade-void)] flex flex-col items-center justify-center p-4 text-center">
      <div className="size-20 bg-[var(--acade-danger)]/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={40} className="text-[var(--acade-danger)]" />
      </div>
      <h1 className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
        Under Maintenance
      </h1>
      <p className="text-[length:var(--text-lg)] text-[var(--acade-text-muted)] max-w-md">
        AcadeGrade is currently undergoing scheduled maintenance to improve your experience. Please check back later.
      </p>
    </div>
  );
}
