import React, { useState } from 'react';
import { 
  EventSubmission, 
  SubmissionStatus, 
  KpmbpEvent, 
  EventCategory, 
  EventMode, 
  RegistrationMode, 
  EventType, 
  ProgramSession,
  EventStatus
} from '../types';
import { getCategoryBadgeClass, formatDateDMY } from '../utils/calendar';
import { formatMalaysiaWhatsAppNumber } from '../utils/whatsappHelper';
import { optimizeEventImage } from '../utils/imageOptimizer';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Trash2, 
  Eye, 
  Layers, 
  Sparkles, 
  AlertCircle, 
  Check, 
  X, 
  Upload, 
  Loader2, 
  Send,
  Plus
} from 'lucide-react';

interface AdminSubmissionsTabProps {
  submissions: EventSubmission[];
  events: KpmbpEvent[];
  onApprove: (sub: EventSubmission, finalPayload: Omit<KpmbpEvent, 'id'>) => Promise<void>;
  onReject: (subId: string, reason?: string) => Promise<void>;
  onDelete: (subId: string) => Promise<void>;
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

export const AdminSubmissionsTab: React.FC<AdminSubmissionsTabProps> = ({
  submissions,
  events,
  onApprove,
  onReject,
  onDelete,
  onShowToast
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | SubmissionStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Review & Approve Modal State
  const [reviewModalSub, setReviewModalSub] = useState<EventSubmission | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Form Fields inside Review Modal
  const [revTitle, setRevTitle] = useState('');
  const [revDescription, setRevDescription] = useState('');
  const [revCategory, setRevCategory] = useState<Exclude<EventCategory, 'Semua'>>('Pertandingan');
  const [revEventType, setRevEventType] = useState<EventType>('ONE_TIME_EVENT');
  const [revEventMode, setRevEventMode] = useState<EventMode>('physical');
  const [revDate, setRevDate] = useState('');
  const [revStartTime, setRevStartTime] = useState('08:30 AM');
  const [revEndTime, setRevEndTime] = useState('04:30 PM');
  const [revSubmissionDeadline, setRevSubmissionDeadline] = useState('');
  const [revLocation, setRevLocation] = useState('');
  const [revOrganiser, setRevOrganiser] = useState('');
  const [revStatus, setRevStatus] = useState<EventStatus>('Upcoming');
  const [revRegistrationMode, setRevRegistrationMode] = useState<RegistrationMode>('none');
  const [revOrganiserWhatsApp, setRevOrganiserWhatsApp] = useState('');
  const [revRegistrationUrl, setRevRegistrationUrl] = useState('');
  const [revRegistrationDeadline, setRevRegistrationDeadline] = useState('');
  const [revSeatsLeft, setRevSeatsLeft] = useState('');
  const [revTotalSeats, setRevTotalSeats] = useState('');
  const [revEligibility, setRevEligibility] = useState('');
  const [revContact, setRevContact] = useState('');
  const [revOrganiserUrl, setRevOrganiserUrl] = useState('');
  const [revImportantNotice, setRevImportantNotice] = useState('');
  const [revImage, setRevImage] = useState('');

  // Ongoing program fields in review modal
  const [revScheduleSummary, setRevScheduleSummary] = useState('');
  const [revScheduleSessions, setRevScheduleSessions] = useState<ProgramSession[]>([]);
  const [revProgramDuration, setRevProgramDuration] = useState('');
  const [revFeeType, setRevFeeType] = useState<'free' | 'paid' | 'voluntary'>('free');
  const [revFeeAmount, setRevFeeAmount] = useState('');
  const [revTargetAudience, setRevTargetAudience] = useState('');

  // Reject Modal State
  const [rejectModalSub, setRejectModalSub] = useState<EventSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmSub, setDeleteConfirmSub] = useState<EventSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Poster Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Computed Statistics
  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED').length;

  // Filtered Submissions List
  const filteredSubmissions = submissions.filter((sub) => {
    // 1. Status Filter
    if (filterStatus !== 'ALL' && sub.status !== filterStatus) {
      return false;
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = sub.title.toLowerCase().includes(q);
      const matchOrganiser = sub.organiser.toLowerCase().includes(q);
      const matchSubmitter = sub.submitterName.toLowerCase().includes(q);
      const matchPhone = sub.submitterPhone.includes(q);
      const matchCategory = sub.category.toLowerCase().includes(q);
      const matchLocation = sub.location.toLowerCase().includes(q);
      return matchTitle || matchOrganiser || matchSubmitter || matchPhone || matchCategory || matchLocation;
    }

    return true;
  });

  // Open Review & Approve Modal with Pre-populated data
  const handleOpenReview = (sub: EventSubmission) => {
    setReviewModalSub(sub);
    setRevTitle(sub.title || '');
    setRevDescription(sub.description || '');
    setRevCategory(sub.category || 'Pertandingan');
    setRevEventType(sub.eventType || 'ONE_TIME_EVENT');
    setRevEventMode(sub.eventMode || 'physical');
    setRevDate(sub.date || '');
    setRevStartTime(sub.startTime || '08:30 AM');
    setRevEndTime(sub.endTime || '04:30 PM');
    setRevSubmissionDeadline(sub.submissionDeadline || '');
    setRevLocation(sub.location || 'Kampus KPMBP');
    setRevOrganiser(sub.organiser || '');
    setRevStatus('Upcoming');
    setRevRegistrationMode(sub.registrationMode || 'none');
    setRevOrganiserWhatsApp(sub.organiserWhatsApp || sub.submitterPhone || '');
    setRevRegistrationUrl(sub.registrationUrl || '');
    setRevRegistrationDeadline(sub.registrationDeadline || '');
    setRevSeatsLeft(sub.seatsLeft !== undefined ? String(sub.seatsLeft) : (sub.totalSeats !== undefined ? String(sub.totalSeats) : ''));
    setRevTotalSeats(sub.totalSeats !== undefined ? String(sub.totalSeats) : '');
    setRevEligibility(sub.eligibility || 'Terbuka kepada semua warga KPMBP');
    setRevContact(sub.contact || `${sub.submitterName} - ${sub.submitterPhone}`);
    setRevOrganiserUrl(sub.organiserUrl || '');
    setRevImportantNotice(sub.importantNotice || '');
    setRevImage(sub.image || '');
    setRevScheduleSummary(sub.scheduleSummary || '');
    setRevScheduleSessions(sub.scheduleSessions || []);
    setRevProgramDuration(sub.programDuration || '');
    setRevFeeType(sub.feeType || 'free');
    setRevFeeAmount(sub.feeAmount || '');
    setRevTargetAudience(sub.targetAudience || '');
  };

  // Submit Approval Action
  const handleApproveFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSub) return;

