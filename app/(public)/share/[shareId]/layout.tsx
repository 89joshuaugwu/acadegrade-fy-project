import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';
import { shareMetadataFor } from './metadata';

type Props = {
  params: Promise<{ shareId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  let data: unknown;

  try {
    const doc = await adminDb.collection('shared_transcripts').doc(shareId).get();
    data = doc.exists ? doc.data() : undefined;
  } catch {
    // Fall back to the generic, name-free metadata.
  }

  return shareMetadataFor(data, Date.now(), shareId);
}

export default function ShareTranscriptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
