import { useState, useEffect, useCallback } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export function useConnection() {
  const [status, setStatus] = useState('connecting');

  const check = useCallback(async (manual = false) => {
    if (manual) setStatus('connecting');
    try {
      const r = await fetch(`${API_BASE}/health`);
      const d = await r.json();
      setStatus(d.mongo ? 'connected' : 'degraded');
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [check]);

  return [status, () => check(true)];
}
