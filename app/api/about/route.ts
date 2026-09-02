import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/about — Public endpoint to fetch the "About" page content.
 * Reads from Firestore config/about document.
 */
export async function GET() {
  try {
    const doc = await adminDb.collection('config').doc('about').get();

    if (!doc.exists) {
      // Return sensible defaults when the admin hasn't configured this yet
      return NextResponse.json({
        about: {
          platformDescription:
            'The next-generation academic tracking and predictive analytics platform built to help students monitor their progress effortlessly.',
          academicContext:
            'AcadeGrade is a comprehensive Final Year Project (FYP) fulfilling the requirements of the CSC 499 course. It addresses the critical need for a modern, reliable, and intelligent student grade tracking system within academic institutions.',
          academicContextExtra:
            'Beyond standard CGPA calculation, this platform introduces AI-driven forecasts, PWA offline capabilities, strict role-based access control, and granular push notifications to deliver a highly robust educational tool.',
          builderName: 'Joshuazaza',
          builderInitials: 'JZ',
          builderImageUrl: '',
          builderBio:
            'Software Engineer & Student. Focused on creating impactful, scalable, and beautifully designed web applications.',
          githubUrl: 'https://github.com/89joshuaugwu',
          repoUrl: 'https://github.com/89joshuaugwu/acadegrade-fy-project',
          liveUrl: 'https://acadegrade.vercel.app',
          contactEmail: 'contact@joshuazaza.com',
          techStack: [
            { name: 'Next.js', description: 'App Router & Server Actions' },
            { name: 'React', description: 'Client Components & UI' },
            { name: 'Firebase', description: 'Auth, Firestore, Cloud Messaging' },
            { name: 'Tailwind CSS', description: 'Utility-first styling system' },
          ],
        },
      });
    }

    return NextResponse.json({ about: doc.data() });
  } catch (error: any) {
    console.error('About GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
