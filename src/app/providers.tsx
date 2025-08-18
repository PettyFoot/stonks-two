'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Toaster } from 'sonner';
import { FilterProvider } from '@/contexts/GlobalFilterContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <FilterProvider>
        {children}
      </FilterProvider>
      <Toaster position="top-right" richColors />
    </UserProvider>
  );
}