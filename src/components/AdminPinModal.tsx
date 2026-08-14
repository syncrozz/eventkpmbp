import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert, KeyRound, X } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError(false);
      setErrorMessage('');
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(false);

    // Auto focus next input
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // If 4 digits filled, check automatically
    if (digit && index === 3 && newPin.every((d) => d !== '')) {
      verifyPin(newPin.join(''));
    }
  };

  const handleInputKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const verifyPin = (enteredPin: string) => {
    // Correct PIN is 5313
    if (enteredPin === '5313') {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setErrorMessage('PIN Keselamatan Salah! Sila cuba lagi.');
      setPin(['', '', '', '']);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin(pin.join(''));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          {/* Lock Icon Badge */}
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-indigo-600 to-slate-900 rounded-2xl flex items-center justify-center text-amber-400 shadow-lg shadow-indigo-200">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Akses Admin Mode
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Sila masukkan 4-digit PIN keselamatan untuk mengubah atau memadamkan sebarang event.
            </p>
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div className="flex justify-center items-center gap-3">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleInputKeyDown(idx, e)}
                  className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                    error
                      ? 'border-rose-500 bg-rose-50 text-rose-700 animate-shake'
                      : digit
                      ? 'border-indigo-600 bg-indigo-50/50 text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-extrabold text-xs shadow-md shadow-slate-300 transition-all flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Sahkan PIN</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
