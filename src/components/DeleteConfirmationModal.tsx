import React from 'react';
import { KpmbpEvent } from '../types';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { formatDateDMY } from '../utils/calendar';

interface DeleteConfirmationModalProps {
  event: KpmbpEvent | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  event,
  isOpen,
  isDeleting,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">
            Padamkan Acara Ini?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tindakan ini akan memadamkan acara daripada paparan umum dan pangkalan data awan Firebase.
          </p>
        </div>

        {/* Target Event Preview Box */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-3">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
              {event.category.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-xs text-slate-900 truncate">
              {event.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>{formatDateDMY(event.date)}</span>
              <span>•</span>
              <span className="truncate">{event.organiser}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-amber-900 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Acara yang dipadam tidak dapat dipulihkan semula kecuali jika dicipta semula secara manual atau dimuat semula melalui data contoh.
          </span>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memadam...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Ya, Padam Sekarang</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
