import React, { useState, useRef } from 'react';
import { 
  EventCategory, 
  EventMode, 
  RegistrationMode, 
  EventType, 
  ProgramSession,
  EventSubmission
} from '../types';
import { submitOrganizerEvent } from '../services/dbAdapter';
import { optimizeEventImage } from '../utils/imageOptimizer';
import { 
  maskFullNameLive, 
  normalizeFullName, 
  validateFullName, 
  maskPhoneNumber, 
  normalizePhoneNumber, 
  validatePhoneNumber, 
  normalizeEmail, 
  validateEmail 
} from '../utils/formMasking';
import { 
  CalendarPlus, 
  Send, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Sparkles, 
  Image as ImageIcon, 
  Upload, 
  Link as LinkIcon, 
  X, 
  Plus, 
  Trash2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowLeft, 
  Info,
  Calendar,
  Layers,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Share2
} from 'lucide-react';

interface EventSubmissionViewProps {
  onBackToDiscover: () => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORIES: Exclude<EventCategory, 'Semua'>[] = [
  'Pertandingan',
  'Bengkel',
  'Program Pelajar',
  'Kelab & Persatuan',
  'Akademik',
  'Kebudayaan',
  'Sukan',
  'Kerjaya',
  'Institusi',
  'Lain-lain'
];

export const EventSubmissionView: React.FC<EventSubmissionViewProps> = ({
  onBackToDiscover,
  onShowToast
}) => {
  // Submitter Details
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitterRole, setSubmitterRole] = useState('');

  // Event Details
  const [eventType, setEventType] = useState<EventType>('ONE_TIME_EVENT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Exclude<EventCategory, 'Semua'>>('Pertandingan');
  const [eventMode, setEventMode] = useState<EventMode>('physical');
  const [organiser, setOrganiser] = useState('');
  
  // Schedule & Location
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:30 AM');
  const [endTime, setEndTime] = useState('04:30 PM');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [location, setLocation] = useState('Kampus KPM Bandar Penawar');

  // Registration & Contact
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('none');
  const [organiserWhatsApp, setOrganiserWhatsApp] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [eligibility, setEligibility] = useState('Terbuka kepada semua siswa & siswi KPMBP');
  const [contact, setContact] = useState('');
  const [organiserUrl, setOrganiserUrl] = useState('');
  const [importantNotice, setImportantNotice] = useState('');

  // Poster / Image
  const [image, setImage] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState<'file' | 'url'>('file');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ongoing Program Fields
  const [scheduleSummary, setScheduleSummary] = useState('');
  const [scheduleSessions, setScheduleSessions] = useState<ProgramSession[]>([]);
  const [programDuration, setProgramDuration] = useState('');
  const [feeType, setFeeType] = useState<'free' | 'paid' | 'voluntary'>('free');
  const [feeAmount, setFeeAmount] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Form Process State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    id: string;
    title: string;
    organiser: string;
    category: string;
    date?: string;
  } | null>(null);

