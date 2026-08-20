import React, { useState, useRef, useEffect } from 'react';
import { KpmbpEvent, EventCategory, EventStatus, RegistrationRecord, RegistrationMode } from '../types';
import { 
  subscribeToAllRegistrations, 
  deleteExistingRegistration, 
  getActiveBackendLabel, 
  getActiveBackendType 
} from '../services/dbAdapter';
import { SUPABASE_SQL_SETUP, isSupabaseConfigured, checkSupabaseHealth } from '../services/supabase';
import { formatDateDMY, formatDeadlineMalay, getCategoryBadgeClass } from '../utils/calendar';
import { optimizeEventImage } from '../utils/imageOptimizer';
import { 
  Plus, Trash2, Edit2, ShieldCheck, Check, Sparkles, AlertCircle, 
  Image as ImageIcon, Upload, Link as LinkIcon, X, Eye, Cloud, Users, 
  Search, Phone, Mail, Calendar, Download, RefreshCw, Loader2, Database, Copy, CheckCheck, WifiOff, Globe, ExternalLink
} from 'lucide-react';

interface AdminPortalProps {
  events: KpmbpEvent[];
  onCreateEvent: (newEvent: Omit<KpmbpEvent, 'id'>) => void;
  onUpdateEvent: (updatedEvent: KpmbpEvent) => void;
  onDeleteEvent: (event: KpmbpEvent) => void;
  initialEditingEvent?: KpmbpEvent | null;
  onClearInitialEditingEvent?: () => void;
  onSeedSampleData?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  initialEditingEvent,
  onClearInitialEditingEvent,
  onSeedSampleData
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'events' | 'registrations'>('events');
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [selectedRegEventId, setSelectedRegEventId] = useState<string>('all');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseHealth, setSupabaseHealth] = useState<{ checked: boolean; connected: boolean; message: string }>({
    checked: false,
    connected: false,
    message: ''
  });

  const [editingEvent, setEditingEvent] = useState<KpmbpEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Check live Supabase connection status on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      checkSupabaseHealth().then((res) => {
        setSupabaseHealth({
          checked: true,
          connected: res.connected,
          message: res.message
        });
      });
    } else {
      setSupabaseHealth({
        checked: true,
        connected: false,
        message: 'Konfigurasi VITE_SUPABASE_URL belum dimasukkan.'
      });
    }
  }, []);

  // Auto-load initialEditingEvent if requested from card/modal
  useEffect(() => {
    if (initialEditingEvent) {
      handleStartEdit(initialEditingEvent);
      if (onClearInitialEditingEvent) {
        onClearInitialEditingEvent();
      }
    }
  }, [initialEditingEvent]);

  // Subscribe to live student registrations across active cloud backend
  useEffect(() => {
    const unsub = subscribeToAllRegistrations((list) => {
      setRegistrations(list);
    });
    return () => unsub();
  }, []);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Exclude<EventCategory, 'Semua'>>('Pertandingan');
  const [eventMode, setEventMode] = useState<'physical' | 'online'>('physical');
  const [date, setDate] = useState('2026-08-30');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [submissionDeadline, setSubmissionDeadline] = useState('2026-08-30T23:59');
  const [location, setLocation] = useState('Dewan Besar KPMBP');
  const [organiser, setOrganiser] = useState('Urusetia KPMBP');
  const [image, setImage] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState<'file' | 'url'>('file');
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('none');
  const [organiserWhatsApp, setOrganiserWhatsApp] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [status, setStatus] = useState<EventStatus>('Upcoming');
  const [seatsLeft, setSeatsLeft] = useState<string>('');
  const [totalSeats, setTotalSeats] = useState<string>('');
  const [eligibility, setEligibility] = useState('Terbuka kepada semua warga KPMBP');
  const [contact, setContact] = useState('Urusetia KPMBP - 012-3456789');
  const [organiserUrl, setOrganiserUrl] = useState('');

  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: Exclude<EventCategory, 'Semua'>[] = [
    'Pertandingan', 'Bengkel', 'Program Pelajar', 'Kelab & Persatuan', 
    'Akademik', 'Kebudayaan', 'Sukan', 'Kerjaya', 'Institusi', 'Lain-lain'
  ];

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setCategory('Program Pelajar');
    setEventMode('physical');
    setDate('2026-09-01');
    setStartTime('09:00 AM');
    setEndTime('01:00 PM');
    setSubmissionDeadline('2026-09-01T23:59');
    setLocation('Kampus KPMBP');
    setOrganiser('Urusetia KPMBP');
    setImage('');
    setRegistrationMode('none');
    setOrganiserWhatsApp('');
    setRegistrationUrl('');
    setRegistrationDeadline('');
    setStatus('Upcoming');
    setSeatsLeft('');
    setTotalSeats('');
    setEligibility('Terbuka kepada semua warga KPMBP');
    setContact('Urusetia KPMBP - 012-3456789');
    setOrganiserUrl('');
  };

  const handleStartEdit = (evt: KpmbpEvent) => {
    setEditingEvent(evt);
    setIsCreating(false);
    setTitle(evt.title);
    setDescription(evt.description);
    setCategory(evt.category);
    setEventMode(evt.eventMode || 'physical');
    setDate(evt.date);
    setStartTime(evt.startTime || '09:00 AM');
    setEndTime(evt.endTime || '05:00 PM');
    setSubmissionDeadline(evt.submissionDeadline || (evt.date ? `${evt.date}T23:59` : '2026-09-01T23:59'));
    setLocation(evt.location || '');
    setOrganiser(evt.organiser);
    setImage(evt.image || '');
    setRegistrationMode(evt.registrationMode || (evt.registrationUrl ? 'google_form' : (evt.organiserWhatsApp ? 'admin' : 'none')));
    setOrganiserWhatsApp(evt.organiserWhatsApp || '');
    setRegistrationUrl(evt.registrationUrl || '');
    setRegistrationDeadline(evt.registrationDeadline || '');
    setStatus(evt.status);
    setSeatsLeft(evt.seatsLeft !== undefined ? evt.seatsLeft.toString() : '');
    setTotalSeats(evt.totalSeats !== undefined ? evt.totalSeats.toString() : '');
    setEligibility(evt.eligibility);
    setContact(evt.contact);
    setOrganiserUrl(evt.organiserUrl || '');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      // Automatically scale and compress to lightweight base64 (<200KB) safe for Firestore
      const optimizedBase64 = await optimizeEventImage(file, 1200, 1200, 0.82);
      setImage(optimizedBase64);
    } catch (err: any) {
      console.error('Error optimizing image:', err);
      alert(err?.message || 'Gagal memproses fail gambar.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !organiser) return;

    // Validation rules based on Mode
    if (eventMode === 'physical') {
      if (!location.trim()) {
        alert('Sila masukkan Lokasi Kampus untuk acara fizikal.');
        return;
      }
      if (!startTime.trim() || !endTime.trim()) {
        alert('Sila masukkan Masa Mula dan Masa Tamat untuk acara fizikal.');
        return;
      }
    } else {
      if (!submissionDeadline) {
        alert('Sila tetapkan Waktu Due / Tarikh & Masa Akhir Submission untuk acara online.');
        return;
      }
    }

    if (registrationMode === 'admin') {
      if (!organiserWhatsApp.trim()) {
        alert('Sila masukkan No. WhatsApp Penganjur untuk pendaftaran dalaman.');
        return;
      }
    } else if (registrationMode === 'google_form') {
      if (!registrationUrl.trim()) {
        alert('Sila masukkan Pautan Google Form Pendaftaran.');
        return;
      }
    }

    const finalEventPayload: Omit<KpmbpEvent, 'id'> = {
      title,
      description,
      category,
      date,
      startTime: eventMode === 'physical' ? startTime : '',
      endTime: eventMode === 'physical' ? endTime : '',
      location: eventMode === 'physical' ? location : '',
      organiser,
      image: image.trim() || undefined,
      eventMode,
      registrationMode,
      organiserWhatsApp: registrationMode === 'admin' ? organiserWhatsApp.trim() : undefined,
      submissionDeadline: eventMode === 'online' ? submissionDeadline : undefined,
      registrationUrl: registrationMode === 'google_form' ? registrationUrl.trim() : undefined,
      registrationDeadline: registrationMode !== 'none'
        ? (registrationDeadline || (eventMode === 'online' ? submissionDeadline : undefined))
        : undefined,
      status,
      seatsLeft: registrationMode !== 'none' && seatsLeft !== '' ? parseInt(seatsLeft, 10) : undefined,
      totalSeats: registrationMode !== 'none' && totalSeats !== '' ? parseInt(totalSeats, 10) : undefined,
      eligibility,
      contact,
      organiserUrl: organiserUrl.trim() || undefined
    };

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        ...finalEventPayload
      });
      setEditingEvent(null);
    } else {
      onCreateEvent(finalEventPayload);
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Title Card */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Portal Pentadbir Event</span>
            </div>
            
            {getActiveBackendType() === 'supabase' ? (
              supabaseHealth.connected ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supabase PostgreSQL (Aktif & Live Sync)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-300 rounded-full text-[11px] font-bold">
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Supabase PostgreSQL (Tidak Bersambung)</span>
                </div>
              )
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                <span>Firebase Cloud / Local Mode</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold transition-colors"
            >
              <Database className="w-3 h-3 text-slate-500" />
              <span>Skrip SQL Supabase</span>
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Pengurusan & Penerbitan Acara KPMBP
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enjin Pangkalan Data Semasa: <strong className="text-slate-800 font-bold">{getActiveBackendLabel()}</strong>
          </p>
        </div>

        {!isCreating && !editingEvent && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {onSeedSampleData && (
              <button
                type="button"
                onClick={onSeedSampleData}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200/80"
                title="Muat semula set acara sampel default KPMBP"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Semula Sampel</span>
              </button>
            )}
            <button
              onClick={handleStartCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Cipta Event Baharu</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveAdminTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeAdminTab === 'events'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Senarai Acara</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeAdminTab === 'events' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {events.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('registrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeAdminTab === 'registrations'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rekod Pendaftaran Peserta</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeAdminTab === 'registrations' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {registrations.length}
          </span>
        </button>
      </div>

      {/* Form (Create/Edit) */}
      {(isCreating || editingEvent) && (
        <form onSubmit={handleSaveForm} className="bg-white/90 backdrop-blur-xl border border-indigo-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              {editingEvent ? 'Sunting Event' : 'Borang Cipta Event Baharu'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingEvent(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Tajuk Event *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pertandingan Reka Bentuk Poster Digital KPMBP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mod Acara (Event Mode) *</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEventMode('physical')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    eventMode === 'physical'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏛️ Fizikal (Kampus)
                </button>
                <button
                  type="button"
                  onClick={() => setEventMode('online')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    eventMode === 'online'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 Online / Atas Talian
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tarikh Acara (YYYY-MM-DD) *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Conditional fields based on Event Mode */}
            {eventMode === 'physical' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Masa Mula *</label>
                    <input
                      type="text"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="08:00 AM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Masa Tamat *</label>
                    <input
                      type="text"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="05:00 PM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Kampus *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Dewan Besar KPMBP / Bilik Seminar Aras 3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-1 bg-amber-50/70 border border-amber-200 rounded-2xl p-3">
                <label className="block text-xs font-black text-amber-900 mb-1">
                  ⏰ Due Submission (Tarikh & Waktu Akhir Penghantaran) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-[10px] text-amber-700 font-medium mt-1">
                  Masa mula, tamat & lokasi fizikal disembunyikan secara automatik untuk pertandingan/acara online.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Penganjur / Kelab / Unit *</label>
              <input
                type="text"
                required
                value={organiser}
                onChange={(e) => setOrganiser(e.target.value)}
                placeholder="Kelab Kebudayaan / MPP KPMBP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Acara *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {registrationMode === 'none' ? (
                  <>
                    <option value="Upcoming">Upcoming (Akan Datang / Terbuka)</option>
                    <option value="Ongoing">Ongoing (Sedang Berlangsung)</option>
                    <option value="Completed">Completed (Telah Selesai)</option>
                    <option value="Cancelled">Cancelled (Dibatalkan)</option>
                  </>
                ) : (
                  <>
                    <option value="Registration Open">Registration Open (Pendaftaran Dibuka)</option>
                    <option value="Registration Closing Soon">Registration Closing Soon (Hampir Tutup)</option>
                    <option value="Registration Closed">Registration Closed (Pendaftaran Ditutup)</option>
                    <option value="Fully Booked">Fully Booked (Tempat Penuh)</option>
                    <option value="Upcoming">Upcoming (Akan Datang)</option>
                    <option value="Ongoing">Ongoing (Sedang Berlangsung)</option>
                    <option value="Completed">Completed (Telah Selesai)</option>
                    <option value="Cancelled">Cancelled (Dibatalkan)</option>
                  </>
                )}
              </select>
            </div>

            {/* Registration Mode Section (Optional Registration) */}
            <div className="md:col-span-2 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  Kaedah Pendaftaran Acara (Optional)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pilih sama ada event ini memerlukan pendaftaran peserta atau merupakan program terbuka tanpa pendaftaran.
                </p>
              </div>

              {/* 3 Explicit Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode('none');
                    if (status === 'Registration Open' || status === 'Registration Closing Soon' || status === 'Registration Closed') {
                      setStatus('Upcoming');
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    registrationMode === 'none'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">Tiada Pendaftaran</span>
                    {registrationMode === 'none' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Acara terbuka / walk-in (e.g. Pasar Malam KPMBP, Pameran, Karnival).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode('admin');
                    if (status === 'Upcoming') {
                      setStatus('Registration Open');
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    registrationMode === 'admin'
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">Pendaftaran Dalaman</span>
                    {registrationMode === 'admin' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Daftar di portal & hantar slip ke WhatsApp urusetia/admin.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode('google_form');
                    if (status === 'Upcoming') {
                      setStatus('Registration Open');
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    registrationMode === 'google_form'
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">Borang Daftar Luar</span>
                    {registrationMode === 'google_form' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Pautan borang pendaftaran luar (Google Form, Microsoft Forms, dll).
                  </p>
                </button>
              </div>

              {/* Conditional Form Fields */}
              {registrationMode === 'none' && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Acara Terbuka / Tanpa Pendaftaran</span>
                    <span className="text-[11px] text-emerald-800">
                      Pengunjung dan pelajar boleh terus hadir tanpa sebarang borang pendaftaran, WhatsApp ringkasan atau tarikh tutup pendaftaran.
                    </span>
                  </div>
                </div>
              )}

              {registrationMode === 'admin' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      No. WhatsApp Penganjur (Untuk Terima Ringkasan Peserta) *
                    </label>
                    <input
                      type="text"
                      required
                      value={organiserWhatsApp}
                      onChange={(e) => setOrganiserWhatsApp(e.target.value)}
                      placeholder="Contoh: 0123456789 / 60123456789"
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p className="text-[10px] text-indigo-800 mt-1">
                      Peserta akan mengisi borang dalaman dan secara automatik menjana butang WhatsApp untuk menghantar ringkasan pendaftaran terus kepada nombor ini.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tarikh & Masa Tutup Pendaftaran (Pilihan)
                      </label>
                      <input
                        type="datetime-local"
                        value={registrationDeadline}
                        onChange={(e) => setRegistrationDeadline(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Slot Terhad / Tempat Kosong Tersisa (Pilihan)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={seatsLeft}
                        onChange={(e) => setSeatsLeft(e.target.value)}
                        placeholder="Contoh: 8 (Baki slot)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Biarkan kosong jika tiada had slot.</p>
                    </div>
                  </div>
                </div>
              )}

              {registrationMode === 'google_form' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      Pautan Borang Pendaftaran (Google Form / Microsoft Forms / dll) *
                    </label>
                    <input
                      type="url"
                      required
                      value={registrationUrl}
                      onChange={(e) => setRegistrationUrl(e.target.value)}
                      placeholder="https://forms.gle/... atau https://forms.office.com/..."
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p className="text-[10px] text-indigo-800 mt-1">
                      Peserta yang menekan butang "Borang Daftar" akan terus dibawa ke pautan borang ini.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tarikh & Masa Tutup Pendaftaran (Pilihan)
                      </label>
                      <input
                        type="datetime-local"
                        value={registrationDeadline}
                        onChange={(e) => setRegistrationDeadline(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Slot Terhad / Tempat Kosong Tersisa (Pilihan)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={seatsLeft}
                        onChange={(e) => setSeatsLeft(e.target.value)}
                        placeholder="Contoh: 2 (Baki slot)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Biarkan kosong jika tiada had slot.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pegawai In-Charge / No. Telefon Urusetia (Untuk Pertanyaan) *
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Contoh: En. Razak (012-3456789) / Urusetia MPP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Syarat Kelayakan Peserta (Eligibility) *
              </label>
              <input
                type="text"
                required
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="Contoh: Terbuka kepada semua pelajar KPMBP / Terbuka kepada warga KPMBP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setEligibility('Terbuka kepada semua pelajar KPMBP')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-medium transition-colors"
                >
                  Pelajar KPMBP
                </button>
                <button
                  type="button"
                  onClick={() => setEligibility('Terbuka kepada semua warga KPMBP (Staf & Pelajar)')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium transition-colors"
                >
                  Semua Warga (Staf & Pelajar)
                </button>
                <button
                  type="button"
                  onClick={() => setEligibility('Terbuka kepada semua warga kampus & orang awam')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium transition-colors"
                >
                  Terbuka & Awam
                </button>
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
              <label className="block text-xs font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Pautan Laman Web / Rujukan Penganjur (Webpages URL - Pilihan)</span>
              </label>
              <input
                type="url"
                value={organiserUrl}
                onChange={(e) => setOrganiserUrl(e.target.value)}
                placeholder="https://kontinjenkpmbp.syncrozz.com atau https://instagram.com/mppkpmbp"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Sekiranya penganjur mempunyai laman web khas, portal maklumat, atau media sosial rasmi program, masukkan pautan di sini. Butang "Laman Web Penganjur" akan dipaparkan pada butiran acara.
              </p>
            </div>

            {/* Poster Event Attachment Section */}
            <div className="md:col-span-2 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Poster Rasmi Event (Pilihan)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lampirkan poster khusus untuk menarik minat dan memudahkan pelajar melihat info grafik program.
                  </p>
                </div>

                {/* Upload Mode Switcher */}
                <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl self-start shrink-0">
                  <button
                    type="button"
                    onClick={() => setImageUploadMode('file')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      imageUploadMode === 'file'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Pilih Fail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUploadMode('url')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      imageUploadMode === 'url'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Pautan URL</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: File Upload */}
              {imageUploadMode === 'file' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isCompressingImage}
                    className="hidden"
                    id="poster-upload-input"
                  />
                  <label
                    htmlFor="poster-upload-input"
                    className={`border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group ${
                      isCompressingImage ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                      {isCompressingImage ? (
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-indigo-600">
                      {isCompressingImage ? 'Mengoptimumkan & memampatkan imej poster...' : 'Klik atau heret gambar poster di sini'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Dimampatkan secara automatik untuk keserasian awan pantas (Format: JPG, PNG, WebP)
                    </span>
                  </label>
                </div>
              )}

              {/* Mode 2: URL Input */}
              {imageUploadMode === 'url' && (
                <div>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/.../poster.png atau pautan gambar"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Masukkan URL langsung (direct link) ke fail gambar poster.
                  </p>
                </div>
              )}

              {/* Live Image Preview */}
              {image && (
                <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={image}
                      alt="Pratonton Poster"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Poster Berjaya Dipautkan</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs sm:max-w-md mt-0.5">
                        {image.startsWith('data:') ? 'Fail imej bersedia untuk dimuat naik' : image}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Buang Poster"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Penerangan Event *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan aktiviti, tentatif ringkas, serta faedah menyertai program ini..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingEvent(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-200"
            >
              Simpan & Terbit Event
            </button>
          </div>
        </form>
      )}

      {/* Tab 1: Events Table / List */}
      {activeAdminTab === 'events' && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-800">
              Senarai Acara Terbit ({events.length})
            </h3>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pr-2">Tajuk Event</th>
                <th className="pb-3 px-2">Mod / Tarikh</th>
                <th className="pb-3 px-2">Kategori</th>
                <th className="pb-3 px-2">Pendaftaran</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Lokasi / Due</th>
                <th className="pb-3 pl-2 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 pr-2 font-bold text-slate-900 max-w-[220px]">
                    <div className="flex items-center gap-2">
                      {evt.image ? (
                        <img
                          src={evt.image}
                          alt="Poster"
                          className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <span className="truncate">{evt.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        evt.eventMode === 'online' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {evt.eventMode === 'online' ? 'Online' : 'Fizikal'}
                      </span>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100/95 text-amber-950 border border-amber-300 shadow-2xs">
                        {formatDateDMY(evt.date)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${getCategoryBadgeClass(evt.category)}`}>
                      {evt.category}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {evt.registrationMode === 'none' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold">
                        <span>Tiada Pendaftaran</span>
                      </span>
                    ) : evt.registrationMode === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                        <span>WhatsApp Admin</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                        <span>Borang Daftar</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                      {evt.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-600 max-w-[170px] truncate text-[11px]">
                    {evt.eventMode === 'online' ? (
                      <span className="text-amber-700 font-bold">Due: {formatDeadlineMalay(evt.submissionDeadline)}</span>
                    ) : (
                      evt.location || '-'
                    )}
                  </td>
                  <td className="py-3 pl-2 text-right whitespace-nowrap space-x-1">
                    <button
                      onClick={() => handleStartEdit(evt)}
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Sunting"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEvent(evt)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="Padam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Registrations Table (From Firestore Cloud) */}
      {activeAdminTab === 'registrations' && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Rekod Pendaftaran Pelajar (Disimpan di Firebase)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Semua pendaftaran yang dihantar oleh pelajar direkodkan terus secara masa nyata.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, no. ID, email..."
                  value={regSearchQuery}
                  onChange={(e) => setRegSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={selectedRegEventId}
                onChange={(e) => setSelectedRegEventId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Semua Acara ({registrations.length})</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title.length > 30 ? `${evt.title.slice(0, 30)}...` : evt.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {registrations.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Belum ada rekod pendaftaran dalam talian.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pendaftaran pelajar yang dihantar melalui butang "Daftar" akan dipaparkan di sini secara automatik.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-2">Kod Pas / ID</th>
                    <th className="pb-3 px-2">Nama Pelajar</th>
                    <th className="pb-3 px-2">No. ID / Matrik</th>
                    <th className="pb-3 px-2">Program</th>
                    <th className="pb-3 px-2">WhatsApp / Email</th>
                    <th className="pb-3 px-2">Acara</th>
                    <th className="pb-3 pl-2 text-right">Tarikh Masa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {registrations
                    .filter((r) => {
                      if (selectedRegEventId !== 'all' && r.eventId !== selectedRegEventId) return false;
                      if (regSearchQuery.trim()) {
                        const q = regSearchQuery.toLowerCase();
                        return (
                          r.studentName?.toLowerCase().includes(q) ||
                          r.studentId?.toLowerCase().includes(q) ||
                          r.email?.toLowerCase().includes(q) ||
                          r.phone?.toLowerCase().includes(q) ||
                          r.programCode?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pr-2 font-mono font-bold text-indigo-600">
                          {reg.id}
                        </td>
                        <td className="py-3 px-2 font-bold text-slate-900">
                          {reg.studentName}
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-700 font-semibold">
                          {reg.studentId}
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                            {reg.programCode}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          <div className="space-y-0.5">
                            {reg.phone && (
                              <a
                                href={`https://wa.me/${reg.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{reg.phone}</span>
                              </a>
                            )}
                            <div className="text-[10px] text-slate-400">{reg.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-800 font-semibold max-w-[180px] truncate">
                          {reg.eventTitle || reg.eventId}
                        </td>
                        <td className="py-3 pl-2 text-right text-slate-500 text-[11px] whitespace-nowrap">
                          {reg.timestamp || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supabase SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Skrip SQL Jadual Supabase</h3>
                  <p className="text-[11px] text-slate-400">Salin dan laksanakan kod ini di Supabase SQL Editor anda.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SQL Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 space-y-1">
                <p className="font-bold">Langkah Pemasangan di Supabase:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-800">
                  <li>Buka papan pemuka Supabase anda (<strong>SQL Editor</strong>).</li>
                  <li>Tampal kod SQL di bawah dan klik <strong>Run</strong>.</li>
                  <li>Jadual <code>events</code> & <code>registrations</code> berserta polisi keselamatan (RLS) & Realtime akan dicipta secara automatik.</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-2xl overflow-x-auto leading-relaxed border border-slate-800 max-h-[300px]">
                  {SUPABASE_SQL_SETUP}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
