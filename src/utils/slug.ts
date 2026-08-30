import { KpmbpEvent } from '../types';

/**
 * Menghasilkan akronim ringkas dari tajuk acara.
 * Contoh: 
 * - "Pasar Malam Kampus" -> "pmk"
 * - "Pasar Malam KPMBP" -> "pmk"
 * - "Majlis Perasmian Karnival" -> "mpk"
 * - "Bengkel AI" -> "bai"
 * - "Karnival" -> "kar"
 */
export function getTitleAcronym(title?: string): string {
  if (!title || typeof title !== 'string') return 'evt';

  // 1. Buang simbol, kurungan, emoji & aksara khas
  const cleaned = title
    .replace(/\[.*?\]|\(.*?\)|<.*?>/g, ' ') // Buang kandungan dalam kurungan seperti [OGI], (KPMBP)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')      // Kekalkan huruf dan nombor sahaja
    .trim();

  // 2. Pecahkan kepada perkataan
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 'evt';

  if (words.length === 1) {
    // Satu perkataan: ambil 3 huruf pertama
    return words[0].substring(0, 3).toLowerCase();
  }

  // Pelbagai perkataan: ambil huruf pertama setiap perkataan (hadkan kepada 4-5 huruf maksima)
  const acronym = words
    .slice(0, 5)
    .map((w) => w.charAt(0))
    .join('')
    .toLowerCase();

  return acronym.length >= 2 ? acronym : words[0].substring(0, 3).toLowerCase();
}

/**
 * Menghasilkan kod tarikh format DDMMYY (cth: 02hb Sept 2026 -> "020926")
 */
export function getDateCodeDDMMYY(event: KpmbpEvent): string {
  let dateStr = event.date;

  // Jika tiada tarikh khusus (cth program berterusan), semak sesi jadual pertama atau tarikh cipta
  if (!dateStr && event.createdAt) {
    dateStr = event.createdAt.split('T')[0];
  }

  if (!dateStr) {
    // Tarikh lalai tahun semasa jika kosong
    return '010126';
  }

  try {
    const raw = dateStr.split('T')[0].trim();
    const parts = raw.split(/[-/]/);

    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // Format YYYY-MM-DD
        const yearYY = parts[0].slice(-2);
        const monthMM = parts[1].padStart(2, '0');
        const dayDD = parts[2].padStart(2, '0');
        return `${dayDD}${monthMM}${yearYY}`;
      } else if (parts[2].length === 4 || parts[2].length === 2) {
        // Format DD-MM-YYYY atau DD-MM-YY
        const dayDD = parts[0].padStart(2, '0');
        const monthMM = parts[1].padStart(2, '0');
        const yearYY = parts[2].slice(-2);
        return `${dayDD}${monthMM}${yearYY}`;
      }
    }

    // Fallback menggunakan Date parser
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const dayDD = String(d.getDate()).padStart(2, '0');
      const monthMM = String(d.getMonth() + 1).padStart(2, '0');
      const yearYY = String(d.getFullYear()).slice(-2);
      return `${dayDD}${monthMM}${yearYY}`;
    }
  } catch {
    // ignore
  }

  return '010126';
}

/**
 * Menghasilkan slug / pautan ringkas automatik bagi acara.
 * Format: [akronim_tajuk][DDMMYY]
 * Contoh: "Pasar Malam" pada 2 Sep 2026 -> "pmk020926" atau "pm020926"
 */
export function getEventSlug(event: KpmbpEvent): string {
  if (!event) return 'event';

  // Jika acara mempunyai slug tersuai (custom slug) yang telah ditetapkan
  if ((event as any).customSlug && typeof (event as any).customSlug === 'string') {
    return (event as any).customSlug.trim().toLowerCase();
  }

  const acronym = getTitleAcronym(event.title);
  const dateCode = getDateCodeDDMMYY(event);

  return `${acronym}${dateCode}`;
}

/**
 * Menghasilkan URL penuh perkongsian ringkas untuk acara.
 * Contoh: "https://eventkpmbp.syncrozz.com/#event-pmk020926"
 */
export function getEventShareUrl(event: KpmbpEvent, baseUrl?: string): string {
  const slug = getEventSlug(event);
  if (baseUrl) {
    const cleanBase = baseUrl.split('#')[0];
    return `${cleanBase}#event-${slug}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}#event-${slug}`;
  }

  return `https://eventkpmbp.syncrozz.com/#event-${slug}`;
}

/**
 * Mencari acara dalam senarai sama ada melalui Slug Ringkas (cth: "pmk020926")
 * ATAU ID Asal Firestore / UUID (cth: "pPRvStNrTBDvJV5nfzUs").
 * Ini memastikan keserasian 100% dengan pautan lama dan pautan baharu.
 */
export function findEventBySlugOrId(events: KpmbpEvent[], identifier: string): KpmbpEvent | undefined {
  if (!identifier || !Array.isArray(events) || events.length === 0) return undefined;

  const clean = identifier
    .replace(/^#event-/, '')
    .replace(/^#/, '')
    .trim()
    .toLowerCase();

  if (!clean) return undefined;

  // 1. Padanan tepat ID
  const matchId = events.find((e) => e.id.toLowerCase() === clean);
  if (matchId) return matchId;

  // 2. Padanan tepat Slug Ringkas (cth: "pmk020926")
  const matchSlug = events.find((e) => getEventSlug(e).toLowerCase() === clean);
  if (matchSlug) return matchSlug;

  // 3. Padanan slug tersuai
  const matchCustom = events.find(
    (e) => (e as any).customSlug && (e as any).customSlug.toLowerCase() === clean
  );
  if (matchCustom) return matchCustom;

  // 4. Padanan fleksibel (jika ID mempunyai prefix/suffix)
  const matchFuzzy = events.find((e) => e.id.toLowerCase().startsWith(clean) || clean.startsWith(e.id.toLowerCase()));
  if (matchFuzzy) return matchFuzzy;

  return undefined;
}
