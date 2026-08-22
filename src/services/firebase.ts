import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  addDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { KpmbpEvent, RegistrationRecord } from '../types';
import { INITIAL_EVENTS } from '../data/initialEvents';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Database ID configured in applet settings
const designatedDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Initialize primary and fallback instances with ignoreUndefinedProperties
let primaryDb;
try {
  primaryDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  }, designatedDbId);
} catch {
  primaryDb = designatedDbId ? getFirestore(app, designatedDbId) : getFirestore(app);
}

export const db = primaryDb;

const EVENTS_COLLECTION = 'events';
const REGISTRATIONS_COLLECTION = 'registrations';

/**
 * Deeply sanitizes any object or array by removing `undefined` keys
 * and ensuring values are safe for Firestore write operations.
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item));
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

// Helper to load stored events cache
export function getLocalEventsCache(): KpmbpEvent[] {
  if (typeof window === 'undefined') return INITIAL_EVENTS;
  try {
    const raw = localStorage.getItem('kpmbp_events_v2');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_EVENTS;
}

// Helper to save stored events cache
export function saveLocalEventsCache(events: KpmbpEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kpmbp_events_v2', JSON.stringify(events));
  } catch {}
}

// Helper to load stored registrations cache
export function getLocalRegistrationsCache(): RegistrationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('kpmbp_registrations_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

// Helper to save stored registrations cache
export function saveLocalRegistrationsCache(registrations: RegistrationRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kpmbp_registrations_v1', JSON.stringify(registrations));
  } catch {}
}

/**
 * Seeds initial event data into Firestore if collection is empty or when manually requested.
 */
export async function seedEventsIfEmpty(force = false): Promise<void> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    
    // Only attempt seed if not quota blocked or when user explicitly requested
    if (force) {
      const batch = writeBatch(db);
      for (const event of INITIAL_EVENTS) {
        const docRef = doc(db, EVENTS_COLLECTION, event.id);
        const payload = sanitizeForFirestore({
          ...event,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        batch.set(docRef, payload);
      }
      await batch.commit();
    }
    saveLocalEventsCache(INITIAL_EVENTS);
    try { localStorage.setItem('kpmbp_has_seeded', 'true'); } catch {}
  } catch (error: any) {
    console.warn('Notice: Firestore seeding skipped or quota reached, using local dataset.', error?.message);
    saveLocalEventsCache(INITIAL_EVENTS);
  }
}

/**
 * Subscribes to real-time events updates in Firestore with automatic offline/quota fallback.
 */
export function subscribeToEvents(
  onUpdate: (events: KpmbpEvent[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Immediately emit cached data so UI is fast and resilient
  const cachedEvents = getLocalEventsCache();
  if (cachedEvents.length > 0) {
    onUpdate(cachedEvents);
  }

  const eventsRef = collection(db, EVENTS_COLLECTION);
  
  let unsubscribe: (() => void) | null = null;
  try {
    unsubscribe = onSnapshot(
      eventsRef,
      async (snapshot) => {
        if (snapshot.empty) {
          const alreadySeeded = typeof window !== 'undefined' && localStorage.getItem('kpmbp_has_seeded') === 'true';
          if (!alreadySeeded) {
            try { localStorage.setItem('kpmbp_has_seeded', 'true'); } catch {}
            await seedEventsIfEmpty(true);
            onUpdate(INITIAL_EVENTS);
            return;
          } else {
            onUpdate([]);
            saveLocalEventsCache([]);
            return;
          }
        }

        const eventsList: KpmbpEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          eventsList.push({
            id: docSnap.id,
            eventType: data.eventType || 'ONE_TIME_EVENT',
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'Akademik',
            date: data.date || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            location: data.location || '',
            organiser: data.organiser || 'KPMBP',
            image: data.image || undefined,
            eventMode: data.eventMode || 'physical',
            registrationMode: data.registrationMode || (data.registrationUrl ? 'google_form' : (data.organiserWhatsApp ? 'admin' : 'none')),
            organiserWhatsApp: data.organiserWhatsApp || undefined,
            submissionDeadline: data.submissionDeadline || undefined,
            registrationUrl: data.registrationUrl || undefined,
            registrationDeadline: data.registrationDeadline || undefined,
            status: data.status || 'Registration Open',
            eligibility: data.eligibility || 'Terbuka kepada semua siswa & siswi KPMBP',
            contact: data.contact || 'Urusetia KPMBP',
            featured: data.featured || false,
            importantNotice: data.importantNotice || undefined,
            seatsLeft: typeof data.seatsLeft === 'number' ? data.seatsLeft : undefined,
            totalSeats: typeof data.totalSeats === 'number' ? data.totalSeats : undefined,
            tags: Array.isArray(data.tags) ? data.tags : [],
            programDuration: data.programDuration || undefined,
            scheduleSummary: data.scheduleSummary || undefined,
            scheduleSessions: Array.isArray(data.scheduleSessions) ? data.scheduleSessions : undefined,
            feeType: data.feeType || undefined,
            feeAmount: data.feeAmount || undefined,
            targetAudience: data.targetAudience || undefined,
            createdAt: data.createdAt || undefined,
            updatedAt: data.updatedAt || undefined
          });
        });

        eventsList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        saveLocalEventsCache(eventsList);
        onUpdate(eventsList);
      },
      (err) => {
        // Quota exceeded or connection error handled gracefully
        console.warn('Firestore sync notice (using local storage fallback):', err.message);
        const fallback = getLocalEventsCache();
        onUpdate(fallback);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Firestore subscription unavailable:', err?.message);
    const fallback = getLocalEventsCache();
    onUpdate(fallback);
    if (onError) onError(err);
  }

  return () => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {}
    }
  };
}

