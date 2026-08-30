import { KpmbpEvent, EventStatus } from '../types';

/**
 * Checks whether an event is an Ongoing Programme.
 */
export function isOngoingProgram(event?: KpmbpEvent): boolean {
  return event?.eventType === 'ONGOING_PROGRAM';
}

/**
 * Normalizes time strings (e.g. '08:00 PM', '8:30 AM', '15:00', '8.30 pagi', '2:00 petang') into hours & minutes (24h).
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 8, minutes: 0 };
  
  const raw = timeStr.trim();
  const clean = raw.toLowerCase();
  
  // Detect 12-hour indicators (English & Malay)
  const isPM = clean.includes('pm') || clean.includes('petang') || clean.includes('malam');
  const isAM = clean.includes('am') || clean.includes('pagi');

  // Extract hours and minutes
  const match = clean.match(/(\d{1,2})(?:[:.](\d{2}))?/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;

    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }

    return { 
      hours: isNaN(hours) ? 8 : Math.min(Math.max(hours, 0), 23), 
      minutes: isNaN(minutes) ? 0 : Math.min(Math.max(minutes, 0), 59) 
    };
  }

  return { hours: 8, minutes: 0 };
}

/**
 * Calculates the exact start timestamp of an event (Physical or Online) using EVENT DATE + START TIME.
 */
export function getEventStartTimestamp(event: KpmbpEvent): number {
  try {
    if (!event.date) return Infinity;
    const parts = event.date.split('-').map((v) => parseInt(v, 10));
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return Infinity;
    }
    const [y, m, d] = parts;
    const { hours, minutes } = parseTimeString(event.startTime);
    const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
    const time = dt.getTime();
    return isNaN(time) ? Infinity : time;
  } catch {
    return Infinity;
  }
}

/**
 * Calculates the exact end timestamp of an event:
 * - Online: submissionDeadline timestamp (or end of date at 23:59:59)
 * - Physical: event date + endTime
 * - Ongoing Programme: 0 (No single end timestamp)
 */
export function getEventEndTimestamp(event: KpmbpEvent): number {
  try {
    // Ongoing programs do not have a fixed single end date timestamp
    if (isOngoingProgram(event)) {
      return 0;
    }

    const isOnline = event.eventMode === 'online';

    if (isOnline) {
      if (event.submissionDeadline) {
        const subTime = new Date(event.submissionDeadline).getTime();
        if (!isNaN(subTime)) return subTime;
      }
      if (event.registrationDeadline) {
        const regTime = new Date(event.registrationDeadline).getTime();
        if (!isNaN(regTime)) return regTime;
      }
      // Fallback: 23:59 on event date
      if (event.date) {
        const [y, m, d] = event.date.split('-').map((v) => parseInt(v, 10));
        return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      }
      return 0;
    }

    // Physical Event
    if (!event.date) return 0;
    const [y, m, d] = event.date.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return 0;

    const { hours, minutes } = parseTimeString(event.endTime || '17:00');
    const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
    return dt.getTime();
  } catch {
    return 0;
  }
}

/**
 * Auto-Archive timestamp: Event end + 1 hour (3600000 ms)
 */
export function getEventArchiveTimestamp(event: KpmbpEvent): number {
  if (isOngoingProgram(event)) return 0;
  const endTime = getEventEndTimestamp(event);
  if (!endTime) return 0;
  return endTime + 1 * 60 * 60 * 1000; // +1 hour
}

/**
 * Checks if an event is archived (+1 hour after completion).
 */
export function isEventArchived(event: KpmbpEvent, nowTimestamp = Date.now()): boolean {
  if (event.status === 'Cancelled' || event.status === 'Archived' || event.status === 'Completed') return true;
  
  // Ongoing Program: Only archived if manually marked Archived or Cancelled
  if (isOngoingProgram(event)) {
    return false;
  }

  const archiveTime = getEventArchiveTimestamp(event);
  if (!archiveTime) {
    if (event.date) {
      const parts = event.date.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const endOfDay = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
        return nowTimestamp >= endOfDay;
      }
    }
    return false;
  }
  return nowTimestamp >= archiveTime;
}

