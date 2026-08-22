import { KpmbpEvent, RegistrationRecord, EventCategory, EventStatus, EventType, RegistrationMode } from '../types';

/**
 * Escapes a field for CSV export according to RFC 4180
 */
function escapeCSVField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If string contains comma, newline, or double quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports all KPMBP events to a clean UTF-8 CSV with BOM for Excel/Google Sheets compatibility
 */
export function exportEventsToCSV(events: KpmbpEvent[]): void {
  const headers = [
    'id',
    'eventType',
    'title',
    'description',
    'category',
    'date',
    'startTime',
    'endTime',
    'location',
    'organiser',
    'image',
    'eventMode',
    'registrationMode',
    'organiserWhatsApp',
    'submissionDeadline',
    'registrationUrl',
    'status',
    'eligibility',
    'contact',
    'featured',
    'importantNotice',
    'seatsLeft',
    'totalSeats',
    'tags',
    'programDuration',
    'scheduleSummary',
    'scheduleSessionsJson',
    'feeType',
    'feeAmount',
    'targetAudience'
  ];

  const rows: string[] = [headers.join(',')];

  events.forEach((evt) => {
    const row = [
      escapeCSVField(evt.id || ''),
      escapeCSVField(evt.eventType || 'ONE_TIME_EVENT'),
      escapeCSVField(evt.title || ''),
      escapeCSVField(evt.description || ''),
      escapeCSVField(evt.category || 'Akademik'),
      escapeCSVField(evt.date || ''),
      escapeCSVField(evt.startTime || ''),
      escapeCSVField(evt.endTime || ''),
      escapeCSVField(evt.location || ''),
      escapeCSVField(evt.organiser || ''),
      escapeCSVField(evt.image || ''),
      escapeCSVField(evt.eventMode || 'physical'),
      escapeCSVField(evt.registrationMode || 'none'),
      escapeCSVField(evt.organiserWhatsApp || ''),
      escapeCSVField(evt.submissionDeadline || ''),
      escapeCSVField(evt.registrationUrl || ''),
      escapeCSVField(evt.status || 'Registration Open'),
      escapeCSVField(evt.eligibility || ''),
      escapeCSVField(evt.contact || ''),
      escapeCSVField(evt.featured ? 'true' : 'false'),
      escapeCSVField(evt.importantNotice || ''),
      escapeCSVField(evt.seatsLeft !== undefined ? evt.seatsLeft : ''),
      escapeCSVField(evt.totalSeats !== undefined ? evt.totalSeats : ''),
      escapeCSVField(Array.isArray(evt.tags) ? evt.tags.join(';') : ''),
      escapeCSVField(evt.programDuration || ''),
      escapeCSVField(evt.scheduleSummary || ''),
      escapeCSVField(evt.scheduleSessions ? JSON.stringify(evt.scheduleSessions) : ''),
      escapeCSVField(evt.feeType || ''),
      escapeCSVField(evt.feeAmount || ''),
      escapeCSVField(evt.targetAudience || '')
    ];
    rows.push(row.join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `KPMBP_Events_Backup_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports registration records to CSV
 */
export function exportRegistrationsToCSV(registrations: RegistrationRecord[], events: KpmbpEvent[]): void {
  const headers = [
    'id',
    'eventId',
    'eventTitle',
    'studentName',
    'studentId',
    'email',
    'phone',
    'programCode',
    'timestamp'
  ];

  const rows: string[] = [headers.join(',')];

  const eventMap = new Map<string, string>();
  events.forEach((e) => eventMap.set(e.id, e.title));

  registrations.forEach((reg) => {
    const row = [
      escapeCSVField(reg.id || ''),
      escapeCSVField(reg.eventId || ''),
      escapeCSVField(reg.eventTitle || eventMap.get(reg.eventId) || ''),
      escapeCSVField(reg.studentName || ''),
      escapeCSVField(reg.studentId || ''),
      escapeCSVField(reg.email || ''),
      escapeCSVField(reg.phone || ''),
      escapeCSVField(reg.programCode || ''),
      escapeCSVField(reg.timestamp || '')
    ];
    rows.push(row.join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `KPMBP_Pendaftaran_Pelajar_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a sample template CSV for easy population
 */
export function downloadEventsTemplateCSV(): void {
  const sampleEvents: KpmbpEvent[] = [
    {
      id: 'contoh-acara-fizikal-01',
      eventType: 'ONE_TIME_EVENT',
      title: 'Bengkel AI & Python KPMBP 2026',
      description: 'Bengkel intensif pengaturcaraan Python dan asas Kecerdasan Buatan (AI) untuk pelajar KPMBP.',
      category: 'Akademik',
      date: '2026-09-15',
      startTime: '08:30 AM',
      endTime: '04:30 PM',
      location: 'Makmal Komputer 3, KPMBP',
      organiser: 'Kelab Sains Komputer & Inovasi',
      image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      eventMode: 'physical',
      registrationMode: 'admin',
      organiserWhatsApp: '60123456789',
      status: 'Registration Open',
      eligibility: 'Semua Pelajar KPMBP',
      contact: 'Penyelaras AI: 012-3456789',
      featured: true,
      seatsLeft: 25,
      totalSeats: 30,
      tags: ['AI', 'Python', 'Coding']
    },
    {
      id: 'contoh-program-berterusan-02',
      eventType: 'ONGOING_PROGRAM',
      title: 'Klinik Matematik & Statistik Mingguan',
      description: 'Sesi bimbingan berkala mingguan terbuka kepada semua pelajar yang ingin mengukuhkan kefahaman matematik.',
      category: 'Program Pelajar',
      organiser: 'Unit Matematik & Sains KPMBP',
      image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
      location: 'Bilik Seminar Al-Khawarizmi, KPMBP',
      eventMode: 'physical',
      registrationMode: 'none',
      status: 'Ongoing',
      eligibility: 'Semua Pelajar Diploma KPMBP',
      contact: 'Unit Matematik KPMBP: 07-8861234',
      programDuration: 'Sepanjang Semester 1 & 2',
      scheduleSummary: 'Setiap Selasa & Khamis (4.30 PM - 6.00 PM)',
      feeType: 'free',
      feeAmount: 'Percuma',
      targetAudience: 'Semua pelajar diploma',
      scheduleSessions: [
        {
          id: 'sess-1',
          day: 'Selasa',
          time: '04:30 PM - 06:00 PM',
          activity: 'Sesi Bimbingan Asas',
          location: 'Bilik Seminar Al-Khawarizmi'
        },
        {
          id: 'sess-2',
          day: 'Khamis',
          time: '04:30 PM - 06:00 PM',
          activity: 'Sesi Soal Jawab & Latihan',
          location: 'Bilik Seminar Al-Khawarizmi'
        }
      ],
      tags: ['Matematik', 'Klinik', 'Bimbingan']
    }
  ];

  exportEventsToCSV(sampleEvents);
}

/**
 * Robust CSV parser that handles RFC 4180 rules (quoted strings, multi-line values, escaped quotes)
 */
export function parseCSVToRows(text: string): string[][] {
  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push last field & row if not empty
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out any purely empty trailing rows
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));
}

/**
 * Parses CSV text into KpmbpEvent objects with field normalization and validations
 */
export function parseEventsFromCSV(csvText: string): {
  success: boolean;
  events: KpmbpEvent[];
  errors: string[];
} {
  const rows = parseCSVToRows(csvText);

  if (rows.length < 2) {
    return {
      success: false,
      events: [],
      errors: ['Fail CSV kosong atau tidak mempunyai baris data selepas baris tajuk (headers).']
    };
  }

  const headerRow = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  const dataRows = rows.slice(1);
  const parsedEvents: KpmbpEvent[] = [];
  const errors: string[] = [];

  // Helper to find column index by potential names
  const getCol = (possibleNames: string[]): number => {
    const cleanPossibles = possibleNames.map((p) => p.toLowerCase().replace(/[\s_-]+/g, ''));
    return headerRow.findIndex((h) => cleanPossibles.includes(h));
  };

  const idCol = getCol(['id', 'eventid', 'kodbukti']);
  const typeCol = getCol(['eventtype', 'type', 'jenisevent', 'jenispengisian']);
  const titleCol = getCol(['title', 'tajuk', 'namaacara', 'namaprogram']);
  const descCol = getCol(['description', 'keterangan', 'deskripsi', 'penerangan']);
  const catCol = getCol(['category', 'kategori']);
  const dateCol = getCol(['date', 'tarikh', 'eventdate']);
  const startCol = getCol(['starttime', 'masamula', 'waktumula']);
  const endCol = getCol(['endtime', 'masatamat', 'waktutamat']);
  const locCol = getCol(['location', 'tempat', 'lokasi', 'platform']);
  const orgCol = getCol(['organiser', 'organizer', 'penganjur', 'kelab']);
  const imgCol = getCol(['image', 'gambar', 'poster', 'banner', 'imageurl']);
  const modeCol = getCol(['eventmode', 'mode', 'modacara']);
  const regModeCol = getCol(['registrationmode', 'modpendaftaran', 'caradaftar']);
  const waCol = getCol(['organiserwhatsapp', 'whatsapp', 'nomborwhatsapp', 'whatsapppenganjur']);
  const deadCol = getCol(['submissiondeadline', 'deadline', 'tarikhtutup', 'tarikhtamathantar']);
  const regUrlCol = getCol(['registrationurl', 'googleform', 'formurl', 'pautanborang']);
  const statusCol = getCol(['status', 'statusevent']);
  const eligCol = getCol(['eligibility', 'kelayakan', 'syaratpenyertaan']);
  const contactCol = getCol(['contact', 'hubungi', 'penyelaras']);
  const featCol = getCol(['featured', 'sorotan', 'highlight']);
  const noticeCol = getCol(['importantnotice', 'notis', 'pesananpenting']);
  const seatsLeftCol = getCol(['seatsleft', 'kekosongan', 'baki']);
  const totalSeatsCol = getCol(['totalseats', 'jumlahkapasiti', 'hadpeserta']);
  const tagsCol = getCol(['tags', 'tag', 'katalaluan', 'label']);
  const progDurCol = getCol(['programduration', 'tempohprogram', 'tempoh']);
  const schedSumCol = getCol(['schedulesummary', 'ringkasanjadual', 'jadual']);
  const schedSessCol = getCol(['schedulesessionsjson', 'schedulesessions', 'sesi', 'sesiberulang']);
  const feeTypeCol = getCol(['feetype', 'jenisyuran', 'yuran']);
  const feeAmtCol = getCol(['feeamount', 'kadaryuran', 'jumlahyuran']);
  const targetAudCol = getCol(['targetaudience', 'sasaranaudiens', 'sasaranpeserta']);

  if (titleCol === -1) {
    return {
      success: false,
      events: [],
      errors: ['Kolum "title" atau "tajuk" tidak ditemui dalam fail CSV. Sila pastikan format CSV betul.']
    };
  }

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed including header
    const titleVal = row[titleCol]?.trim();

    if (!titleVal) {
      // skip empty lines
      return;
    }

    const rawId = idCol !== -1 && row[idCol]?.trim() ? row[idCol].trim() : `kpmbp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const rawType = typeCol !== -1 && row[typeCol]?.trim() ? row[typeCol].trim().toUpperCase() : '';
    const eventType: EventType = rawType.includes('ONGOING') || rawType.includes('BERTERUSAN') || rawType.includes('BERKALA')
      ? 'ONGOING_PROGRAM'
      : 'ONE_TIME_EVENT';

    // Parse category
    let category: Exclude<EventCategory, 'Semua'> = 'Akademik';
    if (catCol !== -1 && row[catCol]?.trim()) {
      const rawCat = row[catCol].trim();
      const validCategories: Array<Exclude<EventCategory, 'Semua'>> = [
        'Pertandingan', 'Bengkel', 'Program Pelajar', 'Kelab & Persatuan', 'Akademik', 'Kebudayaan', 'Sukan', 'Kerjaya', 'Institusi', 'Lain-lain'
      ];
      const match = validCategories.find((c) => c.toLowerCase() === rawCat.toLowerCase());
      if (match) {
        category = match;
      } else if (rawCat.toLowerCase().includes('sukan')) category = 'Sukan';
      else if (rawCat.toLowerCase().includes('budaya') || rawCat.toLowerCase().includes('seni')) category = 'Kebudayaan';
      else if (rawCat.toLowerCase().includes('bengkel') || rawCat.toLowerCase().includes('seminar') || rawCat.toLowerCase().includes('kursus')) category = 'Bengkel';
      else if (rawCat.toLowerCase().includes('kelab') || rawCat.toLowerCase().includes('persatuan')) category = 'Kelab & Persatuan';
      else if (rawCat.toLowerCase().includes('tanding') || rawCat.toLowerCase().includes('kompetisi')) category = 'Pertandingan';
      else if (rawCat.toLowerCase().includes('kerja') || rawCat.toLowerCase().includes('karier')) category = 'Kerjaya';
      else if (rawCat.toLowerCase().includes('institusi') || rawCat.toLowerCase().includes('kpm')) category = 'Institusi';
      else if (rawCat.toLowerCase().includes('program') || rawCat.toLowerCase().includes('pelajar')) category = 'Program Pelajar';
    }

    // Parse status
    let status: EventStatus = 'Registration Open';
    if (statusCol !== -1 && row[statusCol]?.trim()) {
      const rawStat = row[statusCol].trim();
      const validStatuses: EventStatus[] = [
        'Registration Open',
        'Registration Closing Soon',
        'Registration Closed',
        'Fully Booked',
        'Upcoming',
        'Ongoing',
        'Completed',
        'Cancelled',
        'Archived'
      ];
      const foundStatus = validStatuses.find((s) => s.toLowerCase() === rawStat.toLowerCase());
      if (foundStatus) {
        status = foundStatus;
      }
    }

    // Parse registration mode
    let regMode: RegistrationMode = 'none';
    if (regModeCol !== -1 && row[regModeCol]?.trim()) {
      const rawReg = row[regModeCol].trim().toLowerCase();
      if (rawReg.includes('form') || rawReg.includes('google') || rawReg.includes('borang')) {
        regMode = 'google_form';
      } else if (rawReg.includes('admin') || rawReg.includes('whatsapp')) {
        regMode = 'admin';
      } else {
        regMode = 'none';
      }
    } else if (regUrlCol !== -1 && row[regUrlCol]?.trim()) {
      regMode = 'google_form';
    } else if (waCol !== -1 && row[waCol]?.trim()) {
      regMode = 'admin';
    }

    // Parse event mode
    let eventMode: 'physical' | 'online' = 'physical';
    if (modeCol !== -1 && row[modeCol]?.trim()) {
      const rawMode = row[modeCol].trim().toLowerCase();
      if (rawMode.includes('online') || rawMode.includes('dalam talian') || rawMode.includes('maya')) {
        eventMode = 'online';
      }
    }

    // Parse schedule sessions JSON if provided
    let scheduleSessions = undefined;
    if (schedSessCol !== -1 && row[schedSessCol]?.trim()) {
      try {
        const parsed = JSON.parse(row[schedSessCol].trim());
        if (Array.isArray(parsed)) {
          scheduleSessions = parsed;
        }
      } catch {
        // If not valid JSON, leave undefined
      }
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsCol !== -1 && row[tagsCol]?.trim()) {
      tags = row[tagsCol]
        .split(/[;,|]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    const dateVal = dateCol !== -1 ? row[dateCol]?.trim() || '' : '';
    const descVal = descCol !== -1 ? row[descCol]?.trim() || '' : '';
    const orgVal = orgCol !== -1 ? row[orgCol]?.trim() || 'KPMBP' : 'KPMBP';
    const locVal = locCol !== -1 ? row[locCol]?.trim() || '' : '';

    const newEvt: KpmbpEvent = {
      id: rawId,
      eventType,
      title: titleVal,
      description: descVal || `${titleVal} anjuran ${orgVal}`,
      category,
      date: dateVal,
      startTime: startCol !== -1 ? row[startCol]?.trim() || '08:00 AM' : '08:00 AM',
      endTime: endCol !== -1 ? row[endCol]?.trim() || '05:00 PM' : '05:00 PM',
      location: locVal || 'KPM Bandar Penawar',
      organiser: orgVal,
      image: imgCol !== -1 && row[imgCol]?.trim() ? row[imgCol].trim() : 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80',
      eventMode,
      registrationMode: regMode,
      organiserWhatsApp: waCol !== -1 ? row[waCol]?.trim() || undefined : undefined,
      submissionDeadline: deadCol !== -1 ? row[deadCol]?.trim() || undefined : undefined,
      registrationUrl: regUrlCol !== -1 ? row[regUrlCol]?.trim() || undefined : undefined,
      status,
      eligibility: eligCol !== -1 ? row[eligCol]?.trim() || 'Semua Warga KPMBP' : 'Semua Warga KPMBP',
      contact: contactCol !== -1 && row[contactCol]?.trim() ? row[contactCol].trim() : `${orgVal}`,
      featured: featCol !== -1 ? row[featCol]?.trim().toLowerCase() === 'true' : false,
      importantNotice: noticeCol !== -1 ? row[noticeCol]?.trim() || undefined : undefined,
      seatsLeft: seatsLeftCol !== -1 && row[seatsLeftCol]?.trim() ? Number(row[seatsLeftCol].trim()) || undefined : undefined,
      totalSeats: totalSeatsCol !== -1 && row[totalSeatsCol]?.trim() ? Number(row[totalSeatsCol].trim()) || undefined : undefined,
      tags,
      programDuration: progDurCol !== -1 ? row[progDurCol]?.trim() || undefined : undefined,
      scheduleSummary: schedSumCol !== -1 ? row[schedSumCol]?.trim() || undefined : undefined,
      scheduleSessions,
      feeType: feeTypeCol !== -1 ? (row[feeTypeCol]?.trim() as any) || undefined : undefined,
      feeAmount: feeAmtCol !== -1 ? row[feeAmtCol]?.trim() || undefined : undefined,
      targetAudience: targetAudCol !== -1 ? row[targetAudCol]?.trim() || undefined : undefined,
      updatedAt: new Date().toISOString()
    };

    parsedEvents.push(newEvt);
  });

  if (parsedEvents.length === 0) {
    return {
      success: false,
      events: [],
      errors: ['Tiada rekod acara yang sah berjaya diekstrak daripada fail CSV.']
    };
  }

  return {
    success: true,
    events: parsedEvents,
    errors
  };
}
