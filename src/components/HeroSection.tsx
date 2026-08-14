import React from 'react';
import { Sparkles, Calendar, ArrowRight, ShieldAlert, Sparkle } from 'lucide-react';
import { ViewTab } from '../types';

interface HeroSectionProps {
  onSelectTab: (tab: ViewTab) => void;
  openCount: number;
  urgentCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectTab,
  openCount,
  urgentCount
}) => {
  return (
    <section className="relative pt-6 pb-4 md:pt-8 md:pb-6 z-10">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Main Banner Heading */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-3 shadow-2xs">
            <Sparkle className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Pusat Maklumat Rasmi KPMBP</span>
          </div>

          <div className="my-2">
            <img
              src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Pages%20Banner/KPMBP.Hype.png"
              alt="KPMBP Apa yang tengah Hype"
              className="w-full max-w-sm sm:max-w-md h-auto rounded-xl shadow-xs border border-white/80 object-contain"
              loading="eager"
            />
          </div>

          <p className="text-slate-600 mt-2.5 text-sm sm:text-base leading-relaxed">
            Temui program, aktiviti, pertandingan, bengkel dan acara yang akan berlangsung di Kolej Professional MARA Bandar Penawar.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab('events')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-200/80 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Lihat Semua Event</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className="bg-white/80 hover:bg-white text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-md shadow-2xs transition-all hover:border-indigo-300"
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Kalendar</span>
            </button>

            {urgentCount > 0 && (
              <button
                onClick={() => onSelectTab('dont-miss')}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{urgentCount} Pendaftaran Tutup Segera!</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};
