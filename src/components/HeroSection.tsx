import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Compass, 
  Flame, 
  Shield, 
  Star, 
  BookOpen, 
  ExternalLink,
  Pause,
  Play
} from 'lucide-react';
import { ViewTab, HeroConfig, HeroSlide, DEFAULT_HERO_CONFIG, KpmbpEvent, HeroCtaAction } from '../types';

interface HeroSectionProps {
  heroConfig?: HeroConfig;
  config?: HeroConfig;
  onSelectTab: (tab: ViewTab) => void;
  onOpenEventDetail?: (event: KpmbpEvent) => void;
  onViewDetails?: (event: KpmbpEvent) => void;
  onOpenEventById?: (eventId: string) => void;
  events?: KpmbpEvent[];
  openCount: number;
  urgentCount: number;
  selectedCategory?: string;
  onSelectCategory?: (category: any) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  heroConfig,
  config,
  onSelectTab,
  onOpenEventDetail,
  onViewDetails,
  onOpenEventById,
  events = [],
  openCount,
  urgentCount
}) => {
  const effectiveConfig = heroConfig || config || DEFAULT_HERO_CONFIG;
  const activeSlides = (effectiveConfig?.slides || DEFAULT_HERO_CONFIG.slides).filter((s) => s.enabled);
  const slidesToDisplay: HeroSlide[] = activeSlides.length > 0 ? activeSlides : [DEFAULT_HERO_CONFIG.slides[0]];
  const isCarousel = slidesToDisplay.length > 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [imageLoadError, setImageLoadError] = useState<Record<string, boolean>>({});

  // Ensure current index is within bounds if slides change
  useEffect(() => {
    if (currentIndex >= slidesToDisplay.length) {
      setCurrentIndex(0);
    }
  }, [slidesToDisplay.length, currentIndex]);

  // Auto-play timer
  useEffect(() => {
    if (!isCarousel || isPaused || effectiveConfig.autoPlay === false) return;

    const intervalMs = Math.max(3, effectiveConfig.intervalSeconds || 6) * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slidesToDisplay.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isCarousel, isPaused, effectiveConfig.autoPlay, effectiveConfig.intervalSeconds, slidesToDisplay.length]);

  const currentSlide = slidesToDisplay[currentIndex] || slidesToDisplay[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slidesToDisplay.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slidesToDisplay.length) % slidesToDisplay.length);
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 45 && isCarousel) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  // Execute CTA Action
  const executeCtaAction = (action?: HeroCtaAction | 'none', target?: string) => {
    if (!action || action === 'none') return;

    const detailHandler = onViewDetails || onOpenEventDetail;

    switch (action) {
      case 'tab_calendar':
        onSelectTab('calendar');
        break;
      case 'tab_events':
        onSelectTab('events');
        break;
      case 'tab_dont_miss':
        onSelectTab('dont-miss');
        break;
      case 'tab_archive':
        onSelectTab('archive');
        break;
      case 'open_event':
        if (target) {
          if (onOpenEventById) {
            onOpenEventById(target);
          } else if (detailHandler && events.length > 0) {
            const found = events.find((e) => e.id === target);
            if (found) detailHandler(found);
          }
        } else {
          onSelectTab('events');
        }
        break;
      case 'external_url':
        if (target) {
          window.open(target.startsWith('http') ? target : `https://${target}`, '_blank', 'noopener,noreferrer');
        }
        break;
      default:
        onSelectTab('discover');
    }
  };

  const getBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'flame':
        return <Flame className="w-3.5 h-3.5" />;
      case 'shield':
        return <Shield className="w-3.5 h-3.5" />;
      case 'star':
        return <Star className="w-3.5 h-3.5" />;
      case 'book':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'compass':
        return <Compass className="w-3.5 h-3.5" />;
      case 'sparkle':
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const getAccentStyles = (theme?: string) => {
    switch (theme) {
      case 'purple':
        return {
          glow: 'bg-purple-100/60',
          badge: 'bg-purple-50 border-purple-200 text-purple-700',
          badgeIcon: 'text-purple-600',
          primaryBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200',
          dotActive: 'bg-purple-600',
          tag: 'bg-purple-50 text-purple-700 border-purple-100'
        };
      case 'emerald':
        return {
          glow: 'bg-emerald-100/60',
          badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          badgeIcon: 'text-emerald-600',
          primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
          dotActive: 'bg-emerald-600',
          tag: 'bg-emerald-50 text-emerald-700 border-emerald-100'
        };
      case 'amber':
        return {
          glow: 'bg-amber-100/60',
          badge: 'bg-amber-50 border-amber-200 text-amber-800',
          badgeIcon: 'text-amber-600',
          primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
          dotActive: 'bg-amber-600',
          tag: 'bg-amber-50 text-amber-800 border-amber-100'
        };
      case 'rose':
        return {
          glow: 'bg-rose-100/60',
          badge: 'bg-rose-50 border-rose-200 text-rose-700',
          badgeIcon: 'text-rose-600',
          primaryBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
          dotActive: 'bg-rose-600',
          tag: 'bg-rose-50 text-rose-700 border-rose-100'
        };
      case 'blue':
        return {
          glow: 'bg-blue-100/60',
          badge: 'bg-blue-50 border-blue-200 text-blue-700',
          badgeIcon: 'text-blue-600',
          primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
          dotActive: 'bg-blue-600',
          tag: 'bg-blue-50 text-blue-700 border-blue-100'
        };
      case 'indigo':
      default:
        return {
          glow: 'bg-indigo-100/60',
          badge: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          badgeIcon: 'text-indigo-600',
          primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
          dotActive: 'bg-indigo-600',
          tag: 'bg-indigo-50 text-indigo-700 border-indigo-100'
        };
    }
  };

  const currentTheme = getAccentStyles(currentSlide.accentTheme);

  // Render CTA Button Icon
  const getCtaIcon = (action: HeroCtaAction) => {
    switch (action) {
      case 'tab_calendar':
        return <Calendar className="w-4 h-4" />;
      case 'external_url':
        return <ExternalLink className="w-4 h-4" />;
      case 'tab_dont_miss':
        return <Flame className="w-4 h-4 text-amber-300" />;
      case 'open_event':
      case 'tab_events':
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  return (
    <section 
      className="relative pt-2 pb-4 md:pt-4 md:pb-6 z-10 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 sm:p-7 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden transition-all duration-300">
        
        {/* Dynamic Glow Sphere matching slide theme */}
        <div 
          className={`absolute top-0 right-0 w-[420px] h-[420px] ${currentTheme.glow} rounded-full blur-3xl -z-10 pointer-events-none transition-colors duration-500`} 
        />

        {/* Carousel Header / Counter (Only if >1 slide) */}
        {isCarousel && (
          <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100/80">
            {/* Slide Index Display: 01 / 02 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 tracking-wider">
                0{currentIndex + 1}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">/</span>
              <span className="text-xs font-bold text-slate-400">
                0{slidesToDisplay.length}
              </span>
              <div className="h-3 w-px bg-slate-200 mx-1.5" />
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline-block">
                {currentSlide.badgeText}
              </span>
            </div>

            {/* Carousel Navigation Buttons & Indicators */}
            <div className="flex items-center gap-2">
              {/* Dots / Segmented Indicators */}
              <div className="flex items-center gap-1.5 mr-1">
                {slidesToDisplay.map((slide, idx) => (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Pergi ke slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      currentIndex === idx 
                        ? `w-6 ${currentTheme.dotActive} shadow-xs` 
                        : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              {/* Pause / Play status indicator */}
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? "Mainkan Auto-slide" : "Hentikan Auto-slide"}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title={isPaused ? "Auto-slide dijeda (klik untuk sambung)" : "Sedang berputar (hover untuk jeda)"}
              >
                {isPaused ? <Play className="w-3 h-3 text-slate-500" /> : <Pause className="w-3 h-3" />}
              </button>

              {/* Prev & Next Arrows */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Slide Sebelumnya"
                className="p-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 transition-all active:scale-90 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Slide Seterusnya"
                className="p-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 transition-all active:scale-90 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Animated Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || currentIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8"
          >
            {/* Left Column: Text, Badges, CTAs */}
            <div className="flex-1 space-y-4 max-w-2xl">
              
              {/* Badges & Live Status */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-2xs transition-colors ${currentTheme.badge}`}>
                  <span className={currentTheme.badgeIcon}>
                    {getBadgeIcon(currentSlide.badgeIcon)}
                  </span>
                  <span>{currentSlide.badgeText || 'Pusat Maklumat Rasmi KPMBP'}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{openCount} Acara Dibuka</span>
                </div>

                {currentSlide.subtitle && (
                  <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline-block">
                    • {currentSlide.subtitle}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {currentSlide.title}
                </h1>
                
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
                  {currentSlide.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                {/* Primary CTA */}
                {currentSlide.primaryCtaText && (
                  <button
                    type="button"
                    onClick={() => executeCtaAction(currentSlide.primaryCtaAction, currentSlide.primaryCtaTarget || currentSlide.linkedEventId)}
                    className={`${currentTheme.primaryBtn} px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center gap-2 active:scale-95 group cursor-pointer`}
                  >
                    <span>{currentSlide.primaryCtaText}</span>
                    <span className="transition-transform group-hover:translate-x-0.5">
                      {getCtaIcon(currentSlide.primaryCtaAction)}
                    </span>
                  </button>
                )}

                {/* Secondary CTA */}
                {currentSlide.secondaryCtaText && currentSlide.secondaryCtaAction !== 'none' && (
                  <button
                    type="button"
                    onClick={() => executeCtaAction(currentSlide.secondaryCtaAction || 'tab_events', currentSlide.secondaryCtaTarget)}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 active:scale-95 group cursor-pointer"
                  >
                    <span>{currentSlide.secondaryCtaText}</span>
                    <span className="text-slate-400 group-hover:text-slate-700 transition-colors">
                      {getCtaIcon(currentSlide.secondaryCtaAction || 'tab_events')}
                    </span>
                  </button>
                )}

                {/* Urgent alert shortcut */}
                {urgentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('dont-miss')}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>{urgentCount} Pendaftaran Tutup Segera!</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Visual / Image Banner */}
            <div className="w-full lg:w-auto flex-shrink-0 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-sm h-48 sm:h-52 md:h-56 rounded-2xl overflow-hidden shadow-sm border border-slate-100/90 bg-slate-900/5 group">
                {currentSlide.imageUrl && !imageLoadError[currentSlide.imageUrl] ? (
                  <img
                    key={currentSlide.imageUrl}
                    src={currentSlide.imageUrl}
                    alt={currentSlide.imageAlt || currentSlide.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (currentSlide.imageUrl) {
                        setImageLoadError((prev) => ({ ...prev, [currentSlide.imageUrl!]: true }));
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                      {getBadgeIcon(currentSlide.badgeIcon)}
                    </div>
                    <p className="text-sm font-extrabold text-white line-clamp-1">{currentSlide.title}</p>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{currentSlide.badgeText}</p>
                  </div>
                )}
                
                {/* Subtle gradient overlay at the bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />

                {/* Pill overlay on image */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] font-bold text-white tracking-wide border border-white/10">
                    {currentSlide.badgeText || 'EVENT KPMBP'}
                  </span>
                </div>
              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
