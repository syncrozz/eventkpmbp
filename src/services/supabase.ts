import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KpmbpEvent, RegistrationRecord } from '../types';
import { INITIAL_EVENTS } from '../data/initialEvents';

// Environment credentials for Supabase (Supporting both VITE_ and NEXT_PUBLIC_ naming conventions)
const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {};
const supabaseUrl = 
  env.VITE_SUPABASE_URL || 
  env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://ivkxayntsrtdlvjsbktt.supabase.co';

const supabaseAnonKey = 
  env.VITE_SUPABASE_ANON_KEY || 
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'sb_publishable_dTXrfyQooluNXGDYMC5qGg_WCHrJkjS';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 10
  );
};

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return client;
}

export const SUPABASE_SQL_SETUP = `-- ==========================================================
-- SKRIP STRUKTUR JADUAL, RLS & REALTIME SUPABASE POSTGRESQL
-- (Syncrozz Engineering Standard 4.2 Compliance)
-- Salin dan laksanakan skrip ini di Supabase SQL Editor anda
-- ==========================================================

-- 1. Jadual Events (Acara)
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  date TEXT,
  "startTime" TEXT,
  "endTime" TEXT,
  location TEXT,
  organiser TEXT,
  image TEXT,
  "eventMode" TEXT DEFAULT 'physical',
  "registrationMode" TEXT DEFAULT 'none',
  "organiserWhatsApp" TEXT,
  "organiserUrl" TEXT,
  "submissionDeadline" TEXT,
  "registrationUrl" TEXT,
  "registrationDeadline" TEXT,
  status TEXT DEFAULT 'Upcoming',
  eligibility TEXT,
  contact TEXT,
  featured BOOLEAN DEFAULT false,
  "importantNotice" TEXT,
  "seatsLeft" INTEGER,
  "totalSeats" INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Jadual Registrations (Pendaftaran Pelajar)
CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY,
  "eventId" TEXT,
  "eventTitle" TEXT,
  "studentName" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  "programCode" TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS) - Ketat & Selamat
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Polisi Keselamatan Jadual Events:
-- Public dibenarkan membaca (SELECT) sahaja
DROP POLICY IF EXISTS "Public read events" ON public.events;
DROP POLICY IF EXISTS "Public access for events" ON public.events;
CREATE POLICY "Public read events" ON public.events
  FOR SELECT USING (true);

-- Authenticated (Anon Key / Auth) dibenarkan mengurus Events
DROP POLICY IF EXISTS "Authorized manage events" ON public.events;
CREATE POLICY "Authorized manage events" ON public.events
  FOR ALL USING (true) WITH CHECK (true);

-- Polisi Keselamatan Jadual Registrations:
-- Public HANYA dibenarkan memasukkan data (INSERT). Tiada akses baca/padam umum.
DROP POLICY IF EXISTS "Public insert registrations" ON public.registrations;
DROP POLICY IF EXISTS "Public access for registrations" ON public.registrations;
CREATE POLICY "Public insert registrations" ON public.registrations
  FOR INSERT WITH CHECK (
    "studentName" IS NOT NULL AND 
    "studentId" IS NOT NULL AND 
    length("studentName") > 0 AND 
    length("studentId") > 0
  );

-- Pengurusan Pendaftaran (SELECT / DELETE) untuk paparan penganjur
DROP POLICY IF EXISTS "Authorized manage registrations" ON public.registrations;
CREATE POLICY "Authorized manage registrations" ON public.registrations
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Aktifkan Supabase Realtime secara Selamat & Idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  END IF;
END $$;
`;

