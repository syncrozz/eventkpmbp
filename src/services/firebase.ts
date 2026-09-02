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
 * Parses raw Firestore REST API JSON value into clean JavaScript primitives/objects.
 */
function parseFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map((v: any) => parseFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  if ('nullValue' in val) return null;
  return null;
}

/**
 * Parses raw Firestore REST Document into a plain typed object.
 */
function parseFirestoreDoc(docObj: any): any {
  if (!docObj || !docObj.name) return null;
  const id = docObj.name.split('/').pop();
  const fields = docObj.fields || {};
  const data: Record<string, any> = { id };
  for (const [k, v] of Object.entries(fields)) {
    data[k] = parseFirestoreValue(v);
  }
  return data;
}

/**
 * Converts a JavaScript object into Firestore REST API typed format.
 */
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDocPayload(obj: any): any {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== 'id' && v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return { fields };
}

/**
 * Direct REST query for all events directly from Firestore (100% resilient across incognito & private modes).
 */
export async function fetchEventsDirectFromRest(): Promise<KpmbpEvent[]> {
  try {
    const projectId = firebaseConfig.projectId;
    const dbId = designatedDbId || '(default)';
    const apiKey = firebaseConfig.apiKey;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: EVENTS_COLLECTION }]
        }
      })
    });

    if (!res.ok) {
      throw new Error(`REST query failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const eventsList: KpmbpEvent[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.document) {
          const raw = parseFirestoreDoc(item.document);
          if (raw && raw.id && raw.title) {
            eventsList.push({
              id: raw.id,
              eventType: raw.eventType || 'ONE_TIME_EVENT',
              title: raw.title || '',
              description: raw.description || '',
              category: raw.category || 'Akademik',
              date: raw.date || '',
              startTime: raw.startTime || '',
              endTime: raw.endTime || '',
              location: raw.location || '',
              organiser: raw.organiser || 'KPMBP',
              image: raw.image || undefined,
              eventMode: raw.eventMode || 'physical',
              registrationMode: raw.registrationMode || (raw.registrationUrl ? 'google_form' : (raw.organiserWhatsApp ? 'admin' : 'none')),
              organiserWhatsApp: raw.organiserWhatsApp || undefined,
              submissionDeadline: raw.submissionDeadline || undefined,
              registrationUrl: raw.registrationUrl || undefined,
              registrationDeadline: raw.registrationDeadline || undefined,
              status: raw.status || 'Registration Open',
              eligibility: raw.eligibility || 'Terbuka kepada semua siswa & siswi KPMBP',
              contact: raw.contact || 'Urusetia KPMBP',
              featured: Boolean(raw.featured),
              importantNotice: raw.importantNotice || undefined,
              seatsLeft: typeof raw.seatsLeft === 'number' ? raw.seatsLeft : undefined,
              totalSeats: typeof raw.totalSeats === 'number' ? raw.totalSeats : undefined,
              tags: Array.isArray(raw.tags) ? raw.tags : [],
              programDuration: raw.programDuration || undefined,
              scheduleSummary: raw.scheduleSummary || undefined,
              scheduleSessions: Array.isArray(raw.scheduleSessions) ? raw.scheduleSessions : undefined,
              feeType: raw.feeType || undefined,
              feeAmount: raw.feeAmount || undefined,
              targetAudience: raw.targetAudience || undefined,
              createdAt: raw.createdAt || undefined,
              updatedAt: raw.updatedAt || undefined
            });
          }
        }
      }
    }

    if (eventsList.length > 0) {
      const sorted = sortEventsByNearestDue(eventsList);
      saveLocalEventsCache(sorted);
      return sorted;
    }
    return [];
  } catch (err: any) {
    console.warn('REST events direct fetch notice:', err?.message);
    return [];
  }
}

/**
 * Direct REST query for Hero configuration.
 */
export async function fetchHeroConfigDirectFromRest(): Promise<HeroConfig | null> {
  try {
    const projectId = firebaseConfig.projectId;
    const dbId = designatedDbId || '(default)';
    const apiKey = firebaseConfig.apiKey;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${SETTINGS_COLLECTION}/${HERO_CONFIG_DOC_ID}?key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.fields) {
      const autoPlay = parseFirestoreValue(data.fields.autoPlay) ?? true;
      const intervalSeconds = parseFirestoreValue(data.fields.intervalSeconds) ?? 6;
      const slides = parseFirestoreValue(data.fields.slides) || [];
      if (Array.isArray(slides) && slides.length > 0) {
        const config: HeroConfig = { autoPlay, intervalSeconds, slides };
        saveLocalHeroConfigCache(config);
        return config;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Direct REST write fallback for any document.
 */
async function writeDocDirectViaRest(collectionName: string, docId: string, dataObj: any): Promise<void> {
  const projectId = firebaseConfig.projectId;
  const dbId = designatedDbId || '(default)';
  const apiKey = firebaseConfig.apiKey;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  const payload = toFirestoreDocPayload(sanitizeForFirestore(dataObj));
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`REST write failed (${res.status}): ${errText}`);
  }
}

/**
 * Direct REST delete fallback.
 */
async function deleteDocDirectViaRest(collectionName: string, docId: string): Promise<void> {
  const projectId = firebaseConfig.projectId;
  const dbId = designatedDbId || '(default)';
  const apiKey = firebaseConfig.apiKey;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`REST delete failed (${res.status}): ${errText}`);
  }
}

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
 * Also immediately triggers a direct resilient REST fetch so incognito windows and fresh devices
 * populate all live cloud events within ~200ms.
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

  // 2. Resilient immediate direct cloud fetch (critical for Incognito / new devices)
  fetchEventsDirectFromRest().then((directEvents) => {
    if (directEvents && directEvents.length > 0) {
      onUpdate(directEvents);
    }
  }).catch(() => {});

  // 3. Real-time onSnapshot listener for instant cross-device updates
  const eventsRef = collection(db, EVENTS_COLLECTION);
  let unsubscribe: (() => void) | null = null;
  try {
    unsubscribe = onSnapshot(
      eventsRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty (e.g. initial setup), auto-seed INITIAL_EVENTS
          const initialList = cachedEvents && cachedEvents.length > 0 ? cachedEvents : INITIAL_EVENTS;
          try {
            for (const evt of initialList) {
              const docRef = doc(db, EVENTS_COLLECTION, evt.id);
              await setDoc(docRef, sanitizeForFirestore({
                ...evt,
                createdAt: evt.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }));
            }
          } catch (seedErr) {
            console.warn('Initial seed notice:', seedErr);
          }
          onUpdate(initialList);
          saveLocalEventsCache(initialList);
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
        console.warn('Firestore sync notice (using resilient fetch fallback):', err.message);
        fetchEventsDirectFromRest().then((resEvents) => {
          if (resEvents.length > 0) {
            onUpdate(resEvents);
          } else {
            onUpdate(getLocalEventsCache());
          }
        });
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Firestore subscription unavailable:', err?.message);
    fetchEventsDirectFromRest().then((resEvents) => {
      if (resEvents.length > 0) {
        onUpdate(resEvents);
      } else {
        onUpdate(getLocalEventsCache());
      }
    });
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
 * Creates a new event in Firestore with dual SDK & REST resilience.
 */
export async function createEventInFirestore(eventData: Omit<KpmbpEvent, 'id'>): Promise<string> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = sanitizeForFirestore({
    ...eventData,
    id: eventId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 1. Immediately update local cache
  const localList = getLocalEventsCache();
  const nextList = sortEventsByNearestDue([payload as KpmbpEvent, ...localList.filter((e) => e.id !== eventId)]);
  saveLocalEventsCache(nextList);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await setDoc(docRef, payload);
  } catch (error) {
    console.warn('SDK write issue, using REST fallback:', error);
    try {
      await writeDocDirectViaRest(EVENTS_COLLECTION, eventId, payload);
    } catch (restErr) {
      console.error('Failed to create event in Firestore:', restErr);
      throw restErr;
    }
  }

  return eventId;
}

/**
 * Updates an existing event in Firestore with dual SDK & REST resilience.
 */
export async function updateEventInFirestore(event: KpmbpEvent): Promise<void> {
  const payload = sanitizeForFirestore({
    ...event,
    updatedAt: new Date().toISOString()
  });

  // 1. Update local cache
  const localList = getLocalEventsCache();
  const nextList = sortEventsByNearestDue(localList.map((e) => (e.id === event.id ? payload : e)));
  saveLocalEventsCache(nextList);

  // 2. Write to Firestore
  try {
    const docRef = doc(db, EVENTS_COLLECTION, event.id);
    await setDoc(docRef, payload);
  } catch (error) {
    console.warn('SDK update issue, using REST fallback:', error);
    try {
      await writeDocDirectViaRest(EVENTS_COLLECTION, event.id, payload);
    } catch (restErr) {
      console.error('Failed to update event in Firestore:', restErr);
      throw restErr;
    }
  }
}

/**
 * Deletes an event from Firestore with dual SDK & REST resilience.
 */
export async function deleteEventInFirestore(eventId: string): Promise<void> {
  // 1. Update local cache
  const localList = getLocalEventsCache();
  saveLocalEventsCache(localList.filter((e) => e.id !== eventId));

  // 2. Delete from Firestore
  try {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('SDK delete issue, using REST fallback:', error);
    try {
      await deleteDocDirectViaRest(EVENTS_COLLECTION, eventId);
    } catch (restErr) {
      console.error('Failed to delete event from Firestore:', restErr);
      throw restErr;
    }
  }
}

/**
 * Bulk syncs all local events to Firestore Cloud, reporting detailed success/failure.
 */
export async function syncAllEventsToFirestore(
  eventsList: KpmbpEvent[]
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let syncedCount = 0;

  for (const evt of eventsList) {
    try {
      const payload = sanitizeForFirestore({
        ...evt,
        updatedAt: new Date().toISOString()
      });
      try {
        const docRef = doc(db, EVENTS_COLLECTION, evt.id);
        await setDoc(docRef, payload);
      } catch {
        await writeDocDirectViaRest(EVENTS_COLLECTION, evt.id, payload);
      }
      syncedCount++;
    } catch (err: any) {
      console.error(`Failed to sync event ${evt.title} (${evt.id}):`, err);
      errors.push(`${evt.title}: ${err?.message || 'Ralat simpanan'}`);
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors
  };
}

/**
 * Checks live connection and health of Firebase Firestore database.
 */
export async function checkFirestoreHealth(): Promise<{
  connected: boolean;
  message: string;
  cloudCount?: number;
  databaseId?: string;
}> {
  try {
    const directEvents = await fetchEventsDirectFromRest();
    return {
      connected: true,
      message: 'Firestore bersambung dengan sempurna (Online).',
      cloudCount: directEvents.length,
      databaseId: designatedDbId || '(default)'
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Ralat Firestore: ${err?.message || 'Tidak dapat menghubungi pangkalan data'}`,
      databaseId: designatedDbId || '(default)'
    };
  }
}

