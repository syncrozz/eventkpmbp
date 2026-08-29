/**
 * Form Masking, Normalization & Validation Utility for EVENT KPMBP
 * Principle: "USER MASUKKAN DATA, SISTEM URUSKAN FORMAT."
 */

/**
 * 1. NAMA / NAMA PENUH
 * Converts to UPPERCASE and cleans whitespace while respecting active typing.
 */
export function maskFullNameLive(value: string): string {
  if (!value) return '';
  // Convert to UPPERCASE and collapse 2+ consecutive spaces to a single space
  return value.toUpperCase().replace(/\s{2,}/g, ' ');
}

export function normalizeFullName(value: string): string {
  if (!value) return '';
  return value
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateFullName(name: string): { isValid: boolean; error?: string } {
  const normalized = normalizeFullName(name);
  if (!normalized) {
    return { isValid: false, error: 'Sila masukkan nama penuh peserta.' };
  }
  if (normalized.length < 3) {
    return { isValid: false, error: 'Nama peserta terlalu pendek (minimum 3 huruf).' };
  }
  return { isValid: true };
}

/**
 * 2. ID PELAJAR / MATRIK (Format: XXX-XXXX-XXX)
 * Example: pda2502011 -> PDA-2502-011
 * Regex: ^[A-Z]{3}-[0-9]{4}-[0-9]{3}$
 */
export function maskStudentId(value: string): string {
  if (!value) return '';

  // Strip anything that is not alphanumeric
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
  
  if (clean.length === 0) return '';

  const part1 = clean.slice(0, 3);
  const part2 = clean.slice(3, 7);
  const part3 = clean.slice(7, 10);

  // If user typed hyphen explicitly at boundary, preserve it
  if (clean.length === 3 && value.endsWith('-')) {
    return `${part1}-`;
  }
  if (clean.length === 7 && value.endsWith('-')) {
    return `${part1}-${part2}-`;
  }

  if (part3.length > 0) {
    return `${part1}-${part2}-${part3}`;
  }
  if (part2.length > 0) {
    return `${part1}-${part2}`;
  }
  return part1;
}

export function normalizeStudentId(value: string): string {
  return maskStudentId(value);
}

export function validateStudentId(id: string): { isValid: boolean; error?: string } {
  const normalized = normalizeStudentId(id);
  const regex = /^[A-Z]{3}-[0-9]{4}-[0-9]{3}$/;
  
  if (!normalized) {
    return { isValid: false, error: 'Sila masukkan No. Matrik / ID Pelajar.' };
  }
  
  if (!regex.test(normalized)) {
    return { 
      isValid: false, 
      error: 'Format ID Pelajar tidak sah. Sila gunakan format XXX-XXXX-XXX (Contoh: PDA-2502-011).' 
    };
  }
  return { isValid: true };
}

/**
 * 3. NO. KAD PENGENALAN / NO. ISI / NO. IC (Format: XXXXXX-XX-XXXX)
 * Example: 861115465305 -> 861115-46-5305
 * Regex: ^[0-9]{6}-[0-9]{2}-[0-9]{4}$
 */
export function maskIcNumber(value: string): string {
  if (!value) return '';

  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length === 0) return '';

  const part1 = digits.slice(0, 6);
  const part2 = digits.slice(6, 8);
  const part3 = digits.slice(8, 12);

  if (digits.length === 6 && value.endsWith('-')) {
    return `${part1}-`;
  }
  if (digits.length === 8 && value.endsWith('-')) {
    return `${part1}-${part2}-`;
  }

  if (part3.length > 0) {
    return `${part1}-${part2}-${part3}`;
  }
  if (part2.length > 0) {
    return `${part1}-${part2}`;
  }
  return part1;
}

export function normalizeIcNumber(value: string): string {
  return maskIcNumber(value);
}