  // Direct Link Sharing Handlers
  const handleCopyDirectLink = () => {
    try {
      const directUrl = `${window.location.origin}${window.location.pathname}#hantar-event`;
      navigator.clipboard.writeText(directUrl);
      setIsCopied(true);
      if (onShowToast) {
        onShowToast('Pautan borang hantar event berjaya disalin!');
      }
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareWhatsApp = () => {
    try {
      const directUrl = `${window.location.origin}${window.location.pathname}#hantar-event`;
      const msg = 
        `*Borang Cadangan Event KPMBP*\n\n` +
        `Salam & Hai! Sila gunakan pautan rasmi ini untuk menghantar maklumat program atau aktiviti anjuran kelab/persatuan anda ke Kalendar Rasmi Event KPMBP:\n\n` +
        `🔗 ${directUrl}\n\n` +
        `_Pihak pentadbir akan menyemak maklumat sebelum diterbitkan secara rasmi._`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    } catch {}
  };

  // Image Upload Handler with Automatic Compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      const optimizedBase64 = await optimizeEventImage(file, 1200, 1200, 0.82);
      setImage(optimizedBase64);
    } catch (err: any) {
      console.error('Error optimizing image:', err);
      alert(err?.message || 'Gagal memproses fail poster.');
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

  // Ongoing Program Session Handlers
  const handleAddSession = () => {
    setScheduleSessions((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        day: 'Isnin',
        time: '08:30 PM - 09:30 PM',
        mode: 'online',
        activity: '',
        location: ''
      }
    ]);
  };

  const handleUpdateSession = (index: number, field: keyof ProgramSession, val: any) => {
    setScheduleSessions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveSession = (index: number) => {
    setScheduleSessions((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Submitter
    const cleanSubmitterName = normalizeFullName(submitterName);
    const cleanSubmitterPhone = normalizePhoneNumber(submitterPhone);
    const cleanSubmitterEmail = submitterEmail ? normalizeEmail(submitterEmail) : '';

    const nameCheck = validateFullName(cleanSubmitterName);
    if (!nameCheck.isValid) {
      alert(nameCheck.error || 'Sila masukkan nama penuh wakil penganjur.');
      return;
    }

    const phoneCheck = validatePhoneNumber(cleanSubmitterPhone);
    if (!phoneCheck.isValid) {
      alert(phoneCheck.error || 'Sila masukkan nombor WhatsApp wakil yang sah.');
      return;
    }

    if (cleanSubmitterEmail) {
      const emailCheck = validateEmail(cleanSubmitterEmail);
      if (!emailCheck.isValid) {
        alert(emailCheck.error || 'Sila masukkan format emel yang betul.');
        return;
      }
    }

    // 2. Validate Event Core Details
    if (!title.trim()) {
      alert('Sila masukkan Tajuk Event.');
      return;
    }
    if (!description.trim()) {
      alert('Sila masukkan Penerangan Lengkap Event.');
      return;
    }
    if (!organiser.trim()) {
      alert('Sila masukkan Nama Penganjur / Kelab / Unit.');
      return;
    }

    // 3. Validate Date & Mode
    if (eventType === 'ONE_TIME_EVENT') {
      if (!date) {
        alert('Sila pilih Tarikh Event.');
        return;
      }
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
          alert('Sila masukkan Tarikh & Masa Akhir Submission untuk acara atas talian.');
          return;
        }
      }
    }

    // 4. Validate Registration Mode
    if (registrationMode === 'admin') {
      if (!organiserWhatsApp.trim()) {
        alert('Sila masukkan No. WhatsApp Penganjur untuk pendaftaran.');
        return;
      }
    } else if (registrationMode === 'google_form') {
      if (!registrationUrl.trim()) {
        alert('Sila masukkan Pautan Google Form / Pautan Rasmi Pendaftaran.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const submissionPayload: Omit<EventSubmission, 'id'> = {
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        submitterName: cleanSubmitterName,
        submitterPhone: cleanSubmitterPhone,
        submitterEmail: cleanSubmitterEmail || undefined,
        submitterRole: submitterRole.trim() || undefined,
        eventType,
        title: title.trim(),
        description: description.trim(),
        category,
        date: eventType === 'ONE_TIME_EVENT' ? date : (date || undefined),
        startTime: eventType === 'ONE_TIME_EVENT' && eventMode === 'physical' ? startTime.trim() : undefined,
        endTime: eventType === 'ONE_TIME_EVENT' && eventMode === 'physical' ? endTime.trim() : undefined,
        location: location.trim() || (eventType === 'ONGOING_PROGRAM' ? 'KPM Beranang' : 'Kampus KPMBP'),
        organiser: organiser.trim(),
        image: image.trim() || undefined,
        eventMode: eventType === 'ONE_TIME_EVENT' ? eventMode : undefined,
        registrationMode,
        organiserWhatsApp: registrationMode === 'admin' ? organiserWhatsApp.trim() : undefined,
        organiserUrl: organiserUrl.trim() || undefined,
        submissionDeadline: eventType === 'ONE_TIME_EVENT' && eventMode === 'online' ? submissionDeadline : undefined,
        registrationUrl: registrationMode === 'google_form' ? registrationUrl.trim() : undefined,
        registrationDeadline: registrationDeadline || undefined,
        eligibility: eligibility.trim() || undefined,
        contact: contact.trim() || `${cleanSubmitterName} - ${cleanSubmitterPhone}`,
        importantNotice: importantNotice.trim() || undefined,
        totalSeats: totalSeats ? parseInt(totalSeats, 10) : undefined,
        seatsLeft: totalSeats ? parseInt(totalSeats, 10) : undefined,
        scheduleSummary: eventType === 'ONGOING_PROGRAM' ? scheduleSummary.trim() || undefined : undefined,
        scheduleSessions: eventType === 'ONGOING_PROGRAM' && scheduleSessions.length > 0 ? scheduleSessions : undefined,
        programDuration: eventType === 'ONGOING_PROGRAM' ? programDuration.trim() || undefined : undefined,
        feeType: eventType === 'ONGOING_PROGRAM' ? feeType : undefined,
        feeAmount: eventType === 'ONGOING_PROGRAM' ? feeAmount.trim() || undefined : undefined,
        targetAudience: eventType === 'ONGOING_PROGRAM' ? targetAudience.trim() || undefined : undefined
      };

      const newId = await submitOrganizerEvent(submissionPayload);

      setSubmittedData({
        id: newId,
        title: title.trim(),
        organiser: organiser.trim(),
        category,
        date: date || undefined
      });

      if (onShowToast) {
        onShowToast('Cadangan event anda telah berjaya dihantar untuk semakan pentadbir!');
      }
    } catch (err: any) {
      console.error('Error submitting event:', err);
      alert('Ralat semasa menghantar cadangan event: ' + (err?.message || 'Sila cuba sebentar lagi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setTitle('');
    setDescription('');
    setCategory('Pertandingan');
    setDate('');
    setImage('');
    setRegistrationMode('none');
    setOrganiserWhatsApp('');
    setRegistrationUrl('');
    setRegistrationDeadline('');
    setTotalSeats('');
    setImportantNotice('');
    setOrganiserUrl('');
    setScheduleSummary('');
    setScheduleSessions([]);
  };

  // ----------------------------------------------------
  // SUCCESS CONFIRMATION STATE
  // ----------------------------------------------------
  if (submittedData) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm text-center space-y-6">
          
          <div className="w-16 h-16 mx-auto bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Status: Menunggu Semakan Pentadbir (Pending Review)</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Cadangan Event Berjaya Dihantar!
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Maklumat acara anda telah selamat direkodkan ke dalam pangkalan data. Pihak urusetia & pentadbir KPMBP akan menyemak maklumat sebelum menerbitkannya ke portal rasmi.
            </p>
          </div>

          {/* Submission Summary Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left space-y-3 max-w-lg mx-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ringkasan Cadangan Acara
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 leading-snug">{submittedData.title}</h4>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">Penganjur: {submittedData.organiser}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/80 text-xs">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-lg">
                {submittedData.category}
              </span>
              {submittedData.date && (
                <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded-lg">
                  📅 {submittedData.date}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-200/70">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-200"
            >
              Hantar Cadangan Event Baharu
            </button>
            <button
              type="button"
              onClick={onBackToDiscover}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Kembali ke Halaman Utama
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN SUBMISSION FORM
  // ----------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-xs font-bold">
              <CalendarPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Borang Penganjur / Kelab / Persatuan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hantar Cadangan Event KPMBP
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Ada aktiviti, pertandingan, kursus atau bengkel baharu? Lengkapkan borang di bawah untuk menghantar maklumat acara kepada pihak pentadbir untuk semakan dan penerbitan rasmi.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToDiscover}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ============================================================ */}
        {/* SEKSYEN 1: MAKLUMAT WAKIL PENGANJUR (SUBMITTER) */}
        {/* ============================================================ */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              01
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Maklumat Wakil Penganjur</h3>
              <p className="text-[11px] text-slate-500">Butiran individu yang menguruskan penghantaran borang ini untuk dihubungi oleh pentadbir jika perlu.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Penuh Wakil <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={submitterName}
                  onChange={(e) => setSubmitterName(maskFullNameLive(e.target.value))}
                  placeholder="CONTOH: AHMAD DANIAL BIN ZULKIFLI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. WhatsApp Wakil <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={submitterPhone}
                  onChange={(e) => setSubmitterPhone(maskPhoneNumber(e.target.value))}
                  placeholder="014-5313756"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emel Rasmi Wakil <span className="text-slate-400 font-normal">(Pilihan)</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="wakil@gapps.kpm.edu.my"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Peranan / Jawatan Wakil <span className="text-slate-400 font-normal">(Pilihan)</span>
              </label>
              <input
                type="text"
                value={submitterRole}
                onChange={(e) => setSubmitterRole(e.target.value)}
                placeholder="Cth: Presiden Kelab / Pengarah Program"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEKSYEN 2: BUTIRAN ASAS ACARA */}
        {/* ============================================================ */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              02
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Butiran Asas Acara</h3>
              <p className="text-[11px] text-slate-500">Maklumat utama seperti tajuk, kelab penganjur, dan kategori program.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Jenis Acara: ONE TIME vs ONGOING */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Struktur Acara <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEventType('ONE_TIME_EVENT')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    eventType === 'ONE_TIME_EVENT'
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Acara Sekali Sahaja</span>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pertandingan, bengkel, seminar atau festival pada tarikh tertentu.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEventType('ONGOING_PROGRAM')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    eventType === 'ONGOING_PROGRAM'
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Program Berkala / Berterusan</span>
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Program dengan jadual sesi mingguan (cth: Kelas Mengaji, Latihan Sukan).</p>
                </button>
              </div>
            </div>

            {/* Tajuk Event */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tajuk Acara / Program <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cth: Pertandingan Robotik & AI Kebangsaan 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Kategori & Penganjur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Penganjur / Kelab / Unit <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={organiser}
                    onChange={(e) => setOrganiser(e.target.value)}
                    placeholder="Cth: Kelab Robotik & Inovasi KPMBP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Penerangan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Penerangan Lengkap Acara <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Terangkan tentang objektif acara, aktiviti yang dijalankan, format penyertaan, dan faedah yang diperolehi peserta..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEKSYEN 3: MOD, TARIKH, MASA & LOKASI */}
        {/* ============================================================ */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              03
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Mod, Tarikh & Lokasi</h3>
              <p className="text-[11px] text-slate-500">Tentukan sama ada program ini secara fizikal di kampus atau atas talian.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Mod Fizikal vs Online (For ONE_TIME_EVENT) */}
            {eventType === 'ONE_TIME_EVENT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mod Pelaksanaan <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEventMode('physical')}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      eventMode === 'physical'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🏢 Fizikal di Kampus
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventMode('online')}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      eventMode === 'online'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🌐 Atas Talian / Online Submission
                  </button>
                </div>
              </div>
            )}

            {/* Tarikh & Masa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {eventType === 'ONE_TIME_EVENT' ? 'Tarikh Acara' : 'Tarikh Mula / Anggaran'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required={eventType === 'ONE_TIME_EVENT'}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              {eventType === 'ONE_TIME_EVENT' && eventMode === 'physical' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Masa Mula <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="08:30 AM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Masa Tamat <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="04:30 PM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </>
              )}

              {eventType === 'ONE_TIME_EVENT' && eventMode === 'online' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarikh & Masa Akhir Submission (Due) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={submissionDeadline}
                    onChange={(e) => setSubmissionDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              )}
            </div>

            {/* Lokasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lokasi / Platform <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={eventMode === 'online' ? 'Google Meet / Microsoft Teams / Laman Web' : 'Cth: Dewan Besar KPMBP / Bilik Seminar 1'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEKSYEN 4: KAEDAH PENDAFTARAN */}
        {/* ============================================================ */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              04
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Kaedah Pendaftaran & Had Penyertaan</h3>
              <p className="text-[11px] text-slate-500">Tentukan cara siswa mendaftar untuk menyertai acara ini.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRegistrationMode('none')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  registrationMode === 'none'
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black text-slate-900">Terbuka / Walk-in</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Tiada pendaftaran diperlukan.</p>
              </button>

              <button
                type="button"
                onClick={() => setRegistrationMode('admin')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  registrationMode === 'admin'
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black text-slate-900">Borang Portal & WhatsApp</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Pelajar mendaftar & hantar slip ke WhatsApp penganjur.</p>
              </button>

              <button
                type="button"
                onClick={() => setRegistrationMode('google_form')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  registrationMode === 'google_form'
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black text-slate-900">Google Form / Pautan Luar</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Pelajar terus ke borang penganjur.</p>
              </button>
            </div>

            {registrationMode === 'admin' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. WhatsApp Penganjur untuk Menerima Pendaftaran <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={organiserWhatsApp}
                    onChange={(e) => setOrganiserWhatsApp(maskPhoneNumber(e.target.value))}
                    placeholder="014-5313756"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            {registrationMode === 'google_form' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pautan Pendaftaran (Google Form / Microsoft Form / URL) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={registrationUrl}
                    onChange={(e) => setRegistrationUrl(e.target.value)}
                    placeholder="https://forms.gle/contoh-pautan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <ExternalLink className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            {registrationMode !== 'none' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarikh & Masa Tutup Pendaftaran
                  </label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Had Tempat (Jumlah Slot Peserta) <span className="text-slate-400 font-normal">(Pilihan)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(e.target.value)}
                    placeholder="Cth: 50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEKSYEN 5: POSTER & BANNER ACARA */}
        {/* ============================================================ */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              05
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Poster / Banner Acara</h3>
              <p className="text-[11px] text-slate-500">Muat naik poster rasmi program dalam format gambar atau pautan URL.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImageUploadMode('file')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                  imageUploadMode === 'file'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Muat Naik Fail Poster
              </button>
              <button
                type="button"
                onClick={() => setImageUploadMode('url')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                  imageUploadMode === 'url'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Gunakan Pautan Gambar (URL)
              </button>
            </div>

            {imageUploadMode === 'file' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="poster-upload-input"
                />
                
                {image ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-w-sm">
                    <img src={image} alt="Preview Poster" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="poster-upload-input"
                    className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl bg-slate-50 hover:bg-indigo-50/30 cursor-pointer transition-all text-center"
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <div className="text-xs font-bold text-slate-700">
                      {isCompressingImage ? 'Memproses dan mengoptimumkan gambar...' : 'Klik untuk pilih fail gambar poster (PNG / JPG / WEBP)'}
                    </div>
                    <p className="text-[10px] text-slate-400">Gambar akan dimampatkan secara automatik.</p>
                  </label>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/poster.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEKSYEN 6: MAKLUMAT TAMBAHAN & SYARAT */}
        {/* ============================================================ */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              06
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Syarat Kelayakan & Maklumat Tambahan</h3>
              <p className="text-[11px] text-slate-500">Syarat penyertaan, notis penting, atau laman rujukan tambahan.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Syarat Kelayakan Peserta
              </label>
              <input
                type="text"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="Terbuka kepada semua warga KPMBP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notis Penting / Peringatan Khas <span className="text-slate-400 font-normal">(Pilihan)</span>
              </label>
              <input
                type="text"
                value={importantNotice}
                onChange={(e) => setImportantNotice(e.target.value)}
                placeholder="Cth: Sila bawa laptop sendiri dan patuhi etika pakaian kemas."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Laman Rujukan / Web Rasmi Program <span className="text-slate-400 font-normal">(Pilihan)</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={organiserUrl}
                  onChange={(e) => setOrganiserUrl(e.target.value)}
                  placeholder="https://instagram.com/kelab_kpmbp"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SEKSYEN KHAS JIKA ONGOING_PROGRAM */}
        {/* ============================================================ */}
        {eventType === 'ONGOING_PROGRAM' && (
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                07
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Jadual & Maklumat Program Berkala</h3>
                <p className="text-[11px] text-slate-500">Konfigurasi sesi mingguan dan yuran bagi program berterusan.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ringkasan Jadual
                  </label>
                  <input
                    type="text"
                    value={scheduleSummary}
                    onChange={(e) => setScheduleSummary(e.target.value)}
                    placeholder="Cth: 3 kali seminggu (Isnin, Rabu, Jumaat)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tempoh Program
                  </label>
                  <input
                    type="text"
                    value={programDuration}
                    onChange={(e) => setProgramDuration(e.target.value)}
                    placeholder="Cth: Sepanjang Tahun 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Sesi Berkala Items */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Senarai Sesi Berkala
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSession}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sesi</span>
                  </button>
                </div>

                {scheduleSessions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                    Belum ada sesi spesifik ditambah. Klik butang Tambah Sesi di atas jika ingin menyenaraikan waktu hari tertentu.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {scheduleSessions.map((session, idx) => (
                      <div key={session.id || idx} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <input
                          type="text"
                          value={session.day}
                          onChange={(e) => handleUpdateSession(idx, 'day', e.target.value)}
                          placeholder="Hari (cth: Isnin)"
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold"
                        />
                        <input
                          type="text"
                          value={session.time}
                          onChange={(e) => handleUpdateSession(idx, 'time', e.target.value)}
                          placeholder="Masa (cth: 8:30 PM - 9:30 PM)"
                          className="flex-1 min-w-[140px] px-2 py-1 bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={session.activity || ''}
                          onChange={(e) => handleUpdateSession(idx, 'activity', e.target.value)}
                          placeholder="Aktiviti / Modul"
                          className="flex-1 min-w-[140px] px-2 py-1 bg-white border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSession(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Action Bar */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">Perhatian:</span> Maklumat yang dihantar akan disemak sebelum diterbitkan secara umum.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBackToDiscover}
              className="flex-1 sm:flex-initial px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Menghantar Cadangan...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Hantar Cadangan Event</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
