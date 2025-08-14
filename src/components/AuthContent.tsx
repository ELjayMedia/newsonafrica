'use client';

import Link from 'next/link';

import { AuthForm } from '@/components/AuthForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthContent() {
  return (
    <div className="max-w-md mx-auto mt-8 px-4 sm:px-0">
      <div className="flex justify-center mb-6">{/* Logo removed */}</div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-2xl font-bold">
            Welcome to News on Africa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
