import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';

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

  const title = `${studentName}'s Transcript | AcadeGrade`;
  const description = `View ${studentName}'s academic transcript, CGPA, and Performance Index securely shared via AcadeGrade.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://acadegrade.com/share/${shareId}`,
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
