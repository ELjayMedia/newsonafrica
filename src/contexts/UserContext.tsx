'use client';

import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type React from 'react';

import { useInterval } from '@/hooks/useInterval';
import type { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Session refresh settings
const SESSION_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/news',
  '/business',
  '/sport',
  '/entertainment',
  '/search',
  '/post',
];

/**
 * User context type definition
 */
interface UserContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: (redirectTo?: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  requireAuth: (fallbackUrl?: string) => boolean;
}

/**
 * User context for authentication and profile management
 */
const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Provider component for user authentication and profile management
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  /**
   * Fetch user profile from Supabase
   */
  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  /**
   * Refresh the session if needed
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        // If refresh failed but we still have a user in state,
        // we'll keep them signed in until they explicitly sign out
        if (user) {
          console.log('Session refresh failed, but keeping existing user state');
          return true;
        }

        // Otherwise clear the session
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsAuthenticated(false);
        return false;
      }

      setSession(data.session);
      setUser(data.session.user);
      setIsAuthenticated(!!data.session.user);

      if (data.session.user) {
        await fetchProfile(data.session.user.id);
      }

      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return !!user;
    }
  }, [user, fetchProfile, supabase]);

  /**
   * Check if the session needs to be refreshed
   */
  const checkSessionExpiry = useCallback(async () => {
    if (!session) return;

    // Calculate time until session expires
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If session will expire within the buffer time, refresh it
    if (timeUntilExpiry > 0 && timeUntilExpiry < SESSION_REFRESH_BUFFER) {
      console.log('Session expiring soon, refreshing...');
      await refreshSession();
    }
  }, [session, refreshSession]);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsAuthenticated(!!currentSession?.user);

        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
        } else {
          setLoading(false);
        }

        // Mark initial auth check as complete
        setInitialAuthCheckComplete(true);

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event);

            setSession(newSession);
            setUser(newSession?.user ?? null);
            setIsAuthenticated(!!newSession?.user);

            if (newSession?.user) {
              fetchProfile(newSession.user.id);
            } else {
              setProfile(null);
              setLoading(false);
            }
          },
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
        setInitialAuthCheckComplete(true);
      }
    };

    initAuth();
  }, [fetchProfile, supabase]);

  /**
   * Check if the current route requires authentication
   */
  const requireAuth = useCallback(
    (fallbackUrl = '/auth'): boolean => {
      // Don't check during initial loading
      if (loading || !initialAuthCheckComplete) return true;

      // If authenticated, allow access
      if (isAuthenticated) return true;

      // If this is a public route, allow access
      const pathname = window.location.pathname;
      if (pathname && PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) return true;

      // Otherwise redirect to auth page with return URL
      const returnUrl = encodeURIComponent(pathname || '/');
      router.push(`${fallbackUrl}?returnTo=${returnUrl}`);
      return false;
    },
    [loading, initialAuthCheckComplete, isAuthenticated, router],
  );

  // Set up interval to check session expiry
  useInterval(checkSessionExpiry, SESSION_CHECK_INTERVAL);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user profile after successful sign-in
      if (data.user) {
        await fetchProfile(data.user.id);
      }

      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email, password and username
   */
  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) throw new Error('Username is already taken');

      // Register new user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      // Create profile after successful sign-up
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            username,
            email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
        } else {
          await fetchProfile(data.user.id);
        }
      }

      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async (redirectTo = '/auth') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAuthenticated(false);

      // Redirect after logout
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update the user profile
   */
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setLoading(true);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset the user password
   */
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Facebook
   */
  const signInWithFacebook = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        updateProfile,
        resetPassword,
        signInWithGoogle,
        signInWithFacebook,
        refreshSession,
        requireAuth,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access the user context
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
