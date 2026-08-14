import React, { useState, useEffect } from 'react';
import { KpmbpEvent, RegistrationRecord } from '../types';
import { formatDateMalay } from '../utils/calendar';
import { X, CheckCircle, Ticket, User, Mail, Phone, ExternalLink, QrCode, Download } from 'lucide-react';

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
  const [programCode, setProgramCode] = useState('DIT');
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
      studentName,
      studentId: studentId.toUpperCase(),
      email,
      phone,
      programCode,
      timestamp: new Date().toISOString()
    };

    setSubmittedPass(newRecord);
    onSuccess(newRecord);
  };

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

          <span className="inline-block px-2.5 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider mb-2">
            Pendaftaran Event KPMBP
          </span>

          <h3 className="text-xl font-extrabold leading-snug">
            {event.title}
          </h3>
          <p className="text-xs text-indigo-100 mt-1">
            📅 {fullDateMalay} • 📍 {event.location}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {submittedPass ? (
            /* Registration Pass Confirmation View */
            <div className="space-y-4 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">Pendaftaran Berjaya!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slip pendaftaran digital anda telah dijana.
                </p>
              </div>

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
                    <span>Imbas QR semasa pendaftaran masuk</span>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Cetak
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Selesai
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {event.registrationUrl && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900 flex items-center justify-between mb-2">
                  <span>Acara ini mempunyai pautan Google Form rasmi:</span>
                  <a 
                    href={event.registrationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-bold text-indigo-700 underline flex items-center gap-1 shrink-0"
                  >
                    Buka Google Form <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

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
                    placeholder="DIT202488"
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
                    <option value="DIT">Diploma Sains Komputer (DIT)</option>
                    <option value="DIA">Diploma Perakaunan (DIA)</option>
                    <option value="DBM">Diploma Pengurusan Perniagaan (DBM)</option>
                    <option value="DIB">Diploma Perbankan Islam (DIB)</option>
                    <option value="STAF">Staf / Pensyarah KPMBP</option>
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
                    placeholder="amirul@student.kpmbp.edu.my"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. Telefon WhatsApp
                </label>
                <div className="relative">
                  <input
                    type="tel"
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 transition-all"
                >
                  Sahkan & Jana Pas Pendaftaran
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
