import { KpmbpEvent, RegistrationRecord } from '../types';
import {
  isSupabaseConfigured,
  subscribeToSupabaseEvents,
  createEventInSupabase,
  updateEventInSupabase,
  deleteEventInSupabase,
  saveRegistrationInSupabase,
  getRegistrationsFromSupabase,
  subscribeToSupabaseRegistrations,
  deleteRegistrationInSupabase,
  seedInitialEventsToSupabase
} from './supabase';
import {
  subscribeToEvents as subscribeToFirestoreEvents,
  createEventInFirestore,
  updateEventInFirestore,
  deleteEventInFirestore,
  saveRegistrationToFirestore,
  subscribeToRegistrations as subscribeToFirestoreRegistrations,
  deleteRegistrationFromFirestore,
  getLocalEventsCache,
  saveLocalEventsCache,
  seedEventsIfEmpty
} from './firebase';
import { INITIAL_EVENTS } from '../data/initialEvents';

export type BackendType = 'supabase' | 'firebase' | 'local';

export function getActiveBackendType(): BackendType {
  if (isSupabaseConfigured()) {
    return 'supabase';
  }
  return 'firebase';
}

export function getActiveBackendLabel(): string {
  const backend = getActiveBackendType();
  if (backend === 'supabase') return 'Supabase PostgreSQL Cloud';
  if (backend === 'firebase') return 'Firebase Firestore';
  return 'Offline Local Storage';
}

/**
 * Real-time event subscription with multi-backend failover
 */
export function subscribeToAllEvents(
  onUpdate: (events: KpmbpEvent[]) => void,
  onError?: (err: any) => void
): () => void {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    return subscribeToSupabaseEvents(
      (events) => {
        if (Array.isArray(events) && events.length > 0) {
          saveLocalEventsCache(events);
          onUpdate(events);
        } else {
          // If empty in Supabase, seed and send initial events
          seedInitialEventsToSupabase().then(() => onUpdate(INITIAL_EVENTS));
        }
      },
      (err) => {
        console.warn('Supabase subscription warning:', err);
        const cached = getLocalEventsCache();
        onUpdate(cached.length > 0 ? cached : INITIAL_EVENTS);
        if (onError) onError(err);
      }
    );
  }

  // Otherwise use Firestore / local fallback
  return subscribeToFirestoreEvents(
    (firestoreEvents) => {
      if (Array.isArray(firestoreEvents) && firestoreEvents.length > 0) {
        saveLocalEventsCache(firestoreEvents);
        onUpdate(firestoreEvents);
      } else {
        onUpdate(getLocalEventsCache());
      }
    },
    (err) => {
      console.warn('Firestore subscription fallback:', err);
      const cached = getLocalEventsCache();
      onUpdate(cached.length > 0 ? cached : INITIAL_EVENTS);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new event across active cloud backend
 */
export async function createNewEvent(eventData: Omit<KpmbpEvent, 'id'>): Promise<string> {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    try {
      return await createEventInSupabase(eventData);
    } catch (err) {
      console.error('Supabase write error, using fallback:', err);
      throw err;
    }
  }

  return await createEventInFirestore(eventData);
}

/**
 * Update an existing event in active cloud backend
 */
export async function updateExistingEvent(eventData: KpmbpEvent): Promise<void> {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    await updateEventInSupabase(eventData.id, eventData);
    return;
  }

  await updateEventInFirestore(eventData);
}

/**
 * Delete an event from active cloud backend
 */
export async function deleteExistingEvent(id: string): Promise<void> {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    await deleteEventInSupabase(id);
    return;
  }

  await deleteEventInFirestore(id);
}

/**
 * Save student registration to active cloud backend
 */
export async function saveNewRegistration(record: RegistrationRecord): Promise<string> {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    return await saveRegistrationInSupabase(record);
  }

  await saveRegistrationToFirestore(record);
  return record.id;
}


/**
  * Reset and seed default 3 official demo events
  */
export async function resetAndSeedDemoEvents(): Promise<void> {
  const backend = getActiveBackendType();
  saveLocalEventsCache(INITIAL_EVENTS);

  if (backend === 'supabase') {
    await seedInitialEventsToSupabase();
    return;
  }

  await seedEventsIfEmpty(true);
}

/**
 * Real-time registrations subscription with multi-backend failover
 */
export function subscribeToAllRegistrations(
  onUpdate: (regs: RegistrationRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    return subscribeToSupabaseRegistrations(onUpdate, onError);
  }

  return subscribeToFirestoreRegistrations(onUpdate);
}

/**
 * Delete student registration from active cloud backend
 */
export async function deleteExistingRegistration(id: string): Promise<void> {
  const backend = getActiveBackendType();

  if (backend === 'supabase') {
    await deleteRegistrationInSupabase(id);
    return;
  }

  await deleteRegistrationFromFirestore(id);
}

