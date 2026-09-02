'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GitBranch, Globe, Mail, Code2, GraduationCap, Cpu, ShieldCheck, Zap, Database, Palette } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Logo } from '@/components/ui/Logo';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { KnowledgeCoreBackground } from '@/components/ui/KnowledgeCoreBackground';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { HolographicIDCard } from '@/components/ui/HolographicIDCard';
import { OrbitingTechStack } from '@/components/ui/OrbitingTechStack';

/** Map tech name → icon */
const TECH_ICONS: Record<string, React.ReactNode> = {
  'Next.js': <Zap size={24} />,
  React: <Code2 size={24} />,
  Firebase: <ShieldCheck size={24} />,
  'Tailwind CSS': <Palette size={24} />,
  TypeScript: <Code2 size={24} />,
  Firestore: <Database size={24} />,
  Default: <Cpu size={24} />,
};

function getIcon(name: string) {
  return TECH_ICONS[name] ?? TECH_ICONS.Default;
}

interface AboutData {
  platformDescription: string;
  academicContext: string;
  academicContextExtra: string;
  builderName: string;
  builderInitials: string;
  builderImageUrl?: string;
  builderBio: string;
  githubUrl: string;
  repoUrl: string;
  liveUrl: string;
  contactEmail: string;
  techStack: Array<{ name: string; description: string }>;
}

export default function AboutPage() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/about')
      .then(r => r.json())
      .then(json => setData(json.about))
      .catch(err => console.error('Failed to load about data', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 pb-20 px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
            <Skeleton className="h-48 rounded-3xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-52 rounded-3xl" />
              <Skeleton className="h-52 rounded-3xl" />
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <Navbar />

      <div className="min-h-screen pt-24 pb-20 px-4 relative overflow-hidden">
        {/* The 3D Knowledge Core Interactive Centerpiece */}
        <KnowledgeCoreBackground />

        <div className="max-w-4xl mx-auto space-y-16 relative z-10">
          {/* ─── Header ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            {/* Use the actual Logo component */}
            <div className="flex justify-center mb-4">
              <Logo href="/" size="lg" />
            </div>

            <h1 className="text-[length:var(--text-4xl)] md:text-[length:var(--text-6xl)] font-bold font-[family-name:var(--font-bricolage)]">
              About{' '}
              <span className="bg-gradient-to-r from-white via-indigo-100 to-[var(--acade-primary-glow)] text-transparent bg-clip-text">
                AcadeGrade
              </span>
            </h1>
            <p className="text-[var(--acade-text-muted)] text-[length:var(--text-lg)] md:text-[length:var(--text-xl)] max-w-2xl mx-auto leading-relaxed">
              {data.platformDescription}
            </p>
          </motion.div>

          {/* ─── Academic Context ─── */}
          <HolographicCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-8 md:p-10 relative overflow-hidden group hover:border-[var(--acade-primary)]/50 transition-colors"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--acade-primary)]/10 rounded-bl-full pointer-events-none" />
            <h2 className="text-[length:var(--text-2xl)] font-bold mb-4 font-[family-name:var(--font-bricolage)] flex items-center gap-2">
              <GraduationCap className="text-[var(--acade-primary)]" />
              Academic Context (CSC 499)
            </h2>
            <p className="text-[var(--acade-text-muted)] text-[length:var(--text-base)] leading-relaxed mb-4 relative z-10">
              {data.academicContext}
            </p>
            {data.academicContextExtra && (
              <p className="text-[var(--acade-text-muted)] text-[length:var(--text-base)] leading-relaxed relative z-10">
                {data.academicContextExtra}
              </p>
            )}
          </HolographicCard>

          {/* ─── Tech Stack ─── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-bricolage)] text-center">
              Technology Stack
            </h2>
            <div className="hidden md:block">
              <OrbitingTechStack techStack={data.techStack} />
            </div>

            {/* Mobile Fallback Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {data.techStack.map((tech) => (
                <HolographicCard
                  key={tech.name}
                  className="flex flex-col items-center text-center gap-4 p-6"
                >
                  <div className="p-3 bg-[var(--acade-deep)]/80 rounded-xl text-[var(--acade-primary)] shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                    {getIcon(tech.name)}
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-bold text-[length:var(--text-lg)] text-white">{tech.name}</h3>
                    <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
                      {tech.description}
                    </p>
                  </div>
                </HolographicCard>
              ))}
            </div>
          </motion.section>

          {/* ─── Builder & Links ─── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20"
          >
            <HolographicIDCard className="p-8 shadow-sm">
              <h2 className="text-[length:var(--text-2xl)] font-bold mb-4 font-[family-name:var(--font-bricolage)]">
                The Developer
              </h2>
              <div className="flex items-start gap-4">
                {data.builderImageUrl ? (
                  <img
                    src={data.builderImageUrl}
                    alt={data.builderName}
                    className="w-16 h-16 rounded-full object-cover shadow-sm shrink-0 border border-[var(--acade-border)]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--acade-primary)] to-[var(--acade-primary-glow)] flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {data.builderInitials}
                  </div>
                )}
                <div>
                  <h3 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">
                    {data.builderName}
                  </h3>
                  <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)] mt-1 mb-4 leading-relaxed">
                    {data.builderBio}
                  </p>
                  {data.githubUrl && (
                    <a
                      href={data.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors border border-[var(--acade-border)] bg-transparent hover:bg-[var(--acade-deep)] h-9 px-4 py-2"
                    >
                      <GitBranch size={16} /> GitHub
                    </a>
                  )}
                </div>
              </div>
            </HolographicIDCard>

            <HolographicIDCard className="p-8 shadow-sm flex flex-col justify-center">
              <h2 className="text-[length:var(--text-2xl)] font-bold mb-2 font-[family-name:var(--font-bricolage)]">
                Project Links
              </h2>
              <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)] mb-6">
                Explore the source code or contact for inquiries.
              </p>
              <div className="space-y-3">
                {data.repoUrl && (
                  <a
                    href={data.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-start gap-2 rounded-xl text-sm font-medium transition-colors bg-[var(--acade-primary)] text-white hover:bg-[var(--acade-primary-glow)] h-10 px-4 py-2"
                  >
                    <GitBranch size={18} /> Source Repository
                  </a>
                )}
                {data.liveUrl && (
                  <a
                    href={data.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-start gap-2 rounded-xl text-sm font-medium transition-colors border border-[var(--acade-border)] bg-transparent hover:bg-[var(--acade-deep)] h-10 px-4 py-2"
                  >
                    <Globe size={18} /> Live Deployment
                  </a>
                )}
                {data.contactEmail && (
                  <a
                    href={`mailto:${data.contactEmail}`}
                    className="w-full inline-flex items-center justify-start gap-2 rounded-xl text-sm font-medium transition-colors text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-deep)] h-10 px-4 py-2"
                  >
                    <Mail size={18} /> Contact Builder
                  </a>
                )}
              </div>
            </HolographicIDCard>
          </motion.section>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