/**
 * Computes dynamic live status based on real-time clock.
 */
export function getDynamicEventStatus(event: KpmbpEvent, nowTimestamp = Date.now()): EventStatus {
  if (event.status === 'Cancelled') return 'Cancelled';
  if (event.status === 'Fully Booked') return 'Fully Booked';

  // Ongoing Program: Controlled manually via status (Default 'Registration Open')
  if (isOngoingProgram(event)) {
    if (event.status === 'Registration Closed' || event.status === 'Completed' || event.status === 'Archived' || event.status === 'Ongoing') {
      return event.status;
    }
    return 'Registration Open';
  }

  const isArchived = isEventArchived(event, nowTimestamp);
  if (isArchived) return 'Archived';

  const startTime = getEventStartTimestamp(event);
  const endTime = getEventEndTimestamp(event);

  // If No Registration Required (e.g. Pasar Malam, Pameran, Taklimat Terbuka)
  if (event.registrationMode === 'none') {
    if (nowTimestamp >= endTime) {
      return 'Completed';
    }
    if (nowTimestamp >= startTime && nowTimestamp < endTime) {
      return 'Ongoing';
    }
    return 'Upcoming';
  }

  // Online Event Status Logic (with registration)
  if (event.eventMode === 'online') {
    if (nowTimestamp >= endTime) {
      return 'Completed';
    }
    if (event.registrationDeadline) {
      const regDeadline = new Date(event.registrationDeadline).getTime();
      if (nowTimestamp > regDeadline) {
        return 'Registration Closed';
      }
      const hoursLeft = (regDeadline - nowTimestamp) / (1000 * 60 * 60);
      if (hoursLeft <= 24 && hoursLeft > 0) {
        return 'Registration Closing Soon';
      }
    }
    if (startTime && nowTimestamp >= startTime && nowTimestamp < endTime) {
      return 'Ongoing';
    }
    return 'Registration Open';
  }

  // Physical Event Status Logic (with registration)
  if (nowTimestamp >= endTime) {
    return 'Completed';
  }
  if (nowTimestamp >= startTime && nowTimestamp < endTime) {
    return 'Ongoing';
  }
  if (event.registrationDeadline) {
    const regDeadline = new Date(event.registrationDeadline).getTime();
    if (nowTimestamp > regDeadline) {
      return 'Registration Closed';
    }
    const hoursLeft = (regDeadline - nowTimestamp) / (1000 * 60 * 60);
    if (hoursLeft <= 24 && hoursLeft > 0) {
      return 'Registration Closing Soon';
    }
  }

  return 'Registration Open';
}

/**
 * Cleans phone number to standard international WhatsApp format without spaces/dashes (e.g. 60123456789).
 */
export function normalizeWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.slice(1);
  } else if (!cleaned.startsWith('60') && cleaned.length >= 9) {
    cleaned = '60' + cleaned;
  }
  return cleaned;
}

/**
 * Builds standard WhatsApp deep link for sending registration details to the organizer.
 */