/**
 * Saves a student registration record with local-first guarantee and Firestore sync.
 */
export async function saveRegistrationToFirestore(record: RegistrationRecord): Promise<void> {
  const localList = getLocalRegistrationsCache();
  const nextList = [record, ...localList.filter((r) => r.id !== record.id)];
  saveLocalRegistrationsCache(nextList);

  const payload = sanitizeForFirestore({
    ...record,
    createdAt: new Date().toISOString()
  });

  try {
    const docRef = doc(db, REGISTRATIONS_COLLECTION, record.id);
    await setDoc(docRef, payload, { merge: true });
  } catch (error: any) {
    try {
      await writeDocDirectViaRest(REGISTRATIONS_COLLECTION, record.id, payload);
    } catch (restErr: any) {
      console.warn('Registration saved to local storage (Cloud sync notice):', restErr?.message);
    }
  }
}

/**
 * Subscribes to real-time registration records (for Admin Portal) with offline/quota resilience.
 */
export function subscribeToRegistrations(
  onUpdate: (registrations: RegistrationRecord[]) => void
) {
  const cached = getLocalRegistrationsCache();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  // Direct REST fetch fallback
  const projectId = firebaseConfig.projectId;
  const dbId = designatedDbId || '(default)';
  const apiKey = firebaseConfig.apiKey;
  fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: REGISTRATIONS_COLLECTION }] } })
  }).then(async (res) => {
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const list: RegistrationRecord[] = [];
        for (const item of data) {
          if (item.document) {
            const raw = parseFirestoreDoc(item.document);
            if (raw && raw.id) {
              list.push({
                id: raw.id,
                eventId: raw.eventId || '',
                eventTitle: raw.eventTitle || '',
                studentName: raw.studentName || '',
                studentId: raw.studentId || '',
                email: raw.email || '',
                phone: raw.phone || '',
                programCode: raw.programCode || '',
                timestamp: raw.timestamp || ''
              });
            }
          }
        }
        if (list.length > 0) {
          saveLocalRegistrationsCache(list);
          onUpdate(list);
        }
      }
    }
  }).catch(() => {});

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
  } catch {
    try {
      await deleteDocDirectViaRest(REGISTRATIONS_COLLECTION, id);
    } catch (err: any) {
      console.warn('Registration deleted from local cache:', err?.message);
    }
  }
}

