import { KpmbpEvent, RegistrationRecord, HeroConfig, DEFAULT_HERO_CONFIG } from '../types';
import {
  subscribeToEvents as subscribeToFirestoreEvents,
  createEventInFirestore,
  updateEventInFirestore,
  deleteEventInFirestore,
  saveRegistrationToFirestore,
  subscribeToRegistrations as subscribeToFirestoreRegistrations,
  deleteRegistrationFromFirestore,
  updateRegistrationInFirestore,
  getLocalEventsCache,
  saveLocalEventsCache,
  seedEventsIfEmpty,
  getLocalHeroConfigCache,
  saveLocalHeroConfigCache,
  subscribeToHeroConfig as subscribeToFirestoreHeroConfig,
  saveHeroConfigToFirestore,
  db
} from './firebase';
import { INITIAL_EVENTS } from '../data/initialEvents';

export type BackendType = 'firebase' | 'local';

export function getActiveBackendType(): BackendType {
  return db ? 'firebase' : 'local';
}

export function getActiveBackendLabel(): string {
  return db ? 'Firebase Firestore Cloud' : 'Offline Local Storage';
}

/**
 * Real-time event subscription with Firestore & local cache fallback
 */
export function subscribeToAllEvents(
  onUpdate: (events: KpmbpEvent[]) => void,
  onError?: (err: any) => void
): () => void {
  return subscribeToFirestoreEvents(
    (firestoreEvents) => {
      if (Array.isArray(firestoreEvents) && firestoreEvents.length > 0) {
        saveLocalEventsCache(firestoreEvents);
        onUpdate(firestoreEvents);
      } else {
        const cached = getLocalEventsCache();
        onUpdate(cached.length > 0 ? cached : INITIAL_EVENTS);
      }
    },
    (err) => {
      console.warn('Firestore subscription notice (using local cache):', err?.message || err);
      const cached = getLocalEventsCache();
      onUpdate(cached.length > 0 ? cached : INITIAL_EVENTS);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new event in Firestore
 */
export async function createNewEvent(eventData: Omit<KpmbpEvent, 'id'>): Promise<string> {
  return await createEventInFirestore(eventData);
}

/**
 * Update an existing event in Firestore
 */
export async function updateExistingEvent(eventData: KpmbpEvent): Promise<void> {
  await updateEventInFirestore(eventData);
}

/**
 * Delete an event from Firestore
 */
export async function deleteExistingEvent(id: string): Promise<void> {
  await deleteEventInFirestore(id);
}

/**
 * Save student registration to Firestore & local cache
 */
export async function saveNewRegistration(record: RegistrationRecord): Promise<string> {
  await saveRegistrationToFirestore(record);
  return record.id;
}

/**
 * Reset and seed default official demo events into Firestore
 */
export async function resetAndSeedDemoEvents(): Promise<void> {
  saveLocalEventsCache(INITIAL_EVENTS);
  await seedEventsIfEmpty(true);
}

/**
 * Bulk imports events into Firestore & local cache
 */
export async function bulkImportEvents(
  importedEvents: KpmbpEvent[],
  replaceAll: boolean = false
): Promise<{ success: boolean; count: number }> {
  const currentCache = getLocalEventsCache();

  let nextEvents: KpmbpEvent[];
  if (replaceAll) {
    nextEvents = [...importedEvents];
  } else {
    const map = new Map<string, KpmbpEvent>();
    currentCache.forEach((e) => map.set(e.id, e));
    importedEvents.forEach((e) => map.set(e.id, e));
    nextEvents = Array.from(map.values());
  }

  saveLocalEventsCache(nextEvents);

  try {
    for (const evt of importedEvents) {
      await updateEventInFirestore(evt);
    }
  } catch (err) {
    console.warn('Firebase bulk import notice:', err);
  }

  return { success: true, count: importedEvents.length };
}

/**
 * Real-time registrations subscription with Firestore
 */
export function subscribeToAllRegistrations(
  onUpdate: (regs: RegistrationRecord[]) => void
): () => void {
  return subscribeToFirestoreRegistrations(onUpdate);
}

/**
 * Delete student registration from Firestore & local cache
 */
export async function deleteExistingRegistration(id: string): Promise<void> {
  await deleteRegistrationFromFirestore(id);
}

/**
 * Update student registration in Firestore & local cache
 */
export async function updateExistingRegistration(record: RegistrationRecord): Promise<void> {
  await updateRegistrationInFirestore(record);
}

/**
 * Get cached hero carousel configuration
 */
export function getLocalHeroConfig(): HeroConfig {
  return getLocalHeroConfigCache();
}

/**
 * Real-time Hero Carousel configuration subscription
 */
export function subscribeToHeroConfig(
  onUpdate: (config: HeroConfig) => void
): () => void {
  return subscribeToFirestoreHeroConfig((config) => {
    saveLocalHeroConfigCache(config);
    onUpdate(config);
  });
}

/**
 * Save and persist Hero Carousel configuration to Firestore and local storage
 */
export async function saveHeroConfig(config: HeroConfig): Promise<void> {
  saveLocalHeroConfigCache(config);
  await saveHeroConfigToFirestore(config);
}

