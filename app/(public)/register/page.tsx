'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Check, Sparkles, AlertCircle, FileText, Database } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/hooks/useAuth';
import { signUpWithEmail } from '@/lib/firebase/auth';
import { setDocument, getDocument, serverTimestamp } from '@/lib/firebase/firestore';
import { DEFAULT_UNIVERSITY, STUDENT_LEVELS } from '@/lib/utils/constants';
import { NIGERIAN_UNIVERSITIES, ACADEMIC_DEPARTMENTS, ACADEMIC_PROGRAMMES } from '@/lib/utils/academic-data';
import type { StudentLevel, RecordMode, PastSemesterEntry } from '@/types/user';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Logo } from '@/components/ui';

/* ─── Validation Schemas per Step ─── */
const step1Base = z.object({
  fullName: z.string().min(2, 'Name is too short'),
  matric: z.string().min(4, 'Matric number is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
});
const step1Schema = step1Base.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const step2Base = z.object({
  university: z.string().min(2, 'University is required'),
  department: z.string().min(2, 'Department is required'),
  programme: z.string().min(2, 'Programme is required'),
  courseDuration: z.number().min(1).max(10),
  currentLevel: z.number(),
  entrySession: z.string().regex(/^\d{4}\/\d{4}$/, 'Must be format YYYY/YYYY (e.g. 2022/2023)'),
});
const step2Schema = step2Base;

const step3Base = z.object({
  recordMode: z.union([z.literal('fromScratch'), z.literal('complete')]),
  semestersCompleted: z.number().min(1).max(20).optional(),
});
const step3Schema = step3Base.refine(
  (data) => {
    if (data.recordMode === 'complete') {
      return data.semestersCompleted !== undefined && data.semestersCompleted > 0;
    }
    return true;
  },
  {
    message: "Specify semesters completed",
    path: ['semestersCompleted'],
  }
);

const step4Base = z.object({
  pastSemesters: z.array(z.object({
    level: z.number(),
    semester: z.union([z.literal(1), z.literal(2)]),
    session: z.string().regex(/^\d{4}\/\d{4}$/, 'Invalid session format'),
    label: z.string()
  })).optional()
});
const step4Schema = step4Base;

const formSchema = step1Base
  .merge(step2Base)
  .merge(step3Base)
  .merge(step4Base)
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.recordMode === 'complete') {
        return data.semestersCompleted !== undefined && data.semestersCompleted > 0;
      }
      return true;
    },
    {
      message: "Specify semesters completed",
      path: ['semestersCompleted'],
    }
  );

type FormData = z.infer<typeof formSchema>;

/* ─── Helper to generate past semesters ─── */
function generatePastSemesters(
  currentLevel: number,
  semestersCompleted: number,
  entrySession: string
): PastSemesterEntry[] {
  const result: PastSemesterEntry[] = [];
  
  // Try to parse the starting year of the entry session
  const parts = entrySession.split('/');
  let startYear = parseInt(parts[0], 10);
  if (isNaN(startYear)) startYear = new Date().getFullYear();

  let totalGenerated = 0;
  let year = startYear;

  // Support up to course duration (up to 1000L)
  const levelsToGenerate = Array.from({length: 10}, (_, i) => (i + 1) * 100);

  for (const level of levelsToGenerate) {
    if (totalGenerated >= semestersCompleted) break;
    
    // Semester 1
    result.push({
      level: level as StudentLevel,
      semester: 1,
      session: `${year}/${year + 1}`,
      label: `${level}L First Semester`,
    });
    totalGenerated++;
    if (totalGenerated >= semestersCompleted) break;

    // Semester 2
    result.push({
      level: level as StudentLevel,
      semester: 2,
      session: `${year}/${year + 1}`,
      label: `${level}L Second Semester`,
    });
    totalGenerated++;

    year++; // next level
  }
  return result;
}

