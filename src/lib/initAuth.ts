import { getSessionUser } from '@/server/auth';

export async function initAuth() {
  await getSessionUser();
}
