import React, { useState, useEffect } from 'react';
import { KpmbpEvent, RegistrationRecord } from '../types';
import { formatDateMalay, buildRegistrationWhatsAppUrl } from '../utils/calendar';
import { X, CheckCircle, Ticket, User, Mail, Phone, ExternalLink, QrCode, Download, MessageCircle, Send } from 'lucide-react';

interface RegistrationModalProps {
  event: KpmbpEvent | null;
  onClose: () => void;
  onSuccess: (record: RegistrationRecord) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  event,
  onClose,
  onSuccess
}) => {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [programCode, setProgramCode] = useState('DLM');
  const [submittedPass, setSubmittedPass] = useState<RegistrationRecord | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentId || !email) return;

    const newRecord: RegistrationRecord = {
      id: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
      eventId: event.id,
      eventTitle: event.title,
      studentName,
      studentId: studentId.toUpperCase(),
      email,
      phone,
      programCode,
      timestamp: new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' })
    };

    setSubmittedPass(newRecord);
    onSuccess(newRecord);
  };

  const whatsAppSubmissionUrl = submittedPass ? buildRegistrationWhatsAppUrl({
    organiserWhatsApp: event.organiserWhatsApp || event.contact,
    eventTitle: event.title,
    studentName: submittedPass.studentName,
    studentId: submittedPass.studentId,
    programCode: submittedPass.programCode,
    email: submittedPass.email,
    phone: submittedPass.phone,
    timestamp: submittedPass.timestamp
  }) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">
              {event.eventMode === 'online' ? '🌐 Pendaftaran Acara Online' : '🏛️ Pendaftaran Acara Fizikal'}
            </span>
            <span className="inline-block px-2 py-0.5 bg-emerald-500/80 rounded text-[10px] font-bold uppercase">
              Urusetia WhatsApp
            </span>
          </div>

          <h3 className="text-xl font-extrabold leading-snug">
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 font-extrabold shadow-2xs">
              📅 {fullDateMalay}
            </span>
            {event.eventMode === 'online' ? (
              <span className="text-xs text-indigo-100">⏰ Due: {event.submissionDeadline ? event.submissionDeadline.replace('T', ' ') : '23:59'}</span>
            ) : (
              <span className="text-xs text-indigo-100">📍 {event.location || 'Kampus KPMBP'}</span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {submittedPass ? (
            /* Registration Pass Confirmation View with WhatsApp Direct Action */
            <div className="space-y-4 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">Pendaftaran Berjaya Disimpan!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sila hantar ringkasan pendaftaran ini terus ke WhatsApp penganjur untuk pengesahan rekod.
                </p>
              </div>

              {/* Primary Action: Send to WhatsApp */}
              <a
                href={whatsAppSubmissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-2xl text-xs font-black shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all group"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                <span>Hantar Maklumat Pendaftaran ke WhatsApp Penganjur</span>
                <Send className="w-3.5 h-3.5" />
              </a>

              {/* Digital Pass Ticket */}
              <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl p-5 text-left relative overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-indigo-600" />
                    <span className="font-black text-xs text-slate-800 uppercase tracking-wide">
                      PAS DIGITAL KPMBP
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {submittedPass.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama Peserta</span>
                    <span className="font-bold text-slate-800">{submittedPass.studentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">No. Matrik / ID</span>
                    <span className="font-bold text-slate-800">{submittedPass.studentId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Program</span>
                    <span className="font-bold text-slate-800">{submittedPass.programCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Merit</span>
                    <span className="font-bold text-emerald-600">Layak MARA MERIT</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <QrCode className="w-8 h-8 text-slate-800" />
                    <span>Imbas QR semasa pengesahan</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Cetak
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Selesai & Tutup
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penuh Peserta *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Contoh: Muhammad Amirul Bin Rosli"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Matrik / ID Staf *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="PDA-2503-008"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Program / Kursus
                  </label>
                  <select
                    value={programCode}
                    onChange={(e) => setProgramCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Diploma in Logistik (DLM)">Diploma in Logistik (DLM)</option>
                    <option value="Diploma in Accounting (DIA)">Diploma in Accounting (DIA)</option>
                    <option value="Pra Diploma (PRA DIP)">Pra Diploma (PRA DIP)</option>
                    <option value="Staf / Pensyarah KPMBP">Staf / Pensyarah KPMBP</option>
                    <option value="Lain-Lain">Lain-Lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Emel Siswa / Rasmi *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amirul@bpenawar.kpm.edu.my"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. Telefon WhatsApp *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <span>Sahkan & Dapatkan Pautan WhatsApp</span>
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

