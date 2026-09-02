'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { signInWithEmail } from '@/lib/firebase/auth';
import { signOut } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[var(--acade-danger)]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[var(--acade-danger)]/10 border border-[var(--acade-danger)]/20 mb-4">
            <Shield size={32} className="text-[var(--acade-danger)]" />
          </div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
            Admin Access
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-2 font-[family-name:var(--font-dm-sans)]">
            Sign in with your authorized admin credentials.
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              id="admin-email"
              label="Email Address"
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
                className="absolute right-3 top-[38px] p-1 text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="danger"
              size="lg"
              fullWidth
              loading={loading}
            >
              <LogIn size={18} />
              Sign In as Admin
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--acade-border-subtle)] text-center">
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-dm-sans)]">
              Only authorized administrators can access this panel.
              <br />
              Contact the system owner if you need access.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
