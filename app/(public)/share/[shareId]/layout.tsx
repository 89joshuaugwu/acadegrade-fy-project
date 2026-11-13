import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';
import { absoluteUrl, NO_INDEX_METADATA } from '@/lib/seo/site';

type Props = {
  params: Promise<{ shareId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const shareId = resolvedParams.shareId;
  let studentName = 'Student';

  try {
    const doc = await adminDb.collection('shared_transcripts').doc(shareId).get();
    if (doc.exists) {
      studentName = doc.data()?.studentName || 'Student';
    }
  } catch (error) {
    // Fallback gracefully
  }

  const title = `${studentName}'s unofficial academic record | AcadeGrade`;
  const description = `${studentName}'s self-reported academic record, CGPA, and Performance Index, shared via AcadeGrade. Not issued or verified by any university.`;

  return {
    title,
    description,
    robots: NO_INDEX_METADATA.robots,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/share/${shareId}`),
      images: [
        {
          url: '/logo.png', // Or a dynamic OG image if available
          width: 800,
          height: 600,
          alt: `${studentName}'s Transcript`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/logo.png'],
    },
  };
}

export default function ShareTranscriptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
