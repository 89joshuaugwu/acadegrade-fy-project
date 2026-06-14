'use client';

import { type ReactNode } from 'react';
import { AuthContext, useAuthState } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — wraps the app with Firebase Auth context.
 * Uses useAuthState() to subscribe to onAuthStateChanged and provides
 * the auth state to all children via AuthContext.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const authState = useAuthState();

  return (
    <AuthContext value={authState}>
      {children}
    </AuthContext>
  );
}
