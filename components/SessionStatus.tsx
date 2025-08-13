'use client';

import { useState, useEffect } from 'react';

import { useUser } from '@/contexts/UserContext';
import { getSessionExpiryTime } from '@/lib/supabase';

export function SessionStatus() {
  const { session, refreshSession } = useUser();
  const [expiryTime, setExpiryTime] = useState<string>('Unknown');
  const [timeLeft, setTimeLeft] = useState<string>('Unknown');

  useEffect(() => {
    if (session) {
      setExpiryTime(getSessionExpiryTime(session));

      const updateTimeLeft = () => {
        if (session.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          const timeToExpiry = session.expires_at - now;

          if (timeToExpiry <= 0) {
            setTimeLeft('Expired');
            refreshSession();
          } else {
            const hours = Math.floor(timeToExpiry / 3600);
            const minutes = Math.floor((timeToExpiry % 3600) / 60);
            setTimeLeft(`${hours}h ${minutes}m`);
          }
        }
      };

      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [session, refreshSession]);

  if (!session) {
    return null;
  }

  const isLongSession =
    session.expires_at && session.expires_at - Math.floor(Date.now() / 1000) > 24 * 3600;

  return (
    <div className="text-xs text-gray-500 mt-2">
      <p>
        {isLongSession ? 'Extended session' : 'Standard session'}
        {' • '}
        Expires in: {timeLeft}
      </p>
    </div>
  );
}
