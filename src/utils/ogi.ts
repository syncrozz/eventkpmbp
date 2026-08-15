import { KpmbpEvent } from '../types';
import { formatDateMalay, formatDeadlineMalay, formatDateDMY } from './calendar';

/**
 * SOURCE IMAGE UTAMA (Centralized & Configurable)
 * Direct Raw Image URL dari GitHub repository tanpa melalui web viewer blob.
 */
export const DEFAULT_OGI_SOURCE_URL =
  'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg';

export interface OGIConfig {
  sourceUrl: string;
}

/**
 * Konfigurasi Berpusat OGI
 * Membolehkan URL sumber OGI ditukar pada masa hadapan secara modular tanpa mengubah logik utama.
 */
export const ogiConfig: OGIConfig = {
  sourceUrl: DEFAULT_OGI_SOURCE_URL
};

/**
 * Memuatkan imej sumber secara asynchronous dengan cross-origin support.
 * Sekiranya gagal dicapai, menghasilkan mesej ralat yang jelas mengikut spesifikasi.
 */
export function loadOGISourceImage(url = ogiConfig.sourceUrl): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(
        new Error(
          `Ralat: Sumber imej OGI tidak dapat diakses daripada URL: ${url}. Sila pastikan pautan imej raw adalah sah dan boleh dicapai.`
        )
      );
    };

    img.src = url;
  });
}

/**
 * Helper untuk membalut teks panjang (word-wrapping) dalam kanvas kanvas grafik 2D.
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * PRINSIP: SOURCE → TEMPLATE → DYNAMIC EVENT DATA → FINAL OGI
 * 
 * Menjana imej Open Graph dinamik dengan melapiskan data acara ke atas 
 * template sumber OGI asal tanpa mereka bentuk semula template.
 */
