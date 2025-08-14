import { NextResponse } from 'next/server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/server/audit';
import { getSignedUrl } from '@/server/storage';

const MAX = 2 * 1024 * 1024;
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (!ACCEPT.includes(file.type) || file.size > MAX) {
    return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
  }
  const s = createSupabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const ext = file.type.split('/')[1];
  const path = `${user.id}/avatar.${ext}`;
  const { error } = await s.storage.from('user-media').upload(path, file.stream(), {
    upsert: true,
    contentType: file.type,
  });
  if (error) return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  const url = await getSignedUrl(path, 60 * 60 * 6);
  await s.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  await logAudit(req, 'upload.avatar');
  return NextResponse.json({ url });
}
