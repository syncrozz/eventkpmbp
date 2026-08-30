import React, { useState, useRef, useEffect } from 'react';
import { 
  KpmbpEvent, 
  EventCategory, 
  EventStatus, 
  RegistrationRecord, 
  RegistrationMode, 
  EventType, 
  ProgramSession,
  HeroConfig,
  HeroSlide,
  DEFAULT_HERO_CONFIG,
  HeroCtaAction
} from '../types';
import { 
  subscribeToAllRegistrations, 
  deleteExistingRegistration, 
  updateExistingRegistration,
  getActiveBackendLabel, 
  getActiveBackendType 
} from '../services/dbAdapter';
import { formatDateDMY, formatDeadlineMalay, getCategoryBadgeClass, isOngoingProgram } from '../utils/calendar';
import { optimizeEventImage } from '../utils/imageOptimizer';
import { 
  formatMalaysiaWhatsAppNumber, 
  generateRegistrationWhatsAppMessage, 
  generateRegistrationWhatsAppUrl 
} from '../utils/whatsappHelper';
import { 
  maskFullNameLive, 
  normalizeFullName, 
  validateFullName, 
  maskStudentId, 
  normalizeStudentId, 
  validateStudentId, 
  maskPhoneNumber, 
  normalizePhoneNumber, 
  validatePhoneNumber, 
  normalizeEmail, 
  validateEmail 
} from '../utils/formMasking';
import { 
  exportEventsToCSV, 
  exportRegistrationsToCSV, 
  downloadEventsTemplateCSV, 
  parseEventsFromCSV 
} from '../utils/csvHelper';
import { 
  Plus, Trash2, Edit2, ShieldCheck, Check, Sparkles, AlertCircle, 
  Image as ImageIcon, Upload, Link as LinkIcon, X, Eye, Cloud, Users, 
  Search, Phone, Mail, Calendar, Download, RefreshCw, Loader2, Database, Copy, CheckCheck, WifiOff, Globe, ExternalLink,
  Repeat, Clock, Layers, FileSpreadsheet, FileUp, FileDown, CheckCircle2, FileText, ArrowUpDown, HelpCircle,
  SlidersHorizontal, ArrowLeftRight, Star, Flame, Shield, BookOpen, Compass, Save, RotateCcw, MonitorPlay, MessageSquare, Send
} from 'lucide-react';
import { AdminHeroManager } from './AdminHeroManager';

interface AdminPortalProps {
  events: KpmbpEvent[];
  onCreateEvent: (newEvent: Omit<KpmbpEvent, 'id'>) => void;
  onUpdateEvent: (updatedEvent: KpmbpEvent) => void;
  onDeleteEvent: (event: KpmbpEvent) => void;
  initialEditingEvent?: KpmbpEvent | null;
  onClearInitialEditingEvent?: () => void;
  onSeedSampleData?: () => void;
  onBulkImportEvents?: (events: KpmbpEvent[], replaceAll: boolean) => Promise<void>;
  heroConfig?: HeroConfig;
  onSaveHeroConfig?: (config: HeroConfig) => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  initialEditingEvent,
  onClearInitialEditingEvent,
  onSeedSampleData,
  onBulkImportEvents,
  heroConfig,
  onSaveHeroConfig,
  onShowToast
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'events' | 'registrations' | 'hero'>('events');
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [selectedRegEventId, setSelectedRegEventId] = useState<string>('all');

  // Registration Edit & Delete States
  const [editingRegistration, setEditingRegistration] = useState<RegistrationRecord | null>(null);
  const [isSavingReg, setIsSavingReg] = useState(false);
  const [deleteConfirmReg, setDeleteConfirmReg] = useState<RegistrationRecord | null>(null);
  const [isDeletingReg, setIsDeletingReg] = useState(false);
  const [copiedRegId, setCopiedRegId] = useState<string | null>(null);
  const [regActionToast, setRegActionToast] = useState<string | null>(null);
  const [previewWhatsappReg, setPreviewWhatsappReg] = useState<RegistrationRecord | null>(null);

  // Hero Carousel Configuration State
  const [adminHeroConfig, setAdminHeroConfig] = useState<HeroConfig>(() => {
    return heroConfig && Array.isArray(heroConfig.slides) && heroConfig.slides.length > 0
      ? heroConfig
      : DEFAULT_HERO_CONFIG;
  });
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [heroSaveSuccess, setHeroSaveSuccess] = useState(false);
  const [heroPreviewIndex, setHeroPreviewIndex] = useState(0);

  // Synchronize when external heroConfig updates
  useEffect(() => {
    if (heroConfig && Array.isArray(heroConfig.slides) && heroConfig.slides.length > 0) {
      setAdminHeroConfig(heroConfig);
    }
  }, [heroConfig]);

