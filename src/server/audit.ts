import { createHash } from 'crypto';

import { createSupabaseServer } from '@/lib/supabase/server';

export async function logAudit(req: Request, action: string) {
  try {
    const s = createSupabaseServer();
    const {
      data: { user },
    } = await s.auth.getUser();
    const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim();
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16);
    await s.from('audit_events').insert({
      user_id: user?.id ?? null,
      action,
      path: new URL(req.url).pathname,
      ip_hash: ipHash,
    });
  } catch {
    // ignore audit failures
  }
}
