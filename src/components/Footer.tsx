import React from 'react';
import { Heart } from 'lucide-react';

interface FooterProps {
  platformName?: string;
  year?: number;
  logoUrl?: string;
}

export const Footer: React.FC<FooterProps> = ({
  platformName = 'EVENT KPMBP',
  year = 2026,
  logoUrl = 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/Event%20KPMBP/android-chrome-192x192.png'
}) => {
  return (
    <footer className="mt-auto border-t border-white/40 bg-white/30 backdrop-blur-md py-6 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-xs text-slate-600 font-medium text-center">
        
        {/* GLOBAL SYNCROZZ SUPPORT ENTRY (LEFT) */}
        <a
          href="https://syncrozz.com/#support"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-700 hover:text-indigo-900 border border-indigo-200/70 shadow-2xs transition-all font-semibold hover:scale-105 active:scale-95 group"
          title="Sokong Ekosistem SYNCROZZ"
          aria-label="Sokong SYNCROZZ"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 group-hover:fill-rose-500 transition-colors" />
          <span>Sokong SYNCROZZ</span>
        </a>

        {/* Separator (Desktop) */}
        <span className="hidden sm:inline text-slate-300 font-light select-none">|</span>

        {/* PLATFORM BRANDING & DEVELOP BY SYNCROZZ (RIGHT) */}
        <div className="flex items-center justify-center gap-2">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={`${platformName} Logo`} 
              className="w-5 h-5 object-contain rounded"
            />
          )}
          <span>
            © {year} {platformName} · Develop By{' '}
            <a 
              href="https://wasap.my/60145313756" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-black text-indigo-600 hover:text-indigo-800 underline transition-colors"
            >
              Syncrozz
            </a>
          </span>
        </div>

      </div>
    </footer>
  );
};
