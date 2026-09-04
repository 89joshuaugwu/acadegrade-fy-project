'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { getDocument } from '@/lib/firebase/firestore';
import { DEFAULT_UNIVERSITY } from '@/lib/utils/constants';
import { NIGERIAN_UNIVERSITIES, ACADEMIC_DEPARTMENTS, ACADEMIC_PROGRAMMES } from '@/lib/utils/academic-data';
import type { StudentLevel, PastSemesterEntry } from '@/types/user';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import {
  buildAcademicSlots,
  graduationSession,
  inferCurrentLevel,
  parseAcademicSession,
} from '@/lib/academic/timeline';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Logo } from '@/components/ui';
import { ReactiveAuthBackground } from '@/components/ui/ReactiveAuthBackground';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';

/* ─── Validation Schemas per Step ─── */
const step1Base = z.object({
  authMethod: z.enum(['email', 'google']),
  fullName: z.string().trim().min(2, 'Name is too short').max(100, 'Name is too long'),
  matric: z.string().trim().min(4, 'Matric number is required').max(64, 'Matric number is too long').regex(
    /^[A-Za-z0-9/._-]+(?:\s+[A-Za-z0-9/._-]+)*$/,
    'Use only letters, numbers, /, -, _ or .'
  ),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().max(128, 'Password is too long').optional(),
  confirmPassword: z.string().max(128, 'Password is too long').optional(),
  verificationToken: z.string().optional(),
});
const step1Schema = step1Base.refine((data) => {
  if (data.authMethod === 'email') {
    return !!data.password && data.password.length >= 8;
  }
  return true;
}, {
  message: "Password must be at least 8 characters",
  path: ['password'],
}).refine((data) => {
  if (data.authMethod === 'email') {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const step2Base = z.object({
  university: z.string().trim().min(2, 'University is required'),
  department: z.string().trim().min(2, 'Department is required'),
  programme: z.string().trim().min(2, 'Programme is required'),
  courseDuration: z.number().min(1).max(10),
  currentLevel: z.number().int().min(100).max(1000).refine((value) => value % 100 === 0, 'Choose a valid level'),
  entrySession: z.string().trim().refine(
    (value) => parseAcademicSession(value) !== null,
    'Use consecutive years, for example 2022/2023'
  ),
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
    session: z.string().trim().refine(
      (value) => parseAcademicSession(value) !== null,
      'Use consecutive years, for example 2022/2023'
    ),
    label: z.string()
  })).optional()
});
const step4Schema = step4Base;

