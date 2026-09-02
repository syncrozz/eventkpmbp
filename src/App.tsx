import React, { useState, useEffect } from 'react';
import { KpmbpEvent, EventCategory, ViewTab, RegistrationRecord, HeroConfig, DEFAULT_HERO_CONFIG } from './types';
import { INITIAL_EVENTS } from './data/initialEvents';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventCard } from './components/EventCard';
import { EventDetailModal } from './components/EventDetailModal';
import { DontMissSidebar } from './components/DontMissSidebar';
import { CalendarView } from './components/CalendarView';
import { RegistrationModal } from './components/RegistrationModal';
import { ArchiveView } from './components/ArchiveView';
import { AdminPortal } from './components/AdminPortal';
import { EventSubmissionView } from './components/EventSubmissionView';
import { AdminPinModal } from './components/AdminPinModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Footer } from './components/Footer';
import { sortEventsByNearestDue, getCategoryButtonClass, isEventArchived, isOngoingProgram, getDynamicEventStatus, findEventBySlugOrId, getEventSlug } from './utils/calendar';
import { 
  subscribeToAllEvents,
  createNewEvent,
  updateExistingEvent,
  deleteExistingEvent,
  saveNewRegistration,
  bulkImportEvents,
  getActiveBackendLabel,
  getActiveBackendType,
  subscribeToHeroConfig,
  saveHeroConfig
} from './services/dbAdapter';
import { Sparkles, Calendar as CalendarIcon, Filter, Flame, CheckCircle2, ShieldCheck, Bookmark, Lock, KeyRound, Archive, Cloud, Repeat, ArrowRight } from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState<KpmbpEvent[]>(() => {
    try {
      const saved = localStorage.getItem('kpmbp_events_v2');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_EVENTS;
  });

  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Hero Carousel Configuration State with local persistence fallback
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(() => {
    try {
      const cached = localStorage.getItem('kpmbp_hero_config_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_HERO_CONFIG;
  });

  const [savedEventIds, setSavedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kpmbp_saved_events');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  const [currentTab, setCurrentTab] = useState<ViewTab>('discover');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlySaved, setShowOnlySaved] = useState(false);
  const [showOngoingOnly, setShowOngoingOnly] = useState(false);

  // Admin Access Security
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kpmbp_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  
  // Modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<KpmbpEvent | null>(null);
  const [selectedEventForRegistration, setSelectedEventForRegistration] = useState<KpmbpEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<KpmbpEvent | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [editingEventInAdmin, setEditingEventInAdmin] = useState<KpmbpEvent | null>(null);
  const [pendingAdminEditEvent, setPendingAdminEditEvent] = useState<KpmbpEvent | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Real-time synchronization (Supabase / Firestore / Local Cache)
  useEffect(() => {
    const unsubscribeEvents = subscribeToAllEvents(
      (incomingEvents) => {
        if (Array.isArray(incomingEvents)) {
          setEvents(incomingEvents);
          setIsFirebaseConnected(true);
        }
      },
      (err) => {
        // Handled silently: falls back to local cache safely
        setIsFirebaseConnected(false);
      }
    );

    const unsubscribeHero = subscribeToHeroConfig((incomingHeroConfig) => {
      if (incomingHeroConfig && Array.isArray(incomingHeroConfig.slides) && incomingHeroConfig.slides.length > 0) {
        setHeroConfig(incomingHeroConfig);
      }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeHero();
    };
  }, []);

  // Deep-linking hash support: Automatically handle modal (#slug, #event-slug) and tab deep-links (#hantar-event, #kalendar, etc.)
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash.toLowerCase().trim();
      if (!hash || hash === '#') return;

      if (
        hash === '#hantar-event' || 
        hash === '#submit-event' || 
        hash === '#hantar' || 
        hash === '#cadang-event' || 
        hash === '#borang-penganjur'
      ) {
        setCurrentTab('submit-event');
      } else if (hash === '#events' || hash === '#semua-event' || hash === '#semua-acara') {
        setCurrentTab('events');
      } else if (hash === '#kalendar' || hash === '#calendar') {
        setCurrentTab('calendar');
      } else if (hash === '#jangan-terlepas' || hash === '#dont-miss') {
        setCurrentTab('dont-miss');
      } else if (hash === '#arkib' || hash === '#archive') {
        setCurrentTab('archive');
      } else if (hash === '#admin') {
        if (isAdminUnlocked) {
          setCurrentTab('admin');
        } else {
          setIsAdminPinOpen(true);
        }
      } else if (hash === '#discover' || hash === '#utama' || hash === '#home') {
        setCurrentTab('discover');
      } else {
        // Event deep-link lookup: supports both modern #<event-code> (e.g., #pmk020926) and legacy #event-<event-code>
        const found = findEventBySlugOrId(events, hash);
        if (found) {
          setSelectedEventForDetail(found);
          const canonicalSlug = getEventSlug(found);
          // Seamlessly update URL in browser to canonical short hash format (#<event-code>)
          if (window.location.hash !== `#${canonicalSlug}`) {
            try {
              window.history.replaceState(null, '', `#${canonicalSlug}`);
            } catch {}
          }
        }
      }
    };

    // Check on initial load / events change and hashchange event
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [events, isAdminUnlocked]);

  const handleSelectTab = (tab: ViewTab) => {
    setCurrentTab(tab);
    try {
      if (tab === 'submit-event') {
        window.history.replaceState(null, '', '#hantar-event');
      } else if (tab === 'events') {
        window.history.replaceState(null, '', '#events');
      } else if (tab === 'calendar') {
        window.history.replaceState(null, '', '#kalendar');
      } else if (tab === 'dont-miss') {
        window.history.replaceState(null, '', '#jangan-terlepas');
      } else if (tab === 'archive') {
        window.history.replaceState(null, '', '#arkib');
      } else if (tab === 'admin') {
        window.history.replaceState(null, '', '#admin');
      } else if (tab === 'discover') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {}
  };

  // Keep URL hash in sync with short slug (#<event-code>) when modal is opened / closed
  const handleOpenDetailModal = (evt: KpmbpEvent) => {
    setSelectedEventForDetail(evt);
    try {
      const slug = getEventSlug(evt);
      window.history.replaceState(null, '', `#${slug}`);
    } catch {}
  };

  const handleCloseDetailModal = () => {
    setSelectedEventForDetail(null);
    try {
      if (currentTab === 'submit-event') {
        window.history.replaceState(null, '', '#hantar-event');
      } else if (currentTab === 'events') {
        window.history.replaceState(null, '', '#events');
      } else if (currentTab === 'calendar') {
        window.history.replaceState(null, '', '#kalendar');
      } else if (currentTab === 'dont-miss') {
        window.history.replaceState(null, '', '#jangan-terlepas');
      } else if (currentTab === 'archive') {
        window.history.replaceState(null, '', '#arkib');
      } else if (currentTab === 'admin') {
        window.history.replaceState(null, '', '#admin');
      } else {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {}
  };

  // Save bookmarked events to local storage
  useEffect(() => {
    try {
      localStorage.setItem('kpmbp_saved_events', JSON.stringify(savedEventIds));
    } catch {
      // storage quota error
    }
  }, [savedEventIds]);

  // Save admin unlock status
  useEffect(() => {
    try {
      localStorage.setItem('kpmbp_admin_unlocked', isAdminUnlocked ? 'true' : 'false');
    } catch {
      // storage quota error
    }
  }, [isAdminUnlocked]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSave = (eventId: string) => {
    if (savedEventIds.includes(eventId)) {
      setSavedEventIds(savedEventIds.filter((id) => id !== eventId));
      showToast('Event telah dikeluarkan daripada simpanan.');
    } else {
      setSavedEventIds([...savedEventIds, eventId]);
      showToast('Event berjaya disimpan dalam senarai semakan!');
    }
  };

  const handleAdminPinSuccess = () => {
    setIsAdminUnlocked(true);
    setIsAdminPinOpen(false);
    if (pendingAdminEditEvent) {
      const target = pendingAdminEditEvent;
      setPendingAdminEditEvent(null);
      handleTriggerEdit(target);
    } else {
      setCurrentTab('admin');
      showToast('Akses Admin Mode Berjaya Disahkan!');
    }
  };

  const handleQuickAdminEdit = (evt: KpmbpEvent) => {
    if (isAdminUnlocked) {
      handleTriggerEdit(evt);
    } else {
      setPendingAdminEditEvent(evt);
      setSelectedEventForDetail(null);
      setIsAdminPinOpen(true);
      showToast(`Sila masukkan PIN Pentadbir untuk menyunting "${evt.title}"`);
    }
  };

  const handleToggleOffAdmin = () => {
    setIsAdminUnlocked(false);
    if (currentTab === 'admin') {
      setCurrentTab('discover');
    }
    showToast('Admin Mode telah dimatikan (OFF).');
  };

  // Active vs Archived Events
  const activeEvents = events.filter((e) => !isEventArchived(e));
  const archivedEvents = events.filter((e) => isEventArchived(e));

  // Ongoing Programs (Program Berterusan) vs One-Time Scheduled Events
  const ongoingPrograms = activeEvents.filter((e) => isOngoingProgram(e));
  const activeOneTimeEvents = activeEvents.filter((e) => !isOngoingProgram(e));

  // Urgent events count (active one-time events requiring registration with closing deadlines or low seats)
  const urgentCount = activeOneTimeEvents.filter((e) => {
    if (e.registrationMode === 'none') return false;
    const dynamicStatus = getDynamicEventStatus(e);
    if (dynamicStatus === 'Registration Closing Soon') return true;
    if (dynamicStatus === 'Registration Open' && e.seatsLeft !== undefined && e.seatsLeft > 0 && e.seatsLeft <= 5) {
      return true;
    }
    return false;
  }).length;

  const openRegistrationCount = activeEvents.filter((e) => {
    if (e.registrationMode === 'none') return false;
    const dynamicStatus = getDynamicEventStatus(e);
    return dynamicStatus === 'Registration Open' || dynamicStatus === 'Registration Closing Soon';
  }).length;

  // List of Urgent / Jangan Terlepas events (active, not archived, dynamic status closing soon or open registration)
  const dontMissEvents = sortEventsByNearestDue(
    activeOneTimeEvents.filter((e) => {
      if (e.registrationMode === 'none') return false;
      const dynamicStatus = getDynamicEventStatus(e);
      return dynamicStatus === 'Registration Closing Soon' || dynamicStatus === 'Registration Open';
    })
  );

  // Base list depending on tab & filter mode:
  // - Archive: archived events
  // - showOngoingOnly (Bahagian/Button Khas): Program Berterusan
  // - Default Priority List: ONE-TIME EVENTS ONLY (Program Berterusan excluded)
  let baseEventsList: KpmbpEvent[];
  if (currentTab === 'archive') {
    baseEventsList = archivedEvents;
  } else if (showOngoingOnly) {
    baseEventsList = ongoingPrograms;
  } else {
    baseEventsList = activeOneTimeEvents;
  }

  const filteredEvents = sortEventsByNearestDue(
    baseEventsList.filter((evt) => {
      // Saved filter check
      if (showOnlySaved && !savedEventIds.includes(evt.id)) {
        return false;
      }
      // Category check (applied when not in dedicated ongoing mode)
      if (!showOngoingOnly && selectedCategory !== 'Semua' && evt.category !== selectedCategory) {
        return false;
      }
      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchDesc = evt.description.toLowerCase().includes(q);
        const matchLoc = evt.location?.toLowerCase().includes(q);
        const matchOrg = evt.organiser.toLowerCase().includes(q);
        const matchCat = evt.category.toLowerCase().includes(q);
        const matchTags = evt.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchLoc && !matchOrg && !matchCat && !matchTags) {
          return false;
        }
      }
      return true;
    })
  );

  // Admin Actions with Cloud Database & local fallback
  const handleCreateEvent = async (newEventData: Omit<KpmbpEvent, 'id'>) => {
    let createdEvent: KpmbpEvent;
    try {
      const newId = await createNewEvent(newEventData);
      createdEvent = { ...newEventData, id: newId };
      showToast(`Acara "${newEventData.title}" berjaya diterbitkan & disegerak ke Cloud!`);
    } catch (err: any) {
      console.warn('Saving event locally (Cloud notice):', err?.message);
      const tempId = `kpmbp-evt-${Date.now()}`;
      createdEvent = { ...newEventData, id: tempId };
      showToast(`⚠️ Acara disimpan secara lokal (Ralat Cloud: ${err?.message || 'Gagal ke Firestore'})`);
    }

    setEvents((prev) => {
      const next = [createdEvent, ...prev.filter((e) => e.id !== createdEvent.id)];
      try { localStorage.setItem('kpmbp_events_v2', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleUpdateEvent = async (updated: KpmbpEvent) => {
    // 1. Immediately update React state & localStorage for instantaneous reflection
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === updated.id ? updated : e));
      try { localStorage.setItem('kpmbp_events_v2', JSON.stringify(next)); } catch {}
      return next;
    });

    if (selectedEventForDetail?.id === updated.id) {
      setSelectedEventForDetail(updated);
    }

    try {
      await updateExistingEvent(updated);
      showToast(`Maklumat "${updated.title}" telah berjaya dikemaskini & disegerak ke Cloud!`);
    } catch (err: any) {
      console.warn('Notice: Update stored locally (Cloud notice):', err?.message);
      showToast(`⚠️ Disimpan pada peranti ini sahaja (Ralat Cloud: ${err?.message || 'Gagal ke Firestore'})`);
    }
  };

  const handleRequestDelete = (target: KpmbpEvent | string) => {
    if (typeof target === 'string') {
      const found = events.find((e) => e.id === target) || null;
      setEventToDelete(found);
    } else {
      setEventToDelete(target);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    const targetTitle = eventToDelete.title;
    const targetId = eventToDelete.id;

    // 1. Immediately update state & storage
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== targetId);
      try { localStorage.setItem('kpmbp_events_v2', JSON.stringify(next)); } catch {}
      return next;
    });
    if (selectedEventForDetail?.id === targetId) {
      setSelectedEventForDetail(null);
    }
    setEventToDelete(null);

    try {
      await deleteExistingEvent(targetId);
      showToast(`Acara "${targetTitle}" telah berjaya dipadam dari Cloud.`);
    } catch (err: any) {
      console.warn('Notice: Deleted from local storage (Cloud notice):', err?.message);
      showToast(`⚠️ Acara dipadam secara lokal sahaja (Ralat Cloud: ${err?.message || 'Gagal segerak'})`);
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleTriggerEdit = (evt: KpmbpEvent) => {
    setEditingEventInAdmin(evt);
    if (selectedEventForDetail?.id === evt.id) {
      setSelectedEventForDetail(null);
    }
    setCurrentTab('admin');
    showToast(`Membuka borang suntingan untuk "${evt.title}"`);
  };

  const handleBulkImportEvents = async (importedEvents: KpmbpEvent[], replaceAll: boolean) => {
    try {
      if (replaceAll) {
        setEvents(importedEvents);
      } else {
        setEvents((prev) => {
          const map = new Map<string, KpmbpEvent>();
          prev.forEach((e) => map.set(e.id, e));
          importedEvents.forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        });
      }
      await bulkImportEvents(importedEvents, replaceAll);
      showToast(`Berjaya mengimport ${importedEvents.length} acara ke dalam sistem!`);
    } catch (err: any) {
      console.error('Error importing events:', err);
      showToast('Ralat semasa mengimport acara ke pangkalan data.');
    }
  };

  const handleRegistrationSuccess = async (record: RegistrationRecord) => {
    try {
      await saveNewRegistration(record);
      showToast(`Pendaftaran berjaya direkodkan ke pangkalan data! Kod Pas: ${record.id}`);
    } catch (err) {
      console.error('Error recording registration in cloud database:', err);
      showToast(`Pendaftaran dijana! Kod Pas: ${record.id}`);
    }
  };

  const handleSaveHeroConfig = async (newConfig: HeroConfig) => {
    try {
      await saveHeroConfig(newConfig);
      setHeroConfig(newConfig);
      showToast('Tetapan Hero Carousel berjaya disimpan & disegerakkan!');
    } catch (err: any) {
      console.error('Error updating hero config:', err);
      showToast('Gagal menyimpan tetapan Hero Carousel ke pelayan.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Frosted Glass Background Ambient Glow Spheres */}
      <div className="absolute top-[-150px] right-[-100px] w-[600px] h-[600px] bg-blue-200/50 rounded-full blur-[130px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[110px] opacity-50 pointer-events-none" />
      <div className="absolute top-[35%] left-[25%] w-[450px] h-[450px] bg-purple-200/40 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      {/* Global Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-5 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        urgentCount={urgentCount}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAdminPin={() => setIsAdminPinOpen(true)}
        onToggleOffAdmin={handleToggleOffAdmin}
      />

      {/* Main Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10 flex flex-col gap-8">
        
        {/* DISCOVER TAB */}
        {currentTab === 'discover' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Hero Section */}
            <HeroSection
              heroConfig={heroConfig}
              events={events}
              onSelectTab={handleSelectTab}
              onViewDetails={handleOpenDetailModal}
              openCount={openRegistrationCount}
              urgentCount={urgentCount}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Split Grid Layout: Main Event Feed + Side Navigator */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              {/* Main Content Column */}
              <section className="flex-1 w-full space-y-6">
                
                {/* Header & Category Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/60 pb-3">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">
                      {showOngoingOnly ? 'PROGRAM BERTERUSAN' : 'AKAN DATANG'}
                    </h2>
                  </div>

                  {/* Category Quick Selector & Program Berterusan Button Khas */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => {
                        setShowOngoingOnly(false);
                        setSelectedCategory('Semua');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${getCategoryButtonClass(
                        'Semua',
                        selectedCategory === 'Semua' && !showOngoingOnly
                      )}`}
                    >
                      Semua
                    </button>

                    {/* Button Khas: Program Berterusan */}
                    <button
                      onClick={() => {
                        setShowOnlySaved(false);
                        setShowOngoingOnly(!showOngoingOnly);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        showOngoingOnly
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50/90 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                      }`}
                      title="Paparkan Program Berterusan"
                    >
                      <Repeat className="w-3 h-3" />
                      <span>Program Berterusan {ongoingPrograms.length > 0 && `(${ongoingPrograms.length})`}</span>
                    </button>

                    {(['Pertandingan', 'Program Pelajar', 'Sukan', 'Kebudayaan', 'Akademik', 'Bengkel', 'Kerjaya'] as EventCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setShowOngoingOnly(false);
                          setSelectedCategory(cat);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${getCategoryButtonClass(
                          cat,
                          selectedCategory === cat && !showOngoingOnly
                        )}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner Khas: Program Berterusan (Apabila pengguna berada di senarai tarikh tunggal / keutamaan) */}
                {!showOngoingOnly && ongoingPrograms.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-purple-50/80 border border-indigo-100 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                        <Repeat className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900">
                            Bahagian Khas: Program Berterusan
                          </h3>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {ongoingPrograms.length} Program
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Program pengajian berkala & aktiviti sepanjang semester diasingkan di bahagian khas.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowOnlySaved(false);
                        setShowOngoingOnly(true);
                      }}
                      className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Lihat Program Berterusan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Header info bar apabila dalam mod Program Berterusan */}
                {showOngoingOnly && (
                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Senarai Program Berterusan & Aktiviti Berkala</span>
                      </h3>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Menampilkan program mingguan/berkala yang berjalan berterusan tanpa tarikh tamat tunggal.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowOngoingOnly(false)}
                      className="shrink-0 px-3 py-1 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 text-xs font-bold rounded-xl transition-all shadow-2xs"
                    >
                      ← Kembali ke Senarai Keutamaan
                    </button>
                  </div>
                )}

                {/* Event Cards Grid */}
                {filteredEvents.length === 0 ? (
                  <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-10 text-center space-y-3">
                    <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                    <h3 className="text-base font-extrabold text-slate-800">Tiada event dijumpai</h3>
                    <p className="text-xs text-slate-500">
                      Cuba ubah carian, padam penapis, atau semak semula status simpanan event.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('Semua');
                        setSearchQuery('');
                        setShowOnlySaved(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Reset Penapis
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onViewDetails={handleOpenDetailModal}
                        onRegister={setSelectedEventForRegistration}
                        isSaved={savedEventIds.includes(event.id)}
                        onToggleSave={handleToggleSave}
                        isAdmin={isAdminUnlocked}
                        onEdit={handleTriggerEdit}
                        onDelete={handleRequestDelete}
                      />
                    ))}
                  </div>
                )}

              </section>

              {/* Sidebar Column: JANGAN TERLEPAS */}
              <DontMissSidebar
                events={events}
                onViewDetails={handleOpenDetailModal}
                onSelectTab={handleSelectTab}
              />

            </div>
          </div>
        )}

        {/* ALL EVENTS TAB */}
        {currentTab === 'events' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Semua Acara & Aktiviti KPMBP
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cari, tapis mengikut kategori, dan simpan event pilihan anda.
                </p>
              </div>

              {/* Category Pills & Saved Toggle & Program Berterusan Button Khas */}
              <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                <button
                  onClick={() => {
                    setShowOngoingOnly(false);
                    setShowOnlySaved(!showOnlySaved);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    showOnlySaved && !showOngoingOnly
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white/80 text-amber-700 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${showOnlySaved ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
                  <span>Disimpan ({savedEventIds.length})</span>
                </button>

                {/* Button Khas: Program Berterusan */}
                <button
                  onClick={() => {
                    setShowOnlySaved(false);
                    setShowOngoingOnly(!showOngoingOnly);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    showOngoingOnly
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50/90 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Program Berterusan {ongoingPrograms.length > 0 && `(${ongoingPrograms.length})`}</span>
                </button>

                {(['Semua', 'Pertandingan', 'Program Pelajar', 'Sukan', 'Kebudayaan', 'Akademik', 'Bengkel', 'Kelab & Persatuan', 'Kerjaya', 'Institusi'] as EventCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setShowOngoingOnly(false);
                      setShowOnlySaved(false);
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap ${getCategoryButtonClass(
                      cat,
                      selectedCategory === cat && !showOnlySaved && !showOngoingOnly
                    )}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onViewDetails={handleOpenDetailModal}
                  onRegister={setSelectedEventForRegistration}
                  isSaved={savedEventIds.includes(event.id)}
                  onToggleSave={handleToggleSave}
                  isAdmin={isAdminUnlocked}
                  onEdit={handleTriggerEdit}
                  onDelete={handleRequestDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {currentTab === 'calendar' && (
          <div className="animate-in fade-in duration-300">
            <CalendarView
              events={events}
              onViewDetails={handleOpenDetailModal}
            />
          </div>
        )}

        {/* DONT MISS TAB */}
        {currentTab === 'dont-miss' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-rose-500 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center gap-2 text-rose-200 font-bold text-xs uppercase tracking-wider mb-1">
                <Flame className="w-4 h-4 text-white" />
                <span>Section Khas: Jangan Terlepas</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">
                Program Yang Memerlukan Tindakan Segera
              </h2>
              <p className="text-xs text-rose-100 mt-1 max-w-xl">
                Daftar sebelum tarikh tutup pendaftaran untuk memastikan anda tidak terlepas peluang menyertai acara, bengkel, dan pertandingan KPMBP.
              </p>
            </div>

            {dontMissEvents.length === 0 ? (
              <div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Tiada Program Mendesak Buat Masa Ini</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Semua program aktif mempunyai tempoh pendaftaran yang mencukupi atau belum dibuka. Sila rujuk tab <strong>Semua Event</strong> atau <strong>Kalendar</strong> untuk senarai penuh program akan datang.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setCurrentTab('events')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Lihat Semua Event
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dontMissEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onViewDetails={handleOpenDetailModal}
                    onRegister={setSelectedEventForRegistration}
                    isSaved={savedEventIds.includes(event.id)}
                    onToggleSave={handleToggleSave}
                    isAdmin={isAdminUnlocked}
                    onEdit={handleTriggerEdit}
                    onDelete={handleRequestDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARCHIVE TAB */}
        {currentTab === 'archive' && (
          <ArchiveView
            events={archivedEvents}
            onViewDetails={handleOpenDetailModal}
            onRegister={setSelectedEventForRegistration}
            savedEventIds={savedEventIds}
            onToggleSave={handleToggleSave}
            isAdmin={isAdminUnlocked}
            onEdit={handleTriggerEdit}
            onDelete={handleRequestDelete}
          />
        )}

        {/* SUBMIT EVENT TAB (Public Organizer Submission) */}
        {currentTab === 'submit-event' && (
          <div className="animate-in fade-in duration-300">
            <EventSubmissionView
              onBackToDiscover={() => handleSelectTab('discover')}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* ADMIN TAB */}
        {currentTab === 'admin' && (
          <div className="animate-in fade-in duration-300">
            {isAdminUnlocked ? (
              <AdminPortal
                events={events}
                onCreateEvent={handleCreateEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleRequestDelete}
                initialEditingEvent={editingEventInAdmin}
                onClearInitialEditingEvent={() => setEditingEventInAdmin(null)}
                onBulkImportEvents={handleBulkImportEvents}
                heroConfig={heroConfig}
                onSaveHeroConfig={handleSaveHeroConfig}
                onShowToast={showToast}
              />
            ) : (
              <div className="max-w-md mx-auto my-12 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 text-center space-y-5 shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-indigo-100">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Akses Mod Admin Dikunci</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sila masukkan 4-digit PIN keselamatan untuk membuat, mengubah, atau memadam acara.
                  </p>
                </div>
                <button
                  onClick={() => setIsAdminPinOpen(true)}
                  className="w-full py-3 px-5 bg-slate-900 hover:bg-black text-amber-300 font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Masukkan PIN Keselamatan</span>
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Detail Modal */}
      <EventDetailModal
        event={selectedEventForDetail}
        onClose={handleCloseDetailModal}
        onRegister={(evt) => {
          handleCloseDetailModal();
          setSelectedEventForRegistration(evt);
        }}
        isAdmin={isAdminUnlocked}
        onEdit={handleTriggerEdit}
        onDelete={handleRequestDelete}
        onQuickAdminEdit={handleQuickAdminEdit}
      />

      {/* Registration Modal */}
      <RegistrationModal
        event={selectedEventForRegistration}
        onClose={() => setSelectedEventForRegistration(null)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Security PIN Modal */}
      <AdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => {
          setIsAdminPinOpen(false);
          setPendingAdminEditEvent(null);
        }}
        onSuccess={handleAdminPinSuccess}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!eventToDelete}
        event={eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeletingEvent}
      />

      {/* Global SYNCROZZ Standard Footer */}
      <Footer />

    </div>
  );
}
