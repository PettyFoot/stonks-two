'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  Plus, 
  Users, 
  Search,
  User
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Trades', href: '/trades', icon: TrendingUp },
  { name: 'Journal', href: '/journal', icon: BookOpen },
  { name: 'New Trade', href: '/new-trade', icon: Plus },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Search', href: '/search', icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-[#0f172a] text-white">
      {/* Logo and Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Trader</span>
          <span className="rounded bg-[#16A34A] px-2 py-0.5 text-xs font-medium">vue</span>
        </div>
      </div>

      {/* Upgrade Button */}
      <div className="px-4 pb-6">
        <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-medium">
          ⚡ Upgrade
        </Button>
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

      {/* Import Trades Button */}
      <div className="px-4 py-4">
        <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-medium">
          📊 Import Trades
        </Button>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500">
          <User className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">lcorr</p>
          <p className="text-xs text-gray-400">Plan: Free</p>
        </div>
        <button className="text-gray-400 hover:text-white">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}