import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { KpmbpEvent, RegistrationRecord } from '../types';
import { INITIAL_EVENTS } from '../data/initialEvents';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config if present
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const EVENTS_COLLECTION = 'events';
const REGISTRATIONS_COLLECTION = 'registrations';

/**
 * Seeds initial event data into Firestore if collection is empty.
 */
export async function seedEventsIfEmpty(): Promise<void> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const snapshot = await getDocs(eventsRef);
    
    if (snapshot.empty) {
      console.log('Seeding initial KPMBP events to Firestore...');
      const batch = writeBatch(db);
      
      for (const event of INITIAL_EVENTS) {
        const docRef = doc(db, EVENTS_COLLECTION, event.id);
        batch.set(docRef, {
          ...event,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      await batch.commit();
      console.log('Seeding completed successfully.');
    }
  } catch (error) {
    console.error('Error checking or seeding initial events in Firestore:', error);
  }
}

/**
 * Subscribes to real-time events updates in Firestore.
 */
export function subscribeToEvents(
  onUpdate: (events: KpmbpEvent[]) => void,
  onError?: (err: Error) => void
) {
  const eventsRef = collection(db, EVENTS_COLLECTION);
  
  return onSnapshot(
    eventsRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Trigger seed if empty, and fallback to initial events
        seedEventsIfEmpty();
        onUpdate(INITIAL_EVENTS);
        return;
      }

      const eventsList: KpmbpEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        eventsList.push({
          id: docSnap.id,
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
          tags: Array.isArray(data.tags) ? data.tags : []
        });
      });

      // Sort by date ascending
      eventsList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      onUpdate(eventsList);
    },
    (err) => {
      console.error('Firestore onSnapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Creates a new event in Firestore.
 */
export async function createEventInFirestore(eventData: Omit<KpmbpEvent, 'id'>): Promise<string> {
  const eventsRef = collection(db, EVENTS_COLLECTION);
  const newDocRef = doc(eventsRef);
  const eventId = newDocRef.id;

  await setDoc(newDocRef, {
    ...eventData,
    id: eventId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return eventId;
}

/**
 * Updates an existing event in Firestore.
 */
export async function updateEventInFirestore(event: KpmbpEvent): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, event.id);
  await setDoc(
    docRef,
    {
      ...event,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

/**
 * Deletes an event from Firestore.
 */
export async function deleteEventInFirestore(eventId: string): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await deleteDoc(docRef);
}

/**
 * Saves a student registration record in Firestore.
 */
export async function saveRegistrationToFirestore(record: RegistrationRecord): Promise<void> {
  try {
    const regRef = collection(db, REGISTRATIONS_COLLECTION);
    await addDoc(regRef, {
      ...record,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving registration to Firestore:', error);
    throw error;
  }
}

/**
 * Subscribes to real-time registration records (for Admin Portal).
 */
export function subscribeToRegistrations(
  onUpdate: (registrations: RegistrationRecord[]) => void
) {
  const regRef = collection(db, REGISTRATIONS_COLLECTION);
  return onSnapshot(regRef, (snapshot) => {
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
    onUpdate(list);
  }, (err) => {
    console.error('Error fetching registrations:', err);
  });
}
