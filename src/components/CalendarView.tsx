import React, { useState } from 'react';
import { KpmbpEvent, EventCategory } from '../types';
import { formatDateMalay, getCategoryButtonClass, getCalendarEventPillClass, getCategoryBadgeClass, isOngoingProgram } from '../utils/calendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Grid, List } from 'lucide-react';

interface CalendarViewProps {
  events: KpmbpEvent[];
  onViewDetails: (event: KpmbpEvent) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onViewDetails
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  const monthNamesMalay = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];

  const categories: EventCategory[] = [
    'Semua', 'Pertandingan', 'Bengkel', 'Program Pelajar', 'Sukan', 'Kebudayaan', 'Kerjaya', 'Akademik', 'Institusi'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Ahad

  // Filter events (Exclude ongoing programs without specific one-time dates to avoid dummy calendar entries)
  const filteredEvents = events.filter((e) => {
    if (isOngoingProgram(e)) return false;
    if (selectedCategory !== 'Semua' && e.category !== selectedCategory) return false;
    if (!e.date) return false;
    const d = new Date(e.date);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Map events by day number
  const eventsByDay: { [day: number]: KpmbpEvent[] } = {};
  filteredEvents.forEach((evt) => {
    const dayNum = new Date(evt.date).getDate();
    if (!eventsByDay[dayNum]) eventsByDay[dayNum] = [];
    eventsByDay[dayNum].push(evt);
  });

  return (
    <div className="bg-slate-50/70 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
      
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            <span>Kalendar Acara KPMBP</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semak jadual program mengikut hari dan bulan
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Stepper */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-slate-800 px-3 min-w-[130px] text-center">
                {monthNamesMalay[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Bulan Seterusnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {(currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) && (
              <button
                onClick={() => {
                  setCurrentMonth(today.getMonth());
                  setCurrentYear(today.getFullYear());
                }}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200/60 shadow-2xs cursor-pointer"
                title="Kembali ke Bulan Semasa"
              >
                Hari Ini
              </button>
            )}
          </div>

          {/* Grid vs Agenda Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Grid Kalendar"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Senarai Agenda"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${getCategoryButtonClass(
              cat,
              selectedCategory === cat
            )}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* View Mode: GRID */}
      {viewMode === 'grid' && (
        <div className="overflow-x-auto">
          <div className="min-w-[650px] bg-slate-100/60 p-3 sm:p-4 rounded-2xl border border-slate-200/80">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2 text-center font-bold text-xs text-slate-600 uppercase tracking-wider mb-2.5 px-0.5">
              <div className="py-1">Ahad</div>
              <div className="py-1">Isnin</div>
              <div className="py-1">Selasa</div>
              <div className="py-1">Rabu</div>
              <div className="py-1">Khamis</div>
              <div className="py-1">Jumaat</div>
              <div className="py-1">Sabtu</div>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-2">
              {/* Blank offset boxes */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`blank-${idx}`} className="h-28 bg-slate-200/25 rounded-xl sm:rounded-2xl border border-slate-200/50 opacity-40" />
              ))}

              {/* Day boxes */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayEvents = eventsByDay[dayNum] || [];
                const isToday = dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`h-28 rounded-xl sm:rounded-2xl p-2 border flex flex-col justify-between transition-all ${
                      isToday
                        ? 'bg-indigo-50/90 border-indigo-300 shadow-2xs ring-2 ring-indigo-400/30'
                        : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full border border-slate-200">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Events inside day */}
                    <div className="space-y-1 overflow-y-auto max-h-[64px] scrollbar-none">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => onViewDetails(evt)}
                          className={`px-1.5 py-1 rounded-lg text-[10px] font-bold truncate cursor-pointer shadow-2xs transition-all active:scale-95 ${getCalendarEventPillClass(
                            evt.category
                          )}`}
                          title={`${evt.title} (${evt.category})`}
                        >
                          {evt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View Mode: AGENDA */}
      {viewMode === 'agenda' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs bg-white rounded-2xl border border-slate-200/80">
              Tiada event berjadual untuk bulan {monthNamesMalay[currentMonth]} {currentYear} bagi kategori ini.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const { day, month } = formatDateMalay(evt.date);
              return (
                <div
                  key={evt.id}
                  onClick={() => onViewDetails(evt)}
                  className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl shrink-0">
                      <div className="text-lg font-black text-indigo-700 leading-none">{day}</div>
                      <div className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">{month}</div>
                    </div>

                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${getCategoryBadgeClass(
                        evt.category
                      )}`}>
                        {evt.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 hover:text-indigo-600">
                        {evt.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-500" /> {evt.startTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" /> {evt.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button className="hidden sm:block px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer">
                    Lihat Detail
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};
