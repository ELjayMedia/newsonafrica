'use client';

import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccessMessage(
        'Registration successful! Please check your email to activate your account.',
      );
      setFormData({ username: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center mb-6">
        <Image
          src="/images/news-on-africa-logo.png"
          alt="News On Africa"
          width={200}
          height={80}
          priority
        />
      </div>

      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          className="w-full px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          className="w-full px-3 py-2"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}

      <Button type="submit" className="w-full bg-[#2271b1] hover:bg-[#135e96]" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </Button>

      <div className="mt-6 text-center space-y-4">
        <Link href="/signin" className="text-[#2271b1] hover:underline text-sm block">
          Already have an account? Sign In
        </Link>
        <Link href="/" className="text-[#2271b1] hover:underline text-sm block">
          ← Go to News On Africa
        </Link>
      </div>
    </form>
  );
}
