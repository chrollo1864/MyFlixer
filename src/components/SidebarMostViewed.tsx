import React, { useState, useEffect } from 'react';
import { TrendingUp, Star, Play } from 'lucide-react';
import { Movie } from '../types/movie';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

interface SidebarMostViewedProps {
  curatedMovies?: Movie[];
  title?: string;
  itemsCount?: number;
}

export const SidebarMostViewed: React.FC<SidebarMostViewedProps> = ({
  curatedMovies,
  title = 'Most Viewed',
  itemsCount = 8
}) => {
  const { navigateTo } = useApp();
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    if (curatedMovies !== undefined) return;
    api.getMostViewed(activeTab).then(setMovies);
  }, [activeTab, curatedMovies]);

  const displayedMovies = (curatedMovies ?? movies).slice(0, itemsCount);

  return (
    <aside className="w-full bg-[#242832] rounded-2xl p-4 border border-[#2e3442] shadow-lg space-y-4">
      {/* Head: Title + Day/Week/Month Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2129]">
        <div className="flex items-center gap-2 text-white font-semibold text-base">
          <TrendingUp className="w-4 h-4 text-[#db6937]" />
          <span>{title}</span>
        </div>

        {/* Tabs: Day / Week / Month */}
        {curatedMovies === undefined && <div className="flex items-center gap-1 bg-[#1a1c23] p-1 rounded-xl text-xs">
          {(['day', 'week', 'month'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#4f83d3] text-white shadow'
                  : 'text-[#b2b1ad] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>}
      </div>

      {/* Ranked Movie Items List */}
      <div className="space-y-2">
        {displayedMovies.map((movie, index) => (
          <div
            key={movie.id}
            onClick={() => navigateTo('watch', movie.id)}
            className="flex items-center gap-3 p-2 bg-[#1a1c23] hover:bg-[#292d38] border border-transparent hover:border-[#db6937]/50 rounded-xl cursor-pointer transition-all duration-200 group"
          >
            {/* Index rank indicator */}
            <span className={`text-xs font-bold w-4 text-center shrink-0 ${
              index === 0 ? 'text-[#db6937]' : index === 1 ? 'text-[#4f83d3]' : index === 2 ? 'text-amber-400' : 'text-[#6c757d]'
            }`}>
              {index + 1}
            </span>

            {/* Poster Thumbnail */}
            <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-[#242832]">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Play className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            </div>

            {/* Title and Metadata */}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-[#e9ecef] group-hover:text-[#4f83d3] transition-colors truncate">
                {movie.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#b2b1ad]">
                <span className="capitalize">{movie.type}</span>
                <span>•</span>
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.duration}</span>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 shrink-0">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{movie.rating}</span>
            </div>
          </div>
        ))}
        {curatedMovies !== undefined && displayedMovies.length === 0 && (
          <p className="text-xs text-[#8f96a3] text-center py-3">No selected titles are available.</p>
        )}
      </div>
    </aside>
  );
};
