'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect } from 'react';

import { AuthModal } from '@/components/AuthModal';
import { useUser } from '@/contexts/UserContext';
import { useAuthModal } from '@/hooks/useAuthModal';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    isOpen,
    defaultTab,
    redirectAfterAuth,
    redirectTo,
    title,
    description,
    onSuccess,
    close,
  } = useAuthModal();
  const { user, loading } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle auth-related URL parameters
  useEffect(() => {
    if (loading) return;

    const authAction = searchParams.get('auth');
    const authError = searchParams.get('auth_error');

    if (authAction && !user) {
      // Open auth modal based on URL parameter
      if (authAction === 'signin' || authAction === 'signup') {
        useAuthModal.getState().open({
          defaultTab: authAction as 'signin' | 'signup',
          redirectAfterAuth: false,
        });

        // Remove the auth parameter from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('auth');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }

    if (authError) {
      // Show error in auth modal
      useAuthModal.getState().open({
        defaultTab: 'signin',
        redirectAfterAuth: false,
      });

      // Remove the error parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [loading, user, pathname, searchParams, router]);

  return (
    <>
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={close}
        defaultTab={defaultTab}
        redirectAfterAuth={redirectAfterAuth}
        redirectTo={redirectTo}
        title={title}
        description={description}
        onSuccess={onSuccess}
      />
    </>
  );
}
