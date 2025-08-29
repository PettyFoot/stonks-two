'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Toaster } from 'sonner';
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { DemoWatermark } from '@/components/DemoIndicators';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AuthProvider>
        <ThemeProvider>
          <GlobalFilterProvider>
            <DemoModeBanner />
            {children}
            <DemoWatermark />
            <Toaster position="top-right" richColors />
          </GlobalFilterProvider>
        </ThemeProvider>
      </AuthProvider>
    </UserProvider>
  );
}