'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings2, Save, MessageSquare, AlertTriangle, Power, BookOpen } from 'lucide-react';
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

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingGradeScale, setSavingGradeScale] = useState(false);

  useEffect(() => { if (user) loadSettings(); }, [user]);

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
    </div>
  );
}