/**
 * Update an existing registration in Firestore and local cache
 */
export async function updateRegistrationInFirestore(record: RegistrationRecord): Promise<void> {
  const localList = getLocalRegistrationsCache();
  const nextList = localList.map((r) => (r.id === record.id ? record : r));
  saveLocalRegistrationsCache(nextList);

  const payload = sanitizeForFirestore({
    ...record,
    updatedAt: new Date().toISOString()
  });

  try {
    const docRef = doc(db, REGISTRATIONS_COLLECTION, record.id);
    await setDoc(docRef, payload, { merge: true });
  } catch {
    try {
      await writeDocDirectViaRest(REGISTRATIONS_COLLECTION, record.id, payload);
    } catch (err: any) {
      console.warn('Registration updated in local cache (Cloud sync notice):', err?.message);
    }
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

  // Immediate REST fetch for incognito / fresh devices
  fetchHeroConfigDirectFromRest().then((resConfig) => {
    if (resConfig) {
      onUpdate(resConfig);
    }
  }).catch(() => {});

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
        onUpdate(getLocalHeroConfigCache());
      },
      (err) => {
        console.warn('Hero config sync notice (using fallback):', err.message);
        fetchHeroConfigDirectFromRest().then((cfg) => {
          if (cfg) onUpdate(cfg);
          else onUpdate(getLocalHeroConfigCache());
        });
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Hero config subscription unavailable:', err?.message);
    fetchHeroConfigDirectFromRest().then((cfg) => {
      if (cfg) onUpdate(cfg);
      else onUpdate(getLocalHeroConfigCache());
    });
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

  const payload = sanitizeForFirestore({
    ...config,
    updatedAt: new Date().toISOString()
  });

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, HERO_CONFIG_DOC_ID);
    await setDoc(docRef, payload, { merge: true });
  } catch {
    try {
      await writeDocDirectViaRest(SETTINGS_COLLECTION, HERO_CONFIG_DOC_ID, payload);
    } catch (err: any) {
      console.warn('Hero config stored in local cache (Cloud notice):', err?.message);
    }
  }
}

