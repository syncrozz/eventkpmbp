import { KpmbpEvent } from '../types';
import { formatDateMalay, formatDeadlineMalay, formatDateDMY } from './calendar';

export const DEFAULT_FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

/**
 * Generates a dedicated, modern, high-definition event poster canvas if no direct image was uploaded.
 */
export async function generateDedicatedEventPoster(event: KpmbpEvent): Promise<string> {
  const width = 1200;
  const height = 1200; // Crisp square poster format
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Ralat: Kanvas 2D tidak disokong oleh pelayar web.');
  }

  // 1. Gradient Background matching KPMBP event aesthetic
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0F172A'); // Deep Slate
  bgGradient.addColorStop(0.5, '#1E1B4B'); // Indigo 950
  bgGradient.addColorStop(1, '#090D16'); // Dark Base
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative Accent Blobs
  const radGrad1 = ctx.createRadialGradient(1000, 200, 10, 1000, 200, 500);
  radGrad1.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
  radGrad1.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = radGrad1;
  ctx.fillRect(0, 0, width, height);

  const radGrad2 = ctx.createRadialGradient(200, 1000, 10, 200, 1000, 500);
  radGrad2.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
  radGrad2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = radGrad2;
  ctx.fillRect(0, 0, width, height);

  // Outer Border Frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 12;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Inner Subtle Golden Accent Line
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  // 2. Header Branding: KPMBP Event Hub
  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '900 24px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('KOLEJ PROFESIONAL MARA BANDAR PENAWAR', 80, 110);

  ctx.fillStyle = '#FCD34D'; // Amber 300
  ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PORTAL RASMI ACARA & PROGRAM SISWA', 80, 140);
  ctx.restore();

  // 3. Category & Mode Badge (Pastel Yellow Highlight)
  const isOnline = event.eventMode === 'online';
  const badgeText = `${event.category.toUpperCase()} • ${isOnline ? 'ONLINE' : 'FIZIKAL'}`;
  
  ctx.save();
  ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 36;
  const badgeH = 46;
  const badgeX = 80;
  const badgeY = 190;

  // Pastel Yellow Badge Pill
  ctx.fillStyle = '#FEF3C7'; // Amber 100
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fill();

  ctx.strokeStyle = '#FCD34D'; // Amber 300
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#451A03'; // Amber 950
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + 18, badgeY + badgeH / 2);
  ctx.restore();

  // 4. Event Title
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 52px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'top';

  const titleX = 80;
  const titleY = 270;
  const maxTitleW = width - 160;

  const wrapText = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let curLine = '';
    for (const w of words) {
      const test = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && curLine) {
        lines.push(curLine);
        curLine = w;
      } else {
        curLine = test;
      }
    }
    if (curLine) lines.push(curLine);
    return lines;
  };

  const titleLines = wrapText(event.title, maxTitleW).slice(0, 3);
  titleLines.forEach((l, i) => {
    ctx.fillText(l, titleX, titleY + i * 66);
  });
  ctx.restore();

  // 5. Main Information Box
  const infoBoxY = titleY + (titleLines.length * 66) + 36;
  const infoBoxH = 340;
  
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(80, infoBoxY, width - 160, infoBoxH, 20);
  ctx.fill();
  ctx.stroke();

  const { full: fullDateMalay } = formatDateMalay(event.date);

  // Item 1: Tarikh
  ctx.fillStyle = '#FCD34D'; // Amber 300
  ctx.font = '900 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('📅  TARIKH ACARA:', 115, infoBoxY + 50);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${fullDateMalay} (${formatDateDMY(event.date)})`, 115, infoBoxY + 90);

  // Item 2: Masa & Lokasi / Submission
  ctx.fillStyle = '#93C5FD'; // Blue 300
  ctx.font = '900 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('📍  LOKASI & MASA:', 115, infoBoxY + 150);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  if (isOnline) {
    const dueStr = event.submissionDeadline ? formatDeadlineMalay(event.submissionDeadline) : 'Sebelum 11:59 PM';
    ctx.fillText(`Online Platform • Tarikh Akhir: ${dueStr}`, 115, infoBoxY + 188);
  } else {
    const timeStr = `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}`;
    const locStr = event.location || 'Kampus KPMBP';
    ctx.fillText(`${locStr}  (${timeStr})`, 115, infoBoxY + 188);
  }

  // Item 3: Penganjur
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '900 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('👤  ANJURAN:', 115, infoBoxY + 248);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(event.organiser, 115, infoBoxY + 284);

  ctx.restore();

  // 6. Footer Notes & Merit
  ctx.save();
  ctx.fillStyle = '#10B981'; // Emerald 500
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('🎖️  MARA MERIT DIPERUNTUKKAN BAGI SEMUA PESERTA', 80, height - 140);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Syarat: ${event.eligibility}  •  Hubungi: ${event.contact || 'Urusetia Program'}`, 80, height - 100);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Muat turun poster rasmi acara yang dimuat naik oleh penganjur/admin.
 * Jika penganjur memuat naik poster (event.image), poster sebenar dimuat turun terus.
 */
export async function downloadEventPoster(event: KpmbpEvent, filename?: string): Promise<void> {
  const cleanTitle = (event.title || 'Event')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 40);
  const safeFilename = filename || `Poster_KPMBP_${cleanTitle}.jpg`;

  // 1. Semak sama ada penganjur telah memuat naik poster (event.image)
  if (event.image && typeof event.image === 'string' && event.image.trim().length > 0) {
    const posterUrl = event.image.trim();

    // A. Base64 Data URL (Muat naik terus dari fail lokal)
    if (posterUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = posterUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // B. Blob / Object URL
    if (posterUrl.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = posterUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // C. Web URL (HTTP / HTTPS)
    try {
      const res = await fetch(posterUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }
    } catch {
      // CORS fetch fallback via Canvas
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat imej poster.'));
        img.src = posterUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    } catch {
      // Direct link fallback
      const link = document.createElement('a');
      link.href = posterUrl;
      link.download = safeFilename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  }

  // 2. Jika penganjur belum memuat naik imej poster khas, jana poster visual dinamik mengikut data acara sebenar
  const dynamicPosterDataUrl = await generateDedicatedEventPoster(event);
  const link = document.createElement('a');
  link.href = dynamicPosterDataUrl;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Backward compatibility alias for any existing references
export const downloadEventOGImage = downloadEventPoster;

/**
 * Mengemaskini tag meta Open Graph & Twitter dalam <head> dokumen
 * menggunakan imej poster acara sebenar penganjur.
 */
export function updateDocumentOpenGraph(event?: KpmbpEvent | null) {
  if (typeof document === 'undefined') return;

  const title = event 
    ? `${event.title} | Event KPMBP` 
    : 'Event KPMBP | Pusat Acara & Program KPMBP';

  const description = event
    ? `${event.category} - Tarikh: ${formatDateDMY(event.date)} | ${event.eventMode === 'online' ? 'Online' : event.location || 'KPMBP'}. Anjuran: ${event.organiser}`
    : 'Pusat Acara & Program Rasmi Kolej Profesional MARA Bandar Penawar (KPMBP)';

  // Gunakan imej poster penganjur jika ada
  const imageUrl = event?.image || DEFAULT_FALLBACK_BANNER;

  const setMetaTag = (propertyOrName: string, value: string, isName = false) => {
    const selector = isName ? `meta[name="${propertyOrName}"]` : `meta[property="${propertyOrName}"]`;
    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      if (isName) {
        element.setAttribute('name', propertyOrName);
      } else {
        element.setAttribute('property', propertyOrName);
      }
      document.head.appendChild(element);
    }
    element.setAttribute('content', value);
  };

  document.title = title;
  setMetaTag('description', description, true);

  // Open Graph
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:image', imageUrl);
  setMetaTag('og:type', 'website');

  // Twitter
  setMetaTag('twitter:card', 'summary_large_image', true);
  setMetaTag('twitter:title', title, true);
  setMetaTag('twitter:description', description, true);
  setMetaTag('twitter:image', imageUrl, true);
}