export async function generateEventOGImage(
  event: KpmbpEvent,
  sourceUrl = ogiConfig.sourceUrl
): Promise<string> {
  // 1. Dapatkan template imej daripada SOURCE URL secara terus
  const templateImg = await loadOGISourceImage(sourceUrl);

  const width = templateImg.naturalWidth || 1200;
  const height = templateImg.naturalHeight || 630;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Ralat: Kanvas 2D tidak disokong oleh pelayar web.');
  }

  // 2. Kekalkan struktur visual, komposisi, dan gaya asal dengan melukis background template penuh
  ctx.drawImage(templateImg, 0, 0, width, height);

  // 3. Masukkan kandungan dinamik yang berkaitan dengan acara (Dynamic Event Data)
  const isOnline = event.eventMode === 'online';
  const { full: fullDateMalay } = formatDateMalay(event.date);

  // Skala rujukan berasaskan saiz sebenar kanvas (default 1200 x 630)
  const scale = width / 1200;

  // Kawasan kandungan dinamik di bahagian kiri/tengah kanvas OGI
  const contentX = 72 * scale;
  const maxTextWidth = 720 * scale;

  // Dynamic: Kategori & Status Badge
  ctx.save();
  ctx.font = `bold ${Math.round(18 * scale)}px "Plus Jakarta Sans", sans-serif`;
  const badgeText = `${event.category.toUpperCase()} • ${isOnline ? 'ONLINE' : 'FIZIKAL'}`;
  const badgeWidth = ctx.measureText(badgeText).width + 24 * scale;
  const badgeHeight = 34 * scale;
  const badgeY = 160 * scale;

  ctx.fillStyle = 'rgba(79, 70, 229, 0.9)'; // Indigo accent
  ctx.beginPath();
  ctx.roundRect(contentX, badgeY, badgeWidth, badgeHeight, 8 * scale);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, contentX + 12 * scale, badgeY + badgeHeight / 2);
  ctx.restore();

  // Dynamic: Nama Event (Tajuk Acara)
  ctx.save();
  ctx.fillStyle = '#0F172A'; // Dark slate
  ctx.font = `800 ${Math.round(36 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textBaseline = 'top';

  const titleStartY = 210 * scale;
  const titleLines = wrapCanvasText(ctx, event.title, maxTextWidth).slice(0, 3);
  const lineHeight = 46 * scale;

  titleLines.forEach((line, idx) => {
    ctx.fillText(line, contentX, titleStartY + idx * lineHeight);
  });
  ctx.restore();

  // Dynamic: Maklumat Tarikh, Masa / Penyerahan, Lokasi & Anjuran
  const metaStartY = titleStartY + (titleLines.length * lineHeight) + 24 * scale;
  ctx.save();

  // Box Maklumat Acara (Subtle container)
  const metaBoxHeight = 150 * scale;
  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.roundRect(contentX, metaStartY, maxTextWidth, metaBoxHeight, 14 * scale);
  ctx.fill();
  ctx.stroke();

  // Data 1: Tarikh
  ctx.fillStyle = '#334155';
  ctx.font = `700 ${Math.round(18 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(`📅  Tarikh: ${fullDateMalay} (${formatDateDMY(event.date)})`, contentX + 20 * scale, metaStartY + 28 * scale);

  // Data 2: Masa / Lokasi atau Due Submission
  if (isOnline) {
    const dueStr = event.submissionDeadline ? formatDeadlineMalay(event.submissionDeadline) : 'Sebelum 11:59 PM';
    ctx.fillStyle = '#B45309'; // Amber 700
    ctx.fillText(`⏳  Tarikh Akhir Penyerahan: ${dueStr}`, contentX + 20 * scale, metaStartY + 64 * scale);
  } else {
    const timeStr = `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`;
    const locStr = event.location || 'KPM Beranang (KPMBP)';
    ctx.fillStyle = '#334155';
    ctx.fillText(`🕒  Masa: ${timeStr}   |   📍  Lokasi: ${locStr}`, contentX + 20 * scale, metaStartY + 64 * scale);
  }

  // Data 3: Anjuran & Kelayakan
  ctx.fillStyle = '#475569';
  ctx.font = `600 ${Math.round(16 * scale)}px "Plus Jakarta Sans", sans-serif`;
  const orgStr = `👤  Anjuran: ${event.organiser}`;
  ctx.fillText(orgStr, contentX + 20 * scale, metaStartY + 102 * scale);

  // Dynamic: Merit & Pendaftaran Footer
  const regModeLabel = 
    event.registrationMode === 'none' 
      ? 'Terbuka / Walk-in' 
      : event.registrationMode === 'google_form' 
        ? 'Borang Daftar Disediakan' 
        : 'Pendaftaran Urusetia';

  ctx.fillStyle = '#64748B';
  ctx.font = `500 ${Math.round(14 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(
    `🎖️ MARA Merit Diperuntukkan  •  🎟️ ${regModeLabel}  •  Portal Rasmi Event KPMBP`, 
    contentX, 
    metaStartY + metaBoxHeight + 24 * scale
  );

  ctx.restore();

  // 4. Hasilkan data image URL akhir (Final OGI)
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Muat turun imej OGI yang dijana secara automatik.
 */
export async function downloadEventOGImage(event: KpmbpEvent, filename?: string): Promise<void> {
  const dataUrl = await generateEventOGImage(event);
  const cleanTitle = event.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const safeFilename = filename || `OGI_KPMBP_${cleanTitle}.jpg`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Mengemaskini tag meta Open Graph & Twitter dalam <head> dokumen
 * menggunakan URL sumber OGI berpusat atau data acara aktif.
 */
export function updateDocumentOpenGraph(event?: KpmbpEvent | null) {
  if (typeof document === 'undefined') return;

  const title = event 
    ? `${event.title} | Event KPMBP` 
    : 'Event KPMBP | Pusat Acara & Program KPMBP';

  const description = event
    ? `${event.category} - Tarikh: ${formatDateDMY(event.date)} | ${event.eventMode === 'online' ? 'Online' : event.location || 'KPMBP'}. Anjuran: ${event.organiser}`
    : 'Pusat Acara & Program Rasmi Kolej Professional MARA Bandar Penawar (KPMBP)';

  // Gunakan raw image URL sumber terus
  const imageUrl = ogiConfig.sourceUrl;

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