/* ════════════════════════════════════════════════════
   WIZARD STEPS
   ════════════════════════════════════════════════════ */

// ----- STEP 1 -----
function Step1Account({ onNext }: { onNext: () => void }) {
  const { register, trigger, getValues, formState: { errors } } = useFormContext<FormData>();
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const valid = await trigger(['fullName', 'matric', 'email', 'password', 'confirmPassword']);
    if (!valid) return;

    setIsLoading(true);
    try {
      const email = getValues('email');
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'registration' })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setCooldown(data.cooldownRemaining || 60);
        }
        toast.error(data.error || 'Failed to send verification code');
        return;
      }
      
      setShowOtp(true);
      setCooldown(60);
      toast.success('Verification code sent to your email!');
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const email = getValues('email');
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'registration', code: otpCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Invalid verification code');
        return;
      }
      
      toast.success('Email verified successfully!');
      onNext();
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showOtp) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
          Verify Your Email
        </h2>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-4">
          We sent a 6-digit verification code to <strong>{getValues('email')}</strong>. Please enter it below to proceed. The code expires in 5 minutes.
        </p>
        
        <Input 
          label="Verification Code (OTP)" 
          placeholder="123456" 
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          className="text-center tracking-[0.5em] font-mono text-lg"
        />
        
        <Button type="button" variant="primary" size="lg" fullWidth onClick={handleVerifyOtp} disabled={isLoading || otpCode.length !== 6} className="mt-2">
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </Button>
        
        <div className="flex items-center justify-between mt-4">
          <button 
            type="button" 
            onClick={() => setShowOtp(false)}
            className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back
          </button>
          
          <button 
            type="button" 
            onClick={handleSendOtp}
            disabled={cooldown > 0 || isLoading}
            className="text-[length:var(--text-sm)] text-[var(--grade-b)] hover:underline disabled:opacity-50 disabled:hover:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
        Create Your Account
      </h2>
      <Input label="Full Name" placeholder="joshuazaza" error={errors.fullName?.message} {...register('fullName')} />
      <Input label="Matric Number" placeholder="2022030200000" error={errors.matric?.message} {...register('matric')} />
      <Input label="Email Address" type="email" placeholder="you@university.edu" error={errors.email?.message} {...register('email')} />
      <Input label="Password" type="password" placeholder="At least 8 characters" error={errors.password?.message} {...register('password')} />
      <Input label="Confirm Password" type="password" placeholder="Type password again" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      
      <Button type="button" variant="primary" size="lg" fullWidth onClick={handleSendOtp} disabled={isLoading} className="mt-2">
        {isLoading ? 'Sending Code...' : 'Continue'} <ArrowRight size={18} />
      </Button>
    </div>
  );
}

