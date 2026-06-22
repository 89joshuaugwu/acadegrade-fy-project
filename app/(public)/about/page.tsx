import { Metadata } from 'next';
import { GitBranch, Globe, Mail, Code2, GraduationCap, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'About | AcadeGrade',
  description: 'Learn about the AcadeGrade project, its academic context, and the technology stack behind it.',
};

const techStack = [
  { name: 'Next.js 14', desc: 'App Router & Server Actions', icon: <Zap size={24} /> },
  { name: 'React', desc: 'Client Components & UI', icon: <Code2 size={24} /> },
  { name: 'Firebase', desc: 'Auth, Firestore, Cloud Messaging', icon: <ShieldCheck size={24} /> },
  { name: 'Tailwind CSS', desc: 'Utility-first styling system', icon: <Cpu size={24} /> },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-40 left-10 w-72 h-72 bg-[var(--acade-primary)]/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-[var(--acade-gold)]/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 bg-[var(--acade-deep)] rounded-2xl mb-2 border border-[var(--acade-border)]">
            <GraduationCap size={32} className="text-[var(--acade-primary)]" />
          </div>
          <h1 className="text-[length:var(--text-4xl)] md:text-[length:var(--text-6xl)] font-bold font-[family-name:var(--font-bricolage)]">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--acade-primary)] to-[var(--acade-primary-glow)]">AcadeGrade</span>
          </h1>
          <p className="text-[var(--acade-text-muted)] text-[length:var(--text-lg)] md:text-[length:var(--text-xl)] max-w-2xl mx-auto leading-relaxed">
            The next-generation academic tracking and predictive analytics platform built to help students monitor their progress effortlessly.
          </p>
        </div>

        {/* Academic Context */}
        <section className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden group hover:border-[var(--acade-primary)]/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--acade-primary)]/5 rounded-bl-full pointer-events-none" />
          <h2 className="text-[length:var(--text-2xl)] font-bold mb-4 font-[family-name:var(--font-bricolage)] flex items-center gap-2">
            <GraduationCap className="text-[var(--acade-primary)]" />
            Academic Context (CSC 499)
          </h2>
          <p className="text-[var(--acade-text-muted)] text-[length:var(--text-base)] leading-relaxed mb-4">
            AcadeGrade is a comprehensive Final Year Project (FYP) fulfilling the requirements of the CSC 499 course. It addresses the critical need for a modern, reliable, and intelligent student grade tracking system within academic institutions.
          </p>
          <p className="text-[var(--acade-text-muted)] text-[length:var(--text-base)] leading-relaxed">
            Beyond standard CGPA calculation, this platform introduces AI-driven forecasts, PWA offline capabilities, strict role-based access control, and granular push notifications to deliver a highly robust educational tool.
          </p>
        </section>

        {/* Tech Stack */}
        <section className="space-y-6">
          <h2 className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-bricolage)] text-center">
            Technology Stack
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((tech) => (
              <div key={tech.name} className="bg-[var(--acade-surface)] border border-[var(--acade-border-subtle)] rounded-2xl p-6 flex flex-col items-center text-center gap-4 hover:border-[var(--acade-border)] hover:bg-[var(--acade-deep)] transition-all">
                <div className="p-3 bg-[var(--acade-deep)] rounded-xl text-[var(--acade-primary)]">
                  {tech.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[length:var(--text-lg)]">{tech.name}</h3>
                  <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Builder & Links */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-3xl p-8 shadow-sm">
            <h2 className="text-[length:var(--text-2xl)] font-bold mb-4 font-[family-name:var(--font-bricolage)]">
              The Builder
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--acade-primary)] to-[var(--acade-primary-glow)] flex items-center justify-center text-white font-bold text-xl shrink-0">
                JZ
              </div>
              <div>
                <h3 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">Joshuazaza</h3>
                <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)] mt-1 mb-4 leading-relaxed">
                  Software Engineer & Student. Focused on creating impactful, scalable, and beautifully designed web applications.
                </p>
                <div className="flex gap-2">
                  <a 
                    href="https://github.com/89joshuaugwu" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors border border-[var(--acade-border)] bg-transparent hover:bg-[var(--acade-deep)] h-9 px-4 py-2"
                  >
                    <GitBranch size={16} /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[var(--acade-deep)] to-[var(--acade-surface)] border border-[var(--acade-border)] rounded-3xl p-8 shadow-sm flex flex-col justify-center">
            <h2 className="text-[length:var(--text-2xl)] font-bold mb-2 font-[family-name:var(--font-bricolage)]">
              Project Links
            </h2>
            <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)] mb-6">
              Explore the source code or contact for inquiries.
            </p>
            <div className="space-y-3">
              <a 
                href="https://github.com/89joshuaugwu/acadegrade-fy-project" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-start gap-2 rounded-xl text-sm font-medium transition-colors bg-[var(--acade-primary)] text-white hover:bg-[var(--acade-primary-glow)] h-10 px-4 py-2"
              >
                <GitBranch size={18} /> Source Repository
              </a>
              <a 
                href="https://acadegrade.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-start gap-2 rounded-xl text-sm font-medium transition-colors border border-[var(--acade-border)] bg-transparent hover:bg-[var(--acade-deep)] h-10 px-4 py-2"
              >
                <Globe size={18} /> Live Deployment
              </a>
              <a 
                href="mailto:contact@joshuazaza.com"
                className="w-full inline-flex items-center justify-start gap-2 rounded-xl text-sm font-medium transition-colors text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-deep)] h-10 px-4 py-2"
              >
                <Mail size={18} /> Contact Builder
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
