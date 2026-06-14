'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/firebase/auth';

interface AuthState {
  user: FirebaseUser | null;
  uid: string | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  uid: null,
  loading: true,
  error: null,
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export { AuthContext };

/**
 * Hook that subscribes to Firebase Auth state changes.
 * Used internally by AuthProvider — consumers should use useAuth().
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    uid: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setState({
        user,
        uid: user?.uid ?? null,
        loading: false,
        error: null,
      });
    });

    return unsubscribe;
  }, []);

  return state;
}