// ----- STEP 2 -----
function Step2Programme({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { register, trigger, formState: { errors }, control, watch } = useFormContext<FormData>();
  
  const handleNext = async () => {
    const valid = await trigger(['university', 'department', 'programme', 'courseDuration', 'currentLevel', 'entrySession']);
    if (valid) onNext();
  };

  const levelVal = watch('currentLevel');
  const entrySessionVal = watch('entrySession');
  const durationVal = watch('courseDuration');
  const setValue = useFormContext<FormData>().setValue;

  // Auto-calculate level when entry session changes
  useEffect(() => {
    if (entrySessionVal && /^\d{4}\/\d{4}$/.test(entrySessionVal)) {
      const startYear = parseInt(entrySessionVal.split('/')[0]);
      const currentYear = new Date().getFullYear();
      let calculatedLevel = (currentYear - startYear) * 100 + 100;
      
      // Clamp between 100 and (duration * 100)
      const maxLevel = (durationVal || 4) * 100;
      if (calculatedLevel < 100) calculatedLevel = 100;
      if (calculatedLevel > maxLevel) calculatedLevel = maxLevel;
      
      setValue('currentLevel', calculatedLevel, { shouldValidate: true });
    }
  }, [entrySessionVal, durationVal, setValue]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
        Academic Details
      </h2>
      
      <Input label="University" placeholder="University Name" list="universities" error={errors.university?.message} {...register('university')} />
      <datalist id="universities">
        {NIGERIAN_UNIVERSITIES.map(uni => (
          <option key={uni} value={uni} />
        ))}
      </datalist>

      <Input label="Department" placeholder="e.g. Computer Science" list="departments" error={errors.department?.message} {...register('department')} />
      <datalist id="departments">
        {ACADEMIC_DEPARTMENTS.map(dept => (
          <option key={dept} value={dept} />
        ))}
      </datalist>

      <Input label="Programme" placeholder="e.g. B.Sc Computer Science" list="programmes" error={errors.programme?.message} {...register('programme')} />
      <datalist id="programmes">
        {ACADEMIC_PROGRAMMES.map(prog => (
          <option key={prog} value={prog} />
        ))}
      </datalist>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mb-1 block">Course Duration (Years)</label>
        <div className="flex items-center gap-4">
          <input 
            type="range" min="1" max="10" step="1"
            className="w-full accent-[var(--acade-primary)] h-2 bg-[var(--acade-deep)] rounded-lg appearance-none cursor-pointer"
            {...register('courseDuration', { valueAsNumber: true })}
          />
          <span className="bg-[var(--acade-deep)] px-3 py-1 rounded-lg border border-[var(--acade-border)] font-bold">
            {durationVal || 4}
          </span>
        </div>
      </div>

      <Input label="Entry Year/Session" placeholder="e.g. 2022/2023" error={errors.entrySession?.message} {...register('entrySession')} />

      <div className="flex flex-col gap-1.5">
        <label className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">Current Level (Auto-calculated, you can adjust)</label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
          {Array.from({length: durationVal || 4}, (_, i) => (i + 1) * 100).map((level) => (
            <Controller
              key={level}
              name="currentLevel"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(level)}
                  className={cn(
                    'h-10 px-3 rounded-xl text-[length:var(--text-xs)] font-semibold transition-colors border',
                    levelVal === level
                      ? 'bg-[var(--acade-primary)]/20 border-[var(--acade-primary)] text-[var(--acade-primary-glow)]'
                      : 'bg-[var(--acade-deep)] border-[var(--acade-border)] text-[var(--acade-text-muted)] hover:border-[var(--acade-text-faint)]'
                  )}
                >
                  {level}L
                </button>
              )}
            />
          ))}
        </div>
        {errors.currentLevel && <p className="text-[length:var(--text-xs)] text-[var(--acade-danger)] font-[family-name:var(--font-dm-sans)]">{errors.currentLevel.message}</p>}
      </div>
      
      <div className="flex items-center gap-3 mt-4">
        <Button type="button" variant="ghost" size="lg" onClick={onBack} className="px-4 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <Button type="button" variant="primary" size="lg" fullWidth onClick={handleNext}>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ----- STEP 3 -----
