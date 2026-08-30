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
import { KpmbpEvent, RegistrationRecord, HeroConfig, DEFAULT_HERO_CONFIG, EventSubmission } from '../types';
import { INITIAL_EVENTS } from '../data/initialEvents';
import { sortEventsByNearestDue } from '../utils/calendar';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Database ID configured in applet settings
const designatedDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Initialize primary and fallback instances with ignoreUndefinedProperties & forced long polling
let primaryDb;
try {
  primaryDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  }, designatedDbId);
} catch {
  primaryDb = designatedDbId ? getFirestore(app, designatedDbId) : getFirestore(app);
}

export const db = primaryDb;

const EVENTS_COLLECTION = 'events';
const REGISTRATIONS_COLLECTION = 'registrations';
const SETTINGS_COLLECTION = 'settings';
const SUBMISSIONS_COLLECTION = 'eventSubmissions';
const HERO_CONFIG_DOC_ID = 'hero_carousel';

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

// Helper to load stored Hero Carousel config cache
export function getLocalHeroConfigCache(): HeroConfig {
  if (typeof window === 'undefined') return DEFAULT_HERO_CONFIG;
  try {
    const raw = localStorage.getItem('kpmbp_hero_config_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_HERO_CONFIG;
}

// Helper to save stored Hero Carousel config cache
export function saveLocalHeroConfigCache(config: HeroConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kpmbp_hero_config_v1', JSON.stringify(config));
  } catch {}
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

// Helper to load stored submissions cache
export function getLocalSubmissionsCache(): EventSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('kpmbp_submissions_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

// Helper to save stored submissions cache
export function saveLocalSubmissionsCache(submissions: EventSubmission[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kpmbp_submissions_v1', JSON.stringify(submissions));
  } catch {}
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
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate([]);
          saveLocalEventsCache([]);
          return;
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

        const sortedEvents = sortEventsByNearestDue(eventsList);
        saveLocalEventsCache(sortedEvents);
        onUpdate(sortedEvents);
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

  // 2. Attempt Firestore sync with deterministic document ID (record.id)
  try {
    const docRef = doc(db, REGISTRATIONS_COLLECTION, record.id);
    const payload = sanitizeForFirestore({
      ...record,
      createdAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
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

/**
 * Update an existing registration in Firestore and local cache
 */
export async function updateRegistrationInFirestore(record: RegistrationRecord): Promise<void> {
  const localList = getLocalRegistrationsCache();
  const nextList = localList.map((r) => (r.id === record.id ? record : r));
  saveLocalRegistrationsCache(nextList);

  try {
    const docRef = doc(db, REGISTRATIONS_COLLECTION, record.id);
    const payload = sanitizeForFirestore({
      ...record,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.warn('Registration updated in local cache (Cloud sync notice):', err?.message);
  }
}

/**
 * Subscribes to real-time Hero Carousel configuration updates in Firestore
 */
export function subscribeToHeroConfig(
  onUpdate: (config: HeroConfig) => void,
  onError?: (err: Error) => void
) {
  // Emit local cached config first
  const cached = getLocalHeroConfigCache();
  onUpdate(cached);

  const docRef = doc(db, SETTINGS_COLLECTION, HERO_CONFIG_DOC_ID);
  let unsubscribe: (() => void) | null = null;

  try {
    unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.slides)) {
            const config: HeroConfig = {
              autoPlay: data.autoPlay ?? true,
              intervalSeconds: typeof data.intervalSeconds === 'number' ? data.intervalSeconds : 6,
              slides: data.slides
            };
            saveLocalHeroConfigCache(config);
            onUpdate(config);
            return;
          }
        }
        // If doc doesn't exist yet, preserve cached or default
        onUpdate(getLocalHeroConfigCache());
      },
      (err) => {
        console.warn('Hero config sync notice (using local storage):', err.message);
        onUpdate(getLocalHeroConfigCache());
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Hero config subscription unavailable:', err?.message);
    onUpdate(getLocalHeroConfigCache());
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
 * Saves the Hero Carousel configuration to Firestore and local storage cache
 */
export async function saveHeroConfigToFirestore(config: HeroConfig): Promise<void> {
  // 1. Immediately cache locally
  saveLocalHeroConfigCache(config);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, HERO_CONFIG_DOC_ID);
    const payload = sanitizeForFirestore({
      ...config,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.warn('Hero config stored in local cache (Cloud notice):', err?.message);
  }
}

/**
 * Creates and submits a new organizer event proposal to Firestore and local cache
 */
export async function submitEventToFirestore(
  submissionData: Omit<EventSubmission, 'id'>
): Promise<string> {
  try {
    const subRef = collection(db, SUBMISSIONS_COLLECTION);
    const newDoc = doc(subRef);
    const submissionId = newDoc.id;

    const fullRecord: EventSubmission = {
      ...submissionData,
      id: submissionId,
      status: 'PENDING',
      submittedAt: submissionData.submittedAt || new Date().toISOString()
    };

    // 1. Update local cache immediately
    const local = getLocalSubmissionsCache();
    saveLocalSubmissionsCache([fullRecord, ...local.filter((s) => s.id !== submissionId)]);

    // 2. Write to Firestore
    const payload = sanitizeForFirestore({
      ...fullRecord,
      createdAt: serverTimestamp()
    });
    await setDoc(newDoc, payload);

    return submissionId;
  } catch (error: any) {
    console.warn('Submission saved locally with cloud warning:', error?.message);
    // If Firestore failed, ensure local has the entry
    return `local_${Date.now()}`;
  }
}

/**
 * Subscribes to real-time event submissions for Admin review
 */
export function subscribeToSubmissions(
  onUpdate: (submissions: EventSubmission[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Emit local cache immediately
  const cached = getLocalSubmissionsCache();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const subRef = collection(db, SUBMISSIONS_COLLECTION);
  let unsubscribe: (() => void) | null = null;

  try {
    unsubscribe = onSnapshot(
      subRef,
      (snapshot) => {
        const list: EventSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            status: data.status || 'PENDING',
            submittedAt: data.submittedAt || new Date().toISOString(),
            reviewedAt: data.reviewedAt || undefined,
            reviewedBy: data.reviewedBy || undefined,
            rejectionReason: data.rejectionReason || undefined,
            approvedEventId: data.approvedEventId || undefined,
            submitterName: data.submitterName || '',
            submitterPhone: data.submitterPhone || '',
            submitterEmail: data.submitterEmail || undefined,
            submitterRole: data.submitterRole || undefined,
            eventType: data.eventType || 'ONE_TIME_EVENT',
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'Pertandingan',
            date: data.date || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            location: data.location || '',
            organiser: data.organiser || '',
            image: data.image || undefined,
            eventMode: data.eventMode || 'physical',
            registrationMode: data.registrationMode || 'none',
            organiserWhatsApp: data.organiserWhatsApp || undefined,
            organiserUrl: data.organiserUrl || undefined,
            submissionDeadline: data.submissionDeadline || undefined,
            registrationUrl: data.registrationUrl || undefined,
            registrationDeadline: data.registrationDeadline || undefined,
            eligibility: data.eligibility || undefined,
            contact: data.contact || undefined,
            importantNotice: data.importantNotice || undefined,
            seatsLeft: typeof data.seatsLeft === 'number' ? data.seatsLeft : undefined,
            totalSeats: typeof data.totalSeats === 'number' ? data.totalSeats : undefined,
            tags: Array.isArray(data.tags) ? data.tags : [],
            scheduleSummary: data.scheduleSummary || undefined,
            scheduleSessions: Array.isArray(data.scheduleSessions) ? data.scheduleSessions : undefined,
            programDuration: data.programDuration || undefined,
            feeType: data.feeType || undefined,
            feeAmount: data.feeAmount || undefined,
            targetAudience: data.targetAudience || undefined
          });
        });

        // Sort: PENDING first, then by submittedAt desc
        list.sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });

        saveLocalSubmissionsCache(list);
        onUpdate(list);
      },
      (err) => {
        console.warn('Submissions sync notice (using local cache):', err.message);
        onUpdate(getLocalSubmissionsCache());
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Submissions subscription unavailable:', err?.message);
    onUpdate(getLocalSubmissionsCache());
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
 * Updates a submission in Firestore and local cache
 */
export async function updateSubmissionInFirestore(submission: EventSubmission): Promise<void> {
  const localList = getLocalSubmissionsCache();
  const nextList = localList.map((s) => (s.id === submission.id ? submission : s));
  saveLocalSubmissionsCache(nextList);

  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submission.id);
    const payload = sanitizeForFirestore({
      ...submission,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.warn('Submission updated locally (Cloud notice):', err?.message);
  }
}

/**
 * Deletes a submission from Firestore and local cache
 */
export async function deleteSubmissionFromFirestore(id: string): Promise<void> {
  const localList = getLocalSubmissionsCache();
  saveLocalSubmissionsCache(localList.filter((s) => s.id !== id));

  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Submission deleted from local cache:', err?.message);
  }
}

/**
 * Rejects an event submission with optional reason
 */
export async function rejectSubmissionInFirestore(submissionId: string, reason?: string): Promise<void> {
  const localList = getLocalSubmissionsCache();
  const target = localList.find((s) => s.id === submissionId);
  const now = new Date().toISOString();

  if (target) {
    const updated: EventSubmission = {
      ...target,
      status: 'REJECTED',
      rejectionReason: reason || 'Ditolak oleh pentadbir',
      reviewedAt: now,
      reviewedBy: 'Admin KPMBP'
    };
    await updateSubmissionInFirestore(updated);
  } else {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      await setDoc(
        docRef,
        {
          status: 'REJECTED',
          rejectionReason: reason || 'Ditolak oleh pentadbir',
          reviewedAt: now,
          reviewedBy: 'Admin KPMBP',
          updatedAt: now
        },
        { merge: true }
      );
    } catch (err) {}
  }
}

/**
 * Idempotently approves a submission and publishes it to the official events collection
 */
export async function approveSubmissionInFirestore(
  submission: EventSubmission,
  finalEventPayload: Omit<KpmbpEvent, 'id'>
): Promise<string> {
  // 1. Check idempotency: If already approved and has approvedEventId, return that
  if (submission.status === 'APPROVED' && submission.approvedEventId) {
    return submission.approvedEventId;
  }

  // 2. Create the official event in events collection
  const newEventId = await createEventInFirestore(finalEventPayload);

  // 3. Mark submission as APPROVED and link approvedEventId
  const now = new Date().toISOString();
  const updatedSubmission: EventSubmission = {
    ...submission,
    ...finalEventPayload,
    status: 'APPROVED',
    approvedEventId: newEventId,
    reviewedAt: now,
    reviewedBy: 'Admin KPMBP'
  };

  await updateSubmissionInFirestore(updatedSubmission);
  return newEventId;
}


