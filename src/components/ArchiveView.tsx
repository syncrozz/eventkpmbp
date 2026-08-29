import React, { useState, useMemo } from 'react';
import { KpmbpEvent, EventCategory } from '../types';
import { EventCard } from './EventCard';
import { getCategoryButtonClass } from '../utils/calendar';
import { exportEventsToCSV } from '../utils/csvHelper';
import { 
  Archive, Search, Calendar, Bookmark, FileDown, 
  RotateCcw, Sparkles, Filter, CheckCircle2, History, Layers
} from 'lucide-react';

interface ArchiveViewProps {
  events: KpmbpEvent[];
  onViewDetails: (event: KpmbpEvent) => void;
  onRegister: (event: KpmbpEvent) => void;
  savedEventIds: string[];
  onToggleSave: (eventId: string) => void;
  isAdmin: boolean;
  onEdit?: (event: KpmbpEvent) => void;
  onDelete?: (event: KpmbpEvent) => void;
  onSeedSampleData?: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  events,
  onViewDetails,
  onRegister,
  savedEventIds,
  onToggleSave,
  isAdmin,
  onEdit,
  onDelete,
  onSeedSampleData
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('Semua');
  const [selectedYear, setSelectedYear] = useState<string>('Semua');
  const [showOnlySaved, setShowOnlySaved] = useState(false);

  // Extract unique years from archived events
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach((evt) => {
      if (evt.date && evt.date.includes('-')) {
        const yr = evt.date.split('-')[0];
        if (yr) years.add(yr);
      }
    });
    return ['Semua', ...Array.from(years).sort().reverse()];
  }, [events]);

  // Filter archived events
  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        // Saved filter check
        if (showOnlySaved && !savedEventIds.includes(evt.id)) {
          return false;
        }

        // Year filter check
        if (selectedYear !== 'Semua') {
          if (!evt.date || !evt.date.startsWith(selectedYear)) {
            return false;
          }
        }

        // Category filter check
        if (selectedCategory !== 'Semua' && evt.category !== selectedCategory) {
          return false;
        }

        // Search query check
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = evt.title.toLowerCase().includes(q);
          const matchDesc = evt.description.toLowerCase().includes(q);
          const matchLoc = evt.location?.toLowerCase().includes(q);
          const matchOrg = evt.organiser.toLowerCase().includes(q);
          const matchCat = evt.category.toLowerCase().includes(q);
          const matchTags = evt.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchLoc && !matchOrg && !matchCat && !matchTags) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort newest past event to oldest past event
        const dateA = a.date || '0000-00-00';
        const dateB = b.date || '0000-00-00';
        return dateB.localeCompare(dateA);
      });
  }, [events, showOnlySaved, savedEventIds, selectedYear, selectedCategory, searchQuery]);

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      alert('Tiada acara arkib untuk dieksport.');
      return;
    }
    exportEventsToCSV(filteredEvents);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Semua');
    setSelectedYear('Semua');
    setShowOnlySaved(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-extrabold border border-indigo-400/30">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>ARKIB AKTIVITI & REKOD SEJARAH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Arkib Acara & Program KPMBP
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pusat rujukan dan rekod aktiviti kampus Kolej Profesional MARA Bandar Penawar yang telah selesai dijalankan. Berguna untuk semakan laporan aktiviti, rujukan jawatankuasa penganjur, dan tinjauan sejarah program.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[130px] flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold text-indigo-200">Jumlah Rekod Arkib</div>
              <div className="text-2xl font-black text-white mt-0.5">{events.length}</div>
              <div className="text-[10px] text-slate-300">Acara & Program Lepas</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[130px] flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold text-indigo-200">Tahun Dikesan</div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">
                {availableYears.filter((y) => y !== 'Semua').length || 1}
              </div>
              <div className="text-[10px] text-slate-300">Sesi Akademik / Takwim</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Panel */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dalam arkib: tajuk acara, penganjur, lokasi..."
              className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action and Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-extrabold text-slate-800 focus:outline-none text-xs cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === 'Semua' ? 'Semua Tahun' : yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Saved Bookmark Toggle */}
            <button
              type="button"
              onClick={() => setShowOnlySaved(!showOnlySaved)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all ${
                showOnlySaved
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${showOnlySaved ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
              <span>Disimpan ({savedEventIds.length})</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              title="Eksport rekod arkib ke format CSV / Excel"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Eksport CSV ({filteredEvents.length})</span>
            </button>

            {(searchQuery || selectedCategory !== 'Semua' || selectedYear !== 'Semua' || showOnlySaved) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1.5 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100">
          {(['Semua', 'Pertandingan', 'Program Pelajar', 'Sukan', 'Kebudayaan', 'Akademik', 'Bengkel', 'Kelab & Persatuan', 'Kerjaya', 'Institusi'] as EventCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs transition-all whitespace-nowrap ${getCategoryButtonClass(
                cat,
                selectedCategory === cat
              )}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid or Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-10 text-center space-y-4 shadow-sm max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <Archive className="w-8 h-8" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800">
              {events.length === 0 ? 'Tiada Acara Lepas Dalam Arkib' : 'Tiada Rekod Arkib Yang Sepadan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {events.length === 0
                ? 'Acara yang telah tamat tarikh berlangsungnya atau ditandakan status "Diarkibkan / Selesai" oleh pihak penganjur akan dipindahkan secara automatik ke Arkib KPMBP ini untuk rujukan masa depan.'
                : 'Tiada acara arkib yang memenuhi penapis carian, tahun, atau kategori yang dipilih.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {(searchQuery || selectedCategory !== 'Semua' || selectedYear !== 'Semua' || showOnlySaved) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                Reset Semua Penapis
              </button>
            )}

            {events.length === 0 && onSeedSampleData && (
              <button
                type="button"
                onClick={onSeedSampleData}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-amber-300 text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Muat Rekod Acara Contoh (2025 & 2026)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Menampilkan {filteredEvents.length} Rekod Arkib
            </span>
            <span className="text-[11px] text-slate-400">
              Susunan mengikut tarikh terkini dahulu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onViewDetails={onViewDetails}
                onRegister={onRegister}
                isSaved={savedEventIds.includes(event.id)}
                onToggleSave={onToggleSave}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