/**
 * Creates a new event in Firestore.
 */
export async function createEventInFirestore(eventData: Omit<KpmbpEvent, 'id'>): Promise<string> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const newDocRef = doc(eventsRef);
    const eventId = newDocRef.id;

    const payload = sanitizeForFirestore({
      ...eventData,
      id: eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await setDoc(newDocRef, payload);
    return eventId;
  } catch (error) {
    console.error('Error in createEventInFirestore:', error);
    throw error;
  }
}

/**
 * Updates an existing event in Firestore.
 */
export async function updateEventInFirestore(event: KpmbpEvent): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, event.id);
    const payload = sanitizeForFirestore({
      ...event,
      updatedAt: new Date().toISOString()
    });
    // Set doc cleanly so updated title, dates, deadlines, and fields replace old version
    await setDoc(docRef, payload);
  } catch (error) {
    console.error('Error in updateEventInFirestore:', error);
    throw error;
  }
}

/**
 * Deletes an event from Firestore.
 */
export async function deleteEventInFirestore(eventId: string): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error in deleteEventInFirestore:', error);
    throw error;
  }
}

/**
 * Saves a student registration record with local-first guarantee and Firestore sync.
 */
export async function saveRegistrationToFirestore(record: RegistrationRecord): Promise<void> {
  // 1. Immediately save to local registrations cache
  const localList = getLocalRegistrationsCache();
  const nextList = [record, ...localList.filter((r) => r.id !== record.id)];
  saveLocalRegistrationsCache(nextList);

  // 2. Attempt Firestore sync
  try {
    const regRef = collection(db, REGISTRATIONS_COLLECTION);
    const payload = sanitizeForFirestore({
      ...record,
      createdAt: serverTimestamp()
    });
    await addDoc(regRef, payload);
  } catch (error: any) {
    console.warn('Registration saved to local storage (Cloud sync notice):', error?.message);
    // Don't throw if local was saved successfully
  }
}

/**
 * Subscribes to real-time registration records (for Admin Portal) with offline/quota resilience.
 */
export function subscribeToRegistrations(
  onUpdate: (registrations: RegistrationRecord[]) => void
) {
  // 1. Emit local cached registrations immediately
  const cached = getLocalRegistrationsCache();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const regRef = collection(db, REGISTRATIONS_COLLECTION);
  let unsubscribe: (() => void) | null = null;
  
  try {
    unsubscribe = onSnapshot(
      regRef, 
      (snapshot) => {
        const list: RegistrationRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            eventId: data.eventId || '',
            eventTitle: data.eventTitle || '',
            studentName: data.studentName || '',
            studentId: data.studentId || '',
            email: data.email || '',
            phone: data.phone || '',
            programCode: data.programCode || '',
            timestamp: data.timestamp || ''
          });
        });
        saveLocalRegistrationsCache(list);
        onUpdate(list);
      }, 
      (err) => {
        console.warn('Registrations sync notice (using local storage):', err.message);
        onUpdate(getLocalRegistrationsCache());
      }
    );
  } catch (err: any) {
    console.warn('Registrations subscription unavailable:', err?.message);
    onUpdate(getLocalRegistrationsCache());
  }

  return () => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {}
    }
  };
}

/**
 * Delete a registration from Firestore and local cache
 */
export async function deleteRegistrationFromFirestore(id: string): Promise<void> {
  const localList = getLocalRegistrationsCache();
  saveLocalRegistrationsCache(localList.filter((r) => r.id !== id));

  try {
    const docRef = doc(db, REGISTRATIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Registration deleted from local cache:', err?.message);
  }
}
