import { KpmbpEvent } from '../types';

export function formatDateMalay(dateStr: string): { day: string; month: string; year: string; full: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { day: '--', month: '---', year: '----', full: dateStr };
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
      full: `${dayNum} ${monthFull} ${year}`
    };
  } catch {
    return { day: '01', month: 'OGOS', year: '2026', full: dateStr };
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
