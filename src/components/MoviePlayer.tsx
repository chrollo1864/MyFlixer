import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Lightbulb, 
  Heart, 
  Flag, 
  Share2, 
  Server, 
  Check, 
  Maximize,
  Volume2,
  SkipBack,
  SkipForward,
  RotateCcw
} from 'lucide-react';
import { Movie, StreamingServer } from '../types/movie';
import { useApp } from '../context/AppContext';
import { buildEmbedUrl } from '../services/embedUrl';

interface MoviePlayerProps {
  movie: Movie;
  activeEpisodeTitle?: string;
  activeSeasonNumber?: number;
  activeEpisodeNumber?: number;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  movie, 
  activeEpisodeTitle,
  activeSeasonNumber,
  activeEpisodeNumber,
  onNextEpisode,
  onPrevEpisode,
  hasNextEpisode = false,
  hasPrevEpisode = false
}) => {
  const { 
    cinemaMode, 
    toggleCinemaMode, 
    toggleFavorite, 
    isFavorite, 
    openModal, 
    showToast,
    updateWatchProgress,
    watchHistory,
    themeOptions
  } = useApp();

  const tmdbId = movie.tmdbId?.trim() || movie.id.replace(/^tmdb-/i, '').trim() || movie.id;
  const configuredServerIds = new Set(themeOptions.streamingServers.map(server => server.id));
  const configuredSources: StreamingServer[] = themeOptions.streamingServers
    .filter(server => server.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(server => {
      const template = movie.type === 'tv'
        ? server.tvEmbedTemplate || server.embedTemplate
        : server.embedTemplate;
      return {
        id: server.id,
        name: server.name,
        quality: server.quality,
        speed: '—',
        embedUrl: buildEmbedUrl(
          template,
          movie.type,
          tmdbId,
          movie.type === 'tv' ? activeSeasonNumber : undefined,
          movie.type === 'tv' ? activeEpisodeNumber : undefined
        )
      };
    })
    .filter(server => Boolean(server.embedUrl));
  // The media editor stores title-specific sources with the stable `srv-1` ID.
  // Older TMDB imports also stored copies of configured servers on each title;
  // don't resurrect those snapshots after an admin removes their server.
  const additionalSources = movie.videoSources.filter(
    source => source.id === 'srv-1' && !configuredServerIds.has(source.id)
  );
  const availableServers = [...configuredSources, ...additionalSources];
  const preferredServer = availableServers.find(s => s.id === themeOptions.player.defaultServerId)
    || availableServers[0];

  const [isPlaying, setIsPlaying] = useState(Boolean(themeOptions.player.autoplay));
  const [selectedServerId, setSelectedServerId] = useState(preferredServer?.id || 'default');
  const selectedServer = availableServers.find(server => server.id === selectedServerId)
    || preferredServer
    || {
      id: 'default',
      name: 'Authorized server',
      quality: 'HD',
      speed: '—',
      embedUrl: ''
    };
  const [isCopied, setIsCopied] = useState(false);

  // MoviePlayer stays mounted while WatchPage changes titles. Reset its URL
  // source to the new title's preferred server instead of retaining the
  // previous title's server URL.
  useEffect(() => {
    setSelectedServerId(preferredServer?.id || 'default');
    setIsPlaying(Boolean(themeOptions.player.autoplay));
  }, [movie.id, themeOptions.player.defaultServerId]);

  const isFav = isFavorite(movie.id);
  const existingHistory = watchHistory.find(h => h.movieId === movie.id);
  const playbackUrl = selectedServer.embedUrl;
  const selectedServerConfig = themeOptions.streamingServers.find(server => server.id === selectedServer.id);
  const iframeSandboxEnabled = selectedServerConfig?.iframeSandboxEnabled === true;

  const handleStartPlay = (resume = false) => {
    if (!playbackUrl) {
      showToast('No playback URL is configured for this title.');
      return;
    }
    setIsPlaying(true);
    const startPercent = resume && existingHistory ? existingHistory.progressPercent : 15;
    updateWatchProgress(movie.id, startPercent, activeSeasonNumber, activeEpisodeNumber);
    if (resume) {
      showToast(`Resumed from ${existingHistory?.progressPercent}%`);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    showToast('Link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
      cinemaMode ? 'z-[102] ring-4 ring-[#4f83d3]/30' : 'z-10'
    }`}>
      {/* Resume playback banner if history exists and setting is enabled */}
      {themeOptions.player.enableResumePlayback !== false && !isPlaying && existingHistory && existingHistory.progressPercent > 5 && (
        <div className="bg-[#1a1c23] border-b border-[#2e3442] px-4 py-2 flex items-center justify-between text-xs text-[#b2b1ad]">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-[#4f83d3]" />
            <span>You previously watched up to <strong>{existingHistory.progressPercent}%</strong></span>
          </div>
          <button
            onClick={() => handleStartPlay(true)}
            className="bg-[#4f83d3] hover:bg-[#db6937] text-white px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Resume Playback
          </button>
        </div>
      )}
      {/* Video Display Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {isPlaying ? (
          <iframe
            key={`${selectedServer.id}-${iframeSandboxEnabled ? 'sandboxed' : 'standard'}`}
            src={`${playbackUrl}${playbackUrl.includes('?') ? '&' : '?'}autoplay=1&rel=0`}
            title={movie.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox={iframeSandboxEnabled ? 'allow-scripts allow-same-origin allow-forms allow-presentation' : undefined}
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Background Backdrop Poster with blur effect */}
            <img
              src={movie.backdropUrl || movie.posterUrl}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover filter brightness-75 scale-105"
            />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

            {/* Central Big Play Button Matching Theme */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <button
                onClick={() => handleStartPlay()}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1e2129]/90 hover:bg-[#db6937] text-white flex items-center justify-center shadow-2xl border-2 border-white/20 hover:scale-110 active:scale-95 transition-all duration-300 pl-1 group cursor-pointer"
                aria-label="Play Stream"
              >
                <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white group-hover:scale-105 transition-transform" />
              </button>
              
              <div className="text-center">
                <span className="text-sm sm:text-base font-semibold text-white drop-shadow">
                  Click to Stream in {selectedServer.quality}
                </span>
                {activeEpisodeTitle && (
                  <p className="text-xs text-[#b2b1ad] mt-0.5 drop-shadow">
                    Playing: {activeEpisodeTitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player controls */}
      <div className="bg-[#242832] border-t border-[#1a1c23]">
        {themeOptions.player.displayServerSelection !== false && (
          <div className="px-4 py-3 border-b border-[#1a1c23]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Server className="w-4 h-4 text-[#4f83d3]" />
                <span>Available servers</span>
                <span className="rounded-full bg-[#1a1c23] px-2 py-0.5 text-[10px] text-[#b2b1ad]">
                  {availableServers.length}
                </span>
              </div>
              {availableServers.length > 1 && (
                <span className="text-[10px] text-[#858b98]">Select a server to switch playback</span>
              )}
            </div>
            {availableServers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableServers.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      setSelectedServerId(srv.id);
                      showToast(`Switched to ${srv.name}`);
                    }}
                    aria-pressed={selectedServer.id === srv.id}
                    className={`min-w-[130px] rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                      selectedServer.id === srv.id
                        ? 'border-[#4f83d3] bg-[#4f83d3]/15 text-white shadow-sm'
                        : 'border-[#343b4a] bg-[#1a1c23] text-[#b2b1ad] hover:border-[#4f83d3]/60 hover:text-white'
                    }`}
                  >
                    <span className="block truncate text-xs font-semibold">{srv.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[#858b98]">{srv.quality}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#b2b1ad]">
                No servers are enabled. Add or enable a server in Admin → Site Settings → Streaming Servers.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            {/* TV Episode Previous / Next buttons */}
            {(hasPrevEpisode || hasNextEpisode) && (
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#343b4a]">
                {hasPrevEpisode && (
                  <button
                    onClick={onPrevEpisode}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-[#1a1c23] hover:bg-[#4f83d3] text-white flex items-center gap-1 transition-all cursor-pointer"
                    title="Previous Episode"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev Ep</span>
                  </button>
                )}
                {hasNextEpisode && (
                  <button
                    onClick={onNextEpisode}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-[#1a1c23] hover:bg-[#4f83d3] text-white flex items-center gap-1 transition-all cursor-pointer"
                    title="Next Episode"
                  >
                    <span className="hidden sm:inline">Next Ep</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Actions (Cinema Mode, Favorite, Report, Share) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cinema Mode Toggle ("Turn off light") */}
            <button
              onClick={toggleCinemaMode}
              className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                cinemaMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#2e3442]'
              }`}
              title="Turn lights on/off"
            >
              <Lightbulb className={`w-3.5 h-3.5 ${cinemaMode ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span className="hidden md:inline">{cinemaMode ? 'Lights On' : 'Turn off light'}</span>
            </button>

            {/* Favorite Toggle */}
            <button
              onClick={() => toggleFavorite(movie.id)}
              className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                isFav
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                  : 'bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#2e3442]'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="hidden sm:inline">{isFav ? 'Favorited' : 'Favorite'}</span>
            </button>

            {/* Report Modal */}
            <button
              onClick={() => openModal('report')}
              className="text-xs px-3 py-1.5 rounded-full bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#2e3442] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Report video issue"
            >
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Report</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="text-xs px-3 py-1.5 rounded-full bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#2e3442] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Share Movie"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isCopied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional In-Player Sponsor / Ad Banner */}
      {themeOptions.ads.playerAdEnabled && (
        <div 
          dangerouslySetInnerHTML={{ __html: themeOptions.ads.playerAdHtml }}
          className="border-t border-[#1a1c23] overflow-hidden"
        />
      )}
    </div>
  );
};
