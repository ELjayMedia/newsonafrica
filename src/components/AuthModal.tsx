'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { AuthForm } from '@/components/AuthForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'signin' | 'signup';
  returnTo?: string;
}

export function AuthModal({ open, onOpenChange, defaultTab = 'signin', returnTo }: AuthModalProps) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Use current path as returnTo if not provided
  const returnPath = returnTo || pathname || '/';

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && open) {
      onOpenChange(false);
    }
  }, [isAuthenticated, open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-center text-xl font-bold">
            {defaultTab === 'signin' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <AuthForm
            defaultTab={defaultTab}
            redirectTo={returnPath}
            inModal={true}
            onComplete={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
