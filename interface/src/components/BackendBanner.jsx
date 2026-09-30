import React, { useEffect, useState } from 'react';
import { checkApiHealth } from '../services/api';
import { AlertCircle } from 'lucide-react';

export default function BackendBanner() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let live = true;
    const run = async () => { const h = await checkApiHealth(); if (live) setDown(!h); };
    run(); const id = setInterval(run, 20000);
    return () => { live = false; clearInterval(id); };
  }, []);
  if (!down) return null;
  return (
    <div className="alert-banner alert-danger" role="alert" style={{ margin: '16px 32px 0' }}>
      <AlertCircle size={20} style={{ flexShrink: 0 }} />
      <div><strong>Backend not reachable.</strong> Start it from the project root:
        <code style={{ display: 'block', marginTop: 4 }}>python -m uvicorn api:app --host 127.0.0.1 --port 8000</code></div>
    </div>
  );
}
