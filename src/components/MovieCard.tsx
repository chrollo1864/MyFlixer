import React, { useState, useRef } from 'react';
import { Play, Bookmark, Star } from 'lucide-react';
import { Movie } from '../types/movie';
import { useApp } from '../context/AppContext';
import { MovieTooltip } from './MovieTooltip';

interface MovieCardProps {
  movie: Movie;
  showProgress?: boolean;
  progressPercent?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  showProgress = false,
  progressPercent = 0 
}) => {
  const { navigateTo, toggleFavorite, isFavorite } = useApp();
  const isFav = isFavorite(movie.id);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setShowTooltip(false);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col p-1.5 bg-[#242832] rounded-[1.3rem] border border-transparent hover:border-[#db6937] transition-all duration-300 shadow-md hover:shadow-xl"
    >
      {/* Tooltipster Hover Popover on Desktop */}
      {showTooltip && (
        <div className="hidden lg:block absolute left-full top-2 z-[60] ml-2">
          <MovieTooltip movie={movie} />
        </div>
      )}
      {/* Top Media Poster Area */}
      <div 
        onClick={() => navigateTo('watch', movie.id)}
        className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden cursor-pointer bg-[#1a1c23]"
      >
        <img
          src={movie.posterUrl}
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Quality Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="bg-[#db6937] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow uppercase tracking-wide">
            {movie.quality}
          </span>
        </div>

        {/* Bookmark / Watchlist Action (Top Right) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(movie.id);
          }}
          className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer shadow ${
            isFav 
              ? 'bg-[#db6937] text-white' 
              : 'bg-black/60 text-[#b2b1ad] hover:text-white hover:bg-black/90'
          }`}
          title={isFav ? "Remove from watchlist" : "Add to watchlist"}
          aria-label={isFav ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
        </button>

        {/* Hover Overlay: Dark Gradient + Central Play Button Icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#db6937]/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 text-[#1e2129] flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300 pl-0.5">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div>
      </div>

      {/* Card Body: Meta & Title */}
      <div className="pt-2 px-1 pb-1 flex flex-col flex-1 justify-between">
        {/* Rounded Metadata Pill matching theme's .meta .meta-bg */}
        <div className="bg-[#1a1c23] py-1 px-2 rounded-full text-center text-[11px] text-[#b2b1ad] flex items-center justify-center gap-1.5 font-normal tracking-wide">
          <span className="capitalize">{movie.type === 'tv' ? 'TV' : 'Movie'}</span>
          <span>•</span>
          <span>{movie.year}</span>
          <span>•</span>
          <span className="truncate">{movie.duration}</span>
        </div>

        {/* Title */}
        <h3 
          onClick={() => navigateTo('watch', movie.id)}
          className="mt-1.5 text-xs sm:text-sm font-semibold text-[#e9ecef] group-hover:text-[#4f83d3] transition-colors line-clamp-2 text-center cursor-pointer min-h-[2.5rem] leading-snug"
          title={movie.title}
        >
          {movie.title}
        </h3>

        {/* Optional Watch History Progress Bar */}
        {showProgress && (
          <div className="mt-2 w-full bg-[#1a1c23] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-flixer h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
