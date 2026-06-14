'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { setDocument } from '@/lib/firebase/firestore';
import { STUDENT_LEVELS } from '@/lib/utils/constants';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

export default function NewSemesterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const [level, setLevel] = useState<number>(100);
  const [semesterNum, setSemesterNum] = useState<1 | 2>(1);
  const [session, setSession] = useState(new Date().getFullYear() + '/' + (new Date().getFullYear() + 1));

  useEffect(() => {
    if (profile?.level) {
      setLevel(profile.level);
    }
  }, [profile?.level]);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const id = `sem_${Date.now()}`;
      const label = `${level}L ${semesterNum === 1 ? 'First' : 'Second'} Semester`;

      await setDocument(`users/${user.uid}/semesters/${id}`, {
        label,
        session,
        level,
        semester: semesterNum,
        gpa: 0,
        pi: 0,
        creditLoaded: 0,
        isComplete: false,
      });

      toast.success('Semester created');
      router.replace(`/results/${id}`);
    } catch (err) {
      toast.error('Failed to create semester');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
          Add New Semester
        </h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="default" padding="lg">
          <div className="flex flex-col gap-6">
            <div>
              <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mb-2 block">
                Level
              </label>
              <Select
                options={STUDENT_LEVELS.map(l => ({ value: String(l), label: `${l} Level` }))}
                value={String(level)}
                onChange={(val) => setLevel(Number(val))}
              />
            </div>

            <div>
              <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mb-2 block">
                Semester
              </label>
              <Select
                options={[
                  { value: '1', label: 'First Semester' },
                  { value: '2', label: 'Second Semester' },
                ]}
                value={String(semesterNum)}
                onChange={(val) => setSemesterNum(Number(val) as 1 | 2)}
              />
            </div>

            <Input 
              label="Academic Session" 
              placeholder="e.g. 2025/2026" 
              value={session}
              onChange={(e) => setSession(e.target.value)}
            />

            <Button variant="primary" size="lg" onClick={handleCreate} disabled={loading} className="mt-4">
              {loading ? 'Creating...' : 'Create Semester'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