const formSchema = step1Base
  .merge(step2Base)
  .merge(step3Base)
  .merge(step4Base)
  .refine((data) => {
    if (data.authMethod === 'email') {
      return !!data.password && data.password.length >= 8;
    }
    return true;
  }, {
    message: "Password must be at least 8 characters",
    path: ['password'],
  })
  .refine((data) => {
    if (data.authMethod === 'email') {
      return data.password === data.confirmPassword;
    }
    return true;
  }, {
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
  )
  .refine(
    (data) => data.currentLevel <= data.courseDuration * 100,
    {
      message: 'Current level exceeds the programme duration',
      path: ['currentLevel'],
    }
  )
  .refine(
    (data) => data.recordMode !== 'complete' || (
      (data.semestersCompleted || 0) <= Math.min(
        data.courseDuration * 2,
        (data.currentLevel / 100) * 2
      )
    ),
    {
      message: 'Completed semesters cannot extend beyond your current level',
      path: ['semestersCompleted'],
    }
  )
  .refine(
    (data) => data.recordMode !== 'complete' || (
      data.pastSemesters?.length === data.semestersCompleted
    ),
    {
      message: 'Confirm every completed semester before continuing',
      path: ['pastSemesters'],
    }
  );

type FormData = z.infer<typeof formSchema>;

const REGISTRATION_DRAFT_KEY = 'acadegrade:registration-draft:v2';

type SafeRegistrationDraft = {
  step: number;
  values: Partial<Omit<FormData, 'password' | 'confirmPassword' | 'verificationToken'>>;
};

function withoutRegistrationSecrets(values: unknown): SafeRegistrationDraft['values'] {
  const source = values && typeof values === 'object'
    ? values as Record<string, unknown>
    : {};
  const { password: _password, confirmPassword: _confirmPassword, verificationToken: _verificationToken, ...safe } = source;
  return safe as SafeRegistrationDraft['values'];
}

/* ─── Helper to generate past semesters ─── */
function generatePastSemesters(
  currentLevel: number,
  semestersCompleted: number,
  entrySession: string,
  courseDuration: number
): PastSemesterEntry[] {
  return buildAcademicSlots(entrySession, courseDuration)
    .filter((slot) => slot.level <= currentLevel)
    .slice(0, semestersCompleted)
    .map((slot) => ({
      level: slot.level as StudentLevel,
      semester: slot.semester,
      session: slot.session,
      label: slot.label,
    }));
}

/* ════════════════════════════════════════════════════
   WIZARD STEPS
   ════════════════════════════════════════════════════ */

// ----- STEP 1 -----
function Step1Account({ onNext }: { onNext: () => void }) {
  const { register, trigger, getValues, setValue, watch, formState: { errors } } = useFormContext<FormData>();
  const { user: signedInUser } = useAuth();
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const authMethod = watch('authMethod');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      setValue('authMethod', 'google', { shouldValidate: true });
      setValue('verificationToken', undefined);
      if (user.email) setValue('email', user.email, { shouldValidate: true });
      if (user.displayName) setValue('fullName', user.displayName, { shouldValidate: true });
      
      toast.success('Authenticated! Please verify your name and enter your matric number.');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Failed to authenticate with Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const fieldsToValidate = authMethod === 'google' 
      ? ['fullName', 'matric', 'email'] as const
      : ['fullName', 'matric', 'email', 'password', 'confirmPassword'] as const;
      
    const valid = await trigger(fieldsToValidate);
    if (!valid) return;

    if (authMethod === 'google') {
      onNext();
      return;
    }

    setIsLoading(true);
    try {
      const email = getValues('email');
      setValue('verificationToken', undefined);
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
      
      if (!data.verificationToken) {
        toast.error('Verification could not be secured. Please request a new code.');
        return;
      }

      setValue('verificationToken', data.verificationToken, { shouldValidate: true });
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
            onClick={() => {
              setShowOtp(false);
              setValue('verificationToken', undefined);
            }}
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

      {authMethod === 'email' && (
        <Button type="button" variant="outline" size="lg" fullWidth onClick={handleGoogleSignup} disabled={isLoading} className="mb-2">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>
      )}

      {authMethod === 'email' && (
        <div className="relative flex items-center py-2 mb-2">
          <div className="flex-grow border-t border-[var(--acade-border)]"></div>
          <span className="flex-shrink-0 mx-4 text-[var(--acade-text-muted)] text-[length:var(--text-xs)] uppercase tracking-wider font-bold">OR</span>
          <div className="flex-grow border-t border-[var(--acade-border)]"></div>
        </div>
      )}

      {authMethod === 'google' && (
        <div className="bg-[var(--acade-success)]/10 text-[var(--acade-success)] p-3 rounded-xl mb-4 flex items-start gap-2 border border-[var(--acade-success)]/20">
          <Check className="shrink-0 mt-0.5" size={18} />
          <p className="text-[length:var(--text-sm)]">Google authenticated! Verify your details below to continue.</p>
        </div>
      )}

      <Input label="Full Name" placeholder="joshuazaza" error={errors.fullName?.message} {...register('fullName')} />
      <Input label="Matric Number" placeholder="2022030200000" error={errors.matric?.message} {...register('matric')} />
      <Input label="Email Address" type="email" placeholder="you@university.edu" error={errors.email?.message} {...register('email')} disabled={authMethod === 'google' || Boolean(signedInUser?.email)} />
      
      {authMethod === 'email' && (
        <>
          <Input label="Password" type="password" placeholder="At least 8 characters" error={errors.password?.message} {...register('password')} />
          <Input label="Confirm Password" type="password" placeholder="Type password again" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        </>
      )}
      
      <Button type="button" variant="primary" size="lg" fullWidth onClick={handleSendOtp} disabled={isLoading} className="mt-2">
        {isLoading ? (authMethod === 'google' ? 'Saving...' : 'Sending Code...') : 'Continue'} <ArrowRight size={18} />
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

  // Auto-calculate level using the September academic-year rollover shared
  // with the mobile app.
  useEffect(() => {
    if (parseAcademicSession(entrySessionVal) !== null) {
      setValue(
        'currentLevel',
        inferCurrentLevel(entrySessionVal, durationVal || 4),
        { shouldValidate: true }
      );
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

      {parseAcademicSession(entrySessionVal) !== null && (
        <p className="-mt-2 text-[length:var(--text-xs)] text-[var(--acade-text-faint)]">
          Expected graduation: {graduationSession(entrySessionVal, durationVal || 4)}
        </p>
      )}

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
function Step3RecordMode({
  onNext,
  onSubmit,
  onBack,
}: {
  onNext: () => void;
  onSubmit: () => void | Promise<void>;
  onBack: () => void;
}) {
  const { trigger, watch, setValue, formState: { errors } } = useFormContext<FormData>();
  const shouldReduceMotion = useReducedMotion();
  
  const modeVal = watch('recordMode');
  const durationVal = watch('courseDuration') || 4;
  const currentLevel = watch('currentLevel') || 100;
  const maxSemesters = Math.min(durationVal * 2, (currentLevel / 100) * 2);
  const semsCompleted = watch('semestersCompleted') || 1;

  useEffect(() => {
    if (modeVal === 'complete' && semsCompleted > maxSemesters) {
      setValue('semestersCompleted', maxSemesters, { shouldValidate: true });
    }
  }, [maxSemesters, modeVal, semsCompleted, setValue]);

  const handleNext = async () => {
    const valid = await trigger(['recordMode', 'semestersCompleted']);
    if (valid) {
      if (modeVal === 'fromScratch') {
        setValue('pastSemesters', []);
        setValue('semestersCompleted', undefined);
        await onSubmit();
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
          onClick={() => {
            setValue('recordMode', 'fromScratch', { shouldValidate: true });
            setValue('pastSemesters', []);
            setValue('semestersCompleted', undefined);
          }}
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
          onClick={() => {
            setValue('recordMode', 'complete', { shouldValidate: true });
            if (!watch('semestersCompleted')) {
              setValue('semestersCompleted', 1, { shouldValidate: true });
            }
          }}
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
              {errors.semestersCompleted && (
                <p className="mt-2 text-[length:var(--text-xs)] text-[var(--acade-danger)]">
                  {errors.semestersCompleted.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 mt-4">
        <Button type="button" variant="ghost" size="lg" onClick={onBack} className="px-4 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <Button type="button" variant="primary" size="lg" fullWidth onClick={handleNext}>
          {modeVal === 'fromScratch' ? 'Create Account' : 'Continue'} <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ----- STEP 4 -----
function Step4PastSemesters({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { watch, setValue, trigger, formState: { errors } } = useFormContext<FormData>();
  const shouldReduceMotion = useReducedMotion();
  
  const currentLevel = watch('currentLevel');
  const semestersCompleted = watch('semestersCompleted') || 1;
  const entrySession = watch('entrySession');
  const courseDuration = watch('courseDuration') || 4;
  const pastSemesters = watch('pastSemesters') || [];

  // Generate if empty
  useEffect(() => {
    if (pastSemesters.length === 0 && currentLevel && entrySession) {
      const generated = generatePastSemesters(currentLevel, semestersCompleted, entrySession, courseDuration);
      setValue('pastSemesters', generated);
    }
  }, [currentLevel, semestersCompleted, entrySession, courseDuration, pastSemesters, setValue]);

  const handleNext = async () => {
    const valid = await trigger('pastSemesters');
    if (valid) onNext();
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
                    setValue('pastSemesters', newArr, { shouldDirty: true, shouldValidate: true });
                  }}
                  aria-invalid={Boolean(errors.pastSemesters?.[index]?.session)}
                  className={cn(
                    'w-36 h-10 px-3 bg-[var(--acade-deep)] border rounded-lg text-[length:var(--text-sm)] focus:outline-none font-[family-name:var(--font-dm-sans)] text-center',
                    errors.pastSemesters?.[index]?.session
                      ? 'border-[var(--acade-danger)] focus:border-[var(--acade-danger)]'
                      : 'border-[var(--acade-border)] focus:border-[var(--acade-primary)]'
                  )}
                />
                {errors.pastSemesters?.[index]?.session && (
                  <p className="mt-1 max-w-36 text-center text-[10px] leading-tight text-[var(--acade-danger)]">
                    {errors.pastSemesters[index]?.session?.message}
                  </p>
                )}
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

  const { profile, loading: profileLoading } = useProfile();
  const draftRestored = useRef(false);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      authMethod: 'email',
      university: DEFAULT_UNIVERSITY,
      recordMode: 'fromScratch',
      courseDuration: 4,
    }
  });

  // Redirect only when the Firestore student profile is actually complete.
  useEffect(() => {
    if (
      !authLoading &&
      !profileLoading &&
      user &&
      isStudentProfileComplete(profile) &&
      !isSubmitting &&
      !isSuccess
    ) {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      router.replace('/dashboard');
    }
  }, [user, profile, authLoading, profileLoading, isSubmitting, isSuccess, router]);

  // Restore non-secret progress. Passwords and OTP tickets are deliberately
  // never written to browser storage.
  useEffect(() => {
    if (authLoading || profileLoading || draftRestored.current) return;
    try {
      const rawDraft = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as SafeRegistrationDraft;
        const signedInWithGoogle = Boolean(user?.providerData.some(
          (provider) => provider.providerId === 'google.com'
        ));
        methods.reset({
          ...methods.getValues(),
          ...(draft.values || {}),
          authMethod: signedInWithGoogle ? 'google' : 'email',
          password: '',
          confirmPassword: '',
          verificationToken: undefined,
        });
        setCurrentStep(signedInWithGoogle
          ? Math.max(1, Math.min(4, Number(draft.step) || 1))
          : 1);
      }
    } catch {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } finally {
      draftRestored.current = true;
    }
  }, [authLoading, profileLoading, user, methods]);

  useEffect(() => {
    if (!draftRestored.current || isSuccess) return;

    const persistDraft = (values: unknown) => {
      const draft: SafeRegistrationDraft = {
        step: currentStep,
        values: withoutRegistrationSecrets(values),
      };
      sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
    };

    persistDraft(methods.getValues());
    const subscription = methods.watch((values) => persistDraft(values));
    return () => subscription.unsubscribe();
  }, [currentStep, isSuccess, methods]);

  // Pre-fill the correct provider when an interrupted registration resumes.
  useEffect(() => {
    if (!authLoading && !profileLoading && user && !isStudentProfileComplete(profile)) {
      const signedInWithGoogle = user.providerData.some(
        (provider) => provider.providerId === 'google.com'
      );
      methods.setValue('authMethod', signedInWithGoogle ? 'google' : 'email');
      if (user.email) methods.setValue('email', user.email);
      if (user.displayName) methods.setValue('fullName', user.displayName);
    }
  }, [user, profile, authLoading, profileLoading, methods]);

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
      if (data.authMethod === 'google' && !user) {
        throw new Error('Your Google session expired. Continue with Google again.');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }

      const response = await fetch('/api/auth/register/finalize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          authMethod: data.authMethod,
          verificationToken: data.verificationToken,
          password: data.authMethod === 'email' ? data.password : undefined,
          profile: {
            fullName: data.fullName,
            matric: data.matric,
            email: data.email,
            university: data.university,
            department: data.department,
            programme: data.programme,
            courseDuration: data.courseDuration,
            currentLevel: data.currentLevel,
            entrySession: data.entrySession,
            recordMode: data.recordMode,
            semestersCompleted: data.recordMode === 'complete' ? data.semestersCompleted : 0,
          },
          pastSemesters: data.recordMode === 'complete' ? data.pastSemesters || [] : [],
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const registrationError = new Error(result.error || 'Failed to create account. Please try again.') as Error & { code?: string };
        registrationError.code = result.code;
        throw registrationError;
      }

      if (data.authMethod === 'email') {
        await signInWithEmail(data.email.trim().toLowerCase(), data.password!);
      }

      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      setIsSuccess(true);
      setCurrentStep(5);
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      toast.error(message);
      const code = (err as { code?: string } | null)?.code;
      if (code === 'verification-expired' || code === 'verification-mismatch') {
        methods.setValue('verificationToken', undefined);
        setCurrentStep(1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitValidatedRegistration = methods.handleSubmit(onSubmit, (validationErrors) => {
    toast.error('Please review the highlighted registration details.');
    if (
      validationErrors.fullName ||
      validationErrors.matric ||
      validationErrors.email ||
      validationErrors.password ||
      validationErrors.confirmPassword ||
      validationErrors.verificationToken
    ) {
      setCurrentStep(1);
    } else if (
      validationErrors.university ||
      validationErrors.department ||
      validationErrors.programme ||
      validationErrors.courseDuration ||
      validationErrors.currentLevel ||
      validationErrors.entrySession
    ) {
      setCurrentStep(2);
    } else if (validationErrors.recordMode || validationErrors.semestersCompleted) {
      setCurrentStep(3);
    } else if (validationErrors.pastSemesters) {
      setCurrentStep(4);
    }
  });

  const submitRegistration = async () => {
    if (methods.getValues('authMethod') === 'email' && !methods.getValues('verificationToken')) {
      toast.error('Verify your email again before creating the account.');
      setCurrentStep(1);
      return;
    }
    await submitValidatedRegistration();
  };

  if (authLoading || (user && profileLoading)) {
    return <div className="min-h-screen bg-[var(--acade-void)]" />;
  }

  // We only hide the wizard if they are logged in AND have a profile completed
  if (user && isStudentProfileComplete(profile) && !isSuccess) return null;

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

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12 bg-[var(--acade-void)]">
      {/* Keystroke Reactive Background */}
      <ReactiveAuthBackground />

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

        <HolographicCard
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
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
                    <Step3RecordMode
                      onNext={() => setCurrentStep(4)}
                      onSubmit={submitRegistration}
                      onBack={() => setCurrentStep(2)}
                    />
                  </motion.div>
                )}
                {currentStep === 4 && (
                  <motion.div key="step4" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {/* The next button on step 4 submits the form */}
                    <Step4PastSemesters onNext={submitRegistration} onBack={() => setCurrentStep(3)} />
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
        </HolographicCard>

        {/* Footer Link */}
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
        {!isSuccess && <MobileAppDownload compact className="mt-4" />}
      </div>
    </main>
  );
}
