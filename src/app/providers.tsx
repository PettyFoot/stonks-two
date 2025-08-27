'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Toaster } from 'sonner';
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <GlobalFilterProvider>
          {children}
          <Toaster position="top-right" richColors />
        </GlobalFilterProvider>
      </ThemeProvider>
    </UserProvider>
  );
}