  const [editingEvent, setEditingEvent] = useState<KpmbpEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedPreviewEvents, setImportedPreviewEvents] = useState<KpmbpEvent[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportEventsCSV = () => {
    if (events.length === 0) {
      alert('Tiada acara untuk dieksport.');
      return;
    }
    exportEventsToCSV(events);
  };

  const handleExportRegistrationsCSV = () => {
    if (registrations.length === 0) {
      alert('Tiada rekod pendaftaran untuk dieksport.');
      return;
    }
    exportRegistrationsToCSV(registrations, events);
  };

  const handleDownloadTemplate = () => {
    downloadEventsTemplateCSV();
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        alert('Fail CSV kosong atau tidak dapat dibaca.');
        return;
      }
      const result = parseEventsFromCSV(text);
      if (!result.success || result.events.length === 0) {
        alert(`Gagal memproses fail CSV:\n${result.errors.join('\n')}`);
        return;
      }

      setImportedPreviewEvents(result.events);
      setImportErrors(result.errors);
      setImportMode('merge');
      setIsImportModalOpen(true);
    };

    reader.onerror = () => {
      alert('Ralat semasa membaca fail CSV.');
    };

    reader.readAsText(file, 'UTF-8');
    // Reset file input so selecting the same file triggers onChange again
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (importedPreviewEvents.length === 0) return;
    setIsImporting(true);
    try {
      if (onBulkImportEvents) {
        await onBulkImportEvents(importedPreviewEvents, importMode === 'replace');
      } else {
        for (const evt of importedPreviewEvents) {
          const exists = events.some((e) => e.id === evt.id);
          if (exists) {
            onUpdateEvent(evt);
          } else {
            onCreateEvent(evt);
          }
        }
      }
      setIsImportModalOpen(false);
      setImportedPreviewEvents([]);
    } catch (err: any) {
      console.error('Import error:', err);
      alert('Ralat semasa import data: ' + (err?.message || 'Sila cuba lagi.'));
    } finally {
      setIsImporting(false);
    }
  };

  // --- Registration Management Handlers ---
  const handleCopyWhatsAppMessage = (reg: RegistrationRecord) => {
    const matchedEvent = events.find(e => e.id === reg.eventId);
    const msg = generateRegistrationWhatsAppMessage(reg, matchedEvent?.title || reg.eventTitle);
    navigator.clipboard.writeText(msg);
    setCopiedRegId(reg.id);
    setRegActionToast(`Mesej WhatsApp pengesahan untuk ${reg.studentName} disalin ke clipboard!`);
    setTimeout(() => {
      setCopiedRegId(null);
      setRegActionToast(null);
    }, 3000);
  };

  const handleStartEditRegistration = (reg: RegistrationRecord) => {
    setEditingRegistration({ ...reg });
  };

  const handleSaveEditedRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegistration) return;

    const normalizedName = normalizeFullName(editingRegistration.studentName);
    const normalizedId = normalizeStudentId(editingRegistration.studentId);
    const normalizedPhone = normalizePhoneNumber(editingRegistration.phone);
    const normalizedMail = editingRegistration.email ? normalizeEmail(editingRegistration.email) : '';

    const nameVal = validateFullName(normalizedName);
    const idVal = validateStudentId(normalizedId);
    const phoneVal = validatePhoneNumber(normalizedPhone);

    if (!nameVal.isValid) {
      alert(nameVal.error || 'Sila masukkan nama penuh peserta yang sah.');
      return;
    }
    if (!idVal.isValid) {
      alert(idVal.error || 'Format No. ID / Matrik tidak sah. Sila gunakan format XXX-XXXX-XXX (Contoh: PDA-2502-011).');
      return;
    }
    if (!phoneVal.isValid) {
      alert(phoneVal.error || 'Sila masukkan nombor telefon yang sah.');
      return;
    }
    if (normalizedMail) {
      const emailVal = validateEmail(normalizedMail);
      if (!emailVal.isValid) {
        alert(emailVal.error || 'Sila masukkan format emel yang sah.');
        return;
      }
    }

    setIsSavingReg(true);
    try {
      // Find event title if eventId changed
      const matchedEvent = events.find(e => e.id === editingRegistration.eventId);
      const updatedReg: RegistrationRecord = {
        ...editingRegistration,
        studentName: normalizedName,
        studentId: normalizedId,
        phone: normalizedPhone,
        email: normalizedMail,
        eventTitle: matchedEvent ? matchedEvent.title : editingRegistration.eventTitle
      };

      await updateExistingRegistration(updatedReg);
      setRegistrations((prev) => prev.map((r) => (r.id === updatedReg.id ? updatedReg : r)));
      setEditingRegistration(null);
      setRegActionToast(`Rekod pendaftaran ${updatedReg.studentName} berjaya dikemaskini!`);
      setTimeout(() => setRegActionToast(null), 3500);
    } catch (err: any) {
      console.error('Error updating registration:', err);
      alert('Ralat semasa mengemaskini pendaftaran: ' + (err?.message || 'Sila cuba lagi.'));
    } finally {
      setIsSavingReg(false);
    }
  };

  const handleConfirmDeleteRegistration = async () => {
    if (!deleteConfirmReg) return;
    setIsDeletingReg(true);
    try {
      await deleteExistingRegistration(deleteConfirmReg.id);
      setRegistrations((prev) => prev.filter((r) => r.id !== deleteConfirmReg.id));
      setRegActionToast(`Rekod pendaftaran ${deleteConfirmReg.studentName} berjaya dipadam.`);
      setDeleteConfirmReg(null);
      setTimeout(() => setRegActionToast(null), 3500);
    } catch (err: any) {
      console.error('Error deleting registration:', err);
      alert('Ralat semasa memadam pendaftaran: ' + (err?.message || 'Sila cuba lagi.'));
    } finally {
      setIsDeletingReg(false);
    }
  };

  // Auto-load initialEditingEvent if requested from card/modal
  useEffect(() => {
    if (initialEditingEvent) {
      handleStartEdit(initialEditingEvent);
      if (onClearInitialEditingEvent) {
        onClearInitialEditingEvent();
      }
    }
  }, [initialEditingEvent]);

  // Subscribe to live student registrations across Firestore cloud backend
  useEffect(() => {
    const unsub = subscribeToAllRegistrations((list) => {
      setRegistrations(list);
    });
    return () => unsub();
  }, []);

  // Form State
  const [eventType, setEventType] = useState<EventType>('ONE_TIME_EVENT');
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

  // Ongoing Program State Fields
  const [scheduleSummary, setScheduleSummary] = useState('');
  const [scheduleSessions, setScheduleSessions] = useState<ProgramSession[]>([]);
  const [programDuration, setProgramDuration] = useState('');
  const [feeType, setFeeType] = useState<'free' | 'paid' | 'voluntary'>('free');
  const [feeAmount, setFeeAmount] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: Exclude<EventCategory, 'Semua'>[] = [
    'Pertandingan', 'Bengkel', 'Program Pelajar', 'Kelab & Persatuan', 
    'Akademik', 'Kebudayaan', 'Sukan', 'Kerjaya', 'Institusi', 'Lain-lain'
  ];

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

  const handleStartCreate = (defaultType: EventType = 'ONE_TIME_EVENT') => {
    setIsCreating(true);
    setEditingEvent(null);
    setEventType(defaultType);
    setTitle('');
    setDescription('');
    setCategory(defaultType === 'ONGOING_PROGRAM' ? 'Program Pelajar' : 'Pertandingan');
    setEventMode('physical');
    setDate('2026-09-01');
    setStartTime('09:00 AM');
    setEndTime('01:00 PM');
    setSubmissionDeadline('2026-09-01T23:59');
    setLocation(defaultType === 'ONGOING_PROGRAM' ? 'Bilik Seminar & Atas Talian' : 'Kampus KPMBP');
    setOrganiser('Urusetia KPMBP');
    setImage('');
    setRegistrationMode(defaultType === 'ONGOING_PROGRAM' ? 'admin' : 'none');
    setOrganiserWhatsApp('');
    setRegistrationUrl('');
    setRegistrationDeadline('');
    setStatus(defaultType === 'ONGOING_PROGRAM' ? 'Registration Open' : 'Upcoming');
    setSeatsLeft('');
    setTotalSeats('');
    setEligibility('Terbuka kepada semua warga KPMBP');
    setContact('Urusetia KPMBP - 012-3456789');
    setOrganiserUrl('');
    // Reset ongoing fields
    setScheduleSummary('');
    setScheduleSessions([]);
    setProgramDuration('');
    setFeeType('free');
    setFeeAmount('');
    setTargetAudience('');
  };

  const handleStartEdit = (evt: KpmbpEvent) => {
    setEditingEvent(evt);
    setIsCreating(false);
    setEventType(evt.eventType || 'ONE_TIME_EVENT');
    setTitle(evt.title);
    setDescription(evt.description);
    setCategory(evt.category);
    setEventMode(evt.eventMode || 'physical');
    setDate(evt.date || '');
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
    // Ongoing program fields
    setScheduleSummary(evt.scheduleSummary || '');
    setScheduleSessions(evt.scheduleSessions ? JSON.parse(JSON.stringify(evt.scheduleSessions)) : []);
    setProgramDuration(evt.programDuration || '');
    setFeeType(evt.feeType || 'free');
    setFeeAmount(evt.feeAmount || '');
    setTargetAudience(evt.targetAudience || '');
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

    // Validation rules based on Event Type and Mode
    if (eventType === 'ONE_TIME_EVENT') {
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
    }

    if (registrationMode === 'admin') {
      if (!organiserWhatsApp.trim()) {
        alert('Sila masukkan No. WhatsApp Penganjur untuk pendaftaran dalaman.');
        return;
      }
    } else if (registrationMode === 'google_form') {
      if (!registrationUrl.trim()) {
        alert('Sila masukkan Pautan Form Rasmi Penganjur.');
        return;
      }
    }

    const finalEventPayload: Omit<KpmbpEvent, 'id'> = {
      eventType,
      title,
      description,
      category,
      date: eventType === 'ONE_TIME_EVENT' ? date : (date || undefined),
      startTime: eventType === 'ONE_TIME_EVENT' && eventMode === 'physical' ? startTime : undefined,
      endTime: eventType === 'ONE_TIME_EVENT' && eventMode === 'physical' ? endTime : undefined,
      location: location.trim() || (eventType === 'ONGOING_PROGRAM' ? 'KPM Beranang' : ''),
      organiser,
      image: image.trim() || undefined,
      eventMode: eventType === 'ONE_TIME_EVENT' ? eventMode : undefined,
      registrationMode,
      organiserWhatsApp: registrationMode === 'admin' ? organiserWhatsApp.trim() : undefined,
      submissionDeadline: eventType === 'ONE_TIME_EVENT' && eventMode === 'online' ? submissionDeadline : undefined,
      registrationUrl: registrationMode === 'google_form' ? registrationUrl.trim() : undefined,
      registrationDeadline: eventType === 'ONE_TIME_EVENT' && registrationMode !== 'none'
        ? (registrationDeadline || (eventMode === 'online' ? submissionDeadline : undefined))
        : (registrationDeadline || undefined),
      status,
      seatsLeft: registrationMode !== 'none' && seatsLeft !== '' ? parseInt(seatsLeft, 10) : undefined,
      totalSeats: registrationMode !== 'none' && totalSeats !== '' ? parseInt(totalSeats, 10) : undefined,
      eligibility,
      contact,
      organiserUrl: organiserUrl.trim() || undefined,
      // Ongoing program specifics
      scheduleSummary: eventType === 'ONGOING_PROGRAM' ? scheduleSummary.trim() || undefined : undefined,
      scheduleSessions: eventType === 'ONGOING_PROGRAM' && scheduleSessions.length > 0 ? scheduleSessions : undefined,
      programDuration: eventType === 'ONGOING_PROGRAM' ? programDuration.trim() || undefined : undefined,
      feeType: eventType === 'ONGOING_PROGRAM' ? feeType : undefined,
      feeAmount: eventType === 'ONGOING_PROGRAM' ? feeAmount.trim() || undefined : undefined,
      targetAudience: eventType === 'ONGOING_PROGRAM' ? targetAudience.trim() || undefined : undefined
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
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Portal Pentadbir Event</span>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud className="w-3.5 h-3.5 text-indigo-600" />
            <span>Firebase Firestore Cloud (Live Sync)</span>
          </div>
        </div>
      </div>

      {/* Admin Navigation & Action Toolbar (Organized in 2 Structured Rows) */}
      <div className="bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3">
        
        {/* ROW 1: Primary Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Senarai Acara */}
          <button
            id="admin-tab-events"
            type="button"
            onClick={() => setActiveAdminTab('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeAdminTab === 'events'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Senarai Acara</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeAdminTab === 'events' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-bold'
            }`}>
              {events.length}
            </span>
          </button>

          {/* Tab 2: Rekod Pendaftaran Peserta */}
          <button
            id="admin-tab-registrations"
            type="button"
            onClick={() => setActiveAdminTab('registrations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeAdminTab === 'registrations'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rekod Pendaftaran Peserta</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeAdminTab === 'registrations' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {registrations.length}
            </span>
          </button>

          {/* Tab 3: Hero Carousel & Komunikasi */}
          <button
            id="admin-tab-hero"
            type="button"
            onClick={() => setActiveAdminTab('hero')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeAdminTab === 'hero'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hero Carousel & Komunikasi</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeAdminTab === 'hero' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
            }`}>
              {(heroConfig?.slides?.filter((s) => s.enabled).length ?? 2)} Aktif
            </span>
          </button>
        </div>

        {/* ROW 2: Primary Management & Creation Action Buttons */}
        {!isCreating && !editingEvent && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200/70">
            {/* Hidden CSV File Input */}
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvFileSelect}
            />

            {/* 1. [ Eksport Pendaftaran ] */}
            <button
              id="admin-btn-export-registrations"
              type="button"
              onClick={handleExportRegistrationsCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-emerald-200/80 cursor-pointer shadow-2xs"
              title="Eksport senarai pendaftaran pelajar ke fail CSV / Excel"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
              <span>Eksport Pendaftaran</span>
              <span className="bg-emerald-200/80 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                {registrations.length}
              </span>
            </button>

            {/* CSV Backup & Import Tools for Events */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={handleExportEventsCSV}
                className="hover:bg-white text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Eksport semua acara ke CSV"
              >
                <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
                <span>Eksport Acara</span>
              </button>
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="hover:bg-white text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Import acara daripada CSV"
              >
                <FileUp className="w-3 h-3 text-indigo-700" />
                <span>Import</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-xs transition-colors"
                title="Muat turun templat CSV kosong"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </div>

            {/* 2. [ Muat Semula Sampel ] */}
            {onSeedSampleData && (
              <button
                id="admin-btn-seed-sample"
                type="button"
                onClick={onSeedSampleData}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200/80 cursor-pointer"
                title="Muat semula set acara sampel default KPMBP"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Muat Semula Sampel</span>
              </button>
            )}

            {/* 3. [ Cipta Acara Sekali ] */}
            <button
              id="admin-btn-create-event"
              type="button"
              onClick={() => handleStartCreate('ONE_TIME_EVENT')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer sm:ml-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Cipta Acara Sekali</span>
            </button>

            {/* 4. [ Cipta Program Berterusan ] */}
            <button
              id="admin-btn-create-ongoing"
              type="button"
              onClick={() => handleStartCreate('ONGOING_PROGRAM')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              <span>Cipta Program Berterusan</span>
            </button>
          </div>
        )}
      </div>

      {/* Form (Create/Edit) */}
      {(isCreating || editingEvent) && (
        <form onSubmit={handleSaveForm} className="bg-white/90 backdrop-blur-xl border border-indigo-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {editingEvent 
                  ? (eventType === 'ONGOING_PROGRAM' ? 'Sunting Program Berterusan' : 'Sunting Event')
                  : (eventType === 'ONGOING_PROGRAM' ? 'Borang Cipta Program Berterusan' : 'Borang Cipta Event Baharu')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {eventType === 'ONGOING_PROGRAM' 
                  ? 'Konfigurasikan program berkala dengan jadual sesi mingguan/harian tanpa kekangan tarikh tunggal.' 
                  : 'Konfigurasikan acara sekali sahaja (fizikal atau pertandingan online).'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingEvent(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Batal
            </button>
          </div>

          {/* Segmented Switcher for Event Type */}
          <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setEventType('ONE_TIME_EVENT')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  eventType === 'ONE_TIME_EVENT'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Acara Sekali Sahaja (One-Time Event)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEventType('ONGOING_PROGRAM');
                  if (status === 'Upcoming') setStatus('Registration Open');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  eventType === 'ONGOING_PROGRAM'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Repeat className="w-4 h-4" />
                <span>Program Berterusan (Ongoing Program)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {eventType === 'ONGOING_PROGRAM' ? 'Nama Program Berterusan *' : 'Tajuk Event *'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={eventType === 'ONGOING_PROGRAM' ? "Contoh: Program Pengajian Al-Quran for Auladina KPMBP" : "Contoh: Pertandingan Reka Bentuk Poster Digital KPMBP"}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Penganjur / Kelab / Unit *</label>
              <input
                type="text"
                required
                value={organiser}
                onChange={(e) => setOrganiser(e.target.value)}
                placeholder="Contoh: Unit Pendidikan Islam / Kelab Sahabat Al-Quran KPMBP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* ONE_TIME_EVENT SPECIFIC FIELDS */}
            {eventType === 'ONE_TIME_EVENT' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mod Acara (Event Mode) *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEventMode('physical')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              </>
            ) : (
              /* ONGOING_PROGRAM SPECIFIC FIELDS */
              <div className="md:col-span-2 space-y-4 bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                  <Repeat className="w-4 h-4 text-emerald-600" />
                  <span>Maklumat Jadual & Sesi Program Berterusan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Ringkasan Kekerapan / Jadual Program *
                    </label>
                    <input
                      type="text"
                      value={scheduleSummary}
                      onChange={(e) => setScheduleSummary(e.target.value)}
                      placeholder="Contoh: 4 kali seminggu (Isnin, Rabu, Jumaat, Sabtu)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Dipaparkan pada lencana kad acara untuk memudahkan peserta melihat jadual ringkas.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Lokasi Utama & Kaedah Penyertaan *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Google Meet & Bilik Seminar KPMBP (Hybrid / Online)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Tempoh Program (Pilihan)
                    </label>
                    <input
                      type="text"
                      value={programDuration}
                      onChange={(e) => setProgramDuration(e.target.value)}
                      placeholder="Contoh: Sepanjang Tahun 2026 / Sesi 2026/2027"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Sasaran Peserta / Had Umur
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="Contoh: Umur 4 - 17 Tahun (Anak staf & pensyarah KPMBP)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Yuran / Sumbangan Selection */}
                <div className="bg-white border border-emerald-200/80 rounded-xl p-3.5">
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Kategori Yuran / Sumbangan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeeType('free');
                        setFeeAmount('Percuma');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                        feeType === 'free'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🎉 Percuma
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeeType('voluntary');
                        setFeeAmount('Sumbangan Ikhlas / Sukarela');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                        feeType === 'voluntary'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🤝 Sumbangan Ikhlas
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeType('paid')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                        feeType === 'paid'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      💳 Berbayar / Yuran
                    </button>
                  </div>

                  {feeType === 'paid' && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Jumlah Yuran (Contoh: RM 10 / Bulan)
                      </label>
                      <input
                        type="text"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="Contoh: RM 15 / sesi atau RM 30 / bulan"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}
                </div>

                {/* Sesi Builder Section */}
                <div className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block">
                        Senarai Sesi Jadual Program ({scheduleSessions.length} sesi)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Tetapkan hari, masa, kaedah (Online/Fizikal) dan aktiviti khusus bagi setiap sesi.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSession}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Sesi</span>
                    </button>
                  </div>

                  {scheduleSessions.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500 font-medium">Belum ada sesi jadual ditambah.</p>
                      <button
                        type="button"
                        onClick={handleAddSession}
                        className="mt-2 text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        + Tambah Sesi Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {scheduleSessions.map((session, sIdx) => (
                        <div key={session.id || sIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Hari / Kekerapan</label>
                              <input
                                type="text"
                                value={session.day}
                                onChange={(e) => handleUpdateSession(sIdx, 'day', e.target.value)}
                                placeholder="Isnin / Sabtu"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Masa</label>
                              <input
                                type="text"
                                value={session.time}
                                onChange={(e) => handleUpdateSession(sIdx, 'time', e.target.value)}
                                placeholder="08:30 PM - 09:30 PM"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Kaedah</label>
                              <select
                                value={session.mode || 'online'}
                                onChange={(e) => handleUpdateSession(sIdx, 'mode', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                              >
                                <option value="online">🌐 Online</option>
                                <option value="physical">🏛️ Fizikal</option>
                                <option value="hybrid">🔄 Hybrid</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Aktiviti / Topik</label>
                              <input
                                type="text"
                                value={session.activity || ''}
                                onChange={(e) => handleUpdateSession(sIdx, 'activity', e.target.value)}
                                placeholder="Tajwid & Tahsin / Latihan"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSession(sIdx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 self-end sm:self-center transition-colors cursor-pointer"
                            title="Buang Sesi Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Program / Acara *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {eventType === 'ONGOING_PROGRAM' ? (
                  <>
                    <option value="Registration Open">Registration Open (Pendaftaran Dibuka)</option>
                    <option value="Registration Closed">Registration Closed (Pendaftaran Ditutup)</option>
                    <option value="Ongoing">Ongoing (Program Sedang Berjalan)</option>
                    <option value="Completed">Completed (Telah Selesai / Tamat Sesi)</option>
                    <option value="Cancelled">Cancelled (Dibatalkan)</option>
                  </>
                ) : registrationMode === 'none' ? (
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
                    <span className="font-extrabold text-xs">Form Rasmi Penganjur</span>
                    {registrationMode === 'google_form' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Pautan borang pendaftaran luar (Form Rasmi Penganjur seperti Google Form, Microsoft Forms, dll).
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
                      onChange={(e) => setOrganiserWhatsApp(maskPhoneNumber(e.target.value))}
                      onBlur={() => setOrganiserWhatsApp(normalizePhoneNumber(organiserWhatsApp))}
                      placeholder="014-5313756 / 6014-5313756"
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
                      Pautan Form Rasmi Penganjur (Google Form / Microsoft Forms / dll) *
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
                    {isOngoingProgram(evt) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-100/95 text-emerald-950 border border-emerald-300 shadow-2xs">
                        <Repeat className="w-3 h-3 text-emerald-700" />
                        <span>Program Berterusan</span>
                      </span>
                    ) : (
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
                    )}
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
                    {isOngoingProgram(evt) ? (
                      <span className="text-slate-700 font-semibold truncate block">
                        {evt.scheduleSummary || evt.location || 'Program Berkala'}
                      </span>
                    ) : evt.eventMode === 'online' ? (
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
        <div id="admin-registrations-section" className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
          
          {/* Toast Notification */}
          {regActionToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{regActionToast}</span>
              </span>
              <button onClick={() => setRegActionToast(null)} className="text-emerald-200 hover:text-white p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Rekod Pendaftaran Pelajar (Disimpan di Firebase)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengurusan pendaftaran pelajar: Klik WhatsApp untuk auto terus ke nombor <span className="font-semibold text-emerald-700">wa.me/6...</span> bersama draf Maklumat Pendaftaran bagi pengesahan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, no. ID, email, telefon..."
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
              <table id="admin-registrations-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-2">Kod Pas / ID</th>
                    <th className="pb-3 px-2">Nama Pelajar</th>
                    <th className="pb-3 px-2">No. ID / Matrik</th>
                    <th className="pb-3 px-2">Program</th>
                    <th className="pb-3 px-2">Direct WhatsApp (wa.me/6) & Maklumat</th>
                    <th className="pb-3 px-2">Acara</th>
                    <th className="pb-3 px-2 text-slate-500">Tarikh Daftar</th>
                    <th className="pb-3 pl-2 text-right">Tindakan</th>
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
                    .map((reg) => {
                      const waUrl = generateRegistrationWhatsAppUrl(reg);
                      const isCopied = copiedRegId === reg.id;

                      return (
                        <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 pr-2 font-mono font-bold text-indigo-600 whitespace-nowrap">
                            {reg.id}
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-900">
                            {reg.studentName}
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-700 font-semibold whitespace-nowrap">
                            {reg.studentId}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                              {reg.programCode}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            <div className="space-y-1">
                              {reg.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    id={`wa-btn-${reg.id}`}
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/90 transition-all shadow-2xs group hover:shadow-xs"
                                    title="Klik untuk direct WhatsApp wa.me/6 dengan draf Maklumat Pendaftaran lengkap"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                                    <span>{reg.phone}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-emerald-600/70" />
                                  </a>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleCopyWhatsAppMessage(reg)}
                                    className={`p-1.5 rounded-lg border transition-all ${
                                      isCopied 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200/80'
                                    }`}
                                    title="Salin templat teks pendaftaran untuk dihantar ke WhatsApp"
                                  >
                                    {isCopied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                              {reg.email && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Mail className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{reg.email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-800 font-semibold max-w-[180px] truncate" title={reg.eventTitle || reg.eventId}>
                            {reg.eventTitle || reg.eventId}
                          </td>
                          <td className="py-3 px-2 text-slate-500 text-[11px] whitespace-nowrap">
                            {reg.timestamp || '-'}
                          </td>
                          <td className="py-3 pl-2 text-right whitespace-nowrap space-x-1.5">
                            {/* Direct WhatsApp Button */}
                            {reg.phone && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="Buka WhatsApp Pelajar (wa.me/6)"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Edit Registration Button */}
                            <button
                              id={`edit-reg-${reg.id}`}
                              type="button"
                              onClick={() => handleStartEditRegistration(reg)}
                              className="inline-flex p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                              title="Sunting Maklumat Pendaftaran Pelajar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Registration Button */}
                            <button
                              id={`del-reg-${reg.id}`}
                              type="button"
                              onClick={() => setDeleteConfirmReg(reg)}
                              className="inline-flex p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="Padam Rekod Pendaftaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit Registration Record */}
      {editingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>Sunting Maklumat Pendaftaran</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID Pas: <span className="font-bold text-indigo-600">{editingRegistration.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRegistration(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRegistration} className="space-y-4">
              {/* Nama Pelajar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penuh Pelajar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingRegistration.studentName}
                  onChange={(e) => setEditingRegistration({ ...editingRegistration, studentName: maskFullNameLive(e.target.value) })}
                  onBlur={() => setEditingRegistration({ ...editingRegistration, studentName: normalizeFullName(editingRegistration.studentName) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* No. ID & Program */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. ID / Matrik Pelajar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRegistration.studentId}
                    onChange={(e) => setEditingRegistration({ ...editingRegistration, studentId: maskStudentId(e.target.value) })}
                    onBlur={() => setEditingRegistration({ ...editingRegistration, studentId: normalizeStudentId(editingRegistration.studentId) })}
                    placeholder="PDA-2502-011"
                    maxLength={12}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Format: XXX-XXXX-XXX</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Program / Kursus
                  </label>
                  <input
                    type="text"
                    value={editingRegistration.programCode}
                    onChange={(e) => setEditingRegistration({ ...editingRegistration, programCode: e.target.value })}
                    placeholder="Contoh: DIA, DBS, DIB"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* No. Telefon (WhatsApp) & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Telefon (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRegistration.phone}
                    onChange={(e) => setEditingRegistration({ ...editingRegistration, phone: maskPhoneNumber(e.target.value) })}
                    onBlur={() => setEditingRegistration({ ...editingRegistration, phone: normalizePhoneNumber(editingRegistration.phone) })}
                    placeholder="014-5313756"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                    Direct Link: wa.me/{formatMalaysiaWhatsAppNumber(editingRegistration.phone)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Emel Siswa
                  </label>
                  <input
                    type="email"
                    value={editingRegistration.email}
                    onChange={(e) => setEditingRegistration({ ...editingRegistration, email: e.target.value })}
                    placeholder="pelajar@gapps.kpm.edu.my"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Acara Dipohon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Acara / Program Berkaitan
                </label>
                <select
                  value={editingRegistration.eventId}
                  onChange={(e) => {
                    const selected = events.find((evt) => evt.id === e.target.value);
                    setEditingRegistration({
                      ...editingRegistration,
                      eventId: e.target.value,
                      eventTitle: selected ? selected.title : editingRegistration.eventTitle
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tarikh & Masa Daftar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarikh & Masa Rekod Pendaftaran
                </label>
                <input
                  type="text"
                  value={editingRegistration.timestamp}
                  onChange={(e) => setEditingRegistration({ ...editingRegistration, timestamp: e.target.value })}
                  placeholder="29/08/2026, 02:30 PM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* WhatsApp Message Preview Box */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>Draf Pengesahan WhatsApp Auto (wa.me/6...)</span>
                  </span>
                  <a
                    href={generateRegistrationWhatsAppUrl(editingRegistration)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-extrabold"
                  >
                    <span>Buka WhatsApp</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-xl font-mono text-[10px] whitespace-pre-line max-h-28 overflow-y-auto border border-emerald-100">
                  {generateRegistrationWhatsAppMessage(editingRegistration)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRegistration(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingReg}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingReg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Registration Confirmation */}
      {deleteConfirmReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                Padam Rekod Pendaftaran?
              </h3>
              <p className="text-xs text-slate-500">
                Adakah anda pasti mahu memadam rekod pendaftaran peserta ini daripada sistem? Tindakan ini tidak boleh diundur.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-1 text-slate-700">
              <div><span className="text-slate-400 font-medium">Nama:</span> <strong className="text-slate-900">{deleteConfirmReg.studentName}</strong></div>
              <div><span className="text-slate-400 font-medium">No. Matrik:</span> <span className="font-mono font-bold">{deleteConfirmReg.studentId}</span></div>
              <div><span className="text-slate-400 font-medium">Acara:</span> <span>{deleteConfirmReg.eventTitle || deleteConfirmReg.eventId}</span></div>
              <div><span className="text-slate-400 font-medium">No. Telefon:</span> <span className="text-emerald-700 font-bold">{deleteConfirmReg.phone}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmReg(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingReg}
                onClick={handleConfirmDeleteRegistration}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeletingReg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Padam Rekod Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Admin-Controlled Hero Carousel & Communication Manager */}
      {activeAdminTab === 'hero' && (
        <AdminHeroManager
          heroConfig={heroConfig}
          events={events}
          onSaveHeroConfig={onSaveHeroConfig}
          onShowToast={onShowToast}
        />
      )}

      {/* CSV Import & Restore Confirmation Modal */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (!isImporting) {
              setIsImportModalOpen(false);
              setImportedPreviewEvents([]);
            }
          }}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <span>Import Acara CSV & Pulihkan Data</span>
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Fail: <span className="font-mono text-white font-semibold">{importFileName || 'fail.csv'}</span> • {importedPreviewEvents.length} Acara Dikesan
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedPreviewEvents([]);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {importedPreviewEvents.length}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Jumlah Acara</div>
                    <div className="text-xs font-black text-indigo-950">Ditemui dalam fail</div>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {importedPreviewEvents.filter((e) => e.eventType !== 'ONGOING_PROGRAM').length}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Acara Sekali</div>
                    <div className="text-xs font-black text-amber-950">Fizikal / Online</div>
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {importedPreviewEvents.filter((e) => e.eventType === 'ONGOING_PROGRAM').length}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Program Berterusan</div>
                    <div className="text-xs font-black text-emerald-950">Jadual Berkala</div>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-900 block">
                  Pilih Kaedah Import:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Merge & Update */}
                  <label
                    onClick={() => setImportMode('merge')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      importMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="import_mode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                        <span>Gabung & Kemas Kini</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
                          Disyorkan
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Mengemas kini acara jika ID sama wujud dan menambah acara baharu. Acara sedia ada lain kekal terpelihara.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Replace All */}
                  <label
                    onClick={() => setImportMode('replace')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="import_mode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                        <span>Gantikan Semua (Pulih Sandaran)</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.2 rounded-full">
                          Restore Penuh
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Menggantikan senarai acara sekarang dengan data CSV ini sepenuhnya. Sangat berguna sekiranya data ter-overwrite.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Any Errors / Warnings */}
              {importErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Peringatan Format CSV:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Pratonton Senarai Acara ({importedPreviewEvents.length}):
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Data akan disegerakkan terus ke Awan (Firebase/Supabase).
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto max-h-[260px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5 px-3">Tajuk Acara</th>
                        <th className="py-2.5 px-2">Jenis</th>
                        <th className="py-2.5 px-2">Kategori</th>
                        <th className="py-2.5 px-2">Tarikh / Jadual</th>
                        <th className="py-2.5 px-2">Penganjur</th>
                        <th className="py-2.5 px-2">Mod Pendaftaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {importedPreviewEvents.map((evt, index) => (
                        <tr key={evt.id || index} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-bold text-slate-900 max-w-[200px] truncate">
                            {evt.title}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {evt.eventType === 'ONGOING_PROGRAM' ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                                Program Berterusan
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-800">
                                Acara Sekali
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${getCategoryBadgeClass(evt.category)}`}>
                              {evt.category}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-600 text-[11px] whitespace-nowrap">
                            {evt.eventType === 'ONGOING_PROGRAM'
                              ? (evt.scheduleSummary || 'Jadual Berkala')
                              : (evt.date || '-')}
                          </td>
                          <td className="py-2 px-2 text-slate-600 text-[11px] max-w-[140px] truncate">
                            {evt.organiser}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-semibold">
                              {evt.registrationMode === 'admin'
                                ? 'WhatsApp Admin'
                                : evt.registrationMode === 'google_form'
                                ? 'Form Rasmi Penganjur'
                                : 'Tiada Pendaftaran'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                Penyegerakan awan akan memastikan semua peranti (PC & Telefon) menerima data terkini.
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportedPreviewEvents([]);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-200/70 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isImporting || importedPreviewEvents.length === 0}
                  onClick={handleExecuteImport}
                  className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                    importMode === 'replace'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  } disabled:opacity-50`}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengimport & Menyegerak...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {importMode === 'replace'
                          ? `Gantikan & Pulihkan (${importedPreviewEvents.length} Acara)`
                          : `Sahkan & Import (${importedPreviewEvents.length} Acara)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
