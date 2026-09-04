import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { uiText } from './i18n.js';

export default function OfflineBanner({ lang = 'en' }) {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} />
      <span>{uiText(lang).offline}</span>
    </div>
  );
}
