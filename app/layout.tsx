import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { ServiceWorkerKill } from '@/components/shared/ServiceWorkerKill';
import { PWABanner } from '@/components/ui/PWABanner';
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

export const metadata: Metadata = {
  title: {
    default: 'AcadeGrade — AI-Powered CGPA Tracker',
    template: '%s | AcadeGrade',
  },
  description:
    'The smartest CGPA tracker built for Nigerian university students. AI-powered insights, dual-metric analysis, and real academic clarity.',
  keywords: [
    'CGPA calculator',
    'Nigerian university',
    'GPA tracker',
    'academic performance',
    'ESUT',
    'AI insights',
    'Performance Index',
  ],
  authors: [{ name: 'Joshuazaza', url: 'https://acadegrade.vercel.app' }],
  creator: 'Joshua Chimaobi Ugwu',
  manifest: '/manifest.json',
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
    url: 'https://acadegrade.vercel.app',
    title: 'AcadeGrade — AI-Powered CGPA Tracker',
    description:
      'Track your CGPA and Performance Index with AI-powered insights. Built for Nigerian university students.',
    siteName: 'AcadeGrade',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AcadeGrade — AI-Powered CGPA Tracker',
    description:
      'Track your CGPA with AI insights. Built for Nigerian university students.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#6366F1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-body antialiased">
        <ServiceWorkerKill />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--acade-deep)',
                  color: 'var(--acade-text)',
                  border: '1px solid var(--acade-border)',
                  borderRadius: '12px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-dm-sans)',
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
            />
            <PWABanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