    if (!revTitle.trim()) {
      alert('Sila masukkan Tajuk Acara.');
      return;
    }
    if (!revDescription.trim()) {
      alert('Sila masukkan Penerangan Acara.');
      return;
    }
    if (!revOrganiser.trim()) {
      alert('Sila masukkan Nama Penganjur.');
      return;
    }

    setIsApproving(true);
    try {
      const finalPayload: Omit<KpmbpEvent, 'id'> = {
        title: revTitle.trim(),
        description: revDescription.trim(),
        category: revCategory,
        eventType: revEventType,
        date: revEventType === 'ONE_TIME_EVENT' ? revDate : (revDate || undefined),
        startTime: revEventType === 'ONE_TIME_EVENT' && revEventMode === 'physical' ? revStartTime.trim() : undefined,
        endTime: revEventType === 'ONE_TIME_EVENT' && revEventMode === 'physical' ? revEndTime.trim() : undefined,
        submissionDeadline: revEventType === 'ONE_TIME_EVENT' && revEventMode === 'online' ? revSubmissionDeadline : undefined,
        location: revLocation.trim(),
        organiser: revOrganiser.trim(),
        image: revImage.trim() || undefined,
        eventMode: revEventType === 'ONE_TIME_EVENT' ? revEventMode : undefined,
        registrationMode: revRegistrationMode,
        organiserWhatsApp: revRegistrationMode === 'admin' ? revOrganiserWhatsApp.trim() : undefined,
        registrationUrl: revRegistrationMode === 'google_form' ? revRegistrationUrl.trim() : undefined,
        registrationDeadline: revRegistrationDeadline || undefined,
        status: revStatus,
        seatsLeft: revRegistrationMode !== 'none' && revSeatsLeft !== '' ? parseInt(revSeatsLeft, 10) : undefined,
        totalSeats: revRegistrationMode !== 'none' && revTotalSeats !== '' ? parseInt(revTotalSeats, 10) : undefined,
        eligibility: revEligibility.trim() || undefined,
        contact: revContact.trim() || undefined,
        organiserUrl: revOrganiserUrl.trim() || undefined,
        importantNotice: revImportantNotice.trim() || undefined,
        scheduleSummary: revEventType === 'ONGOING_PROGRAM' ? revScheduleSummary.trim() || undefined : undefined,
        scheduleSessions: revEventType === 'ONGOING_PROGRAM' && revScheduleSessions.length > 0 ? revScheduleSessions : undefined,
        programDuration: revEventType === 'ONGOING_PROGRAM' ? revProgramDuration.trim() || undefined : undefined,
        feeType: revEventType === 'ONGOING_PROGRAM' ? revFeeType : undefined,
        feeAmount: revEventType === 'ONGOING_PROGRAM' ? revFeeAmount.trim() || undefined : undefined,
        targetAudience: revEventType === 'ONGOING_PROGRAM' ? revTargetAudience.trim() || undefined : undefined
      };

      await onApprove(reviewModalSub, finalPayload);
      setReviewModalSub(null);
    } catch (err: any) {
      console.error('Approval failed:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Submit Rejection Action
  const handleRejectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalSub) return;

    setIsRejecting(true);
    try {
      await onReject(rejectModalSub.id, rejectionReason.trim() || undefined);
      setRejectModalSub(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Rejection failed:', err);
    } finally {
      setIsRejecting(false);
    }
  };

  // Submit Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmSub) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmSub.id);
      setDeleteConfirmSub(null);
    } catch (err: any) {
      console.error('Deletion failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Statistics Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div 
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white/80 border-slate-200/80 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Cadangan</div>
          <div className="text-2xl sm:text-3xl font-black mt-1">{totalCount}</div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setFilterStatus('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'PENDING'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md'
              : 'bg-white/80 border-slate-200/80 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={filterStatus === 'PENDING' ? 'text-amber-100' : 'text-amber-600'}>Menunggu Semakan</span>
            <Clock className={`w-3.5 h-3.5 ${filterStatus === 'PENDING' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1">{pendingCount}</div>
        </div>

        {/* Approved */}
        <div 
          onClick={() => setFilterStatus('APPROVED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white/80 border-slate-200/80 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={filterStatus === 'APPROVED' ? 'text-emerald-100' : 'text-emerald-600'}>Diluluskan</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${filterStatus === 'APPROVED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1">{approvedCount}</div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setFilterStatus('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'REJECTED'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white/80 border-slate-200/80 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={filterStatus === 'REJECTED' ? 'text-rose-100' : 'text-rose-600'}>Ditolak</span>
            <XCircle className={`w-3.5 h-3.5 ${filterStatus === 'REJECTED' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Menunggu ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Diluluskan ({approvedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('REJECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Ditolak ({rejectedCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tajuk, wakil, no telefon..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 3. Submissions Table / Cards List */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-black text-slate-900">
            Senarai Cadangan Penganjur ({filteredSubmissions.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Pentadbir boleh menyemak, mengubah butiran dan meluluskan cadangan untuk terbit terus ke kalendar.
          </span>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-6 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Tiada cadangan event dijumpai</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filterStatus !== 'ALL' 
                ? `Tiada rekod dengan status "${filterStatus}". Cuba pilih penapis 'Semua'.`
                : 'Belum ada sebarang cadangan event dihantar oleh penganjur atau kelab melalui portal.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pr-3">Wakil & Penganjur</th>
                <th className="pb-3 px-3">Tajuk Acara & Kategori</th>
                <th className="pb-3 px-3">Tarikh / Mod</th>
                <th className="pb-3 px-3">Poster</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Dihantar Pada</th>
                <th className="pb-3 pl-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSubmissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Wakil & Penganjur */}
                  <td className="py-3.5 pr-3 align-top max-w-[200px]">
                    <div className="font-black text-slate-900 text-xs flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{sub.submitterName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <a
                        href={`https://wa.me/${formatMalaysiaWhatsAppNumber(sub.submitterPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline font-bold"
                      >
                        {sub.submitterPhone}
                      </a>
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold mt-0.5 truncate">
                      🏛️ {sub.organiser}
                    </div>
                    {sub.submitterRole && (
                      <div className="text-[10px] text-slate-400 italic">
                        {sub.submitterRole}
                      </div>
                    )}
                  </td>

                  {/* Tajuk Acara & Kategori */}
                  <td className="py-3.5 px-3 align-top max-w-[260px]">
                    <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                      {sub.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${getCategoryBadgeClass(sub.category)}`}>
                        {sub.category}
                      </span>
                      {sub.eventType === 'ONGOING_PROGRAM' ? (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-extrabold flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          <span>Program Berkala</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold">
                          Acara Sekali
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tarikh / Mod */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap text-slate-700">
                    <div className="font-bold text-[11px]">
                      {sub.eventType === 'ONGOING_PROGRAM'
                        ? (sub.scheduleSummary || 'Jadual Berkala')
                        : (sub.date ? formatDateDMY(sub.date) : '-')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {sub.eventMode === 'online' ? '🌐 Online' : `🏢 ${sub.location}`}
                    </div>
                  </td>

                  {/* Poster Thumbnail */}
                  <td className="py-3.5 px-3 align-top">
                    {sub.image ? (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(sub.image || null)}
                        className="group relative block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer"
                        title="Klik untuk lihat poster penuh"
                      >
                        <img src={sub.image} alt={sub.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Tiada Poster</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    {sub.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Menunggu Semakan</span>
                      </span>
                    )}
                    {sub.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Diluluskan</span>
                      </span>
                    )}
                    {sub.status === 'REJECTED' && (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Ditolak</span>
                        </span>
                        {sub.rejectionReason && (
                          <p className="text-[10px] text-rose-600 max-w-[140px] truncate" title={sub.rejectionReason}>
                            Alasan: {sub.rejectionReason}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Dihantar Pada */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap text-[10px] text-slate-500">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('ms-MY', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : '-'}
                  </td>

                  {/* Tindakan Buttons */}
                  <td className="py-3.5 pl-3 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* Review & Approve Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenReview(sub)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                          sub.status === 'PENDING'
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title={sub.status === 'PENDING' ? "Semak dan luluskan cadangan acara ini" : "Lihat butiran"}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{sub.status === 'PENDING' ? 'Semak & Luluskan' : 'Semak Semula'}</span>
                      </button>

                      {/* Reject Button (Only if PENDING) */}
                      {sub.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => setRejectModalSub(sub)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                          title="Tolak cadangan ini"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmSub(sub)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Padam rekod cadangan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: SEMAK & LULUSKAN CADANGAN (REVIEW & APPROVE) */}
      {/* ============================================================ */}
      {reviewModalSub && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (!isApproving) setReviewModalSub(null);
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
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <span>Semakan & Kelulusan Cadangan Event</span>
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Cadangan daripada: <span className="font-bold text-white">{reviewModalSub.submitterName}</span> ({reviewModalSub.organiser})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isApproving}
                onClick={() => setReviewModalSub(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleApproveFormSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* Submitter Quick Summary Callout */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Maklumat Pemohon:</span>
                  <div className="font-bold text-slate-900">{reviewModalSub.submitterName} ({reviewModalSub.organiser})</div>
                  <div className="text-[11px] text-slate-500 font-mono">WhatsApp: {reviewModalSub.submitterPhone}</div>
                </div>
                <a
                  href={`https://wa.me/${formatMalaysiaWhatsAppNumber(reviewModalSub.submitterPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Hubungi Wakil di WhatsApp</span>
                </a>
              </div>

              {/* Core Event Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tajuk Event Rasmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={revTitle}
                    onChange={(e) => setRevTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Acara <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={revCategory}
                    onChange={(e) => setRevCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penganjur / Kelab <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={revOrganiser}
                    onChange={(e) => setRevOrganiser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarikh Acara <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={revDate}
                    onChange={(e) => setRevDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Kampus / Platform <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={revLocation}
                    onChange={(e) => setRevLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mod Acara
                  </label>
                  <select
                    value={revEventMode}
                    onChange={(e) => setRevEventMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="physical">🏢 Fizikal di Kampus</option>
                    <option value="online">🌐 Atas Talian / Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kaedah Pendaftaran
                  </label>
                  <select
                    value={revRegistrationMode}
                    onChange={(e) => setRevRegistrationMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="none">Terbuka / Walk-in (Tiada Pendaftaran)</option>
                    <option value="admin">Borang Portal KPMBP (Slip WhatsApp)</option>
                    <option value="google_form">Pautan Google Form / Pautan Luar</option>
                  </select>
                </div>

                {revRegistrationMode === 'google_form' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pautan Google Form / Rasmi Penganjur
                    </label>
                    <input
                      type="url"
                      value={revRegistrationUrl}
                      onChange={(e) => setRevRegistrationUrl(e.target.value)}
                      placeholder="https://forms.gle/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                {revRegistrationMode === 'admin' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. WhatsApp Penganjur untuk Terima Pendaftaran
                    </label>
                    <input
                      type="text"
                      value={revOrganiserWhatsApp}
                      onChange={(e) => setRevOrganiserWhatsApp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Penerangan Acara <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={revDescription}
                    onChange={(e) => setRevDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Poster Acara (URL atau Data URL)
                  </label>
                  <input
                    type="text"
                    value={revImage}
                    onChange={(e) => setRevImage(e.target.value)}
                    placeholder="https://example.com/poster.jpg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => setReviewModalSub(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menerbitkan Acara...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Luluskan & Terbitkan Acara</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: TOLAK CADANGAN (REJECT REASON) */}
      {/* ============================================================ */}
      {rejectModalSub && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => {
            if (!isRejecting) setRejectModalSub(null);
          }}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Tolak Cadangan Event?
              </h3>
              <p className="text-xs text-slate-500">
                Cadangan untuk "{rejectModalSub.title}" akan ditandakan sebagai ditolak.
              </p>
            </div>

            <form onSubmit={handleRejectFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-slate-400 font-normal">(Pilihan)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Cth: Bertindih dengan program institusi rasmi / Maklumat tidak lengkap..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={() => setRejectModalSub(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>Sahkan Penolakan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: PADAM REKOD CADANGAN (DELETE CONFIRMATION) */}
      {/* ============================================================ */}
      {deleteConfirmSub && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeleting) setDeleteConfirmSub(null);
          }}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Padam Rekod Cadangan?
              </h3>
              <p className="text-xs text-slate-500">
                Adakah anda pasti mahu memadam rekod cadangan "{deleteConfirmSub.title}"?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmSub(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Padam Rekod</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LIGHTBOX POSTER MODAL */}
      {/* ============================================================ */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-slate-700">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxImage} alt="Poster Penuh" className="max-w-full max-h-[80vh] object-contain rounded-2xl mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
};
