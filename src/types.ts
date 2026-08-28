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

export type HeroCtaAction =
  | 'tab_calendar'
  | 'tab_events'
  | 'tab_dont_miss'
  | 'tab_archive'
  | 'open_event'
  | 'external_url';

export interface HeroSlide {
  id: string; // e.g. 'slide_1', 'slide_2'
  enabled: boolean;
  badgeText: string;
  badgeIcon?: 'sparkle' | 'calendar' | 'flame' | 'shield' | 'star' | 'book' | 'compass';
  title: string;
  subtitle?: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  linkedEventId?: string; // Optional: Link to a specific event
  primaryCtaText: string;
  primaryCtaAction: HeroCtaAction;
  primaryCtaTarget?: string; // Event ID or external URL
  secondaryCtaText?: string;
  secondaryCtaAction?: HeroCtaAction | 'none';
  secondaryCtaTarget?: string;
  accentTheme?: 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'blue';
}

export interface HeroConfig {
  autoPlay: boolean;
  intervalSeconds: number;
  slides: HeroSlide[];
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  autoPlay: true,
  intervalSeconds: 6,
  slides: [
    {
      id: 'slide_1',
      enabled: true,
      badgeText: 'Pusat Maklumat Rasmi KPMBP',
      badgeIcon: 'sparkle',
      title: 'Pusat Acara & Program Rasmi KPMBP',
      subtitle: 'Kolej Profesional MARA Bandar Penawar',
      description: 'Cari Event, Aktiviti, Pertandingan, dan Bengkel yang berlangsung di Kolej Profesional MARA Bandar Penawar dalam satu platform berpusat.',
      imageUrl: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg',
      imageAlt: 'Event KPMBP',
      primaryCtaText: 'Lihat Semua Acara',
      primaryCtaAction: 'tab_events',
      secondaryCtaText: 'Buka Kalendar Event',
      secondaryCtaAction: 'tab_calendar',
      accentTheme: 'indigo'
    },
    {
      id: 'slide_2',
      enabled: true,
      badgeText: 'Panduan Discovery Platform',
      badgeIcon: 'calendar',
      title: 'Rancang Jadual Melalui Kalendar Event',
      subtitle: 'Semak tarikh, sesi & tarikh tutup dengan mudah',
      description: 'Gunakan mod Kalendar untuk melihat keseluruhan aktiviti bulanan dan tarikh penting program KPMBP secara visual dan teratur tanpa terlepas sebarang acara.',
      imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000&auto=format&fit=crop',
      imageAlt: 'Kalendar Acara KPMBP',
      primaryCtaText: 'Buka Kalendar Sekarang',
      primaryCtaAction: 'tab_calendar',
      secondaryCtaText: 'Jelajah Aktiviti',
      secondaryCtaAction: 'tab_events',
      accentTheme: 'purple'
    }
  ]
};

