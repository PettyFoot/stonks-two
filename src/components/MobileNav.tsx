'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Trades', href: '/trades', icon: TrendingUp },
  { name: 'Journal', href: '/journal', icon: BookOpen },
  { name: 'New Trade', href: '/new-trade', icon: Plus },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Search', href: '/search', icon: Search },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed top-4 left-4 z-40 h-10 w-10 p-0 lg:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-[#0f172a]">
        <div className="flex h-full flex-col">
          {/* Logo and Brand - Now Clickable */}
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
              <Image 
                src="/trade-voyager-logo.png" 
                alt="Trade Voyager Logo" 
                width={32} 
                height={32} 
                className="rounded-lg"
              />
              <span className="text-lg font-semibold text-white">Trade Voyager</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
            
            {/* Upgrade Button - Moved here after Search (matching desktop) */}
            <div className="pt-4">
              <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-medium">
                ⚡ Upgrade
              </Button>
            </div>
          </nav>

          {/* Import Trades Button */}
          <div className="px-4 py-4">
            <Link href="/import" onClick={() => setOpen(false)}>
              <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg font-medium">
                📊 Import Trades
              </Button>
            </Link>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-4 py-4 border-t border-white/10">
            {user ? (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.picture || ''} alt={user.name || ''} />
                  <AvatarFallback className="bg-[#16A34A] text-white">
                    {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name || user.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-400">Plan: Free</p>
                </div>
                <Link 
                  href="/api/auth/logout" 
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Guest</p>
                  <p className="text-xs text-gray-400">Not logged in</p>
                </div>
                <Link 
                  href="/api/auth/login" 
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Login"
                >
                  <User className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}