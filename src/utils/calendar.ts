import { KpmbpEvent, EventStatus } from '../types';

/**
 * Normalizes time strings (e.g. '08:00 PM', '8:30 AM', '20:30') into hours & minutes.
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 8, minutes: 0 };
  
  const clean = timeStr.trim();
  const match12 = clean.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return { hours: isNaN(hours) ? 8 : hours, minutes: isNaN(minutes) ? 0 : minutes };
  }

  return { hours: 8, minutes: 0 };
}

/**
 * Calculates the exact start timestamp of an event (Physical or Online).
 */
export function getEventStartTimestamp(event: KpmbpEvent): number {
  try {
    if (!event.date) return 0;
    const [y, m, d] = event.date.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return 0;

    const { hours, minutes } = parseTimeString(event.startTime);
    const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
    return dt.getTime();
  } catch {
    return 0;
  }
}

/**
 * Calculates the exact end timestamp of an event:
 * - Online: submissionDeadline timestamp (or end of date at 23:59:59)
 * - Physical: event date + endTime
 */
export function getEventEndTimestamp(event: KpmbpEvent): number {
  try {
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
  const endTime = getEventEndTimestamp(event);
  if (!endTime) return 0;
  return endTime + 1 * 60 * 60 * 1000; // +1 hour
}

/**
 * Checks if an event is archived (+1 hour after completion).
 */
export function isEventArchived(event: KpmbpEvent, nowTimestamp = Date.now()): boolean {
  if (event.status === 'Cancelled' || event.status === 'Archived') return true;
  const archiveTime = getEventArchiveTimestamp(event);
  if (!archiveTime) return false;
  return nowTimestamp >= archiveTime;
}

/**
 * Computes dynamic live status based on real-time clock.
 */
export function getDynamicEventStatus(event: KpmbpEvent, nowTimestamp = Date.now()): EventStatus {
  if (event.status === 'Cancelled') return 'Cancelled';
  if (event.status === 'Fully Booked') return 'Fully Booked';

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

export function formatDateMalay(dateStr: string): { day: string; month: string; year: string; full: string; dmy: string } {
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

export function getTimeRemainingMalay(deadlineIsoStr?: string): string | null {
  if (!deadlineIsoStr) return null;
  const deadline = new Date(deadlineIsoStr).getTime();
  const now = new Date().getTime();
  const diff = deadline - now;

  if (diff <= 0) return 'Pendaftaran telah ditutup';

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

export function getGoogleCalendarUrl(event: KpmbpEvent): string {
  const title = encodeURIComponent(`[KPMBP] ${event.title}`);
  const details = encodeURIComponent(`${event.description}\n\n📍 Lokasi: ${event.location}\n👤 Anjuran: ${event.organiser}\n🔗 Info: https://eventkpmbp.syncrozz.com`);
  const location = encodeURIComponent(event.location);

  // Parse YYYY-MM-DD
  const dateParts = event.date.split('-');
  const year = dateParts[0] || '2026';
  const month = dateParts[1] || '08';
  const day = dateParts[2] || '20';

  const startDateStr = `${year}${month}${day}T080000Z`;
  const endDateStr = `${year}${month}${day}T100000Z`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDateStr}/${endDateStr}`;
}

export function downloadIcsFile(event: KpmbpEvent) {
  const dateClean = event.date.replace(/-/g, '');
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

export function getEventDueTimestamp(event: KpmbpEvent): number {
  if (event.registrationDeadline) {
    const deadlineTime = new Date(event.registrationDeadline).getTime();
    if (!isNaN(deadlineTime)) return deadlineTime;
  }
  const dateTime = new Date(`${event.date}T00:00:00`).getTime();
  return isNaN(dateTime) ? Infinity : dateTime;
}

export function sortEventsByNearestDue(events: KpmbpEvent[]): KpmbpEvent[] {
  return [...events].sort((a, b) => {
    const dueA = getEventDueTimestamp(a);
    const dueB = getEventDueTimestamp(b);
    if (dueA !== dueB) return dueA - dueB;
    const dateA = new Date(`${a.date}T00:00:00`).getTime();
    const dateB = new Date(`${b.date}T00:00:00`).getTime();
    return dateA - dateB;
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
 * Returns pastel style classes for category badges in cards/modals.
 */
export function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'Pertandingan':
      return 'bg-orange-100/80 text-orange-900 border-orange-200/90';
    case 'Program Pelajar':
      return 'bg-pink-100/80 text-pink-900 border-pink-200/90';
    case 'Sukan':
      return 'bg-cyan-100/80 text-cyan-900 border-cyan-200/90';
    case 'Kebudayaan':
      return 'bg-sky-100/80 text-sky-900 border-sky-200/90';
    case 'Akademik':
      return 'bg-amber-100/80 text-amber-900 border-amber-200/90';
    case 'Bengkel':
      return 'bg-purple-100/80 text-purple-900 border-purple-200/90';
    case 'Kelab & Persatuan':
      return 'bg-teal-100/80 text-teal-900 border-teal-200/90';
    case 'Kerjaya':
      return 'bg-indigo-100/80 text-indigo-900 border-indigo-200/90';
    case 'Institusi':
      return 'bg-violet-100/80 text-violet-900 border-violet-200/90';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
