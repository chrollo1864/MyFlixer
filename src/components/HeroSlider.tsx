import React, { useState, useEffect } from 'react';
import { Play, Heart, ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react';
import { Movie } from '../types/movie';
import { useApp } from '../context/AppContext';

interface HeroSliderProps {
  movies: Movie[];
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ movies }) => {
  const { navigateTo, toggleFavorite, isFavorite } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance slider every 6.5s
  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (!movies || movies.length === 0) return null;

  const currentMovie = movies[currentIndex];
  const isFav = isFavorite(currentMovie.id);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  return (
    <div className="relative w-full h-[min(560px,92svh)] min-h-[500px] sm:h-[540px] sm:min-h-0 md:h-[620px] bg-[#1e2129] overflow-hidden select-none group">
      {/* Background Backdrop Image */}
      <div 
        className="absolute inset-0 bg-cover bg-top transition-all duration-700 ease-out"
        style={{ backgroundImage: `url(${currentMovie.backdropUrl})`, backgroundPosition: 'center top' }}
      >
        {/* Top gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent h-48" />

        {/* Heavy bottom radial and vertical shadow merging with #1e2129 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e2129] via-[#1e2129]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e2129] via-[#1e2129]/60 to-transparent" />
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
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-[#db6937]' : 'w-2.5 bg-neutral-600 hover:bg-neutral-400'
              }`}
              title={`Slide to ${m.title}`}
              aria-label={`Slide to ${m.title}`}
            />
          ))}
        </div>
      </div>

      {/* Next / Previous Arrow Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white hidden sm:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white hidden sm:flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};
