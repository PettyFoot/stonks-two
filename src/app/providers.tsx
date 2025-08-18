'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Toaster } from 'sonner';
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <GlobalFilterProvider>
        {children}
        <Toaster position="top-right" richColors />
      </GlobalFilterProvider>
    </UserProvider>
  );
}