export function validateIcNumber(ic: string): { isValid: boolean; error?: string } {
  const normalized = normalizeIcNumber(ic);
  const regex = /^[0-9]{6}-[0-9]{2}-[0-9]{4}$/;

  if (!normalized) {
    return { isValid: false, error: 'Sila masukkan No. Kad Pengenalan / No. ISI.' };
  }

  if (!regex.test(normalized)) {
    return {
      isValid: false,
      error: 'Format No. Kad Pengenalan tidak sah. Sila gunakan format XXXXXX-XX-XXXX (Contoh: 861115-46-5305).'
    };
  }
  return { isValid: true };
}

/**
 * 4. NO. TELEFON (Format mengikut prefix Malaysia: 014-5313756 atau 6014-5313756)
 * Example:
 * 0145313756 -> 014-5313756
 * 60145313756 -> 6014-5313756
 * 01112345678 -> 011-12345678
 * 601112345678 -> 6011-12345678
 */
export function maskPhoneNumber(value: string): string {
  if (!value) return '';

  // Preserve leading plus if present temporarily, extract digits
  const hasPlus = value.startsWith('+');
  let rawDigits = value.replace(/\D/g, '');

  if (rawDigits.length === 0) {
    return hasPlus ? '+' : '';
  }

  // Handle prefix 6011 vs 601X vs 011 vs 01X
  if (rawDigits.startsWith('6011')) {
    const pfx = rawDigits.slice(0, 4);
    const rest = rawDigits.slice(4, 12);
    if (rawDigits.length === 4 && value.endsWith('-')) return `${pfx}-`;
    return rest.length > 0 ? `${pfx}-${rest}` : pfx;
  }

  if (rawDigits.startsWith('601')) {
    const pfx = rawDigits.slice(0, 4);
    const rest = rawDigits.slice(4, 11);
    if (rawDigits.length === 4 && value.endsWith('-')) return `${pfx}-`;
    return rest.length > 0 ? `${pfx}-${rest}` : pfx;
  }

  if (rawDigits.startsWith('011')) {
    const pfx = rawDigits.slice(0, 3);
    const rest = rawDigits.slice(3, 11);
    if (rawDigits.length === 3 && value.endsWith('-')) return `${pfx}-`;
    return rest.length > 0 ? `${pfx}-${rest}` : pfx;
  }

  if (rawDigits.startsWith('01')) {
    const pfx = rawDigits.slice(0, 3);
    const rest = rawDigits.slice(3, 10);
    if (rawDigits.length === 3 && value.endsWith('-')) return `${pfx}-`;
    return rest.length > 0 ? `${pfx}-${rest}` : pfx;
  }

  // Other general numbers
  if (rawDigits.startsWith('0')) {
    const pfx = rawDigits.slice(0, 2);
    const rest = rawDigits.slice(2, 10);
    if (rawDigits.length === 2 && value.endsWith('-')) return `${pfx}-`;
    return rest.length > 0 ? `${pfx}-${rest}` : pfx;
  }

  return rawDigits.slice(0, 15);
}

export function normalizePhoneNumber(value: string): string {
  return maskPhoneNumber(value);
}

export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  const normalized = normalizePhoneNumber(phone);
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return { isValid: false, error: 'Sila masukkan nombor telefon WhatsApp.' };
  }

  if (digits.length < 9 || digits.length > 13) {
    return { 
      isValid: false, 
      error: 'Nombor telefon tidak sah. Sila masukkan nombor yang betul (Contoh: 014-5313756).' 
    };
  }
  return { isValid: true };
}

/**
 * 5. EMEL SISWA / RASMI
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const normalized = normalizeEmail(email);
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalized) {
    return { isValid: false, error: 'Sila masukkan alamat emel rasmi.' };
  }

  if (!regex.test(normalized)) {
    return { 
      isValid: false, 
      error: 'Alamat emel tidak sah. Sila masukkan format emel yang betul (Contoh: nama@gapps.kpm.edu.my).' 
    };
  }
  return { isValid: true };
}
