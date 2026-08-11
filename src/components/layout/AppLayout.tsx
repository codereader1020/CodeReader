'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Barcode, 
  Scan, 
  Layers, 
  IdCard, 
  History, 
  Code2, 
  ShieldCheck, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Generate', href: '/generate', icon: Barcode, badge: null },
    { name: 'Read & Scan', href: '/read', icon: Scan, badge: null },
    { name: 'Batch Generate', href: '/batch', icon: Layers, badge: 'Bulk' },
    { name: 'ID Card Studio', href: '/id-card', icon: IdCard, badge: 'Pro' },
    { name: 'History', href: '/history', icon: History, badge: null },
    { name: 'API & Docs', href: '/docs', icon: Code2, badge: null },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-800/60 bg-[#0f1524]/90 p-5 flex-shrink-0">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Barcode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
              PDF417 <span className="text-blue-400 font-semibold">Studio</span>
            </h1>
            <p className="text-xs text-gray-400">Enterprise Engine</p>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/generate');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Privacy & Security Card */}
        <div className="mt-auto pt-4">
          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 flex items-start gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-200">100% Client-Side</p>
              <p className="text-gray-400 text-[11px] mt-0.5 leading-snug">
                Data never leaves your browser. Zero cloud tracking.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Header - Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0f1524] border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Barcode className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-base">PDF417 Studio</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0f1524] border-b border-gray-800 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/generate');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-gray-800/60 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> High Precision Barcode Suite
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-gray-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>PDF417 Engine Ready</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
