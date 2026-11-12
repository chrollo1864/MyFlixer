import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react';
import { Movie } from '../types/movie';
import { useApp } from '../context/AppContext';

interface HeroSliderProps {
  movies: Movie[];
}

type SlideDirection = 'next' | 'prev';

interface PointerDrag {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ movies }) => {
  const { navigateTo, toggleFavorite, isFavorite } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<SlideDirection | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const dragDirectionRef = useRef<SlideDirection | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PointerDrag | null>(null);
  const pendingIndexRef = useRef<number | null>(null);
  const commitPullRef = useRef(false);
  const settlingRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const setCurtainPull = (offset: number, width: number) => {
    const curtain = curtainRef.current;
    if (!curtain) return;

    const progress = Math.min(1, Math.abs(offset) / Math.max(width, 1));
    const bend = 36 * progress;
    curtain.style.setProperty('--pull-x', `${offset}px`);
    curtain.style.setProperty('--pull-progress', `${progress}`);
    curtain.style.setProperty('--pull-rotate', `${(offset < 0 ? -1 : 1) * 5 * progress}deg`);
    curtain.style.setProperty('--pull-skew', `${(offset < 0 ? -1 : 1) * 2.5 * progress}deg`);
    curtain.style.setProperty('--pull-scale', `${1 - 0.025 * progress}`);
    curtain.style.setProperty('--pull-bend-top', `${bend}px`);
    curtain.style.setProperty('--pull-bend-quarter', `${bend * 0.45}px`);
  };

  const finishPull = () => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    if (commitPullRef.current && pendingIndexRef.current !== null) {
      setCurrentIndex(pendingIndexRef.current);
    }

