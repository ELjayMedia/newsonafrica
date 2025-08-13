'use client';

import { useConsent } from '@/features/consent/ConsentManager';

export default function ConsentPage() {
  const { gdprApplies, setConsent } = useConsent();
  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Privacy & Consent</h1>
      <p className="mb-4">
        Manage your advertising consent preferences. GDPR applies: {gdprApplies ? 'Yes' : 'No'}.
      </p>
      <div className="flex gap-4">
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={() => setConsent({ gdprApplies, canServeAds: true })}
        >
          Accept Ads
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => setConsent({ gdprApplies, canServeAds: false })}
        >
          Reject Ads
        </button>
      </div>
    </div>
  );
}
