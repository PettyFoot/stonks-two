'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  Plus, 
  Users, 
  Search,
  User,
  Lock
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/demo', icon: Home },
  { name: 'Calendar', href: '/demo/calendar', icon: Calendar },
  { name: 'Reports', href: '/demo/reports', icon: BarChart3 },
  { name: 'Trades', href: '/demo/trades', icon: TrendingUp },
  { name: 'Journal', href: '/demo/journal', icon: BookOpen },
  { name: 'New Trade', href: '/demo/new-trade', icon: Plus },
  { name: 'Community', href: '/demo/community', icon: Users },
  { name: 'Search', href: '/demo/search', icon: Search },
];

export default function DemoSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-[#0f172a] text-white">
      {/* Logo and Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <Image 
          src="/trade-voyager-logo.png" 
          alt="Trade Voyager Logo" 
          width={32} 
          height={32} 
          className="rounded-lg"
        />
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Trade Voyager</span>
        </div>
        <Badge variant="secondary" className="ml-2 text-xs bg-blue-600 text-white">
          Demo
        </Badge>
      </div>

      {/* Upgrade Button */}
      <div className="px-4 pb-6">
        <Link href="/api/auth/signup">
          <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-medium">
            ⚡ Get Full Access
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Demo Features */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-medium text-gray-400 mb-2">DEMO FEATURES</h3>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>✓ Performance Analytics</li>
              <li>✓ Interactive Charts</li>
              <li>✓ Sample Data Visualization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Import Trades Button */}
      <div className="px-4 py-2">
        <Link href="/demo/import">
          <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-medium">
            📊 Import Trades
          </Button>
        </Link>
      </div>

      {/* Demo User Profile */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500">
          <User className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Demo User</p>
          <p className="text-xs text-gray-400">Sample Data</p>
        </div>
        <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
          Demo
        </Badge>
      </div>
    </div>
  );
}