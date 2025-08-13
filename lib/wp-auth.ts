import { createHmac } from 'crypto';

import { WP_AUTH_CONFIG } from './wp-auth-config';

import { WORDPRESS_REST_API_URL } from '@/config/wordpress';

// Function to generate a WordPress authentication token
export function generateWPAuthToken(userId: string, expiration: number): string {
  const key = WP_AUTH_CONFIG.AUTH_KEY + WP_AUTH_CONFIG.AUTH_SALT;
  const hash = createHmac('sha256', key).update(`${userId}|${expiration}`).digest('hex');

  return `${userId}|${expiration}|${hash}`;
}

// Function to verify a WordPress authentication token
export function verifyWPAuthToken(token: string): boolean {
  const [userId, expiration, hash] = token.split('|');

  if (!userId || !expiration || !hash) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (Number.parseInt(expiration) < currentTime) {
    return false;
  }

  const expectedHash = generateWPAuthToken(userId, Number.parseInt(expiration)).split('|')[2];
  return hash === expectedHash;
}

// Function to create a WordPress user
export async function createWPUser(
  username: string,
  email: string,
  password: string,
): Promise<any> {
  const response = await fetch(`${WORDPRESS_REST_API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${process.env.WP_APP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64')}`,
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create WordPress user');
  }

  return response.json();
}

// Function to authenticate a WordPress user
export async function authenticateWPUser(username: string, password: string): Promise<any> {
  const base = WORDPRESS_REST_API_URL.replace(/\/wp\/v2$/, '');
  const response = await fetch(`${base}/jwt-auth/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate WordPress user');
  }

  return response.json();
}
