import React, { useState, useRef } from 'react';
import { 
  HeroConfig, 
  HeroSlide, 
  DEFAULT_HERO_CONFIG, 
  KpmbpEvent, 
  HeroCtaAction 
} from '../types';
import { 
  Sparkles, 
  Calendar, 
  ArrowRight, 
  ArrowLeftRight, 
  Check, 
  RotateCcw, 
  Save, 
  Eye, 
  ExternalLink, 
  Flame, 
  Shield, 
  Star, 
  BookOpen, 
  Compass, 
  Layers, 
  Image as ImageIcon, 
  Upload, 
  SlidersHorizontal,
  Clock,
  Play,
  Pause,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { optimizeEventImage } from '../utils/imageOptimizer';

interface AdminHeroManagerProps {
  heroConfig?: HeroConfig;
  events: KpmbpEvent[];
  onSaveHeroConfig?: (config: HeroConfig) => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}

export const AdminHeroManager: React.FC<AdminHeroManagerProps> = ({
  heroConfig,
  events,
  onSaveHeroConfig,
  onShowToast
}) => {
  const [config, setConfig] = useState<HeroConfig>(() => {
    return heroConfig && Array.isArray(heroConfig.slides) && heroConfig.slides.length > 0
      ? heroConfig
      : DEFAULT_HERO_CONFIG;
  });

  const [activeSlideTab, setActiveSlideTab] = useState<number>(0);
  const [previewSlideIndex, setPreviewSlideIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if prop changes externally
  React.useEffect(() => {
    if (heroConfig && Array.isArray(heroConfig.slides) && heroConfig.slides.length > 0) {
      setConfig(heroConfig);
    }
  }, [heroConfig]);

  // Track if current configuration has unsaved modifications
  const isDirty = React.useMemo(() => {
    try {
      const savedStr = JSON.stringify(heroConfig || DEFAULT_HERO_CONFIG);
      const currentStr = JSON.stringify(config);
      return savedStr !== currentStr;
    } catch {
      return false;
    }
  }, [heroConfig, config]);

  const showNotification = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setSaveToast(msg);
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  const handleUpdateSlide = (slideIndex: number, field: keyof HeroSlide, value: any) => {
    setConfig((prev) => {
      const slides = [...(prev.slides || DEFAULT_HERO_CONFIG.slides)];
      if (!slides[slideIndex]) return prev;
      slides[slideIndex] = {
        ...slides[slideIndex],
        [field]: value
      };
      return { ...prev, slides };
    });
  };

  const handleToggleSlideEnabled = (slideIndex: number) => {
    setConfig((prev) => {
      const slides = [...(prev.slides || DEFAULT_HERO_CONFIG.slides)];
      if (!slides[slideIndex]) return prev;
      slides[slideIndex] = {
        ...slides[slideIndex],
        enabled: !slides[slideIndex].enabled
      };
      return { ...prev, slides };
    });
  };

  const handleSwapSlides = () => {
    setConfig((prev) => {
      const slides = [...(prev.slides || DEFAULT_HERO_CONFIG.slides)];
      if (slides.length < 2) return prev;
      const temp = slides[0];
      slides[0] = slides[1];
      slides[1] = temp;
      return { ...prev, slides };
    });
    showNotification('Susunan Slide 1 dan Slide 2 telah berjaya ditukar!');
  };

  // Image Upload Handler with automatic compression
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      // Automatically optimize to compressed WebP/base64 format (<200KB)
      const optimizedBase64 = await optimizeEventImage(file, 1200, 700, 0.85);
      handleUpdateSlide(slideIndex, 'imageUrl', optimizedBase64);
      showNotification(`Gambar untuk Slide ${slideIndex + 1} berjaya dimuat naik & dimampatkan!`);
    } catch (err: any) {
      console.error('Error optimizing hero image:', err);
      alert(err?.message || 'Gagal memproses fail gambar. Sila cuba format JPG atau PNG.');
    } finally {
      setIsCompressingImage(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveHeroImage = (slideIndex: number) => {
    handleUpdateSlide(slideIndex, 'imageUrl', '');
    showNotification(`Gambar Slide ${slideIndex + 1} telah dipadam.`);
  };

  // Quick Preset Handlers
  const handleApplyFeaturedEventPreset = (slideIndex: number, eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    setConfig((prev) => {
      const slides = [...(prev.slides || DEFAULT_HERO_CONFIG.slides)];
      if (!slides[slideIndex]) return prev;

      slides[slideIndex] = {
        ...slides[slideIndex],
        enabled: true,
        badgeText: `Sorotan: ${target.category}`,
        badgeIcon: target.category === 'Sukan' ? 'flame' : target.category === 'Pertandingan' ? 'star' : 'sparkle',
        title: target.title,
        subtitle: target.organiser || 'Kolej Profesional MARA Bandar Penawar',
        description: target.description.slice(0, 160) + (target.description.length > 160 ? '...' : ''),
        imageUrl: target.image || slides[slideIndex].imageUrl || 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg',
        imageAlt: target.title,
        linkedEventId: target.id,
        primaryCtaText: 'Lihat Butiran Acara',
        primaryCtaAction: 'open_event',
        primaryCtaTarget: target.id,
        secondaryCtaText: 'Buka Kalendar Event',
        secondaryCtaAction: 'tab_calendar',
        accentTheme: 'indigo'
      };

      return { ...prev, slides };
    });

    showNotification(`Preset Acara "${target.title}" telah dimuatkan ke Slide ${slideIndex + 1}!`);
  };

  const handleApplyCalendarPreset = (slideIndex: number) => {
    setConfig((prev) => {
      const slides = [...(prev.slides || DEFAULT_HERO_CONFIG.slides)];
      if (!slides[slideIndex]) return prev;

      slides[slideIndex] = {
        ...slides[slideIndex],
        enabled: true,
        badgeText: 'Panduan Discovery Platform',
        badgeIcon: 'calendar',
        title: 'Rancang Jadual Melalui Kalendar Event',
        subtitle: 'Semak tarikh, sesi & tarikh tutup dengan mudah',
        description: 'Gunakan mod Kalendar untuk melihat keseluruhan aktiviti bulanan dan tarikh penting program KPMBP secara visual dan teratur tanpa terlepas sebarang acara.',
        imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000&auto=format&fit=crop',
        imageAlt: 'Kalendar Acara KPMBP',
        linkedEventId: undefined,
        primaryCtaText: 'Buka Kalendar Sekarang',
        primaryCtaAction: 'tab_calendar',
        secondaryCtaText: 'Jelajah Semua Acara',
        secondaryCtaAction: 'tab_events',
        accentTheme: 'purple'
      };

      return { ...prev, slides };
    });

    showNotification(`Preset Panduan Kalendar telah dimuatkan ke Slide ${slideIndex + 1}!`);
  };

  const handleApplyAnnouncementPreset = (slideIndex: number) => {
    setConfig((prev) => {
      const slides = [...(prev.slides || DEFAULT_HERO_CONFIG.slides)];
      if (!slides[slideIndex]) return prev;

      slides[slideIndex] = {
        ...slides[slideIndex],
        enabled: true,
        badgeText: 'Pusat Maklumat Rasmi KPMBP',
        badgeIcon: 'sparkle',
        title: 'Pusat Acara & Program Rasmi KPMBP',
        subtitle: 'Kolej Profesional MARA Bandar Penawar',
        description: 'Cari Event, Aktiviti, Pertandingan, dan Bengkel yang berlangsung di Kolej Profesional MARA Bandar Penawar dalam satu platform berpusat.',
        imageUrl: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg',
        imageAlt: 'Event KPMBP',
        linkedEventId: undefined,
        primaryCtaText: 'Lihat Semua Acara',
        primaryCtaAction: 'tab_events',
        secondaryCtaText: 'Buka Kalendar Event',
        secondaryCtaAction: 'tab_calendar',
        accentTheme: 'indigo'
      };

      return { ...prev, slides };
    });

    showNotification(`Preset Hebahan Rasmi telah dimuatkan ke Slide ${slideIndex + 1}!`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSaveHeroConfig) {
        await onSaveHeroConfig(config);
      } else {
        showNotification('Konfigurasi Hero Carousel berjaya disimpan & disegerakkan!');
      }
    } catch (err: any) {
      console.error('Error saving hero config:', err);
      alert('Ralat semasa menyimpan tetapan: ' + (err?.message || 'Sila cuba lagi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Adakah anda pasti mahu mengembalikan Hero Carousel kepada konfigurasi asal (Default)?')) {
      setConfig(DEFAULT_HERO_CONFIG);
      if (onSaveHeroConfig) {
        await onSaveHeroConfig(DEFAULT_HERO_CONFIG);
      } else {
        showNotification('Hero Carousel telah dikembalikan kepada konfigurasi lalai (Default).');
      }
    }
  };

  const currentSlide = config.slides[activeSlideTab] || config.slides[0];
  const enabledSlides = (config.slides || []).filter((s) => s.enabled);
  const previewSlide = config.slides[previewSlideIndex] || config.slides[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast (Fallback only if no parent toast system is connected) */}
      {saveToast && !onShowToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Card Header */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                Admin-Controlled Hero Carousel & Communication Layer
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Tetapkan sehingga 2 featured slides mesej utama di homepage. Gunakan Slide 1 untuk sorotan acara semasa dan Slide 2 untuk panduan discovery kalendar. Tetapan ini disimpan terus ke awan dan peranti pengguna.
            </p>
          </div>

          {/* Action Buttons: Save & Reset */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-indigo-200" />
                  <span>Simpan Tetapan Hero</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Controls: Auto-play, Interval, Swap */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Auto Play Switch */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoPlay}
                onChange={(e) => setConfig((prev) => ({ ...prev, autoPlay: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Putaran Automatik (Auto-Play Carousel)</span>
              </span>
            </label>

            {/* Interval Selector */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Selang Masa:</span>
              <select
                value={config.intervalSeconds || 6}
                onChange={(e) => setConfig((prev) => ({ ...prev, intervalSeconds: Number(e.target.value) }))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={4}>4 Saat (Laju)</option>
                <option value={6}>6 Saat (Disyorkan)</option>
                <option value={8}>8 Saat (Tenang)</option>
                <option value={10}>10 Saat (Panjang)</option>
              </select>
            </div>
          </div>

          {/* Swap Slides Button */}
          <button
            type="button"
            onClick={handleSwapSlides}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs hover:bg-slate-50 active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tukar Susunan Slide 1 ⇄ Slide 2</span>
          </button>
        </div>
      </div>

      {/* Slide Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveSlideTab(0)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSlideTab === 0
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Slide 1 (Utama)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            config.slides[0]?.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
          }`}>
            {config.slides[0]?.enabled ? 'Aktif' : 'Ditutup'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSlideTab(1)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSlideTab === 1
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Slide 2 (Discovery / Guidance)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            config.slides[1]?.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'
          }`}>
            {config.slides[1]?.enabled ? 'Aktif' : 'Ditutup'}
          </span>
        </button>

        <div className="ml-auto text-[11px] text-slate-500 hidden sm:block">
          {enabledSlides.length === 1 ? (
            <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              Mod Hero Tunggal (1 slide aktif)
            </span>
          ) : enabledSlides.length === 2 ? (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Mod Carousel Penuh (2 slide aktif)
            </span>
          ) : (
            <span className="text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              Sila aktifkan sekurang-kurangnya 1 slide
            </span>
          )}
        </div>
      </div>

      {/* Slide Editor Form */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Slide Header & Enable Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center font-black text-xs">
              0{activeSlideTab + 1}
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Penyunting Kandungan: {activeSlideTab === 0 ? 'Slide 1 (Sorotan Utama)' : 'Slide 2 (Discovery Guidance)'}
              </h3>
              <p className="text-xs text-slate-500">
                Ubah teks, lencana, visual, tema warna dan sasaran butang CTA slide ini.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={currentSlide.enabled}
              onChange={() => handleToggleSlideEnabled(activeSlideTab)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span className="text-xs font-black text-slate-800">
              {currentSlide.enabled ? 'Slide Diaktifkan (ON)' : 'Slide Dimatikan (OFF)'}
            </span>
          </label>
        </div>

        {/* Quick Presets Section */}
        <div className="space-y-2 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Muat Cepat Preset Kandungan (1-Click Auto-Fill):</span>
            </label>
            <span className="text-[10px] text-indigo-600 font-semibold">Jimat Masa</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preset 1: Discovery Kalendar */}
            <button
              type="button"
              onClick={() => handleApplyCalendarPreset(activeSlideTab)}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-300 text-indigo-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-indigo-50/50 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Preset: Panduan Kalendar Discovery</span>
            </button>

            {/* Preset 2: Hebahan Rasmi */}
            <button
              type="button"
              onClick={() => handleApplyAnnouncementPreset(activeSlideTab)}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-300 text-indigo-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-indigo-50/50 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Preset: Pusat Maklumat Rasmi</span>
            </button>

            {/* Preset 3: Dropdown from live events */}
            <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg px-2 py-1 shadow-2xs">
              <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyFeaturedEventPreset(activeSlideTab, e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="" disabled>Pilih dari Senarai Acara Semasa...</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Field: Title */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 block">
              Tajuk Utama Slide (Headline) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={currentSlide.title}
              onChange={(e) => handleUpdateSlide(activeSlideTab, 'title', e.target.value)}
              placeholder="Cth: Pusat Acara & Program Rasmi KPMBP"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Field: Subtitle */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Sub-Tajuk / Label Tambahan
            </label>
            <input
              type="text"
              value={currentSlide.subtitle || ''}
              onChange={(e) => handleUpdateSlide(activeSlideTab, 'subtitle', e.target.value)}
              placeholder="Cth: Kolej Profesional MARA Bandar Penawar"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Field: Badge Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Teks Lencana (Pill Badge) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={currentSlide.badgeText}
              onChange={(e) => handleUpdateSlide(activeSlideTab, 'badgeText', e.target.value)}
              placeholder="Cth: Pusat Maklumat Rasmi KPMBP / Panduan Kalendar"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Field: Badge Icon */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Ikon Lencana
            </label>
            <select
              value={currentSlide.badgeIcon || 'sparkle'}
              onChange={(e) => handleUpdateSlide(activeSlideTab, 'badgeIcon', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="sparkle">✨ Sparkle (Kilauan / Rasmi)</option>
              <option value="calendar">📅 Calendar (Kalendar & Tarikh)</option>
              <option value="compass">🧭 Compass (Discovery & Panduan)</option>
              <option value="flame">🔥 Flame (Hangat / Trending)</option>
              <option value="star">⭐ Star (Sorotan Khas)</option>
              <option value="shield">🛡️ Shield (Keselamatan / Pengesahan)</option>
              <option value="book">📖 Book (Akademik & Bengkel)</option>
            </select>
          </div>

          {/* Field: Accent Theme Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Tema Warna Aksen Slide
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-600' },
                { id: 'purple', label: 'Ungu', bg: 'bg-purple-600' },
                { id: 'emerald', label: 'Zamrud', bg: 'bg-emerald-600' },
                { id: 'amber', label: 'Amber', bg: 'bg-amber-600' },
                { id: 'rose', label: 'Ros', bg: 'bg-rose-600' },
                { id: 'blue', label: 'Biru', bg: 'bg-blue-600' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleUpdateSlide(activeSlideTab, 'accentTheme', theme.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    (currentSlide.accentTheme || 'indigo') === theme.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.bg}`} />
                  <span>{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Field: Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 block">
              Penerangan Ringkas Slide <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={currentSlide.description}
              onChange={(e) => handleUpdateSlide(activeSlideTab, 'description', e.target.value)}
              placeholder="Penerangan ringkas mesej atau arahan penggunaan..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
            />
          </div>

          {/* Field: Image Banner Manager */}
          <div className="space-y-3 md:col-span-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Pengurusan Visual / Gambar Banner Slide</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Format: JPG, PNG, WebP (Auto-dimampatkan)
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={(e) => handleHeroImageUpload(e, activeSlideTab)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left/Main: Upload & URL inputs */}
              <div className="lg:col-span-7 space-y-3">
                {/* Upload Action Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingImage}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isCompressingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memampatkan Gambar...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Muat Naik Dari Komputer / Telefon</span>
                      </>
                    )}
                  </button>

                  {currentSlide.imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHeroImage(activeSlideTab)}
                      className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Padam Gambar</span>
                    </button>
                  )}
                </div>

                {/* Direct URL Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-slate-400" />
                    <span>Atau Masukkan URL Pautan Gambar:</span>
                  </label>
                  <input
                    type="text"
                    value={currentSlide.imageUrl || ''}
                    onChange={(e) => handleUpdateSlide(activeSlideTab, 'imageUrl', e.target.value)}
                    placeholder="https://... (URL pautan gambar)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                {/* Preset Banner Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400">Pilihan Pantas:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSlide(activeSlideTab, 'imageUrl', 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Banner OGI Rasmi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSlide(activeSlideTab, 'imageUrl', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000&auto=format&fit=crop')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Banner Kalendar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSlide(activeSlideTab, 'imageUrl', 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000&auto=format&fit=crop')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Banner Aktiviti Kampus
                  </button>
                </div>
              </div>

              {/* Right: Live Image Thumbnail Preview */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center group shadow-xs">
                  {currentSlide.imageUrl ? (
                    <>
                      <img
                        src={currentSlide.imageUrl}
                        alt="Pratonton Gambar Slide"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 bg-white/90 text-slate-900 rounded-lg text-xs font-bold shadow-md hover:bg-white transition-transform hover:scale-105"
                          title="Tukar Gambar"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveHeroImage(activeSlideTab)}
                          className="p-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-rose-700 transition-transform hover:scale-105"
                          title="Padam Gambar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[9px] font-extrabold rounded backdrop-blur-xs">
                        Gambar Aktif
                      </span>
                    </>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-center p-4 cursor-pointer hover:bg-slate-200/50 transition-colors w-full h-full flex flex-col items-center justify-center"
                    >
                      <ImageIcon className="w-7 h-7 text-slate-400 mb-1" />
                      <p className="text-xs font-bold text-slate-700">Tiada gambar dipilih</p>
                      <p className="text-[10px] text-slate-500">Klik untuk muat naik fail poster</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Call To Action (CTA) Buttons Configuration */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            KONFIGURASI BUTANG TINDAKAN (CTA BUTTONS)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Primary CTA */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>Butang Tindakan Utama (Primary CTA)</span>
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                  Wajib
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">Teks Butang</label>
                <input
                  type="text"
                  value={currentSlide.primaryCtaText}
                  onChange={(e) => handleUpdateSlide(activeSlideTab, 'primaryCtaText', e.target.value)}
                  placeholder="Cth: Buka Kalendar Sekarang / Lihat Semua Acara"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">Jenis Tindakan (Action)</label>
                <select
                  value={currentSlide.primaryCtaAction}
                  onChange={(e) => handleUpdateSlide(activeSlideTab, 'primaryCtaAction', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="tab_calendar">📅 Buka Tab Kalendar (Calendar View)</option>
                  <option value="tab_events">📋 Buka Tab Semua Acara (Events Feed)</option>
                  <option value="tab_dont_miss">🔥 Buka Tab Jangan Terlepas (Urgent)</option>
                  <option value="tab_archive">📦 Buka Tab Arkib Acara</option>
                  <option value="open_event">🔍 Buka Modal Acara Khusus</option>
                  <option value="external_url">🔗 Buka Pautan Luar (External Link)</option>
                </select>
              </div>

              {/* Conditional Target Field for open_event or external_url */}
              {currentSlide.primaryCtaAction === 'open_event' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-[11px] font-bold text-slate-600 block">Pilih Acara Sasaran:</label>
                  <select
                    value={currentSlide.primaryCtaTarget || currentSlide.linkedEventId || ''}
                    onChange={(e) => {
                      handleUpdateSlide(activeSlideTab, 'primaryCtaTarget', e.target.value);
                      handleUpdateSlide(activeSlideTab, 'linkedEventId', e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Pilih acara...</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {currentSlide.primaryCtaAction === 'external_url' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-[11px] font-bold text-slate-600 block">URL Pautan Luar:</label>
                  <input
                    type="text"
                    value={currentSlide.primaryCtaTarget || ''}
                    onChange={(e) => handleUpdateSlide(activeSlideTab, 'primaryCtaTarget', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}
            </div>

            {/* Secondary CTA */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Butang Tindakan Kedua (Secondary CTA)</span>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  Pilihan
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">Teks Butang</label>
                <input
                  type="text"
                  value={currentSlide.secondaryCtaText || ''}
                  onChange={(e) => handleUpdateSlide(activeSlideTab, 'secondaryCtaText', e.target.value)}
                  placeholder="Cth: Buka Kalendar Event (atau kosongkan)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">Jenis Tindakan</label>
                <select
                  value={currentSlide.secondaryCtaAction || 'none'}
                  onChange={(e) => handleUpdateSlide(activeSlideTab, 'secondaryCtaAction', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="none">🚫 Tiada Butang Kedua</option>
                  <option value="tab_calendar">📅 Buka Tab Kalendar</option>
                  <option value="tab_events">📋 Buka Tab Semua Acara</option>
                  <option value="tab_dont_miss">🔥 Buka Tab Jangan Terlepas</option>
                  <option value="tab_archive">📦 Buka Tab Arkib Acara</option>
                </select>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Live Preview of Hero Carousel */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">
              Pratonton Interaktif Hero Carousel (Live Visual Preview)
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPreviewSlideIndex(0)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                previewSlideIndex === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Slide 1
            </button>
            <button
              type="button"
              onClick={() => setPreviewSlideIndex(1)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                previewSlideIndex === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Slide 2
            </button>
          </div>
        </div>

        {/* Mini Preview Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              {/* Badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>{previewSlide.badgeText}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  Acara Dibuka
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  {previewSlide.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                  {previewSlide.description}
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5">
                  <span>{previewSlide.primaryCtaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                {previewSlide.secondaryCtaText && previewSlide.secondaryCtaAction !== 'none' && (
                  <span className="px-3.5 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-2xs">
                    {previewSlide.secondaryCtaText}
                  </span>
                )}
              </div>
            </div>

            {/* Poster Thumbnail */}
            <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-900">
              <img
                src={previewSlide.imageUrl || 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/OGI/OGI.Event.v3.jpg'}
                alt={previewSlide.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Floating Save Action Bar when there are unsaved edits */}
      {isDirty && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">Perubahan Hero Carousel Belum Disimpan</p>
              <p className="text-[10px] text-slate-300 truncate">Tekan butang simpan untuk kemaskini di homepage & database</p>
            </div>
          </div>
          
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};
