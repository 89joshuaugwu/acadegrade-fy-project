'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings2, Save, MessageSquare, AlertTriangle, Power, BookOpen, Info, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

interface AppSettings {
  aiSystemPrompt?: string;
  announcementBanner?: string | null;
  maintenanceMode?: boolean;
  gradeScale?: Array<{ grade: string; min: number; max: number; points: number }>;
}

const DEFAULT_GRADE_SCALE = [
  { grade: 'A', min: 70, max: 100, points: 5.0 },
  { grade: 'B', min: 60, max: 69, points: 4.0 },
  { grade: 'C', min: 50, max: 59, points: 3.0 },
  { grade: 'D', min: 45, max: 49, points: 2.0 },
  { grade: 'E', min: 40, max: 44, points: 1.0 },
  { grade: 'F', min: 0, max: 39, points: 0.0 },
];

interface AboutPageData {
  platformDescription: string;
  academicContext: string;
  academicContextExtra: string;
  builderName: string;
  builderInitials: string;
  builderBio: string;
  githubUrl: string;
  repoUrl: string;
  liveUrl: string;
  contactEmail: string;
  techStack: Array<{ name: string; description: string }>;
}

const DEFAULT_ABOUT: AboutPageData = {
  platformDescription: 'The next-generation academic tracking and predictive analytics platform built to help students monitor their progress effortlessly.',
  academicContext: 'AcadeGrade is a comprehensive Final Year Project (FYP) fulfilling the requirements of the CSC 499 course.',
  academicContextExtra: 'Beyond standard CGPA calculation, this platform introduces AI-driven forecasts, PWA offline capabilities, strict role-based access control, and granular push notifications.',
  builderName: 'Joshuazaza',
  builderInitials: 'JZ',
  builderBio: 'Software Engineer & Student.',
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
};

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingGradeScale, setSavingGradeScale] = useState(false);

  // About page state
  const [aboutData, setAboutData] = useState<AboutPageData>(DEFAULT_ABOUT);
  const [savingAbout, setSavingAbout] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadAboutData();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) { console.error(err); toast.error('Failed to load settings.'); }
    finally { setLoading(false); }
  };

  const loadAboutData = async () => {
    try {
      const res = await fetch('/api/about');
      if (res.ok) {
        const json = await res.json();
        if (json.about) setAboutData({ ...DEFAULT_ABOUT, ...json.about });
      }
    } catch (err) { console.error('Failed to load about data', err); }
  };

  const saveAboutData = async () => {
    setSavingAbout(true);
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collection: 'config', doc: 'about', data: aboutData }),
      });
      if (res.ok) {
        toast.success('About page content updated!');
      } else {
        toast.error('Failed to save about page data.');
      }
    } catch (err) { toast.error('Error saving about page data.'); }
    finally { setSavingAbout(false); }
  };

  const saveSetting = async (field: keyof AppSettings, value: any, setSavingState: (s: boolean) => void) => {
    setSavingState(true);
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field, value }),
      });
      if (res.ok) {
        toast.success('Settings updated successfully.');
        setSettings(prev => ({ ...prev, [field]: value }));
      } else {
        toast.error('Failed to update setting.');
      }
    } catch (err) { toast.error('Error updating setting.'); }
    finally { setSavingState(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">Platform Settings</h1>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">Configure global application behavior.</p>
      </div>

      {/* AI System Prompt */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="text-[var(--acade-primary)]" size={20} />
          <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">AI System Prompt</h2>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-4">
          This prompt instructs Gemini 3.1 Flash-Lite how to respond to academic insights. Modifying this will affect all AI generations.
        </p>
        <textarea
          value={settings.aiSystemPrompt || ''}
          onChange={(e) => setSettings({ ...settings, aiSystemPrompt: e.target.value })}
          rows={10}
          placeholder="You are an academic advisor AI..."
          className="w-full p-4 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[var(--acade-primary)] resize-y mb-4"
        />
        <div className="flex justify-end">
          <Button size="sm" loading={savingPrompt} onClick={() => saveSetting('aiSystemPrompt', settings.aiSystemPrompt, setSavingPrompt)}>
            <Save size={16} /> Save Prompt
          </Button>
        </div>
      </Card>

      {/* Grade Scale Table */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="text-[var(--acade-primary)]" size={20} />
          <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">Grade Scale</h2>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-4">
          Customize the grade boundaries and points. Must cover 0 to 100 continuously.
        </p>
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-4 gap-2 text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider mb-2">
            <span>Grade</span><span>Min Score</span><span>Max Score</span><span>Points</span>
          </div>
          {(settings.gradeScale || DEFAULT_GRADE_SCALE).map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2">
              <Input
                label=""
                value={row.grade}
                onChange={(e) => {
                  const newScale = [...(settings.gradeScale || DEFAULT_GRADE_SCALE)];
                  newScale[idx].grade = e.target.value;
                  setSettings({ ...settings, gradeScale: newScale });
                }}
              />
              <Input
                label=""
                type="number"
                value={String(row.min)}
                onChange={(e) => {
                  const newScale = [...(settings.gradeScale || DEFAULT_GRADE_SCALE)];
                  newScale[idx].min = Number(e.target.value);
                  setSettings({ ...settings, gradeScale: newScale });
                }}
              />
              <Input
                label=""
                type="number"
                value={String(row.max)}
                onChange={(e) => {
                  const newScale = [...(settings.gradeScale || DEFAULT_GRADE_SCALE)];
                  newScale[idx].max = Number(e.target.value);
                  setSettings({ ...settings, gradeScale: newScale });
                }}
              />
              <Input
                label=""
                type="number"
                step="0.1"
                value={String(row.points)}
                onChange={(e) => {
                  const newScale = [...(settings.gradeScale || DEFAULT_GRADE_SCALE)];
                  newScale[idx].points = Number(e.target.value);
                  setSettings({ ...settings, gradeScale: newScale });
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setSettings({ ...settings, gradeScale: DEFAULT_GRADE_SCALE })}>
            Reset to Default
          </Button>
          <Button size="sm" loading={savingGradeScale} onClick={() => saveSetting('gradeScale', settings.gradeScale || DEFAULT_GRADE_SCALE, setSavingGradeScale)}>
            <Save size={16} /> Save Scale
          </Button>
        </div>
      </Card>

      {/* Announcement Banner */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-[var(--acade-gold)]" size={20} />
          <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">Announcement Banner</h2>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-4">
          Display a global banner at the top of every student's dashboard. Clear the text to remove the banner.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              id="announcement-banner"
              label=""
              value={settings.announcementBanner || ''}
              onChange={(e) => setSettings({ ...settings, announcementBanner: e.target.value })}
              placeholder="e.g., Scheduled maintenance this Friday at 11 PM..."
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="md" onClick={() => { setSettings({ ...settings, announcementBanner: '' }); saveSetting('announcementBanner', null, setSavingBanner); }}>
              Clear
            </Button>
            <Button size="md" loading={savingBanner} onClick={() => saveSetting('announcementBanner', settings.announcementBanner || null, setSavingBanner)}>
              Publish
            </Button>
          </div>
        </div>
      </Card>

      {/* Maintenance Mode */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Power className="text-[var(--acade-danger)]" size={20} />
          <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">Maintenance Mode</h2>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--acade-danger)]/5 border border-[var(--acade-danger)]/20">
          <div>
            <h3 className="font-bold text-[var(--acade-text)]">Disable Platform Access</h3>
            <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
              When active, only admins can log in. Students will see a maintenance screen.
            </p>
          </div>
          <Switch
            checked={settings.maintenanceMode || false}
            onCheckedChange={(checked) => saveSetting('maintenanceMode', checked, setSavingMaintenance)}
            disabled={savingMaintenance}
          />
        </div>
      </Card>

      {/* ─── About Page Content ─── */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Info className="text-[var(--acade-primary)]" size={20} />
          <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">About Page Content</h2>
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-6">
          Edit the public About page. Changes are reflected immediately on the /about page.
        </p>

        <div className="space-y-6">
          {/* Platform Description */}
          <div>
            <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] mb-1.5 block">Platform Description</label>
            <textarea
              value={aboutData.platformDescription}
              onChange={e => setAboutData({ ...aboutData, platformDescription: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)] resize-y"
            />
          </div>

          {/* Academic Context */}
          <div>
            <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] mb-1.5 block">Academic Context (Main)</label>
            <textarea
              value={aboutData.academicContext}
              onChange={e => setAboutData({ ...aboutData, academicContext: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)] resize-y"
            />
          </div>
          <div>
            <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] mb-1.5 block">Academic Context (Extra)</label>
            <textarea
              value={aboutData.academicContextExtra}
              onChange={e => setAboutData({ ...aboutData, academicContextExtra: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)] resize-y"
            />
          </div>

          {/* Builder Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Builder Name" value={aboutData.builderName} onChange={e => setAboutData({ ...aboutData, builderName: e.target.value })} />
            <Input label="Builder Initials" value={aboutData.builderInitials} onChange={e => setAboutData({ ...aboutData, builderInitials: e.target.value })} />
            <Input label="Contact Email" value={aboutData.contactEmail} onChange={e => setAboutData({ ...aboutData, contactEmail: e.target.value })} />
          </div>
          <div>
            <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] mb-1.5 block">Builder Bio</label>
            <textarea
              value={aboutData.builderBio}
              onChange={e => setAboutData({ ...aboutData, builderBio: e.target.value })}
              rows={2}
              className="w-full p-3 rounded-xl bg-[var(--acade-deep)] border border-[var(--acade-border)] text-[var(--acade-text)] text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)] resize-y"
            />
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="GitHub URL" value={aboutData.githubUrl} onChange={e => setAboutData({ ...aboutData, githubUrl: e.target.value })} />
            <Input label="Repository URL" value={aboutData.repoUrl} onChange={e => setAboutData({ ...aboutData, repoUrl: e.target.value })} />
            <Input label="Live Site URL" value={aboutData.liveUrl} onChange={e => setAboutData({ ...aboutData, liveUrl: e.target.value })} />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] mb-3 block">Tech Stack</label>
            <div className="space-y-3">
              {aboutData.techStack.map((tech, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Input
                      label={idx === 0 ? 'Name' : ''}
                      value={tech.name}
                      onChange={e => {
                        const newStack = [...aboutData.techStack];
                        newStack[idx] = { ...newStack[idx], name: e.target.value };
                        setAboutData({ ...aboutData, techStack: newStack });
                      }}
                    />
                  </div>
                  <div className="col-span-7">
                    <Input
                      label={idx === 0 ? 'Description' : ''}
                      value={tech.description}
                      onChange={e => {
                        const newStack = [...aboutData.techStack];
                        newStack[idx] = { ...newStack[idx], description: e.target.value };
                        setAboutData({ ...aboutData, techStack: newStack });
                      }}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--acade-danger)] px-2"
                      onClick={() => {
                        const newStack = aboutData.techStack.filter((_, i) => i !== idx);
                        setAboutData({ ...aboutData, techStack: newStack });
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setAboutData({ ...aboutData, techStack: [...aboutData.techStack, { name: '', description: '' }] })}
              >
                <Plus size={16} /> Add Tech
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-[var(--acade-border-subtle)]">
          <Button loading={savingAbout} onClick={saveAboutData} className="gap-2">
            <Save size={16} /> Save About Page
          </Button>
        </div>
      </Card>
    </div>
  );
}
