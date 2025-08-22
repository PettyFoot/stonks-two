'use client';

import React from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Navigation - visible only on mobile/tablet */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Add padding-top on mobile to account for fixed hamburger button */}
        <div className="lg:hidden h-16" />
        {children}
      </main>
    </div>
  );
}