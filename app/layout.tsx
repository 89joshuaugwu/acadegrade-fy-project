import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, Hanken_Grotesk } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono'; // taste-skill-ignore: student and admin pages keep their mono until they are migrated
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { ServiceWorkerKill } from '@/components/shared/ServiceWorkerKill';
import { PWABanner } from '@/components/ui/PWABanner';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import {
  getSiteJsonLd,
  resolveSiteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
} from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// The public site's one family (docs/public-redesign/01 §5): two weights, Latin, self-hosted.
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
  weight: ['400', '500'],
});

const DEFAULT_TITLE = 'AcadeGrade: CGPA, GPA and degree class for Nigerian universities';

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | AcadeGrade',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'CGPA calculator',
    'GPA tracker',
    'university grades',
    'academic performance',
    'AI academic advisor',
    'degree class calculator',
    'student dashboard',
    'Nigeria university grading',
    'academic trajectory',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Education',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  verification: {
    google: 'F3WW92_FNlQviz77sKTnTL-EnbLbWuh0P1snZC5e72o',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: '/',
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    // og:image comes from app/opengraph-image.tsx and each route's own file.
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    // Brand v2: Haze on light, Night on dark (docs/brand-v2/DESIGN.md).
    { media: '(prefers-color-scheme: light)', color: '#F4F1FF' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0B2B' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same source as the public pages: admin About email, then env, else none.
  const contactEmail = await getContactEmail();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} ${hanken.variable} ${GeistSans.variable} ${GeistMono.variable}`} // taste-skill-ignore: GeistMono stays for student pages
    >
      <body className="font-body antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(getSiteJsonLd(contactEmail)) }}
        />
        <ServiceWorkerKill />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              containerStyle={{ zIndex: 'var(--z-toast)' }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--acade-deep)',
                  color: 'var(--acade-text)',
                  border: '1px solid var(--acade-border)',
                  borderRadius: '12px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-dm-sans)',
                  boxShadow: 'var(--shadow-popover)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--acade-success)',
                    secondary: 'var(--acade-deep)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--acade-danger)',
                    secondary: 'var(--acade-deep)',
                  },
                },
              }}
            />
            <PWABanner />
            <CookieConsentBanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
