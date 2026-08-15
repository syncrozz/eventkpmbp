import React from 'react';
import { KpmbpEvent, EventCategory, ViewTab } from '../types';
import { getTimeRemainingMalay, formatDateMalay, sortEventsByNearestDue, getCategoryButtonClass, getCategoryBadgeClass, getDynamicEventStatus, isEventArchived } from '../utils/calendar';
import { Flame, Calendar, ArrowRight, Filter, AlertOctagon, Clock } from 'lucide-react';

interface DontMissSidebarProps {
  events: KpmbpEvent[];
  selectedCategory: EventCategory;
  onSelectCategory: (cat: EventCategory) => void;
  onViewDetails: (event: KpmbpEvent) => void;
  onSelectTab: (tab: ViewTab) => void;
}

export const DontMissSidebar: React.FC<DontMissSidebarProps> = ({
  events,
  selectedCategory,
  onSelectCategory,
  onViewDetails,
  onSelectTab
}) => {
  // Urgent events sorted by deadline urgency (excluding archived events)
  const urgentEvents = sortEventsByNearestDue(
    events
      .filter((e) => !isEventArchived(e))
      .filter((e) => {
        const status = getDynamicEventStatus(e);
        return status === 'Registration Closing Soon' || (e.seatsLeft !== undefined && e.seatsLeft <= 5) || status === 'Registration Open';
      })
  ).slice(0, 4);

  const getUrgencyLevel = (evt: KpmbpEvent) => {
    const deadline = evt.eventMode === 'online' ? evt.submissionDeadline || evt.registrationDeadline : evt.registrationDeadline;
    if (!deadline) return { label: 'SEGERA', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    const diffHours = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHours < 24 && diffHours > 0) {
      return { label: 'KRITIKAL (<24j)', color: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' };
    } else if (diffHours <= 72) {
      return { label: 'SEGERA (1-3 hari)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { label: 'AKAN DATANG', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
  };

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
    <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
      
      {/* JANGAN TERLEPAS Section */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-5 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500 text-white shadow-xs">
              <Flame className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                JANGAN TERLEPAS
              </h2>
              <span className="text-[10px] text-slate-500 block font-medium">Peluang & Tarikh Penting</span>
            </div>
          </div>
          <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
            URGENT
          </span>
        </div>

        {urgentEvents.length === 0 ? (
          <div className="text-xs text-slate-500 italic text-center py-4">
            Tiada pendaftaran yang menutup saat ini. Semua acara berjalan mengikut jadual!
          </div>
        ) : (
          <div className="space-y-3">
            {urgentEvents.map((evt) => {
              const timeRem = getTimeRemainingMalay(evt.registrationDeadline);
              const { day, month } = formatDateMalay(evt.date);
              const urgency = getUrgencyLevel(evt);

              return (
                <div
                  key={evt.id}
                  onClick={() => onViewDetails(evt)}
                  className="group bg-white/80 hover:bg-white border border-slate-200/80 hover:border-indigo-300 p-3.5 rounded-2xl relative overflow-hidden transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-md ${urgency.color}`}>
                      {urgency.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {day} {month}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    {evt.title}
                  </h4>

                  {timeRem && (
                    <div className="mt-2 text-[10px] font-extrabold text-rose-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>{timeRem}</span>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[150px]">{evt.location}</span>
                    <span className="font-bold text-indigo-600 flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Lihat Detail <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CATEGORY NAVIGATOR */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
            KATEGORI EVENT
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${getCategoryButtonClass(
                  cat,
                  isSelected
                )}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* CALENDAR BANNER CARD */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
        <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
          PANDANGAN JADUAL
        </p>
        <h3 className="text-base font-extrabold mb-1">
          Format Kalendar Bulanan
        </h3>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Semak tarikh dan susunan program mengikut hari dan minggu.
        </p>

        <button
          onClick={() => onSelectTab('calendar')}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
        >
          <Calendar className="w-4 h-4 text-indigo-300" />
          <span>Buka Kalendar Event</span>
        </button>
      </div>

    </aside>
  );
};

