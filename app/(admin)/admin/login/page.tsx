'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { signInWithEmail } from '@/lib/firebase/auth';
import { signOut } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AcadeGradeMark } from '@/components/public/Logo';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Authenticate with Firebase
      const cred = await signInWithEmail(email, password);
      const token = await cred.user.getIdToken();

      // Step 2: Verify admin status
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.isAdmin) {
        toast.success('Welcome back, Admin.');
        router.replace('/admin/dashboard');
      } else {
        // Not an admin — sign them out immediately
        await signOut();
        toast.error('Access denied. This email is not registered as an admin.');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password.');
      } else {
        toast.error(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ag-admin ag-admin-rail relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-3">
            <AcadeGradeMark size={40} />
            <span className="ag-admin-display text-[1.5rem] font-bold text-white">AcadeGrade</span>
          </div>
          <h1 className="ag-admin-display flex items-center justify-center gap-2 text-[2rem] font-bold leading-tight text-white">
            <Shield size={24} className="text-ag-gold" aria-hidden="true" />
            Admin console
          </h1>
          <p className="mt-2 text-[0.9375rem] text-ag-mist-night">
            Sign in with your authorised admin account.
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-[24px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              id="admin-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acadegrade.com"
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                id="admin-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-[34px] flex size-10 items-center justify-center rounded-[10px] text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              <LogIn size={18} aria-hidden="true" />
              Sign in as admin
            </Button>
          </form>

          <div className="mt-6 border-t border-[var(--acade-border-subtle)] pt-4 text-center">
            <p className="text-sm leading-6 text-[var(--acade-text-muted)]">
              Only listed administrators can open the console. Ask the owner if you need access.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
