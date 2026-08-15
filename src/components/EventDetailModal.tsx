import React, { useState, useEffect } from 'react';
import { KpmbpEvent } from '../types';
import { 
  formatDateMalay, 
  formatDeadlineMalay, 
  formatDateDMY, 
  getGoogleCalendarUrl, 
  downloadIcsFile, 
  getTimeRemainingMalay, 
  getCategoryBadgeClass, 
  getDynamicEventStatus,
  getEventShareText
} from '../utils/calendar';
import { 
  updateDocumentOpenGraph,
  downloadEventOGImage,
  DEFAULT_OGI_SOURCE_URL
} from '../utils/ogi';
import { 
  X, Calendar, Clock, MapPin, User, ShieldAlert, 
  Share2, ExternalLink, Award, PhoneCall, Check, 
  CalendarPlus, MessageCircle, Copy, Globe, Send,
  FileText, Download, Image as ImageIcon, Loader2, AlertCircle
} from 'lucide-react';

interface EventDetailModalProps {
  event: KpmbpEvent | null;
  onClose: () => void;
  onRegister: (event: KpmbpEvent) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRegister
}) => {
  const [copied, setCopied] = useState(false);
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

  const { full: fullDateMalay } = formatDateMalay(event.date);
  const liveStatus = getDynamicEventStatus(event);
  const isOnline = event.eventMode === 'online';
  const deadlineRemaining = getTimeRemainingMalay(isOnline ? event.submissionDeadline || event.registrationDeadline : event.registrationDeadline);

  const handleCopyInfo = () => {
    const fullText = getEventShareText(event);
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getEventShareText(event));
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(getEventShareText(event));
    const url = encodeURIComponent(window.location.href.split('#')[0]);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleDownloadOGI = async () => {
    try {
      setIsGeneratingOgi(true);
      setOgiError(null);
      await downloadEventOGImage(event);
    } catch (err: any) {
      console.error('OGI Generation failed:', err);
      setOgiError(err?.message || 'Ralat: Sumber imej OGI tidak dapat diakses.');
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
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 opacity-90" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Banner Badges */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-wider shadow-md border ${getCategoryBadgeClass(
                event.category
              )}`}>
                {event.category}
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                isOnline ? 'bg-amber-400 text-amber-950' : 'bg-slate-700 text-white'
              }`}>
                {isOnline ? '🌐 ONLINE' : '🏛️ FIZIKAL'}
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Tarikh</div>
                <div className="font-bold text-slate-800">{fullDateMalay}</div>
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

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isOnline ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {isOnline ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Mod & Lokasi</div>
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
                <div className="text-[10px] text-slate-400 font-bold uppercase">Kelayakan / Syarat</div>
                <div className="font-bold text-slate-800 truncate max-w-[180px]">{event.eligibility}</div>
              </div>
            </div>
          </div>

          {/* Registration Deadline Warning Banner */}
          {event.registrationMode !== 'none' && deadlineRemaining && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-rose-700 uppercase tracking-wide text-[10px]">
                  Peringatan Pendaftaran / Penyerahan
                </div>
                <div className="font-bold text-sm mt-0.5">{deadlineRemaining}</div>
                {(event.submissionDeadline || event.registrationDeadline) && (
                  <div className="text-slate-600 text-[11px] font-medium mt-0.5">
                    Tarikh tutup: <span className="font-bold text-slate-800">{formatDeadlineMalay(event.submissionDeadline || event.registrationDeadline)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description ("Tentang Event") */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Tentang Event
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-white/60 p-4 rounded-2xl border border-slate-100">
              {event.description}
            </p>
          </div>

          {/* Official Poster Display if Available */}
          {event.image && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Poster Rasmi Program
              </h3>
              <div className="bg-slate-900/5 border border-slate-200/80 rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center">
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
                    : 'Google Form Rasmi'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 min-w-[140px]">Syarat Kelayakan:</span>
                <span className="text-slate-600">{event.eligibility}</span>
              </div>
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
            </div>
          </div>

          {/* Calendar Sync Options */}
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-400 transition-colors shadow-2xs"
              >
                <Calendar className="w-4 h-4 text-slate-600" />
                <span>Muat Turun Fail .ICS</span>
              </button>
            </div>
          </div>

          {/* Share Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Kongsi Event Bersama Rakan KPMBP
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleShareTelegram}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              <button
                onClick={handleCopyInfo}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                  copied 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80'
                }`}
                title="Salin maklumat lengkap acara yang sedia ditampal ke WhatsApp atau Notes"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copied ? 'Maklumat Disalin!' : 'Salin Maklumat'}</span>
              </button>

              <button
                onClick={handleDownloadOGI}
                disabled={isGeneratingOgi}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors shadow-2xs disabled:opacity-60"
                title="Jana & Muat Turun Poster Acara berasaskan template rasmi"
              >
                {isGeneratingOgi ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <Download className="w-4 h-4 text-indigo-600" />
                )}
                <span>{isGeneratingOgi ? 'Menjana Poster...' : 'Muat Turun Poster'}</span>
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
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>

          {event.registrationMode === 'none' ? (
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-4 h-4 text-emerald-400" />
              <span>Simpan ke Google Calendar (Acara Terbuka)</span>
            </a>
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <span>Daftar via WhatsApp Admin</span>
                <Send className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              disabled
              className="flex-1 bg-slate-200 text-slate-500 py-2.5 px-5 rounded-xl text-xs font-bold cursor-not-allowed"
            >
              {liveStatus === 'Archived' ? 'Acara Telah Diarkibkan' : 'Pendaftaran Tidak Dibuka / Ditutup'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

