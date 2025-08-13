import { createSupabaseServer } from '@/lib/supabase/server';
import { getSessionUser } from '@/server/auth';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const user = await getSessionUser();
  const s = createSupabaseServer();
  let { data: profile } = await s
    .from('profiles')
    .select('display_name, country, avatar_url')
    .eq('id', user!.id)
    .maybeSingle();
  if (!profile) {
    await s.from('profiles').insert({ id: user!.id });
    profile = { display_name: null, country: null, avatar_url: null };
  }
  return (
    <main className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <ProfileForm profile={profile} />
    </main>
  );
}
