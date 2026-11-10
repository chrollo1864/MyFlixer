import React, { useState } from 'react';
import { Tv, Play, Search, Clock } from 'lucide-react';
import { Season, Episode } from '../types/movie';

interface EpisodeSelectorProps {
  seasons: Season[];
  currentSeasonNumber: number;
  currentEpisodeNumber: number;
  onSelectEpisode: (seasonNum: number, episodeNum: number) => void;
}

export const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  seasons,
  currentSeasonNumber,
  currentEpisodeNumber,
  onSelectEpisode
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(currentSeasonNumber || 1);
  const [searchEp, setSearchEp] = useState('');

  const activeSeasonData = seasons.find(s => s.seasonNumber === selectedSeason) || seasons[0];
  if (!activeSeasonData) return null;

  const filteredEpisodes = activeSeasonData.episodes.filter(ep => 
    searchEp.trim() === '' || 
    ep.title.toLowerCase().includes(searchEp.toLowerCase()) ||
    ep.episodeNumber.toString() === searchEp.trim()
  );

  return (
    <div className="w-full bg-[#242832] rounded-3xl p-4 sm:p-5 border border-[#2e3442] shadow-xl flex flex-col space-y-4">
      {/* Top Header: Season Dropdown + Search Episode */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a1c23]">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-[#db6937]" />
          <span className="text-sm sm:text-base font-semibold text-white">Episodes List</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Season Selector */}
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-1.5 text-xs text-[#e9ecef] font-medium focus:outline-none focus:border-[#4f83d3] cursor-pointer"
          >
            {seasons.map((s) => (
              <option key={s.seasonNumber} value={s.seasonNumber}>
                {s.title} ({s.episodes.length} Episodes)
              </option>
            ))}
          </select>

          {/* Quick Filter Episode */}
          <div className="relative">
            <input
              type="text"
              value={searchEp}
              onChange={(e) => setSearchEp(e.target.value)}
              placeholder="Ep # or name..."
              className="w-28 sm:w-36 bg-[#1a1c23] border border-[#3e4555] rounded-xl pl-7 pr-2 py-1.5 text-xs text-[#e9ecef] placeholder-neutral-500 focus:outline-none focus:border-[#4f83d3]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 top-2" />
          </div>
        </div>
      </div>

      {/* Episodes Grid/List */}
      <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 pr-1">
        {filteredEpisodes.map((ep, idx) => {
          const epKey = ep.id || `ep-${selectedSeason}-${ep.episodeNumber || idx}`;
          const isActive = selectedSeason === currentSeasonNumber && ep.episodeNumber === currentEpisodeNumber;
          return (
            <div
              key={epKey}
              onClick={() => onSelectEpisode(selectedSeason, ep.episodeNumber)}
              className={`p-2.5 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all border ${
                isActive
                  ? 'bg-gradient-flixer text-white border-transparent shadow-lg'
                  : 'bg-[#1a1c23] hover:bg-[#292d38] border-[#252b36] text-[#b2b1ad] hover:text-[#e9ecef]'
              }`}
            >
              {/* Episode thumbnail */}
              <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 bg-[#242832]">
                <img
                  src={ep.thumbnail}
                  alt={ep.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play className={`w-3.5 h-3.5 ${isActive ? 'text-white fill-white' : 'text-neutral-300'}`} />
                </div>
              </div>

              {/* Title & Duration */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-[#db6937]'}`}>
                    EP {ep.episodeNumber}:
                  </span>
                  <h4 className="text-xs font-semibold truncate">{ep.title}</h4>
                </div>
                {ep.overview && (
                  <p className="text-[11px] opacity-80 line-clamp-1 mt-0.5 font-light">
                    {ep.overview}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] shrink-0 opacity-80">
                <Clock className="w-3 h-3" />
                <span>{ep.duration}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
