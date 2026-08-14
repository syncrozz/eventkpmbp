import React from 'react';
import { KpmbpEvent } from '../types';
import { formatDateMalay, getTimeRemainingMalay } from '../utils/calendar';
import { Clock, MapPin, User, ArrowRight, Flame, AlertTriangle, Bookmark, CheckCircle2 } from 'lucide-react';

interface EventCardProps {
  event: KpmbpEvent;
  onViewDetails: (event: KpmbpEvent) => void;
  onRegister: (event: KpmbpEvent) => void;
  isSaved?: boolean;
  onToggleSave?: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onViewDetails,
  onRegister,
  isSaved = false,
  onToggleSave
}) => {
  const { day, month } = formatDateMalay(event.date);
  const timeRemaining = getTimeRemainingMalay(event.registrationDeadline);

  // Subtle, refined category badges
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Kebudayaan':
        return 'bg-amber-50 text-amber-800 border-amber-200/70';
      case 'Kerjaya':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200/70';
      case 'Sukan':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/70';
      case 'Akademik':
        return 'bg-blue-50 text-blue-800 border-blue-200/70';
      case 'Pertandingan':
        return 'bg-rose-50 text-rose-800 border-rose-200/70';
      case 'Program Pelajar':
        return 'bg-purple-50 text-purple-800 border-purple-200/70';
      case 'Kelab & Persatuan':
        return 'bg-teal-50 text-teal-800 border-teal-200/70';
      case 'Bengkel':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200/70';
      case 'Institusi':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Distinct Status Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Registration Open':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-300/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            DAFTAR DIBUKA
          </span>
        );
      case 'Registration Closing Soon':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 border border-rose-300/80">
            <Flame className="w-3 h-3 text-rose-600 animate-bounce" />
            TUTUP SEGERA
          </span>
        );
      case 'Registration Closed':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
            PENDAFTARAN DITUTUP
          </span>
        );
      case 'Fully Booked':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 border border-amber-300/80">
            PENUH
          </span>
        );
      case 'Ongoing':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 border border-indigo-300/80">
            SEDANG BERLANGSUNG
          </span>
        );
      case 'Completed':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600">
            SELESAI
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 border border-blue-200">
            AKAN DATANG
          </span>
        );
    }
  };

  const isRegistrationAvailable =
    event.status === 'Registration Open' || event.status === 'Registration Closing Soon';

  return (
    <div className="group bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full relative overflow-hidden hover:border-indigo-300 hover:-translate-y-0.5">
      
      <div>
        {/* Top Priority: Urgent Deadline Banner (If Closing Soon or Urgent) */}
        {timeRemaining && event.status === 'Registration Closing Soon' && (
          <div className="mb-3 bg-gradient-to-r from-rose-50 to-rose-100/80 border border-rose-200 rounded-xl p-2 px-2.5 text-xs text-rose-900 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="font-extrabold text-[11px] truncate text-rose-800">{timeRemaining}</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded shrink-0">
              URGENT
            </span>
          </div>
        )}

        {/* Header Row: Category, Status, Save Button, Date Box */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
            {getStatusBadge(event.status)}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(event.id);
                }}
                className={`p-1.5 rounded-lg border transition-all ${
                  isSaved
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'bg-white/80 border-slate-200/80 text-slate-400 hover:text-slate-600 hover:bg-white'
                }`}
                title={isSaved ? 'Simpanan Event' : 'Simpan Event'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
              </button>
            )}

            {/* Date Box */}
            <div className="text-center bg-white/80 backdrop-blur-sm border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-colors min-w-[42px]">
              <div className="text-base font-black text-slate-900 leading-none">{day}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{month}</div>
            </div>
          </div>
        </div>

        {/* Optional Poster Thumbnail Preview */}
        {event.image && (
          <div 
            onClick={() => onViewDetails(event)}
            className="mb-3 rounded-xl overflow-hidden h-32 w-full bg-slate-100 cursor-pointer border border-slate-200/80 group-hover:border-indigo-200 transition-all relative"
          >
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) parent.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Title */}
        <h3 
          onClick={() => onViewDetails(event)}
          className="text-base font-extrabold text-slate-900 mb-2.5 leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2"
        >
          {event.title}
        </h3>

        {/* Key Attributes */}
        <div className="text-xs text-slate-600 space-y-1.5 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-medium">{event.startTime} {event.endTime ? `– ${event.endTime}` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate font-medium">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-slate-500 text-[11px]">{event.organiser}</span>
          </div>
        </div>

        {/* Seats left indicator */}
        {event.seatsLeft !== undefined && isRegistrationAvailable && (
          <div className="mb-3 text-[11px] font-medium text-slate-500 flex items-center justify-between bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-100">
            <span>Slot Kosong:</span>
            <span className="font-extrabold text-indigo-600">{event.seatsLeft} tempat sahaja lagi</span>
          </div>
        )}
      </div>

      {/* Action Buttons with Standardized Vocabulary */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
        <button
          onClick={() => onViewDetails(event)}
          className="flex-1 bg-white/80 hover:bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 shadow-2xs active:scale-95"
        >
          Lihat Detail
        </button>

        {isRegistrationAvailable ? (
          <button
            onClick={() => onRegister(event)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-1 active:scale-95"
          >
            <span>Daftar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            disabled
            className="px-3 bg-slate-100 text-slate-400 border border-slate-200 py-2 rounded-xl text-[11px] font-bold cursor-not-allowed"
          >
            Tutup
          </button>
        )}
      </div>

    </div>
  );
};

