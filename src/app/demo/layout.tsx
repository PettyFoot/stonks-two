import DemoSidebar from "@/components/DemoSidebar";
import { Button } from '@/components/ui/button';
import { Info, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Demo Mode Header */}
      <div className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Info className="h-5 w-5" />
          <div>
            <h2 className="font-semibold">Demo Mode</h2>
            <p className="text-sm opacity-90">You're viewing sample trading data</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/login">
            <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </Link>
          <Link href="/api/auth/signup">
            <Button size="sm" className="bg-white text-[#2563EB] hover:bg-gray-100">
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-screen bg-background">
        <DemoSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}