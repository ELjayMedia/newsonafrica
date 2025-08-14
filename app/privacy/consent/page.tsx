'use client';

import { useEffect, useState } from 'react';

interface TCData {
  gdprApplies: boolean;
}

export default function ConsentPage() {
  const [gdprApplies, setGdprApplies] = useState(false);

  useEffect(() => {
    const api = window.__tcfapi;
    if (typeof api === 'function') {
      api('getTCData', 2, (data: TCData, success: boolean) => {
        if (success) setGdprApplies(data.gdprApplies);
      });
    }
  }, []);

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Privacy & Consent</h1>
      <p className="mb-4">
        Manage your advertising consent preferences. GDPR applies: {gdprApplies ? 'Yes' : 'No'}.
      </p>
      <button
        className="rounded border px-4 py-2"
        onClick={() => window.__tcfapi?.('showConsentTool', 2, () => {})}
      >
        Manage Consent
      </button>
    </div>
  );
}
