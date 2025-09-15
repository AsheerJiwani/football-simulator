'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Debug page effect running');
    try {
      setMounted(true);
      console.log('✅ Debug page mounted successfully');
    } catch (err) {
      console.error('❌ Debug page mount error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <p>Mounted: {mounted ? 'Yes' : 'No'}</p>
      <p>Client-side rendering: {typeof window !== 'undefined' ? 'Yes' : 'No'}</p>
      <p>Time: {new Date().toISOString()}</p>
      {mounted && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
          ✅ React hydration is working correctly!
        </div>
      )}
    </div>
  );
}