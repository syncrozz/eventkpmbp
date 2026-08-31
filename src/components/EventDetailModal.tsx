import React, { useState, useEffect } from 'react';
import { KpmbpEvent } from '../types';
import { 
  formatDateMalay, 
  formatDeadlineMalay, 
  formatDateDMY, 
  getGoogleCalendarUrl, 
  downloadIcsFile, 
  getTimeRemainingMalay,
  getTimeRemainingFromTimestampMalay,
  getEventStartTimestamp,
  getCategoryBadgeClass, 
  getDynamicEventStatus,
  getEventShareText,
  getEventShareUrl,
  getEventSlug,
  isOngoingProgram
} from '../utils/calendar';
import { 
  updateDocumentOpenGraph,
  downloadEventPoster
} from '../utils/ogi';
import { 
  X, Calendar, Clock, MapPin, User, ShieldAlert, 
  Share2, ExternalLink, Award, PhoneCall, Check, 
  CalendarPlus, MessageCircle, Copy, Globe, Send,
  FileText, Download, Image as ImageIcon, Loader2, AlertCircle, Edit2, Trash2, Settings,
  Repeat, Layers, Tag, Users, CheckCircle2, Link as LinkIcon
} from 'lucide-react';

interface EventDetailModalProps {
  event: KpmbpEvent | null;
  onClose: () => void;
  onRegister: (event: KpmbpEvent) => void;
  isAdmin?: boolean;
  onEdit?: (event: KpmbpEvent) => void;
  onDelete?: (event: KpmbpEvent) => void;
  onQuickAdminEdit?: (event: KpmbpEvent) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRegister,
  isAdmin = false,
  onEdit,
  onDelete,
  onQuickAdminEdit
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingOgi, setIsGeneratingOgi] = useState(false);
  const [ogiError, setOgiError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      updateDocumentOpenGraph(event);
    }
    return () => {
      updateDocumentOpenGraph(null);
    };
  }, [event]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (event) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [event, onClose]);

  if (!event) return null;

  const isOngoing = isOngoingProgram(event);
  const { full: fullDateMalay } = formatDateMalay(event.date);
  const liveStatus = getDynamicEventStatus(event);
  const isOnline = event.eventMode === 'online';

  // 1. Deadline calculation (Priority 1)
  const deadlineIso = isOnline 
    ? (event.submissionDeadline || event.registrationDeadline) 
    : event.registrationDeadline;
  const deadlineTimestamp = deadlineIso ? new Date(deadlineIso).getTime() : 0;
  const hasActiveDeadline = 
    !isOngoing && 
    event.registrationMode !== 'none' && 
    !isNaN(deadlineTimestamp) && 
    deadlineTimestamp > Date.now();
  const deadlineRemaining = hasActiveDeadline ? getTimeRemainingFromTimestampMalay(deadlineTimestamp) : null;

  // 2. Event Start Countdown calculation (Priority 2 - when no active deadline & future event)
  const eventStartTimestamp = !isOngoing ? getEventStartTimestamp(event) : Infinity;
  const isFutureEvent = 
    !isOngoing && 
    !hasActiveDeadline && 
    liveStatus !== 'Ongoing' && 
    liveStatus !== 'Completed' && 
    liveStatus !== 'Archived' && 
    liveStatus !== 'Cancelled' && 
    isFinite(eventStartTimestamp) && 
    eventStartTimestamp > Date.now();
  const eventStartRemaining = isFutureEvent ? getTimeRemainingFromTimestampMalay(eventStartTimestamp) : null;

  const shortEventUrl = event ? getEventShareUrl(event) : '';
  const eventSlug = event ? getEventSlug(event) : '';

  const handleCopyInfo = () => {
    const fullText = getEventShareText(event);
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLink = () => {
    if (!shortEventUrl) return;
    navigator.clipboard.writeText(shortEventUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getEventShareText(event));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(getEventShareText(event));
    const url = encodeURIComponent(shortEventUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleDownloadPoster = async () => {
    try {
      setIsGeneratingOgi(true);
      setOgiError(null);
      await downloadEventPoster(event);
    } catch (err: any) {
      console.error('Poster download failed:', err);
      setOgiError(err?.message || 'Ralat: Gagal memuat turun poster acara.');
    } finally {
      setIsGeneratingOgi(false);
    }
  };

  const isRegistrationAvailable =
    event.registrationMode !== 'none' &&
    (liveStatus === 'Registration Open' || liveStatus === 'Registration Closing Soon');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Banner */}
        <div className="relative h-44 sm:h-52 bg-slate-900 overflow-hidden shrink-0">
          {event.image ? (
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full h-full object-cover object-top opacity-60"
              style={(event as any).imagePosition ? { objectPosition: (event as any).imagePosition } : undefined}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 opacity-90" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Header Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            {/* Admin Quick Edit Button */}
            <button 
              onClick={() => {
                if (onQuickAdminEdit) {
                  onQuickAdminEdit(event);
                } else if (onEdit) {
                  onClose();
                  onEdit(event);
                }
              }}
              className="bg-black/40 hover:bg-black/75 text-white/90 hover:text-amber-300 p-2 rounded-full backdrop-blur-md transition-all hover:scale-105 border border-white/15 shadow-sm group cursor-pointer"
              title={isAdmin ? "Sunting Maklumat Acara (Mod Admin Aktif)" : "Akses Cepat Pentadbir (Masukkan PIN untuk Sunting)"}
              aria-label="Akses Pentadbir & Sunting Acara"
            >
              <Settings className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
            </button>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="bg-black/40 hover:bg-black/75 text-white p-2 rounded-full backdrop-blur-md transition-colors border border-white/10 cursor-pointer"
              title="Tutup (Esc)"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner Badges */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider shadow-md border ${getCategoryBadgeClass(
                event.category
              )}`}>
                {event.category}
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                isOngoing 
                  ? 'bg-emerald-400 text-emerald-950 flex items-center gap-1'
                  : isOnline 
                  ? 'bg-amber-400 text-amber-950' 
                  : 'bg-slate-700 text-white'
              }`}>
                {isOngoing ? (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>PROGRAM BERTERUSAN</span>
                  </>
                ) : isOnline ? (
                  '🌐 ONLINE'
                ) : (
                  '🏛️ FIZIKAL'
                )}
              </span>
            </div>
            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-white/90 text-slate-800 backdrop-blur-md">
              {liveStatus}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Event Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {event.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Anjuran: <span className="text-slate-800 font-bold">{event.organiser}</span>
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-xs">
            {isOngoing ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 flex items-center justify-center shrink-0 shadow-2xs">
                    <Repeat className="w-4 h-4 text-emerald-800" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Tempoh Program</div>
                    <div className="font-extrabold text-emerald-950 bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 rounded-lg inline-block text-xs mt-0.5">
                      {event.programDuration || 'Berterusan Sepanjang Tahun'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Jadual Ringkas</div>
                    <div className="font-bold text-slate-800">
                      {event.scheduleSummary || 'Mengikut jadual sesi'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Tarikh Acara</div>
                    <div className="font-extrabold text-amber-950 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-lg inline-block text-xs mt-0.5">
                      {fullDateMalay}
                    </div>
                  </div>
                </div>

                {isOnline ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-700 font-bold uppercase">Due Submission</div>
                      <div className="font-bold text-amber-900 tracking-wide">
                        {formatDeadlineMalay(event.submissionDeadline)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Masa Program</div>
                      <div className="font-bold text-slate-800">{event.startTime} {event.endTime ? `– ${event.endTime}` : ''}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isOngoing ? 'bg-emerald-100 text-emerald-700' : isOnline ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {isOnline ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Lokasi / Tempat</div>
                <div className="font-bold text-slate-800">
                  {isOnline ? 'Atas Talian (Online Platform)' : (event.location || 'Kampus KPMBP')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Kelayakan / Sasaran</div>
                <div className="font-bold text-slate-800 truncate max-w-[180px]">{event.targetAudience || event.eligibility}</div>
              </div>
            </div>
          </div>

          {/* Dynamic Countdown / Alert Banner */}
          {hasActiveDeadline && deadlineRemaining ? (
            /* Mode 1: Active Registration / Submission Deadline Alert (RED) */
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-rose-700 uppercase tracking-wide text-[10px]">
                  Peringatan Pendaftaran / Penyerahan
                </div>
                <div className="font-bold text-sm mt-0.5 text-rose-950">{deadlineRemaining}</div>
                {deadlineIso && (
                  <div className="text-slate-600 text-[11px] font-medium mt-0.5">
                    Tarikh tutup: <span className="font-bold text-slate-800">{formatDeadlineMalay(deadlineIso)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : isFutureEvent && eventStartRemaining ? (
            /* Mode 2: Upcoming Event Start Countdown (BLUE) */
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-sky-700 uppercase tracking-wide text-[10px]">
                  Countdown Acara
                </div>
                <div className="font-bold text-sm mt-0.5 text-sky-950">{eventStartRemaining}</div>
                <div className="text-slate-600 text-[11px] font-medium mt-0.5">
                  Acara bermula: <span className="font-bold text-slate-800">{fullDateMalay}{event.startTime ? ` · ${event.startTime}` : ''}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Detailed Schedule & Session Breakdown (For ONGOING_PROGRAM) */}
          {isOngoing && event.scheduleSessions && event.scheduleSessions.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Jadual & Sesi Program Berkala</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {event.scheduleSessions.map((session, idx) => (
                  <div
                    key={session.id || idx}
                    className="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-emerald-950 px-2 py-0.5 bg-emerald-100 rounded-md">
                        {session.dayOfWeek}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {session.startTime} - {session.endTime}
                      </span>
                    </div>
                    {session.sessionName && (
                      <div className="text-xs font-extrabold text-slate-900 pt-0.5">
                        {session.sessionName}
                      </div>
                    )}
                    {session.location && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{session.location}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description ("Tentang Program / Event") */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              {isOngoing ? 'Tentang Program' : 'Tentang Event'}
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-white/60 p-4 rounded-2xl border border-slate-100">
              {event.description}
            </p>
          </div>

          {/* Official Poster Display if Available */}
          {event.image && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Poster Rasmi Program
                </h3>
                <button
                  onClick={handleDownloadPoster}
                  disabled={isGeneratingOgi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Muat turun fail poster rasmi program ini"
                >
                  {isGeneratingOgi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isGeneratingOgi ? 'Memuat Turun...' : 'Muat Turun Poster'}</span>
                </button>
              </div>
              <div className="bg-slate-900/5 border border-slate-200/80 rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center relative group">
                <img
                  src={event.image}
                  alt={`Poster ${event.title}`}
                  className="w-full max-w-lg max-h-[420px] object-contain rounded-xl shadow-xs"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Important Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Maklumat Penting & Perhubungan
            </h3>
            <div className="bg-white/60 border border-slate-100 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 min-w-[140px]">Kaedah Pendaftaran:</span>
                <span className={event.registrationMode === 'none' ? 'text-emerald-700 font-bold' : 'text-indigo-700 font-bold'}>
                  {event.registrationMode === 'none'
                    ? 'Tiada Pendaftaran (Acara Terbuka / Walk-in)'
                    : event.registrationMode === 'admin'
                    ? 'Pendaftaran Dalaman (WhatsApp Urusetia)'
                    : 'Form Rasmi Penganjur'}
                </span>
              </div>
              {isOngoing && event.feeType && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-[140px]">Struktur Yuran:</span>
                  <span className="text-slate-900 font-extrabold">
                    {event.feeAmount || (event.feeType === 'free' ? 'Percuma' : event.feeType === 'voluntary' ? 'Sumbangan Sukarela' : 'Berbayar')}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 min-w-[140px]">Syarat Kelayakan:</span>
                <span className="text-slate-600">{event.eligibility}</span>
              </div>
              {event.targetAudience && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-[140px]">Kumpulan Sasaran:</span>
                  <span className="text-slate-600">{event.targetAudience}</span>
                </div>
              )}
              {event.maxCapacity && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-800 min-w-[140px]">Kapasiti Maksimum:</span>
                  <span className="text-slate-600">{event.maxCapacity} Peserta</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 min-w-[140px]">MARA MERIT:</span>
                <span className="text-emerald-700 font-bold">Disediakan untuk semua peserta berdaftar</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 min-w-[140px]">Hubungi Urusetia:</span>
                <span className="text-indigo-600 font-bold">
                  {event.organiserWhatsApp ? `${event.contact || 'Urusetia'} (${event.organiserWhatsApp})` : event.contact}
                </span>
              </div>
              {event.organiserUrl && (
                <div className="flex items-start gap-2 pt-1 border-t border-slate-100 mt-1">
                  <span className="font-bold text-slate-800 min-w-[140px]">Laman Web Penganjur:</span>
                  <a
                    href={event.organiserUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 break-all"
                  >
                    <span>{event.organiserUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Organiser Reference Webpage Button (If Available) */}
          {event.organiserUrl && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Laman Rasmi & Rujukan Penganjur
              </h3>
              <a
                href={event.organiserUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/90 text-indigo-950 transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                      <span>Buka Laman Web / Portal Penganjur</span>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-indigo-700 font-medium truncate mt-0.5">
                      {event.organiserUrl}
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-indigo-700 text-[11px] font-bold border border-indigo-200 shadow-2xs shrink-0 ml-2">
                  Layari Laman Web
                </span>
              </a>
            </div>
          )}

          {/* Calendar Sync Options (Only for ONE_TIME_EVENT with valid dates) */}
          {!isOngoing && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Simpan Ke Kalendar Anda
              </h3>
              <div className="flex flex-wrap gap-2">
                <a
                  href={getGoogleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 transition-colors shadow-2xs"
                >
                  <CalendarPlus className="w-4 h-4 text-indigo-600" />
                  <span>Tambah ke Kalendar</span>
                </a>

                <button
                  onClick={() => downloadIcsFile(event)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 transition-colors shadow-2xs cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>Muat Turun Fail .ICS</span>
                </button>
              </div>
            </div>
          )}

          {/* Share Section */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Kongsi Program Bersama Rakan KPMBP
              </h3>
              {eventSlug && (
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/80">
                  #event-{eventSlug}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title="Salin pautan ringkas acara ini untuk dikongsi (cth: #event-pmk020926)"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-700" /> : <LinkIcon className="w-4 h-4" />}
                <span>{copiedLink ? 'Pautan Disalin!' : 'Salin Pautan Ringkas'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleShareTelegram}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors shadow-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              <button
                onClick={handleCopyInfo}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer ${
                  copied 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80'
                }`}
                title="Salin maklumat lengkap program yang sedia ditampal ke WhatsApp atau Notes"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copied ? 'Maklumat Disalin!' : 'Salin Maklumat'}</span>
              </button>

              <button
                onClick={handleDownloadPoster}
                disabled={isGeneratingOgi}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                title="Muat turun poster rasmi program ini"
              >
                {isGeneratingOgi ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <Download className="w-4 h-4 text-indigo-600" />
                )}
                <span>{isGeneratingOgi ? 'Memuat Turun...' : 'Muat Turun Poster'}</span>
              </button>
            </div>

            {ogiError && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{ogiError}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {isAdmin && (
              <>
                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(event);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Sunting Acara Ini"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sunting</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(event);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Padamkan Acara Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Padam</span>
                  </button>
                )}
              </>
            )}
          </div>

          {event.registrationMode === 'none' ? (
            !isOngoing ? (
              <a
                href={getGoogleCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CalendarPlus className="w-4 h-4 text-emerald-400" />
                <span>Simpan ke Google Calendar</span>
              </a>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Program Terbuka / Hadir Terus</span>
              </button>
            )
          ) : isRegistrationAvailable ? (
            event.registrationMode === 'google_form' && event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <span>Borang Daftar</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onRegister(event);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Daftar via WhatsApp Urusetia</span>
                <Send className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              disabled
              className="flex-1 bg-slate-200 text-slate-500 py-2.5 px-5 rounded-xl text-xs font-bold cursor-not-allowed"
            >
              {liveStatus === 'Archived' ? 'Program Telah Diarkibkan' : 'Pendaftaran Tidak Dibuka / Ditutup'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

