import React, { useState } from 'react';
import { ViewTab } from '../types';
import { Search, Calendar as CalendarIcon, Sparkles, Compass, Flame, ShieldCheck, Menu, X, Lock, KeyRound, Archive } from 'lucide-react';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  urgentCount: number;
  isAdminUnlocked: boolean;
  onOpenAdminPin: () => void;
  onToggleOffAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  urgentCount,
  isAdminUnlocked,
  onOpenAdminPin,
  onToggleOffAdmin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    { id: 'events', label: 'Semua Event', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'calendar', label: 'Kalendar', icon: <CalendarIcon className="w-4 h-4" /> },
    { 
      id: 'dont-miss', 
      label: 'Jangan Terlepas', 
      icon: <Flame className="w-4 h-4 text-rose-500" />,
      badge: urgentCount 
    },
    { id: 'archive', label: 'Arkib', icon: <Archive className="w-4 h-4" /> },
  ];

  const handleAdminModeClick = () => {
    if (isAdminUnlocked) {
      onToggleOffAdmin();
    } else {
      onOpenAdminPin();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/60 bg-white/40 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo - EVENT KPMBP (2 Tone Color) */}
        <div 
          onClick={() => onSelectTab('discover')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <img 
            src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/Event%20KPMBP/android-chrome-192x192.png" 
            alt="Event KPMBP Logo" 
            className="w-9 h-9 object-contain rounded-xl shadow-md shadow-indigo-200/50 group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1 font-black text-base tracking-tight">
              <span className="text-indigo-600">EVENT</span>
              <span className="text-slate-900">KPMBP</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5 tracking-tight">
              syncrozz.com
            </span>
          </div>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-sm relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari event, pertandingan, lokasi..."
            className="w-full bg-white/70 border border-white/80 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white backdrop-blur-sm transition-all shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/30 p-1 rounded-full border border-white/50 backdrop-blur-sm">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* High-Contrast Admin Mode Button (Far Right) & Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAdminModeClick}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border-2 shadow-md hover:scale-105 active:scale-95 ${
              isAdminUnlocked
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-200'
                : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-amber-300 border-amber-400/90 shadow-slate-900/20'
            }`}
            title={isAdminUnlocked ? "Tekan untuk matikan (OFF) Admin Mode" : "Akses Kawalan Admin Mode"}
          >
            {isAdminUnlocked ? (
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            ) : (
              <KeyRound className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
            <span>{isAdminUnlocked ? 'Admin Active' : 'Admin Mode'}</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/60 border border-white/80 text-slate-700 hover:bg-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 space-y-2 animate-in slide-in-from-top-2">
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari event KPMBP..."
              className="w-full bg-slate-100/80 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              handleAdminModeClick();
              setMobileMenuOpen(false);
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-amber-300 border border-amber-400 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Admin Mode (PIN Required)</span>
          </button>
        </div>
      )}
    </header>
  );
};