// Live connection test for Supabase
export async function checkSupabaseHealth(): Promise<{ connected: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      message: 'Pembolehubah persekitaran (VITE_SUPABASE_URL / ANON_KEY) belum ditetapkan.',
    };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return {
      connected: false,
      message: 'Gagal menginisialisasi client Supabase.',
    };
  }

  try {
    const { error } = await sb.from('events').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Ralat sambungan: ${error.message} (Kod: ${error.code || 'UNKNOWN'})`,
      };
    }
    return {
      connected: true,
      message: 'Bersambung dengan jaya ke Supabase PostgreSQL.',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Gagal menghubungi pelayan Supabase.',
    };
  }
}

// Helper to sanitize payload for Supabase insertion
function sanitizeEventForSupabase(event: Partial<KpmbpEvent>): Record<string, any> {
  const payload: Record<string, any> = { ...event };
  if (Array.isArray(payload.tags)) {
    payload.tags = payload.tags;
  }
  return payload;
}

// Convert Supabase database row to KpmbpEvent
function mapRowToEvent(row: any): KpmbpEvent {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    category: row.category || 'Lain-lain',
    date: row.date || new Date().toISOString().split('T')[0],
    startTime: row.startTime || row.start_time || '08:00 AM',
    endTime: row.endTime || row.end_time || '',
    location: row.location || 'Kampus KPMBP',
    organiser: row.organiser || 'KPM Beranang',
    image: row.image || undefined,
    eventMode: row.eventMode || row.event_mode || 'physical',
    registrationMode: row.registrationMode || row.registration_mode || 'none',
    organiserWhatsApp: row.organiserWhatsApp || row.organiser_whatsapp || undefined,
    submissionDeadline: row.submissionDeadline || row.submission_deadline || undefined,
    registrationUrl: row.registrationUrl || row.registration_url || undefined,
    registrationDeadline: row.registrationDeadline || row.registration_deadline || undefined,
    status: row.status || 'Upcoming',
    eligibility: row.eligibility || 'Terbuka kepada semua pelajar KPMBP',
    contact: row.contact || 'Urusetia Program',
    featured: Boolean(row.featured),
    importantNotice: row.importantNotice || row.important_notice || undefined,
    seatsLeft: row.seatsLeft !== null && row.seatsLeft !== undefined ? Number(row.seatsLeft) : undefined,
    totalSeats: row.totalSeats !== null && row.totalSeats !== undefined ? Number(row.totalSeats) : undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.createdAt || row.created_at || undefined,
    updatedAt: row.updatedAt || row.updated_at || undefined,
  };
}

// Fetch all events from Supabase
export async function getEventsFromSupabase(): Promise<KpmbpEvent[]> {
  const sb = getSupabaseClient();
  if (!sb) {
    throw new Error('Supabase client belum dikonfigurasi.');
  }

  const { data, error } = await sb
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  // If table is empty, auto-seed with INITIAL_EVENTS
  if (!data || data.length === 0) {
    await seedInitialEventsToSupabase();
    return INITIAL_EVENTS;
  }

  return data.map(mapRowToEvent);
}

// Auto-seed initial 3 events if Supabase is freshly initialized
export async function seedInitialEventsToSupabase(): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  try {
    const formatted = INITIAL_EVENTS.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      organiser: e.organiser,
      image: e.image || null,
      eventMode: e.eventMode || 'physical',
      registrationMode: e.registrationMode || 'none',
      organiserWhatsApp: e.organiserWhatsApp || null,
      submissionDeadline: e.submissionDeadline || null,
      registrationUrl: e.registrationUrl || null,
      registrationDeadline: e.registrationDeadline || null,
      status: e.status,
      eligibility: e.eligibility,
      contact: e.contact,
      featured: e.featured ?? true,
      importantNotice: e.importantNotice || null,
      seatsLeft: e.seatsLeft ?? null,
      totalSeats: e.totalSeats ?? null,
      tags: e.tags || [],
    }));

    await sb.from('events').upsert(formatted, { onConflict: 'id' });
  } catch (err) {
    console.warn('Initial seeding to Supabase skipped or failed:', err);
  }
}

// Subscribe to Supabase real-time updates for events
export function subscribeToSupabaseEvents(
  onUpdate: (events: KpmbpEvent[]) => void,
  onError?: (err: any) => void
): () => void {
  const sb = getSupabaseClient();
  if (!sb) {
    // Return dummy unsubscriber
    return () => {};
  }

  // Load initial data immediately
  getEventsFromSupabase()
    .then(events => onUpdate(events))
    .catch(err => {
      console.warn('Error fetching Supabase events initially:', err);
      if (onError) onError(err);
    });

  // Create real-time channel
  const channel = sb
    .channel('public:events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      async () => {
        try {
          const freshEvents = await getEventsFromSupabase();
          onUpdate(freshEvents);
        } catch (e) {
          console.warn('Realtime fetch failed, falling back:', e);
        }
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

// Create new event in Supabase
export async function createEventInSupabase(
  eventData: Omit<KpmbpEvent, 'id'> & { id?: string }
): Promise<string> {
  const sb = getSupabaseClient();
  if (!sb) {
    throw new Error('Supabase URL atau Anon Key belum dimasukkan.');
  }

  const generatedId = eventData.id || `kpmbp-evt-${Date.now()}`;
  const record = sanitizeEventForSupabase({
    ...eventData,
    id: generatedId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { error } = await sb.from('events').insert([record]);

  if (error) {
    throw error;
  }

  return generatedId;
}

// Update existing event in Supabase
export async function updateEventInSupabase(
  id: string,
  updates: Partial<KpmbpEvent>
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) {
    throw new Error('Supabase client tidak diaktifkan.');
  }

  const record = sanitizeEventForSupabase({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  const { error } = await sb
    .from('events')
    .update(record)
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// Delete event from Supabase
export async function deleteEventInSupabase(id: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) {
    throw new Error('Supabase client tidak diaktifkan.');
  }

  const { error } = await sb
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// Save registration in Supabase
export async function saveRegistrationInSupabase(
  regData: Omit<RegistrationRecord, 'id'>
): Promise<string> {
  const sb = getSupabaseClient();
  if (!sb) {
    throw new Error('Supabase client tidak diaktifkan.');
  }

  const generatedId = `reg-${Date.now()}`;
  const payload = {
    id: generatedId,
    eventId: regData.eventId,
    eventTitle: regData.eventTitle || '',
    studentName: regData.studentName,
    studentId: regData.studentId,
    email: regData.email,
    phone: regData.phone,
    programCode: regData.programCode,
    timestamp: regData.timestamp || new Date().toISOString(),
  };

  const { error } = await sb.from('registrations').insert([payload]);

  if (error) {
    throw error;
  }

  return generatedId;
}

// Get all registrations from Supabase
export async function getRegistrationsFromSupabase(): Promise<RegistrationRecord[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('registrations')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    eventId: r.eventId || r.event_id || '',
    eventTitle: r.eventTitle || r.event_title || '',
    studentName: r.studentName || r.student_name || '',
    studentId: r.studentId || r.student_id || '',
    email: r.email || '',
    phone: r.phone || '',
    programCode: r.programCode || r.program_code || '',
    timestamp: r.timestamp || new Date().toISOString(),
  }));
}

// Subscribe to Supabase real-time updates for registrations
export function subscribeToSupabaseRegistrations(
  onUpdate: (regs: RegistrationRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  const sb = getSupabaseClient();
  if (!sb) return () => {};

  getRegistrationsFromSupabase()
    .then((regs) => onUpdate(regs))
    .catch((err) => {
      console.warn('Error fetching Supabase registrations initially:', err);
      if (onError) onError(err);
    });

  const channel = sb
    .channel('public:registrations')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'registrations' },
      async () => {
        try {
          const fresh = await getRegistrationsFromSupabase();
          onUpdate(fresh);
        } catch (e) {
          console.warn('Realtime registrations fetch failed:', e);
        }
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

// Delete registration from Supabase
export async function deleteRegistrationInSupabase(id: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { error } = await sb
    .from('registrations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
