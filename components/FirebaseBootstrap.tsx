'use client';

import React, { useEffect } from 'react';
import { testConnection } from '@/lib/firebase';
import { ErrorBoundary } from './ErrorBoundary';

export function FirebaseBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void testConnection();
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
