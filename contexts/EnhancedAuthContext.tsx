'use client';

import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { toast } from '@/hooks/use-toast';
import { createClient } from '@/utils/supabase/client';



interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Handle auth state changes
  const handleAuthStateChange = useCallback(
    async (event: string, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            toast({
              title: 'Welcome back!',
              description: "You've successfully signed in.",
            });

            // Create or update user profile
            try {
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (!existingProfile) {
                // Create new profile
                const username =
                  session.user.user_metadata?.username ||
                  session.user.email?.split('@')[0] ||
                  'user';

                await supabase.from('profiles').insert({
                  id: session.user.id,
                  username,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name,
                  avatar_url: session.user.user_metadata?.avatar_url,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
            } catch (error) {
              console.error('Error handling profile:', error);
            }

            // Redirect to home page
            router.push('/');
            router.refresh();
          }
          break;

        case 'SIGNED_OUT':
          toast({
            title: 'Signed out',
            description: "You've been successfully signed out.",
          });
          router.push('/auth');
          break;

        case 'TOKEN_REFRESHED':
          console.log('Token refreshed');
          break;

        case 'USER_UPDATED':
          console.log('User updated');
          break;
      }
    },
    [router, supabase],
  );

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => subscription.unsubscribe();
  }, [supabase, handleAuthStateChange]);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Refresh session function
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [supabase]);

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useEnhancedAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}
