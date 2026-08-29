import { RegistrationRecord } from '../types';

/**
 * Normalizes any phone number into Malaysian international format (wa.me/6...)
 * e.g.:
 * '012-345 6789' -> '60123456789'
 * '+6012-3456789' -> '60123456789'
 * '60123456789' -> '60123456789'
 * '0111234567' -> '60111234567'
 */
export function formatMalaysiaWhatsAppNumber(phone: string): string {
  if (!phone) return '60';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('60')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '6' + cleaned;
  }
  if (cleaned.startsWith('6')) {
    return cleaned;
  }
  return '60' + cleaned;
}

/**
 * Generates an official pre-filled WhatsApp verification message containing full registration details
 */
export function generateRegistrationWhatsAppMessage(reg: RegistrationRecord, customEventTitle?: string): string {
  const eventName = customEventTitle || reg.eventTitle || 'Acara Rasmi KPMBP';
  
  return `Assalamualaikum & Salam Sejahtera *${reg.studentName}*,

Pihak Urusetia *EVENT KPMBP (Kolej Profesional MARA Bandar Penawar)* ingin membuat pengesahan rekod pendaftaran anda bagi program berikut:

📋 *MAKLUMAT PENDAFTARAN PESERTA:*
• *Kod Pas / ID:* ${reg.id}
• *Nama Penuh:* ${reg.studentName}
• *No. Matrik / Pelajar:* ${reg.studentId}
• *Program / Kursus:* ${reg.programCode}
• *Program / Acara:* ${eventName}
• *No. Telefon:* ${reg.phone}
• *Emel Rasmi:* ${reg.email || '-'}
• *Tarikh & Masa Pendaftaran:* ${reg.timestamp || '-'}

Mohon kerjasama anda untuk membalas mesej ini bagi mengesahkan maklumat pendaftaran dan status kehadiran anda ke sesi program tersebut.

Sekian, terima kasih.
_Urusetia EVENT KPMBP_`;
}

/**
 * Returns full direct wa.me URL with wa.me/6... and URL-encoded verification text
 */
export function generateRegistrationWhatsAppUrl(reg: RegistrationRecord, customEventTitle?: string): string {
  const phone = formatMalaysiaWhatsAppNumber(reg.phone);
  const message = generateRegistrationWhatsAppMessage(reg, customEventTitle);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
