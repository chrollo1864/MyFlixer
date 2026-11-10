import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { FilterOptions } from '../types/movie';
import { YEAR_LIST } from '../services/catalogOptions';

interface FilterBarProps {
  filters: FilterOptions;
  genres: string[];
  countries: string[];
  onChange: (updated: FilterOptions) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, genres, countries, onChange, onReset }) => {
  const handleChange = (key: keyof FilterOptions, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="w-full bg-[#242832] border border-[#2e3442] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
          <SlidersHorizontal className="w-4 h-4 text-[#db6937]" />
          <span>Advanced Filter System</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#b2b1ad] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Type */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#b2b1ad] uppercase tracking-wider block">Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Series</option>
          </select>
        </div>

        {/* Quality */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#b2b1ad] uppercase tracking-wider block">Quality</label>
          <select
            value={filters.quality}
            onChange={(e) => handleChange('quality', e.target.value)}
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            <option value="all">All Qualities</option>
            <option value="4K">4K Ultra HD</option>
            <option value="HD">1080p HD</option>
            <option value="CAM">CAM</option>
          </select>
        </div>

        {/* Genre */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#b2b1ad] uppercase tracking-wider block">Genre</label>
          <select
            value={filters.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            <option value="All">All Genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Release Year */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#b2b1ad] uppercase tracking-wider block">Year</label>
          <select
            value={filters.year}
            onChange={(e) => handleChange('year', e.target.value)}
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            <option value="All">All Years</option>
            {YEAR_LIST.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#b2b1ad] uppercase tracking-wider block">Country</label>
          <select
            value={filters.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            <option value="All">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#b2b1ad] uppercase tracking-wider block">Sort By</label>
          <select
            value={filters.sort}
            onChange={(e) => handleChange('sort', e.target.value)}
            className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#e9ecef] focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            <option value="updated">Recently Added</option>
            <option value="views">Most Viewed</option>
            <option value="rating">Top Rated</option>
            <option value="title">Title (A - Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
