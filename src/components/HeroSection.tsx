import React from 'react';
import { Calendar, ArrowRight, ShieldAlert, Sparkle } from 'lucide-react';
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
    <section className="relative pt-2 pb-4 md:pt-4 md:pb-6 z-10">
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4 max-w-2xl">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs">
                <Sparkle className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>Pusat Maklumat Rasmi KPMBP</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{openCount} Acara Dibuka</span>
              </div>
            </div>

            {/* Title / Banner Image */}
            <div className="space-y-3">
              <img
                src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg"
                alt="Event KPMBP"
                className="w-full max-w-sm sm:max-w-md h-auto rounded-2xl shadow-sm border border-slate-100 object-contain"
                loading="eager"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
                Cari Event, Aktiviti, Pertandingan, dan Bengkel yang berlangsung di Kolej Profesional MARA Bandar Penawar dalam satu platform berpusat.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onSelectTab('calendar')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 group cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
                <span>Buka Kalendar Event</span>
              </button>

              <button
                onClick={() => onSelectTab('events')}
                className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 active:scale-95 group cursor-pointer"
              >
                <span>Lihat Semua Acara</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {urgentCount > 0 && (
                <button
                  onClick={() => onSelectTab('dont-miss')}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>{urgentCount} Pendaftaran Tutup Segera!</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

