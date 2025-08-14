'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      {children}
      <Toaster position="top-right" richColors />
    </UserProvider>
  );
}