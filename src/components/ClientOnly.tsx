'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    console.log('🔄 ClientOnly: Effect running, setting hasMounted = true');
    setHasMounted(true);
  }, []);

  console.log('🔍 ClientOnly: Render - hasMounted =', hasMounted);

  if (!hasMounted) {
    console.log('📱 ClientOnly: Rendering fallback');
    return <>{fallback}</>;
  }

  console.log('✅ ClientOnly: Rendering children');
  return <>{children}</>;
}