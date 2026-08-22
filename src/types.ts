export type EventCategory =
  | 'Semua'
  | 'Pertandingan'
  | 'Bengkel'
  | 'Program Pelajar'
  | 'Kelab & Persatuan'
  | 'Akademik'
  | 'Kebudayaan'
  | 'Sukan'
  | 'Kerjaya'
  | 'Institusi'
  | 'Lain-lain';

export type EventStatus =
  | 'Upcoming'
  | 'Registration Open'
  | 'Registration Closing Soon'
  | 'Registration Closed'
  | 'Fully Booked'
  | 'Ongoing'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export type EventMode = 'physical' | 'online';

export type RegistrationMode = 'none' | 'admin' | 'google_form';

export type EventType = 'ONE_TIME_EVENT' | 'ONGOING_PROGRAM';

export interface ProgramSession {
  id?: string;
  day: string; // e.g. 'Isnin', 'Khamis', 'Sabtu', 'Ahad', 'Setiap Hari'
  time: string; // e.g. '8:30 PM - 9:30 PM'
  mode?: 'physical' | 'online' | 'hybrid';
  activity?: string; // e.g. 'Bacaan Al-Quran & Tajwid', 'Sesi Latihan', 'Fardu Ain'
  location?: string; // e.g. 'Google Meet / Bilik Seminar KPMBP'
}

export interface KpmbpEvent {
  id: string;
  eventType?: EventType; // 'ONE_TIME_EVENT' (default fallback) | 'ONGOING_PROGRAM'
  title: string;
  description: string;
  category: Exclude<EventCategory, 'Semua'>;
  date?: string; // ISO YYYY-MM-DD (Required for ONE_TIME_EVENT, optional for ONGOING_PROGRAM)
  startTime?: string;
  endTime?: string;
  location: string;
  organiser: string;
  image?: string;
  eventMode?: EventMode; // 'physical' | 'online' (default fallback: physical)
  registrationMode?: RegistrationMode; // 'none' | 'admin' | 'google_form'
  organiserWhatsApp?: string; // Contact phone / WhatsApp number for admin registration
  organiserUrl?: string; // Official webpage / reference website from organiser
  submissionDeadline?: string; // ISO datetime YYYY-MM-DDTHH:mm for online competitions / submissions
  registrationUrl?: string;
  registrationDeadline?: string; // ISO datetime YYYY-MM-DDTHH:mm
  status: EventStatus;
  eligibility: string;
  contact: string;
  featured?: boolean;
  importantNotice?: string;
  seatsLeft?: number;
  totalSeats?: number;
  tags?: string[];
  // Generic fields for ONGOING_PROGRAM
  scheduleSummary?: string; // e.g. '4 kali seminggu (Isnin, Rabu, Jumaat, Sabtu)'
  scheduleSessions?: ProgramSession[]; // Detailed list of recurring sessions
  programDuration?: string; // e.g. 'Sepanjang Tahun', 'Sesi 2026/2027', 'Januari - Disember 2026'
  feeType?: 'free' | 'paid' | 'voluntary'; // 'free' | 'paid' | 'voluntary'
  feeAmount?: string; // e.g. 'RM 10/bulan', 'Percuma', 'Sumbangan Ikhlas'
  targetAudience?: string; // e.g. 'Umur 4 - 17 Tahun (Anak staf & pensyarah KPMBP)'
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistrationRecord {
  id: string;
  eventId: string;
  eventTitle?: string;
  studentName: string;
  studentId: string;
  email: string;
  phone: string;
  programCode: string;
  timestamp: string;
}

export type ViewTab = 'discover' | 'events' | 'calendar' | 'dont-miss' | 'archive' | 'admin';