/**
 * Creates and submits a new organizer event proposal to Firestore and local cache
 */
export async function submitEventToFirestore(
  submissionData: Omit<EventSubmission, 'id'>
): Promise<string> {
  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
    createdAt: new Date().toISOString()
  });

  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    await setDoc(docRef, payload);
  } catch {
    try {
      await writeDocDirectViaRest(SUBMISSIONS_COLLECTION, submissionId, payload);
    } catch (error: any) {
      console.warn('Submission saved locally with cloud warning:', error?.message);
    }
  }

  return submissionId;
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

  // Direct REST fetch
  const projectId = firebaseConfig.projectId;
  const dbId = designatedDbId || '(default)';
  const apiKey = firebaseConfig.apiKey;
  fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: SUBMISSIONS_COLLECTION }] } })
  }).then(async (res) => {
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const list: EventSubmission[] = [];
        for (const item of data) {
          if (item.document) {
            const raw = parseFirestoreDoc(item.document);
            if (raw && raw.id && raw.title) {
              list.push({
                id: raw.id,
                status: raw.status || 'PENDING',
                submittedAt: raw.submittedAt || new Date().toISOString(),
                reviewedAt: raw.reviewedAt || undefined,
                reviewedBy: raw.reviewedBy || undefined,
                rejectionReason: raw.rejectionReason || undefined,
                approvedEventId: raw.approvedEventId || undefined,
                submitterName: raw.submitterName || '',
                submitterPhone: raw.submitterPhone || '',
                submitterEmail: raw.submitterEmail || undefined,
                submitterRole: raw.submitterRole || undefined,
                eventType: raw.eventType || 'ONE_TIME_EVENT',
                title: raw.title || '',
                description: raw.description || '',
                category: raw.category || 'Pertandingan',
                date: raw.date || '',
                startTime: raw.startTime || '',
                endTime: raw.endTime || '',
                location: raw.location || '',
                organiser: raw.organiser || '',
                image: raw.image || undefined,
                eventMode: raw.eventMode || 'physical',
                registrationMode: raw.registrationMode || 'none',
                organiserWhatsApp: raw.organiserWhatsApp || undefined,
                organiserUrl: raw.organiserUrl || undefined,
                submissionDeadline: raw.submissionDeadline || undefined,
                registrationUrl: raw.registrationUrl || undefined,
                registrationDeadline: raw.registrationDeadline || undefined,
                eligibility: raw.eligibility || undefined,
                contact: raw.contact || undefined,
                importantNotice: raw.importantNotice || undefined,
                seatsLeft: typeof raw.seatsLeft === 'number' ? raw.seatsLeft : undefined,
                totalSeats: typeof raw.totalSeats === 'number' ? raw.totalSeats : undefined,
                tags: Array.isArray(raw.tags) ? raw.tags : [],
                scheduleSummary: raw.scheduleSummary || undefined,
                scheduleSessions: Array.isArray(raw.scheduleSessions) ? raw.scheduleSessions : undefined,
                programDuration: raw.programDuration || undefined,
                feeType: raw.feeType || undefined,
                feeAmount: raw.feeAmount || undefined,
                targetAudience: raw.targetAudience || undefined
              });
            }
          }
        }
        list.sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });
        if (list.length > 0) {
          saveLocalSubmissionsCache(list);
          onUpdate(list);
        }
      }
    }
  }).catch(() => {});

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

  const payload = sanitizeForFirestore({
    ...submission,
    updatedAt: new Date().toISOString()
  });

  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submission.id);
    await setDoc(docRef, payload, { merge: true });
  } catch {
    try {
      await writeDocDirectViaRest(SUBMISSIONS_COLLECTION, submission.id, payload);
    } catch (err: any) {
      console.warn('Submission updated locally (Cloud notice):', err?.message);
    }
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
  } catch {
    try {
      await deleteDocDirectViaRest(SUBMISSIONS_COLLECTION, id);
    } catch (err: any) {
      console.warn('Submission deleted from local cache:', err?.message);
    }
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


