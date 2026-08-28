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
import { AdminPinModal } from './components/AdminPinModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Footer } from './components/Footer';
import { sortEventsByNearestDue, getCategoryButtonClass, isEventArchived } from './utils/calendar';
import { 
  subscribeToAllEvents,
  createNewEvent,
  updateExistingEvent,
  deleteExistingEvent,
  saveNewRegistration,
  resetAndSeedDemoEvents,
  bulkImportEvents,
  getActiveBackendLabel,
  getActiveBackendType,
  subscribeToHeroConfig,
  saveHeroConfig
} from './services/dbAdapter';
import { Sparkles, Calendar as CalendarIcon, Filter, Flame, CheckCircle2, ShieldCheck, Bookmark, Lock, KeyRound, Archive, Cloud } from 'lucide-react';

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
        if (Array.isArray(incomingEvents) && incomingEvents.length > 0) {
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

  // Deep-linking hash support: Automatically open Event Detail Modal if URL contains #event-ID
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#event-')) {
        const eventId = hash.replace('#event-', '').trim();
        if (eventId) {
          const found = events.find((e) => e.id === eventId || e.id.toLowerCase() === eventId.toLowerCase());
          if (found) {
            setSelectedEventForDetail(found);
          }
        }
      }
    };

    // Check on events change and hashchange event
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [events]);

  // Keep URL hash in sync when modal is opened / closed
  const handleOpenDetailModal = (evt: KpmbpEvent) => {
    setSelectedEventForDetail(evt);
    try {
      window.history.replaceState(null, '', `#event-${evt.id}`);
    } catch {}
  };

  const handleCloseDetailModal = () => {
    setSelectedEventForDetail(null);
    try {
      if (window.location.hash.startsWith('#event-')) {
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

  // Urgent events count (active only)
  const urgentCount = activeEvents.filter(
    (e) => e.status === 'Registration Closing Soon' || (e.seatsLeft !== undefined && e.seatsLeft <= 5)
  ).length;

  const openRegistrationCount = activeEvents.filter(
    (e) => e.status === 'Registration Open' || e.status === 'Registration Closing Soon'
  ).length;

  // Filtered & Sorted Events (by nearest due date)
  const eventsToFilter = currentTab === 'archive' ? archivedEvents : activeEvents;

  const filteredEvents = sortEventsByNearestDue(
    eventsToFilter.filter((evt) => {
      // Saved filter check
      if (showOnlySaved && !savedEventIds.includes(evt.id)) {
        return false;
      }
      // Category check
      if (selectedCategory !== 'Semua' && evt.category !== selectedCategory) {
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
    } catch (err: any) {
      console.warn('Saving event locally (Cloud notice):', err?.message);
      const tempId = `kpmbp-evt-${Date.now()}`;
      createdEvent = { ...newEventData, id: tempId };
    }

    setEvents((prev) => {
      const next = [createdEvent, ...prev.filter((e) => e.id !== createdEvent.id)];
      try { localStorage.setItem('kpmbp_events_v2', JSON.stringify(next)); } catch {}
      return next;
    });
    showToast(`Acara "${newEventData.title}" berjaya diterbitkan & disimpan!`);
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
    } catch (err: any) {
      console.warn('Notice: Update stored locally (Cloud notice):', err?.message);
    }
    showToast(`Maklumat "${updated.title}" telah berjaya dikemaskini!`);
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
    } catch (err: any) {
      console.warn('Notice: Deleted from local storage (Cloud notice):', err?.message);
    } finally {
      setIsDeletingEvent(false);
      showToast(`Acara "${targetTitle}" telah berjaya dipadam.`);
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

  const handleSeedSampleData = async () => {
    try {
      showToast('Memuat semula set 3 acara contoh rasmi KPMBP...');
      setEvents(INITIAL_EVENTS);
      await resetAndSeedDemoEvents();
      showToast('3 Acara demo KPMBP berjaya dimuatkan semula!');
    } catch (err) {
      console.error('Error seeding data:', err);
      showToast('Gagal memuat semula data contoh.');
    }
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
        onSelectTab={setCurrentTab}
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
              onSelectTab={setCurrentTab}
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
                      AKAN DATANG DI KPMBP
                    </h2>
                  </div>

                  {/* Category Quick Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {(['Semua', 'Pertandingan', 'Program Pelajar', 'Sukan', 'Kebudayaan', 'Akademik', 'Bengkel', 'Kerjaya'] as EventCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${getCategoryButtonClass(
                          cat,
                          selectedCategory === cat
                        )}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

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
                onSelectTab={setCurrentTab}
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

              {/* Category Pills & Saved Toggle */}
              <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                <button
                  onClick={() => setShowOnlySaved(!showOnlySaved)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    showOnlySaved
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white/80 text-amber-700 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${showOnlySaved ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
                  <span>Disimpan ({savedEventIds.length})</span>
                </button>

                {(['Semua', 'Pertandingan', 'Program Pelajar', 'Sukan', 'Kebudayaan', 'Akademik', 'Bengkel', 'Kelab & Persatuan', 'Kerjaya', 'Institusi'] as EventCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setShowOnlySaved(false);
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap ${getCategoryButtonClass(
                      cat,
                      selectedCategory === cat && !showOnlySaved
                    )}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortEventsByNearestDue(
                events.filter((e) => e.status === 'Registration Closing Soon' || e.status === 'Registration Open')
              ).map((event) => (
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
            onSeedSampleData={handleSeedSampleData}
          />
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
                onSeedSampleData={handleSeedSampleData}
                onBulkImportEvents={handleBulkImportEvents}
                heroConfig={heroConfig}
                onSaveHeroConfig={handleSaveHeroConfig}
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
