import React, { useState, useRef } from 'react';
import { KpmbpEvent, EventCategory, EventStatus } from '../types';
import { Plus, Trash2, Edit2, ShieldCheck, Check, Sparkles, AlertCircle, Image as ImageIcon, Upload, Link as LinkIcon, X, Eye } from 'lucide-react';

interface AdminPortalProps {
  events: KpmbpEvent[];
  onCreateEvent: (newEvent: Omit<KpmbpEvent, 'id'>) => void;
  onUpdateEvent: (updatedEvent: KpmbpEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent
}) => {
  const [editingEvent, setEditingEvent] = useState<KpmbpEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
  const [registrationMode, setRegistrationMode] = useState<'admin' | 'google_form'>('admin');
  const [organiserWhatsApp, setOrganiserWhatsApp] = useState('0123456789');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-08-28T23:59');
  const [status, setStatus] = useState<EventStatus>('Registration Open');
  const [eligibility, setEligibility] = useState('Terbuka kepada semua warga KPMBP');
  const [contact, setContact] = useState('Urusetia KPMBP - 012-3456789');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: Exclude<EventCategory, 'Semua'>[] = [
    'Pertandingan', 'Bengkel', 'Program Pelajar', 'Kelab & Persatuan', 
    'Akademik', 'Kebudayaan', 'Sukan', 'Kerjaya', 'Institusi', 'Lain-lain'
  ];

  const statuses: EventStatus[] = [
    'Upcoming', 'Registration Open', 'Registration Closing Soon', 
    'Registration Closed', 'Fully Booked', 'Ongoing', 'Completed', 'Cancelled'
  ];

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setCategory('Pertandingan');
    setEventMode('physical');
    setDate('2026-09-01');
    setStartTime('09:00 AM');
    setEndTime('01:00 PM');
    setSubmissionDeadline('2026-09-01T23:59');
    setLocation('Dewan Besar KPMBP');
    setOrganiser('Majlis Perwakilan Pelajar KPMBP');
    setImage('');
    setRegistrationMode('admin');
    setOrganiserWhatsApp('0123456789');
    setRegistrationUrl('');
    setRegistrationDeadline('2026-08-29T23:59');
    setStatus('Registration Open');
    setEligibility('Terbuka kepada semua pelajar KPMBP');
    setContact('Penasihat Program - 012-3456789');
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
    setRegistrationMode(evt.registrationMode || (evt.registrationUrl ? 'google_form' : 'admin'));
    setOrganiserWhatsApp(evt.organiserWhatsApp || '0123456789');
    setRegistrationUrl(evt.registrationUrl || '');
    setRegistrationDeadline(evt.registrationDeadline || '');
    setStatus(evt.status);
    setEligibility(evt.eligibility);
    setContact(evt.contact);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Saiz fail terlalu besar. Sila pilih gambar di bawah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        setImage(result);
      }
    };
    reader.readAsDataURL(file);
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
    } else {
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
      registrationDeadline: registrationDeadline || (eventMode === 'online' ? submissionDeadline : undefined),
      status,
      eligibility,
      contact
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Portal Pentadbir Event</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Pengurusan & Penerbitan Acara KPMBP
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tambah, sunting, dan kemaskini status pendaftaran program kampus secara langsung.
          </p>
        </div>

        {!isCreating && !editingEvent && (
          <button
            onClick={handleStartCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cipta Event Baharu</span>
          </button>
        )}
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
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Registration Mode Section */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-900">
                    Kaedah Pendaftaran Acara
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Tentukan sama ada pendaftaran diuruskan oleh Admin Portal atau Google Form luar.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Uruskan Pendaftaran oleh Admin:</span>
                  <div className="inline-flex bg-slate-200 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('admin')}
                      className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                        registrationMode === 'admin'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('google_form')}
                      className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                        registrationMode === 'google_form'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      NO (Google Form)
                    </button>
                  </div>
                </div>
              </div>

              {registrationMode === 'admin' ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    No. WhatsApp Penganjur (Untuk Terima Ringkasan Peserta) *
                  </label>
                  <input
                    type="text"
                    required
                    value={organiserWhatsApp}
                    onChange={(e) => setOrganiserWhatsApp(e.target.value)}
                    placeholder="Contoh: 0123456789 / 60123456789"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[10px] text-emerald-800 mt-1">
                    Peserta akan mengisi borang dalaman dan secara automatik menjana butang WhatsApp untuk menghantar ringkasan pendaftaran terus kepada nombor ini.
                  </p>
                </div>
              ) : (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    Pautan Google Form Pendaftaran *
                  </label>
                  <input
                    type="url"
                    required
                    value={registrationUrl}
                    onChange={(e) => setRegistrationUrl(e.target.value)}
                    placeholder="https://forms.gle/xxxxxxxxxxxx"
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-indigo-800 mt-1">
                    Peserta yang menekan butang "Daftar" akan terus dibawa ke Google Form ini tanpa borang dalaman.
                  </p>
                </div>
              )}
            </div>

            {eventMode === 'physical' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tarikh & Masa Tutup Pendaftaran (Pilihan)</label>
                <input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

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
                    className="hidden"
                    id="poster-upload-input"
                  />
                  <label
                    htmlFor="poster-upload-input"
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600">
                      Klik atau heret gambar poster di sini
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Format disokong: PNG, JPG, JPEG, WebP (Maksimum 5MB)
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

      {/* Events Table / List */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-extrabold text-slate-800 mb-4">
          Senarai Acara Terbit ({events.length})
        </h3>

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
                    <span className="text-[11px] font-semibold">{evt.date}</span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                    {evt.category}
                  </span>
                </td>
                <td className="py-3 px-2">
                  {evt.registrationMode === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      <span>WhatsApp Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                      <span>Google Form</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                    {evt.status}
                  </span>
                </td>
                <td className="py-3 px-2 text-slate-600 max-w-[140px] truncate text-[11px]">
                  {evt.eventMode === 'online' ? (
                    <span className="text-amber-700 font-bold">Due: {evt.submissionDeadline ? evt.submissionDeadline.replace('T', ' ') : 'Atas Talian'}</span>
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
                    onClick={() => onDeleteEvent(evt.id)}
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

    </div>
  );
};
