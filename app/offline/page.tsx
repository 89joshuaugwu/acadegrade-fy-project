import Link from 'next/link';
import { WifiOff, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[var(--acade-void)] flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      
      <div className="size-20 bg-[var(--acade-primary)]/10 rounded-full flex items-center justify-center mb-6">
        <WifiOff size={40} className="text-[var(--acade-primary)]" />
      </div>
      
      <h1 className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
        You're offline
      </h1>
      
      <p className="text-[length:var(--text-lg)] text-[var(--acade-text-muted)] max-w-md mb-8">
        Please check your internet connection. Don't worry, your last saved data is still available on your device.
      </p>

      <Link 
        href="/dashboard"
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--acade-primary)] text-white font-bold hover:bg-[var(--acade-primary-glow)] transition-colors"
      >
        <ArrowLeft size={18} /> Return to Dashboard
      </Link>
    </div>
  );
}