function Step3RecordMode({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { trigger, watch, setValue, formState: { errors } } = useFormContext<FormData>();
  const shouldReduceMotion = useReducedMotion();
  
  const modeVal = watch('recordMode');
  const durationVal = watch('courseDuration') || 4;
  const maxSemesters = durationVal * 2;
  const semsCompleted = watch('semestersCompleted') || 1;

  const handleNext = async () => {
    const valid = await trigger(['recordMode', 'semestersCompleted']);
    if (valid) {
      if (modeVal === 'fromScratch') {
        // Skip step 4 if from scratch
        onNext(); 
        onNext(); 
      } else {
        // Go to step 4
        onNext();
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
        How do you want to track?
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <motion.div
          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          onClick={() => setValue('recordMode', 'fromScratch', { shouldValidate: true })}
          className={cn(
            'cursor-pointer rounded-2xl p-6 border-2 transition-all',
            modeVal === 'fromScratch'
              ? 'bg-[var(--acade-primary)]/10 border-[var(--acade-primary)] shadow-[0_0_20px_rgba(99,102,241,0.1)]'
              : 'bg-[var(--acade-surface)] border-[var(--acade-border)] hover:border-[var(--acade-border-subtle)]'
          )}
        >
          <div className="size-12 rounded-full bg-[var(--acade-deep)] flex items-center justify-center mb-4">
            <Sparkles size={24} className={modeVal === 'fromScratch' ? 'text-[var(--acade-primary-glow)]' : 'text-[var(--acade-text-muted)]'} />
          </div>
          <h3 className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
            From Scratch
          </h3>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            Start fresh. Enter results as you go. Perfect for freshers.
          </p>
        </motion.div>

        <motion.div
          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          onClick={() => setValue('recordMode', 'complete', { shouldValidate: true })}
          className={cn(
            'cursor-pointer rounded-2xl p-6 border-2 transition-all',
            modeVal === 'complete'
              ? 'bg-[var(--acade-gold)]/10 border-[var(--acade-gold)] shadow-[0_0_20px_rgba(245,158,11,0.1)]'
              : 'bg-[var(--acade-surface)] border-[var(--acade-border)] hover:border-[var(--acade-border-subtle)]'
          )}
        >
          <div className="size-12 rounded-full bg-[var(--acade-deep)] flex items-center justify-center mb-4">
            <Database size={24} className={modeVal === 'complete' ? 'text-[var(--acade-gold)]' : 'text-[var(--acade-text-muted)]'} />
          </div>
          <h3 className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
            Complete Record
          </h3>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            I have past results to enter now to build my CGPA.
          </p>
        </motion.div>
      </div>
      
      {errors.recordMode && <p className="text-[length:var(--text-xs)] text-[var(--acade-danger)] font-[family-name:var(--font-dm-sans)] text-center -mt-2">{errors.recordMode.message}</p>}

      <AnimatePresence>
        {modeVal === 'complete' && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-[var(--acade-surface)] border border-[var(--acade-border)] mt-2">
              <label className="flex items-center justify-between text-[length:var(--text-sm)] font-medium text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] mb-4">
                <span>How many semesters completed?</span>
                <span className="bg-[var(--acade-deep)] px-3 py-1 rounded-full border border-[var(--acade-border)] font-[family-name:var(--font-geist-mono)]">
                  {semsCompleted}
                </span>
              </label>
              <input 
                type="range" 
                min="1" 
                max={maxSemesters} 
                step="1"
                value={semsCompleted}
                onChange={(e) => setValue('semestersCompleted', parseInt(e.target.value), { shouldValidate: true })}
                className="w-full accent-[var(--acade-gold)] h-2 bg-[var(--acade-deep)] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 mt-4">
        <Button type="button" variant="ghost" size="lg" onClick={onBack} className="px-4 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <Button type="button" variant="primary" size="lg" fullWidth onClick={handleNext}>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ----- STEP 4 -----
function Step4PastSemesters({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { watch, setValue } = useFormContext<FormData>();
  const shouldReduceMotion = useReducedMotion();
  
  const currentLevel = watch('currentLevel');
  const semestersCompleted = watch('semestersCompleted') || 1;
  const entrySession = watch('entrySession');
  const pastSemesters = watch('pastSemesters') || [];

  // Generate if empty
  useEffect(() => {
    if (pastSemesters.length === 0 && currentLevel && entrySession) {
      const generated = generatePastSemesters(currentLevel, semestersCompleted, entrySession);
      setValue('pastSemesters', generated);
    }
  }, [currentLevel, semestersCompleted, entrySession, pastSemesters, setValue]);

  const handleNext = () => {
    // Basic validation could happen here
    onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[length:var(--text-xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
        Confirm Past Semesters
      </h2>
      <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] -mt-2 mb-2">
        We&apos;ve set up your timeline. You can adjust the session years if they look wrong.
      </p>

      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
        <AnimatePresence>
          {pastSemesters.map((sem, index) => (
            <motion.div
              key={`${sem.level}-${sem.semester}`}
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-[var(--acade-surface)] border border-[var(--acade-border)]"
            >
              <div className="flex-1 flex flex-col">
                <span className="text-[length:var(--text-sm)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">
                  {sem.label}
                </span>
                <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)]">
                  Level: {sem.level} · Semester: {sem.semester}
                </span>
              </div>
              <div className="shrink-0">
                <input
                  type="text"
                  value={sem.session}
                  onChange={(e) => {
                    const newArr = [...pastSemesters];
                    newArr[index].session = e.target.value;
                    setValue('pastSemesters', newArr);
                  }}
                  className="w-32 h-10 px-3 bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-lg text-[length:var(--text-sm)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-dm-sans)] text-center"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Button type="button" variant="ghost" size="lg" onClick={() => {
          // Go back 2 steps to RecordMode, resetting the array
          setValue('pastSemesters', []);
          onBack(); 
        }} className="px-4 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <Button type="button" variant="primary" size="lg" fullWidth onClick={handleNext}>
          Looks Good <Check size={18} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN REGISTER WIZARD
   ════════════════════════════════════════════════════ */
export default function RegisterWizard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signupsDisabled, setSignupsDisabled] = useState(false);

  const totalSteps = 5;

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      university: DEFAULT_UNIVERSITY,
      recordMode: 'fromScratch',
      courseDuration: 4,
    }
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const doc = await getDocument<any>('config/settings');
        if (doc?.maintenanceMode) {
          router.replace('/maintenance');
        } else if (doc?.disableSignups) {
          setSignupsDisabled(true);
        }
      } catch (err) {}
    };
    checkMaintenance();
  }, [router]);

  // Final submit handler
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // 1. Firebase Auth Create User
      const userCred = await signUpWithEmail(data.email, data.password);
      const uid = userCred.user.uid;

      // 2. Create User Document
      await setDocument(`users/${uid}`, {
        fullName: data.fullName,
        email: data.email,
        matric: data.matric,
        department: data.department,
        currentLevel: data.currentLevel,
        programme: data.programme,
        university: data.university,
        avatarUrl: null,
        recordMode: data.recordMode,
        gradeMode: 'cgpa',
        currentSession: data.entrySession, // We'll save it as currentSession in DB for compatibility, or change later
        isAdmin: false,
        disabled: false,
        fcmTokens: [],
      });

      // 3. Pre-create Semesters if Complete Record mode
      if (data.recordMode === 'complete' && data.pastSemesters) {
        for (const [index, sem] of data.pastSemesters.entries()) {
          const semId = `sem_${Date.now()}_${index}`;
          await setDocument(`users/${uid}/semesters/${semId}`, {
            label: sem.label,
            session: sem.session,
            level: sem.level,
            semester: sem.semester,
            gpa: 0,
            pi: 0,
            creditLoaded: 0,
            isComplete: true, // past semesters are marked complete initially
          });
        }
      }

      // 4. Create dummy analytics document to prevent null errors later
      await setDocument(`analytics/${uid}`, {
        cgpa: 0,
        pi: 0,
        degreeClass: 'Fail',
        totalCredits: 0,
        semesterHistory: [],
        regressionSlope: 0,
        projectedCGPA: 0,
        riskScore: 0,
      });

      // 5. Trigger Welcome Email
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Assuming we use an internal secret or the user token
          'Authorization': `Bearer ${await userCred.user.getIdToken()}`,
        },
        body: JSON.stringify({
          uid,
          type: 'email',
          event: 'welcome',
          data: { name: data.fullName },
        }),
      }).catch(console.error);

      // Show Success step
      setIsSuccess(true);
      setCurrentStep(5);
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error && err.message.includes('email-already-in-use')
          ? 'An account with this email already exists.'
          : 'Failed to create account. Please try again.'
      );
      // Go back to step 1 to let them change email
      setCurrentStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[var(--acade-void)]" />;
  }

  if (signupsDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--acade-void)] text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--acade-primary)]/5 mix-blend-overlay pointer-events-none" />
        <div className="max-w-md w-full z-10 text-center space-y-6">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="p-8 rounded-[2rem] bg-[var(--acade-surface)] border border-[var(--acade-border)] shadow-xl flex flex-col items-center">
            <div className="size-16 rounded-full bg-[var(--acade-gold)]/10 flex items-center justify-center text-[var(--acade-gold)] mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-3">
              Registration Closed
            </h1>
            <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mb-8">
              We are currently not accepting new sign-ups. Existing users can still log in to access their dashboards.
            </p>
            <Button fullWidth disabled className="mb-4">
              Sign Up Disabled
            </Button>
            <Button variant="outline" fullWidth onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (user && !isSuccess) return null;

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12 bg-[var(--acade-void)]">
      {/* Background glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--acade-primary) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Confetti container (Pure CSS) */}
      {isSuccess && !shouldReduceMotion && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 flex justify-around">
          {[...Array(30)].map((_, i) => (
            <div 
              key={i}
              className="w-2 h-4 bg-[var(--acade-primary-glow)] rounded-sm animate-[confetti-fall_3s_ease-out_forwards]"
              style={{
                backgroundColor: i % 3 === 0 ? 'var(--acade-gold)' : i % 2 === 0 ? 'var(--acade-success)' : 'var(--acade-primary-glow)',
                animationDelay: `${Math.random() * 0.5}s`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      )}

      <div className="relative w-full max-w-lg">
        {/* Header Logo */}
        <div className="flex justify-center mb-8">
          <Logo href="/" size="lg" />
        </div>

        {/* Progress Bar */}
        {!isSuccess && (
          <div className="mb-8">
            <div className="flex justify-between text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-bold mb-2 px-1">
              <span>STEP {currentStep} OF {totalSteps - 1}</span>
              <span>{Math.round((currentStep / (totalSteps - 1)) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-[var(--acade-deep)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--acade-primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </div>
          </div>
        )}

        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-2xl p-6 md:p-8',
            'shadow-[0_0_40px_rgba(99,102,241,0.06)] overflow-hidden relative'
          )}
        >
          {isSubmitting && (
            <div className="absolute inset-0 bg-[var(--acade-deep)]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center">
               <div className="size-12 border-4 border-[var(--acade-primary)] border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">
                 Setting up your academic profile...
               </p>
            </div>
          )}

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Step1Account onNext={() => setCurrentStep(2)} />
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Step2Programme onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Step3RecordMode onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />
                  </motion.div>
                )}
                {currentStep === 4 && (
                  <motion.div key="step4" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {/* The next button on step 4 submits the form */}
                    <Step4PastSemesters onNext={methods.handleSubmit(onSubmit)} onBack={() => setCurrentStep(3)} />
                  </motion.div>
                )}
                {currentStep === 5 && (
                  <motion.div key="step5" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center py-10">
                    <div className="size-20 bg-[var(--acade-success)]/20 text-[var(--acade-success)] rounded-full flex items-center justify-center mb-6">
                      <Check size={40} />
                    </div>
                    <h2 className="text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
                      You&apos;re All Set!
                    </h2>
                    <p className="text-[length:var(--text-base)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] max-w-sm">
                      Your AcadeGrade profile is ready. Redirecting you to your new dashboard...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </FormProvider>

        </motion.div>

        {/* Login Link */}
        {!isSuccess && (
          <p className="text-center mt-6 text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] font-semibold transition-colors"
            >
              Sign in →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
