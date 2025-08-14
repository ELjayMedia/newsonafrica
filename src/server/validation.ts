import { z } from 'zod';

export const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);
export const commentBody = z.string().min(1).max(2000);
export const email = z.string().email().max(254);

export function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, '');
}
