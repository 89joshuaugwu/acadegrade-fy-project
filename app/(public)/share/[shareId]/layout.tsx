import type { Metadata } from 'next';
import { shareMetadataFor } from './metadata';

type Props = {
  params: Promise<{ shareId: string }>;
};

/** Generic for every link, so it needs no Firestore read and works when services are down. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  return shareMetadataFor(shareId);
}

export default function ShareTranscriptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
