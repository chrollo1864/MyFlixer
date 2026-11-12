import React from 'react';
import { Play, Star, Bookmark, Clock, Calendar, Sparkles } from 'lucide-react';
import { Movie } from '../types/movie';
import { useApp } from '../context/AppContext';

interface MovieTooltipProps {
  movie: Movie;
  position?: 'right' | 'left' | 'top';
}

export const MovieTooltip: React.FC<MovieTooltipProps> = ({ movie, position = 'right' }) => {
  const { navigateTo, toggleFavorite, isFavorite } = useApp();
  const isFav = isFavorite(movie.id);
  const genres = Array.isArray(movie.genres)
    ? movie.genres.filter((genre): genre is string => typeof genre === 'string')
    : [];

  return (
    <div className="w-72 bg-[#292d38] border border-[#1a1c23] rounded-2xl shadow-2xl p-3.5 text-left text-[#e9ecef] animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
      {/* Head */}
      <div className="bg-[#1e2129] p-3 rounded-xl relative">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-white line-clamp-1 leading-snug">
            {movie.title}
          </h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(movie.id);
            }}
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              isFav ? 'text-[#db6937]' : 'text-[#6c757d] hover:text-white'
            }`}
            title={isFav ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark className={`w-4 h-4 ${isFav ? 'fill-[#db6937]' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2 text-[11px] text-[#b2b1ad] flex-wrap">
          <span className="border border-[#6c757d]/50 text-white font-bold px-1.5 py-0.2 rounded text-[10px]">
            {movie.quality}
          </span>
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="w-3 h-3 fill-amber-400" />
            {movie.rating}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {movie.duration}
          </span>
          <span>•</span>
          <span>{movie.year}</span>
        </div>
      </div>

      {/* Body */}
      <div className="pt-2.5 px-1 space-y-2.5 text-xs text-[#b2b1ad]">
        <p className="line-clamp-3 text-[#c9ccd2] leading-relaxed text-[11px]">
          {movie.synopsis}
        </p>

        <div className="flex flex-wrap gap-1">
          {genres.slice(0, 3).map((g) => (
            <span
              key={g}
              className="bg-[#1e2129] text-[10px] text-[#4f83d3] px-2 py-0.5 rounded-full"
            >
              {g}
            </span>
          ))}
          <span className="text-[10px] text-[#6c757d] self-center">
            {movie.country}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateTo('watch', movie.id);
          }}
          className="w-full mt-1 bg-gradient-flixer hover:opacity-95 text-white font-semibold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer text-xs"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Watch Now</span>
        </button>
      </div>
    </div>
  );
};
