import type { PublicTestimonial } from '@/lib/testimonials/testimonials';

/**
 * SAMPLE quotes from home.md §5.6. NOT real students and NOT consented.
 *
 * Use them ONLY in the admin preview (`?preview=proof` for a signed-in admin, or a
 * Vercel preview deployment), so the owner can see the design while collecting real,
 * consented quotes in Admin > Testimonials. Never render them in production, and
 * never write them to Firestore.
 */
export const PROOF_SAMPLE_TESTIMONIALS: readonly PublicTestimonial[] = [
  {
    id: 'sample-1',
    quote: 'I scanned my slip on results day and knew my CGPA before I reached the hostel.',
    firstName: 'Chiamaka',
    level: '300L',
    department: 'Microbiology',
    university: null,
  },
  {
    id: 'sample-2',
    quote: 'The what-if told me exactly what I needed for a 2:1. It made my second semester plan.',
    firstName: 'Tunde',
    level: '200L',
    department: 'Mechanical Engineering',
    university: null,
  },
  {
    id: 'sample-3',
    quote: 'My reading timetable reminds me even when I have no data. That alone helped me.',
    firstName: 'Amina',
    level: '400L',
    department: 'Law',
    university: null,
  },
];

/** Marks sample content so a page can label it ("Sample") in the preview. */
export const PROOF_SAMPLES_LABEL = 'Sample';