    commitPullRef.current = false;
    pendingIndexRef.current = null;
    settlingRef.current = false;
    dragDirectionRef.current = null;
    setIsSettling(false);
    setDragDirection(null);
    setCurtainPull(0, sliderRef.current?.clientWidth ?? 1);
  };

  const startPull = (direction: SlideDirection, targetIndex: number) => {
    if (settlingRef.current || dragRef.current || movies.length <= 1 || targetIndex === currentIndexRef.current) return;

    settlingRef.current = true;
    commitPullRef.current = true;
    pendingIndexRef.current = targetIndex;
    dragDirectionRef.current = direction;
    setDragDirection(direction);
    setIsSettling(true);
    setCurtainPull(0, sliderRef.current?.clientWidth ?? 1);

    window.requestAnimationFrame(() => {
      const width = sliderRef.current?.clientWidth ?? 1;
      setCurtainPull((direction === 'next' ? -1 : 1) * width * 1.12, width);
    });
    settleTimerRef.current = window.setTimeout(finishPull, 700);
  };

  const showPrevious = () => {
    const target = (currentIndexRef.current - 1 + movies.length) % movies.length;
    startPull('prev', target);
  };

  const showNext = () => {
    const target = (currentIndexRef.current + 1) % movies.length;
    startPull('next', target);
  };

  const selectSlide = (index: number) => {
    const current = currentIndexRef.current;
    const forwardDistance = (index - current + movies.length) % movies.length;
    startPull(forwardDistance <= movies.length / 2 ? 'next' : 'prev', index);
  };

  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = window.setInterval(showNext, 6500);
    return () => window.clearInterval(timer);
  }, [movies.length, currentIndex]);

  useEffect(() => () => {
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
  }, []);

  if (!movies || movies.length === 0) return null;

  const currentMovie = movies[currentIndex];
  const isFav = isFavorite(currentMovie.id);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (settlingRef.current || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select')) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityX: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const elapsed = Math.max(event.timeStamp - drag.lastTime, 1);
    drag.velocityX = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const horizontalDrag = Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY);
    if (!dragDirectionRef.current && horizontalDrag) {
      const direction = deltaX < 0 ? 'next' : 'prev';
      dragDirectionRef.current = direction;
      setDragDirection(direction);
      pendingIndexRef.current = direction === 'next'
        ? (currentIndexRef.current + 1) % movies.length
        : (currentIndexRef.current - 1 + movies.length) % movies.length;
    }

    if (dragDirectionRef.current || horizontalDrag) {
      setCurtainPull(deltaX, sliderRef.current?.clientWidth ?? 1);
    }
  };

  const settlePointerPull = (commit: boolean) => {
    const direction = dragDirectionRef.current;
    const drag = dragRef.current;
    if (!direction) {
      dragRef.current = null;
      return;
    }

    const width = sliderRef.current?.clientWidth ?? 1;
    const offset = drag ? drag.lastX - drag.startX : 0;
    commitPullRef.current = commit;
    settlingRef.current = true;
    setIsSettling(true);
    window.requestAnimationFrame(() => {
      setCurtainPull(commit ? (direction === 'next' ? -1 : 1) * width * 1.12 : 0, width);
    });
    settleTimerRef.current = window.setTimeout(finishPull, 700);
    dragRef.current = null;
    if (Math.abs(offset) < 1) finishPull();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!dragDirectionRef.current && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const direction = deltaX < 0 ? 'next' : 'prev';
      dragDirectionRef.current = direction;
      setDragDirection(direction);
      pendingIndexRef.current = direction === 'next'
        ? (currentIndexRef.current + 1) % movies.length
        : (currentIndexRef.current - 1 + movies.length) % movies.length;
    }

    const width = sliderRef.current?.clientWidth ?? 1;
    const distanceThreshold = Math.min(120, width * 0.25);
    const velocityCommits = Math.abs(drag.velocityX) >= 0.5
      && Math.sign(drag.velocityX) === Math.sign(deltaX)
      && Math.abs(deltaX) >= 24;
    const shouldCommit = Math.abs(deltaX) >= distanceThreshold || velocityCommits;
    settlePointerPull(shouldCommit && movies.length > 1);
  };

  const handlePointerCancel = () => {
    if (dragRef.current) settlePointerPull(false);
  };

  return (
    <div
      ref={sliderRef}
      className={`relative w-full h-[min(560px,92svh)] min-h-[500px] sm:h-[540px] sm:min-h-0 md:h-[620px] bg-[#1e2129] overflow-hidden select-none group cursor-grab active:cursor-grabbing touch-pan-y ${dragDirection ? 'hero-curtain-stage' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {dragDirection && pendingIndexRef.current !== null && (
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-top"
          style={{ backgroundImage: `url(${movies[pendingIndexRef.current].backdropUrl})` }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e2129] via-[#1e2129]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e2129]/80 via-[#1e2129]/35 to-transparent" />
        </div>
      )}

      <div
        ref={curtainRef}
        key={currentMovie.id}
        className={`absolute inset-0 z-10 hero-curtain ${dragDirection ? `hero-curtain-${dragDirection}` : ''} ${isSettling ? 'hero-curtain-settling' : ''}`}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === 'transform' && isSettling) finishPull();
        }}
      >
      {/* Background Backdrop Image */}
      <div 
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: `url(${currentMovie.backdropUrl})`, backgroundPosition: 'center top' }}
      >
        {/* Top gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-transparent h-48" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#1e2129] via-[#1e2129]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e2129]/80 via-[#1e2129]/35 to-transparent" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-[1800px] h-full mx-auto px-5 sm:px-12 flex flex-col justify-end pb-12 sm:pb-16 z-10">
        <div className="max-w-2xl space-y-3 sm:space-y-3.5">
          
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white drop-shadow-md leading-none">
            {currentMovie.title}
          </h1>

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs sm:text-sm text-[#e9ecef] font-medium">
            <span className="bg-[#db6937] text-white px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide">
              {currentMovie.quality}
            </span>
            <span className="bg-[#242832] border border-[#3e4555] px-2.5 py-0.5 rounded-md flex items-center gap-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{currentMovie.rating}</span>
            </span>
            <span className="flex items-center gap-1 text-[#b2b1ad]">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentMovie.duration}</span>
            </span>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[#b2b1ad]">
              {currentMovie.genres.slice(0, 3).map((g, index) => (
                <span key={g} className="whitespace-nowrap">
                  {index > 0 && <span className="mr-1.5 text-[#6b7280]">•</span>}
                  <span className="hover:text-white transition-colors cursor-pointer">
                    {g}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-[#b2b1ad] line-clamp-3 leading-relaxed max-w-xl font-light">
            {currentMovie.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={() => navigateTo('watch', currentMovie.id)}
              className="bg-gradient-flixer hover:opacity-95 text-white text-sm font-semibold px-6 py-3 rounded-full flex items-center gap-2.5 shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={() => toggleFavorite(currentMovie.id)}
              className={`px-5 py-3 rounded-full border text-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                isFav 
                  ? 'bg-rose-600/20 border-rose-500 text-rose-300' 
                  : 'bg-[#242832]/80 border-[#3e4555] text-[#e9ecef] hover:bg-[#343b4a]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{isFav ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center gap-2 mt-4 sm:mt-6">
          {movies.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => selectSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-[#db6937]' : 'w-2.5 bg-neutral-600 hover:bg-neutral-400'
              }`}
              title={`Slide to ${m.title}`}
              aria-label={`Slide to ${m.title}`}
            />
          ))}
        </div>
      </div>
        {dragDirection && <div className={`hero-curtain-edge hero-curtain-edge-${dragDirection}`} />}
      </div>

      {/* Next / Previous Arrow Controls */}
      <button
        onClick={showPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white hidden sm:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={showNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white hidden sm:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};
