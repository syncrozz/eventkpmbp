import React from 'react';
import { Sparkles, Calendar, ArrowRight, ShieldAlert, Sparkle, Filter } from 'lucide-react';
import { ViewTab, EventCategory } from '../types';

interface HeroSectionProps {
  onSelectTab: (tab: ViewTab) => void;
  openCount: number;
  urgentCount: number;
  selectedCategory: EventCategory;
  onSelectCategory: (cat: EventCategory) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectTab,
  openCount,
  urgentCount,
  selectedCategory,
  onSelectCategory
}) => {
  const categories: EventCategory[] = [
    'Semua',
    'Pertandingan',
    'Bengkel',
    'Program Pelajar',
    'Kelab & Persatuan',
    'Akademik',
    'Kebudayaan',
    'Sukan',
    'Kerjaya',
    'Institusi'
  ];

  return (
    <section className="relative pt-4 pb-6 md:pt-6 md:pb-8 z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Main Banner / Left Column */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs">
                <Sparkle className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>Pusat Maklumat Rasmi KPMBP</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{openCount} Acara Dibuka</span>
              </div>
            </div>

            <div className="mb-4">
              <img
                src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg"
                alt="Event KPMBP"
                className="w-full max-w-sm sm:max-w-md h-auto rounded-2xl shadow-sm border border-slate-100 object-contain"
                loading="eager"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
              Cari Event, Aktiviti, pertandingan, Bengkel yang berlangsung di KPMBP dalam 1 Platform
            </p>
          </div>

          {/* Action Button Row */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onSelectTab('events')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 group"
            >
              <span>Lihat Semua Acara</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {urgentCount > 0 && (
              <button
                onClick={() => onSelectTab('dont-miss')}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{urgentCount} Pendaftaran Tutup Segera!</span>
              </button>
            )}
          </div>
        </div>

        {/* Calendar Side Banner + Integrated Category Filter / Right Column */}
        <div className="lg:col-span-5 xl:col-span-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-indigo-800/40 flex flex-col justify-between space-y-5">
          <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-20px] left-[-20px] w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Pandangan Jadual</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-300">
                Interaktif
              </span>
            </div>
            
            <div>
              <h3 className="text-xl font-black text-white leading-snug">
                Format Kalendar Bulanan
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Semak jadual aktiviti dan susunan program mengikut hari dan minggu dengan paparan kalendar interaktif.
              </p>
            </div>

            <button
              onClick={() => onSelectTab('calendar')}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black py-2.5 px-4 rounded-2xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group"
            >
              <Calendar className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>Buka Kalendar Event</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* HARMONIZED CATEGORY FILTER IN SIDE COMPONENT */}
          <div className="relative z-10 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-200">
                Pilih Kategori Acara
              </h4>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md font-black scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
