'use client';
import { useState, useTransition } from 'react';
import { updateProfile } from '@/features/profile/actions';

interface Props {
  profile: { display_name: string | null; country: string | null; avatar_url: string | null };
}

export default function ProfileForm({ profile }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [country, setCountry] = useState(profile.country ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('display_name', displayName);
        formData.append('country', country);
        formData.append('avatar_url', avatarUrl);
        start(async () => {
          await updateProfile(formData);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1">Display Name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block mb-1">Country</label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block mb-1">Avatar URL</label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <button disabled={pending} className="btn-primary">
        {pending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
