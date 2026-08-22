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

export interface KpmbpEvent {
  id: string;
  title: string;
  description: string;
  category: Exclude<EventCategory, 'Semua'>;
  date: string; // ISO YYYY-MM-DD
  startTime: string;
  endTime: string;
  location: string;
  organiser: string;
  image?: string;
  eventMode?: EventMode; // 'physical' | 'online' (default fallback: physical)
  registrationMode?: RegistrationMode; // 'admin' | 'google_form' (default fallback: google_form if registrationUrl exists, else admin)
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