export function buildRegistrationWhatsAppUrl(params: {
  organiserWhatsApp?: string;
  eventTitle: string;
  studentName: string;
  studentId: string;
  programCode: string;
  email: string;
  phone: string;
  timestamp: string;
}): string {
  const number = normalizeWhatsAppNumber(params.organiserWhatsApp);
  const text = `*PENDAFTARAN EVENT KPMBP*\n\n*Event:* ${params.eventTitle}\n*Nama Peserta:* ${params.studentName}\n*No. Matrik / ID:* ${params.studentId}\n*Program:* ${params.programCode}\n*Email:* ${params.email}\n*No. Telefon:* ${params.phone}\n*Masa Pendaftaran:* ${params.timestamp}\n\n_Dihantar melalui Portal Rasmi Acara KPMBP_`;

  if (!number) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function getEventShareText(event: KpmbpEvent): string {
  const isOngoing = isOngoingProgram(event);
  const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#event-${event.id}` : '';

  if (isOngoing) {
    let text = `📌 *${event.title}*\n`;
    text += `🏷️ *Kategori:* ${event.category}\n`;
    text += `🔄 *Jenis:* Program Berterusan\n`;
    
    if (event.scheduleSummary) {
      text += `🗓️ *Jadual:* ${event.scheduleSummary}\n`;
    }

    if (event.scheduleSessions && event.scheduleSessions.length > 0) {
      text += `\n📋 *Sesi & Waktu:*\n`;
      event.scheduleSessions.forEach((s) => {
        const modeLabel = s.mode === 'online' ? '🌐 Online' : s.mode === 'hybrid' ? '🔄 Hybrid' : '📍 Fizikal';
        text += `• ${s.day} (${s.time}) [${modeLabel}]${s.activity ? `: ${s.activity}` : ''}\n`;
      });
      text += `\n`;
    }

    text += `📍 *Kaedah / Lokasi:* ${event.location || 'KPM Beranang (KPMBP)'}\n`;
    
    if (event.programDuration) {
      text += `⏳ *Tempoh Program:* ${event.programDuration}\n`;
    }

    if (event.feeType === 'free') {
      text += `💰 *Penyertaan:* Percuma\n`;
    } else if (event.feeType === 'voluntary') {
      text += `💰 *Sumbangan:* Sukarela / Infaq Ikhlas\n`;
    } else if (event.feeAmount) {
      text += `💰 *Yuran:* ${event.feeAmount}\n`;
    }

    text += `👤 *Anjuran:* ${event.organiser}\n`;
    if (event.targetAudience || event.eligibility) {
      text += `👥 *Sasaran:* ${event.targetAudience || event.eligibility}\n`;
    }

    if (event.registrationMode === 'none') {
      text += `🎟️ *Pendaftaran:* Terbuka / Masuk Terus\n`;
    } else if (event.registrationMode === 'google_form' && event.registrationUrl) {
      text += `📝 *Borang Pendaftaran:* ${event.registrationUrl}\n`;
    } else if (event.registrationMode === 'admin') {
      text += `📝 *Pendaftaran:* Melalui Urusetia KPMBP\n`;
      if (event.organiserWhatsApp) {
        text += `📱 *WhatsApp Urusetia:* https://wa.me/${event.organiserWhatsApp.replace(/\D/g, '')}\n`;
      }
    }

    if (event.description) {
      text += `\n📄 *Keterangan Program:*\n${event.description}\n`;
    }

    if (event.contact) {
      text += `\n📞 *Hubungi:* ${event.contact}\n`;
    }

    if (event.organiserUrl) {
      text += `🌐 *Laman Rasmi:* ${event.organiserUrl}\n`;
    }

    if (url) {
      text += `\n🔗 *Maklumat Penuh:* ${url}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Portal Rasmi Acara KPMBP - © 2026 EVENT KPMBP_`;
    return text;
  }

  // ONE_TIME_EVENT
  const { full: fullDateMalay } = formatDateMalay(event.date);
  const isOnline = event.eventMode === 'online';

  let text = `📌 *${event.title}*\n`;
  text += `🏷️ *Kategori:* ${event.category}\n`;
  text += `📅 *Tarikh:* ${fullDateMalay}\n`;

  if (isOnline) {
    text += `🌐 *Mod:* Atas Talian (Online)\n`;
    if (event.submissionDeadline) {
      text += `⏳ *Tarikh Akhir Penyerahan:* ${formatDateDMY(event.submissionDeadline.split('T')[0])}\n`;
    }
  } else {
    text += `🕒 *Masa:* ${event.startTime || ''}${event.endTime ? ` - ${event.endTime}` : ''}\n`;
    text += `📍 *Lokasi:* ${event.location || 'KPM Beranang (KPMBP)'}\n`;
  }

  text += `👤 *Anjuran:* ${event.organiser}\n`;
  if (event.eligibility) {
    text += `👥 *Kelayakan:* ${event.eligibility}\n`;
  }
  text += `🎖️ *Merit:* Disediakan (MARA Merit)\n`;

  if (event.registrationMode === 'none') {
    text += `🎟️ *Pendaftaran:* Terbuka / Masuk Percuma (Walk-in)\n`;
  } else if (event.registrationMode === 'google_form' && event.registrationUrl) {
    text += `📝 *Borang Daftar:* ${event.registrationUrl}\n`;
    if (event.registrationDeadline) {
      const deadlineDateOnly = event.registrationDeadline.split('T')[0];
      text += `⏰ *Tarikh Tutup:* ${formatDateDMY(deadlineDateOnly)}\n`;
    }
  } else if (event.registrationMode === 'admin') {
    text += `📝 *Pendaftaran:* Melalui Urusetia KPMBP\n`;
    if (event.organiserWhatsApp) {
      text += `📱 *WhatsApp Urusetia:* https://wa.me/${event.organiserWhatsApp.replace(/\D/g, '')}\n`;
    }
    if (event.registrationDeadline) {
      const deadlineDateOnly = event.registrationDeadline.split('T')[0];
      text += `⏰ *Tarikh Tutup:* ${formatDateDMY(deadlineDateOnly)}\n`;
    }
  }

  if (event.seatsLeft !== undefined && event.registrationMode !== 'none') {
    text += `⚡ *Baki Slot:* ${event.seatsLeft} tempat sahaja lagi\n`;
  }

  if (event.description) {
    text += `\n📄 *Keterangan Ringkas:*\n${event.description}\n`;
  }

  if (event.contact) {
    text += `\n📞 *Hubungi:* ${event.contact}\n`;
  }

  if (event.organiserUrl) {
    text += `🌐 *Laman Rasmi Penganjur:* ${event.organiserUrl}\n`;
  }

  if (url) {
    text += `\n🔗 *Maklumat Penuh & Kalendar:* ${url}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Portal Rasmi Acara KPMBP - © 2026 EVENT KPMBP_`;

  return text;
}

export function formatDateDMY(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}-${m}-${y}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function formatDeadlineMalay(deadlineStr?: string): string {
  if (!deadlineStr) return 'Sebelum 11:59 PM';
  try {
    if (deadlineStr.includes('T')) {
      const [datePart, timePart] = deadlineStr.split('T');
      const [y, m, d] = datePart.split('-');
      if (y && m && d) {
        const dmy = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
        let timeFormatted = timePart;
        const [hh, mm] = timePart.split(':');
        if (hh && mm) {
          let h = parseInt(hh, 10);
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          timeFormatted = `${String(h).padStart(2, '0')}:${mm} ${ampm}`;
        }
        return `${dmy}   ${timeFormatted}`;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
      const [y, m, d] = deadlineStr.split('-');
      return `${d}-${m}-${y}`;
    }

    const d = new Date(deadlineStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      return `${day}-${month}-${year}   ${timeStr}`;
    }
  } catch {
    // fallback
  }
  return deadlineStr;
}

export function formatDateMalay(dateStr?: string): { day: string; month: string; year: string; full: string; dmy: string } {
  if (!dateStr) {
    return { day: '', month: '', year: '', full: '', dmy: '' };
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { day: '--', month: '---', year: '----', full: dateStr, dmy: dateStr };
    }
    const monthsMalay = [
      'JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN',
      'JUL', 'OGOS', 'SEPT', 'OKT', 'NOV', 'DIS'
    ];
    const fullMonthsMalay = [
      'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
      'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
    ];
    
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthShort = monthsMalay[d.getMonth()];
    const monthFull = fullMonthsMalay[d.getMonth()];
    const year = String(d.getFullYear());

    return {
      day: dayNum,
      month: monthShort,
      year: year,
      full: `${dayNum} ${monthFull} ${year}`,
      dmy: `${dayNum}-${monthShort}-${year}`
    };
  } catch {
    return { day: '01', month: 'OGOS', year: '2026', full: dateStr, dmy: dateStr };
  }
}

/**
 * Calculates remaining human-readable countdown string in Malay from a timestamp.
 * Returns null if timestamp is in the past, invalid, or infinity.
 */
export function getTimeRemainingFromTimestampMalay(targetTimestamp?: number, nowTimestamp = Date.now()): string | null {
  if (!targetTimestamp || !isFinite(targetTimestamp)) return null;
  const diff = targetTimestamp - nowTimestamp;
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 1) {
    return `Tinggal ${days} hari lagi!`;
  } else if (days === 1) {
    return 'Tinggal 1 hari lagi!';
  } else if (hours >= 1) {
    return `Tinggal ${hours} jam lagi!`;
  } else {
    const mins = Math.floor(diff / (1000 * 60));
    return `Tinggal ${mins} minit lagi!`;
  }
}

export function getTimeRemainingMalay(deadlineIsoStr?: string, nowTimestamp = Date.now()): string | null {
  if (!deadlineIsoStr) return null;
  const deadline = new Date(deadlineIsoStr).getTime();
  if (isNaN(deadline)) return null;
  const diff = deadline - nowTimestamp;

  if (diff <= 0) return 'Pendaftaran telah ditutup';

  return getTimeRemainingFromTimestampMalay(deadline, nowTimestamp);
}

export function getGoogleCalendarUrl(event: KpmbpEvent): string {
  const title = encodeURIComponent(`[KPMBP] ${event.title}`);
  const details = encodeURIComponent(`${event.description}\n\n📍 Lokasi: ${event.location}\n👤 Anjuran: ${event.organiser}\n🔗 Info: https://eventkpmbp.syncrozz.com`);
  const location = encodeURIComponent(event.location);

  // Parse YYYY-MM-DD
  const dateStr = event.date || new Date().toISOString().split('T')[0];
  const dateParts = dateStr.split('-');
  const year = dateParts[0] || '2026';
  const month = dateParts[1] || '08';
  const day = dateParts[2] || '20';

  const startDateStr = `${year}${month}${day}T080000Z`;
  const endDateStr = `${year}${month}${day}T100000Z`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDateStr}/${endDateStr}`;
}

export function downloadIcsFile(event: KpmbpEvent) {
  const dateClean = (event.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KPMBP Event Hub//Malay Calendar//MY',
    'BEGIN:VEVENT',
    `SUMMARY:KPMBP - ${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    `DTSTART:${dateClean}T080000Z`,
    `DTEND:${dateClean}T100000Z`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Primary event sorting timestamp based on EVENT DATE + START TIME.
 */
export function getEventSortingTimestamp(event: KpmbpEvent): number {
  if (event.date) {
    const parts = event.date.split('-').map((v) => parseInt(v, 10));
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const [y, m, d] = parts;
      const { hours, minutes } = parseTimeString(event.startTime);
      const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
      const time = dt.getTime();
      if (!isNaN(time)) return time;
    }
  }

  // Fallback for ongoing programs or events without a fixed single date
  if (event.registrationDeadline) {
    const deadlineTime = new Date(event.registrationDeadline).getTime();
    if (!isNaN(deadlineTime)) return deadlineTime;
  }

  return Infinity;
}

export function getEventDueTimestamp(event: KpmbpEvent): number {
  return getEventSortingTimestamp(event);
}

/**
 * Sorts events strictly by EVENT DATE + START TIME in ascending order (paling hampir -> paling jauh).
 */
export function sortEventsByNearestDue(events: KpmbpEvent[]): KpmbpEvent[] {
  return [...events].sort((a, b) => {
    const timeA = getEventSortingTimestamp(a);
    const timeB = getEventSortingTimestamp(b);
    return timeA - timeB;
  });
}

/**
 * Returns pastel style classes for category filter buttons.
 */
export function getCategoryButtonClass(category: string, isSelected: boolean): string {
  if (isSelected) {
    switch (category) {
      case 'Pertandingan':
        return 'bg-orange-500 text-white shadow-xs border-orange-600 font-bold';
      case 'Program Pelajar':
        return 'bg-pink-500 text-white shadow-xs border-pink-600 font-bold';
      case 'Sukan':
        return 'bg-cyan-600 text-white shadow-xs border-cyan-700 font-bold';
      case 'Kebudayaan':
        return 'bg-sky-500 text-white shadow-xs border-sky-600 font-bold';
      case 'Akademik':
        return 'bg-amber-400 text-amber-950 shadow-xs border-amber-500 font-black';
      case 'Bengkel':
        return 'bg-purple-500 text-white shadow-xs border-purple-600 font-bold';
      case 'Kelab & Persatuan':
        return 'bg-teal-600 text-white shadow-xs border-teal-700 font-bold';
      case 'Kerjaya':
        return 'bg-indigo-600 text-white shadow-xs border-indigo-700 font-bold';
      case 'Institusi':
        return 'bg-violet-600 text-white shadow-xs border-violet-700 font-bold';
      case 'Semua':
        return 'bg-slate-800 text-white shadow-xs border-slate-900 font-bold';
      default:
        return 'bg-slate-700 text-white shadow-xs border-slate-800 font-bold';
    }
  }

  // Inactive pastel states
  switch (category) {
    case 'Pertandingan':
      return 'bg-orange-100/90 text-orange-950 border border-orange-300/80 hover:bg-orange-200/90 hover:border-orange-400';
    case 'Program Pelajar':
      return 'bg-pink-100/90 text-pink-950 border border-pink-300/80 hover:bg-pink-200/90 hover:border-pink-400';
    case 'Sukan':
      return 'bg-cyan-100/90 text-cyan-950 border border-cyan-300/80 hover:bg-cyan-200/90 hover:border-cyan-400';
    case 'Kebudayaan':
      return 'bg-sky-100/90 text-sky-950 border border-sky-300/80 hover:bg-sky-200/90 hover:border-sky-400';
    case 'Akademik':
      return 'bg-amber-100/90 text-amber-950 border border-amber-300/80 hover:bg-amber-200/90 hover:border-amber-400';
    case 'Bengkel':
      return 'bg-purple-100/90 text-purple-950 border border-purple-300/80 hover:bg-purple-200/90 hover:border-purple-400';
    case 'Kelab & Persatuan':
      return 'bg-teal-100/90 text-teal-950 border border-teal-300/80 hover:bg-teal-200/90 hover:border-teal-400';
    case 'Kerjaya':
      return 'bg-indigo-100/90 text-indigo-950 border border-indigo-300/80 hover:bg-indigo-200/90 hover:border-indigo-400';
    case 'Institusi':
      return 'bg-violet-100/90 text-violet-950 border border-violet-300/80 hover:bg-violet-200/90 hover:border-violet-400';
    case 'Semua':
      return 'bg-white/80 text-slate-700 border border-slate-200/90 hover:bg-white hover:border-slate-300';
    default:
      return 'bg-slate-100/80 text-slate-700 border border-slate-200 hover:bg-slate-200';
  }
}

/**
 * Returns pastel style classes for event pills/divs inside calendar date cells.
 */
export function getCalendarEventPillClass(category: string): string {
  switch (category) {
    case 'Pertandingan':
      return 'bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300/90';
    case 'Program Pelajar':
      return 'bg-pink-100 hover:bg-pink-200 text-pink-950 border border-pink-300/90';
    case 'Sukan':
      return 'bg-cyan-100 hover:bg-cyan-200 text-cyan-950 border border-cyan-300/90';
    case 'Kebudayaan':
      return 'bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300/90';
    case 'Akademik':
      return 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/90';
    case 'Bengkel':
      return 'bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300/90';
    case 'Kelab & Persatuan':
      return 'bg-teal-100 hover:bg-teal-200 text-teal-950 border border-teal-300/90';
    case 'Kerjaya':
      return 'bg-indigo-100 hover:bg-indigo-200 text-indigo-950 border border-indigo-300/90';
    case 'Institusi':
      return 'bg-violet-100 hover:bg-violet-200 text-violet-950 border border-violet-300/90';
    default:
      return 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/90';
  }
}

/**
 * Returns striking pastel yellow style classes for category badges across cards, modals, and tables.
 */
export function getCategoryBadgeClass(_category?: string): string {
  // Radiant Pastel Yellow theme: high visibility, warm contrast, crisp dark amber text
  return 'bg-amber-100/95 text-amber-950 border border-amber-300/90 shadow-2xs font-extrabold';
}

/**
 * Returns striking Pastel Yellow badge styling for Date displays (e.g. 20 Ogos, date badges, date boxes).
 */
export function getDateBadgeClass(): string {
  return 'bg-amber-100/95 text-amber-950 border border-amber-300 shadow-2xs font-black';
}
