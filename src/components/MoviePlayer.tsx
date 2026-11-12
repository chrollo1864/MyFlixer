import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'shaka-player/dist/controls.css';
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
  RotateCcw,
  ShieldAlert,
  X,
  LoaderCircle
} from 'lucide-react';
import { Movie, StreamingServer } from '../types/movie';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

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
    currentUser,
    themeOptions,
    navigateTo
  } = useApp();

  const episodeSources = movie.type === 'tv'
    ? movie.seasons?.find(season => season.seasonNumber === activeSeasonNumber)?.episodes.find(episode => episode.episodeNumber === activeEpisodeNumber)?.videoSources || []
    : [];
  const isUsableSource = (source: StreamingServer) =>
    source.isActive !== false && Boolean(source.id);
  const episodeTitleSources = episodeSources.filter(isUsableSource);
  const movieTitleSources = movie.videoSources.filter(isUsableSource);
  const titleSources = episodeTitleSources.length ? episodeTitleSources : movieTitleSources;
  const configuredSources: StreamingServer[] = themeOptions.streamingServers
    .filter(server => server.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(server => ({
      id: server.id,
      name: server.name,
      quality: server.quality,
      speed: '—',
      embedUrl: ''
    }));
  const hasTitleSources = titleSources.length > 0;
  const availableServers = hasTitleSources ? titleSources : configuredSources;
  const preferredServer = hasTitleSources
    ? titleSources.find(server => server.isDefault) || titleSources[0]
    : configuredSources.find(server => server.isDefault)
      || configuredSources.find(server => server.id === themeOptions.player.defaultServerId)
      || configuredSources[0];

  const [isPlaying, setIsPlaying] = useState(false);
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
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [authorizedSourceType, setAuthorizedSourceType] = useState<StreamingServer['sourceType']>();
  const [authorizedClearKey, setAuthorizedClearKey] = useState<{ id: string; key: string }>();
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const playbackRequestRef = useRef(0);
  const playerRootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const shakaPlayerRef = useRef<any>(null);
  const lastProgressUpdateRef = useRef(0);
  const resumeOnMetadataRef = useRef(false);
  const resumePositionRef = useRef<number | null>(null);

  const dismissPlaybackError = useCallback(() => {
    setPlaybackError(null);
    setIsPlaying(false);
    setPlaybackUrl('');
    setAuthorizedSourceType(undefined);
    setAuthorizedClearKey(undefined);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = videoContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement && container.contains(document.fullscreenElement)) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      showToast('Fullscreen is unavailable in this browser.');
    }
  }, [showToast]);

  useEffect(() => {
    const handlePlayerKeyDown = (event: KeyboardEvent) => {
      const player = playerRootRef.current;
      if (!player || playbackError || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      const isPlayerActive = player.contains(document.activeElement)
        || player.matches(':hover')
        || (target instanceof Node && player.contains(target));
      if (!isPlayerActive) return;
      if (target instanceof HTMLElement
        && target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;

      const key = event.key.toLowerCase();
      const video = videoRef.current;
      if (key === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      } else if (video && isPlaying && (key === ' ' || key === 'k')) {
        event.preventDefault();
        if (video.paused) {
          void video.play().catch(() => showToast('Could not start playback.'));
        } else {
          video.pause();
        }
      } else if (video && isPlaying && key === 'm') {
        event.preventDefault();
        video.muted = !video.muted;
      } else if (video && isPlaying && (key === 'arrowleft' || key === 'arrowright')) {
        event.preventDefault();
        const offset = key === 'arrowleft' ? -5 : 5;
        video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + offset));
      }
    };

    window.addEventListener('keydown', handlePlayerKeyDown);
    return () => window.removeEventListener('keydown', handlePlayerKeyDown);
  }, [isPlaying, playbackError, showToast, toggleFullscreen]);

  useEffect(() => {
    playbackRequestRef.current += 1;
    setSelectedServerId(preferredServer?.id || 'default');
    setIsPlaying(false);
    setPlaybackUrl('');
    setAuthorizedSourceType(undefined);
    setAuthorizedClearKey(undefined);
    setPlaybackError(null);
    setIsAuthorizing(false);
  }, [movie.id, activeSeasonNumber, activeEpisodeNumber, themeOptions.player.defaultServerId]);

  const isFav = isFavorite(movie.id);
  const existingHistory = watchHistory.find(h => h.movieId === movie.id
    && h.season === (movie.type === 'tv' ? activeSeasonNumber : undefined)
    && h.episode === (movie.type === 'tv' ? activeEpisodeNumber : undefined));
  const selectedServerConfig = hasTitleSources
    ? undefined
    : themeOptions.streamingServers.find(server => server.id === selectedServer.id);
  const iframeSandboxEnabled = selectedServerConfig?.iframeSandboxEnabled === true;
  const playbackSourceType = authorizedSourceType || selectedServer.sourceType || 'embed';
  const supportsVideoKeyboardShortcuts = ['direct', 'hls', 'dash'].includes(playbackSourceType);

  const handleStartPlay = async (resume = false) => {
    const requestId = ++playbackRequestRef.current;
    setIsAuthorizing(true);
    setPlaybackError(null);
    try {
      if (resume && currentUser) {
        const saved = await api.getPlaybackProgress(movie.id, movie.type === 'tv' ? activeSeasonNumber : undefined, movie.type === 'tv' ? activeEpisodeNumber : undefined).catch(() => null);
        resumePositionRef.current = saved?.positionSeconds ?? null;
      } else resumePositionRef.current = null;
      const authorizedUrl = await api.authorizePlayback(
        movie.id,
        selectedServer.id,
        movie.type === 'tv' ? activeSeasonNumber : undefined,
        movie.type === 'tv' ? activeEpisodeNumber : undefined
      );
      if (requestId !== playbackRequestRef.current) return;
      setPlaybackUrl(authorizedUrl.url);
      setAuthorizedSourceType(authorizedUrl.sourceType);
      setAuthorizedClearKey(authorizedUrl.clearKeyId && authorizedUrl.clearKey
        ? { id: authorizedUrl.clearKeyId, key: authorizedUrl.clearKey }
        : undefined);
      setIsPlaying(true);
      resumeOnMetadataRef.current = resume && Boolean(existingHistory);
      if (!resume) updateWatchProgress(movie.id, 0, activeSeasonNumber, activeEpisodeNumber);
      if (resume) showToast(`Resumed from ${existingHistory?.progressPercent}%`);
    } catch (error) {
      if (requestId !== playbackRequestRef.current) return;
      const code = error instanceof Error && 'code' in error ? error.code : undefined;
      if (code === 'SUBSCRIPTION_REQUIRED' || code === 'AUTH_REQUIRED') {
        setPlaybackError(code);
        setIsPlaying(false);
        setPlaybackUrl('');
      } else {
        showToast(error instanceof Error ? error.message : 'Playback authorization failed.');
      }
    } finally {
      if (requestId === playbackRequestRef.current) setIsAuthorizing(false);
    }
  };

  useEffect(() => {
    if (themeOptions.player.autoplay && selectedServer.id === (preferredServer?.id || 'default')) {
      void handleStartPlay();
    }
  }, [movie.id, selectedServer.id, themeOptions.player.autoplay, activeSeasonNumber, activeEpisodeNumber]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      const requestId = playbackRequestRef.current;
      api.checkPlaybackAccess().catch(error => {
        if (requestId !== playbackRequestRef.current) return;
        playbackRequestRef.current += 1;
        const code = error instanceof Error && 'code' in error ? error.code : undefined;
        setPlaybackError(code === 'SUBSCRIPTION_REQUIRED' ? 'SUBSCRIPTION_REQUIRED' : 'AUTH_REQUIRED');
        setPlaybackUrl('');
        setIsPlaying(false);
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [isPlaying, movie.id]);

  useEffect(() => {
    if (!playbackError) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissPlaybackError();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackError, dismissPlaybackError]);

  useEffect(() => {
    if (!isPlaying || !playbackUrl || !['hls', 'dash'].includes(playbackSourceType)) return;
    let cancelled = false;
    let player: any;
    let overlay: any;

    void import('shaka-player/dist/shaka-player.ui').then(async shakaModule => {
      const shaka: any = (shakaModule as any).default || shakaModule;
      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) {
        throw new Error('This browser does not support Shaka playback for this stream.');
      }

      const video = videoRef.current;
      const container = videoContainerRef.current;
      if (!video || !container || cancelled) return;

      player = new shaka.Player(video);
      shakaPlayerRef.current = player;
      overlay = new shaka.ui.Overlay(player, container, video);

      const drmConfig: any = {
        clearKeys: {}
      };

      if (authorizedClearKey) {
        const keyId = authorizedClearKey.id.trim().toLowerCase();
        const key = authorizedClearKey.key.trim().toLowerCase();

        if (!/^[\da-f]{32}$/.test(keyId) || !/^[\da-f]{32}$/.test(key)) {
          throw new Error('ClearKey DASH playback needs both a 32-character hexadecimal KID and key.');
        }

        drmConfig.clearKeys[keyId] = key;
      }

      player.configure({
        drm: drmConfig,
        streaming: {
          bufferingGoal: 10,
          rebufferingGoal: 2,
          stallEnabled: true,
          ignoreTextStreamFailures: true
        }
      });

      player.addEventListener('error', (event: any) => {
        const detail = event.detail;
        console.error('Shaka Player Error:', detail);
        setPlaybackError(
          `DASH playback error (${detail?.code || 'unknown'}): ${detail?.message || 'Check console for DRM or CORS details.'}`
        );
      });

      await player.load(playbackUrl);
    }).catch(error => {
      if (!cancelled) {
        setPlaybackError(error instanceof Error ? error.message : 'The browser could not initialize the streaming player.');
      }
    });

    return () => {
      cancelled = true;
      if (overlay) void overlay.destroy();
      if (player) void player.destroy();
      shakaPlayerRef.current = null;
    };
  }, [isPlaying, playbackUrl, playbackSourceType, authorizedClearKey]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    showToast('Link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div
      ref={playerRootRef}
      tabIndex={0}
      aria-label={`Movie player. Shortcuts: F for fullscreen${supportsVideoKeyboardShortcuts ? ', Space or K to play or pause, M to mute, and left or right arrow to seek' : ''}.`}
      title={`Shortcuts: F fullscreen${supportsVideoKeyboardShortcuts ? ' · Space/K play or pause · M mute · ←/→ seek' : ''}`}
      className={`movie-player-responsive relative w-full rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
      cinemaMode ? 'z-[102] ring-4 ring-[#4f83d3]/30' : 'z-10'
      }`}
    >
      {themeOptions.player.enableResumePlayback !== false && !isPlaying && !playbackError && existingHistory && existingHistory.progressPercent > 5 && (
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
      <div ref={videoContainerRef} className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {playbackError ? (
          <div className="absolute inset-0">
            <img
              src={movie.backdropUrl || movie.posterUrl}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover brightness-50"
            />
          </div>
        ) : isPlaying && !['direct', 'hls', 'dash'].includes(playbackSourceType) ? (
          <iframe
            key={`${selectedServer.id}-${iframeSandboxEnabled ? 'sandboxed' : 'standard'}`}
            src={`${playbackUrl}${playbackUrl.includes('?') ? '&' : '?'}autoplay=1&rel=0`}
            title={movie.title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox={iframeSandboxEnabled ? 'allow-scripts allow-same-origin allow-forms allow-presentation' : undefined}
            allowFullScreen
          />
        ) : isPlaying ? (
          <video
            key={`${selectedServer.id}-${playbackUrl}`}
            ref={videoRef}
            src={['hls', 'dash'].includes(playbackSourceType) ? undefined : playbackUrl}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            controls={!['hls', 'dash'].includes(playbackSourceType)}
            autoPlay
            playsInline
            onLoadedMetadata={event => {
              if (!resumeOnMetadataRef.current || !existingHistory) return;
              event.currentTarget.currentTime = resumePositionRef.current
                ?? event.currentTarget.duration * existingHistory.progressPercent / 100;
              resumeOnMetadataRef.current = false;
            }}
            onTimeUpdate={event => {
              const now = Date.now();
              if (now - lastProgressUpdateRef.current < 10000 || !event.currentTarget.duration) return;
              lastProgressUpdateRef.current = now;
              const { currentTime, duration } = event.currentTarget;
              updateWatchProgress(movie.id, Math.min(99, Math.floor(currentTime / duration * 100)), activeSeasonNumber, activeEpisodeNumber);
              if (currentUser) void api.savePlaybackProgress(movie.id, currentTime, duration, movie.type === 'tv' ? activeSeasonNumber : undefined, movie.type === 'tv' ? activeEpisodeNumber : undefined).catch(() => undefined);
            }}
            onError={() => setPlaybackError(playbackSourceType === 'dash'
              ? 'This browser could not load the DASH stream. Confirm the URL is a valid HTTPS .mpd manifest with browser CORS access.'
              : 'The browser could not play this video file. Use a browser-supported format such as MP4 (H.264/AAC), and ensure the URL serves the media file directly over HTTPS.')}
          />
        ) : (
          <div className="group absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={movie.backdropUrl || movie.posterUrl}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full scale-[1.03] object-cover brightness-75 transition-transform duration-700 group-hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/25 to-black/65 transition-colors duration-300 group-hover:from-black/30 group-hover:via-black/30 group-hover:to-black/70" />

            <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center">
              <button
                onClick={() => void handleStartPlay()}
                disabled={isAuthorizing}
                aria-busy={isAuthorizing}
                className="group/play relative flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/55 bg-white/15 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_32px_rgba(219,105,55,0.22)] backdrop-blur-xl transition duration-300 before:absolute before:inset-[5px] before:rounded-full before:border before:border-white/20 before:content-[''] hover:scale-105 hover:border-white/80 hover:bg-[#db6937]/90 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_42px_rgba(219,105,55,0.38)] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#db6937]/50 focus-visible:ring-offset-4 focus-visible:ring-offset-black/30 sm:h-[88px] sm:w-[88px] disabled:cursor-wait disabled:opacity-85"
                aria-label="Play Stream"
              >
                {isAuthorizing
                  ? <LoaderCircle className="relative z-10 h-8 w-8 animate-spin" aria-hidden="true" />
                  : <Play className="relative z-10 ml-1 h-8 w-8 fill-current transition-transform duration-300 group-hover/play:scale-110 sm:h-9 sm:w-9" aria-hidden="true" />}
              </button>

              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md sm:text-sm">
                  <span>{isAuthorizing ? 'Preparing your stream…' : 'Play now'}</span>
                  {!isAuthorizing && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[#db6937]" />
                      <span className="text-white/75">{selectedServer.quality}</span>
                    </>
                  )}
                </div>
                {activeEpisodeTitle && (
                  <p className="max-w-[min(90vw,36rem)] truncate text-xs font-medium text-white/85 drop-shadow-md sm:text-sm">
                    {activeEpisodeTitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
                      playbackRequestRef.current += 1;
                      setSelectedServerId(srv.id);
                      setPlaybackUrl('');
                      setAuthorizedSourceType(undefined);
                      setAuthorizedClearKey(undefined);
                      setIsPlaying(false);
                      setPlaybackError(null);
                      setIsAuthorizing(false);
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

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => void toggleFullscreen()}
              className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#2e3442]"
              title="Fullscreen (F)"
              aria-label="Toggle fullscreen"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Fullscreen</span>
            </button>

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

            <button
              onClick={() => openModal('report')}
              className="text-xs px-3 py-1.5 rounded-full bg-[#1a1c23] text-[#b2b1ad] hover:text-white hover:bg-[#2e3442] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Report video issue"
            >
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Report</span>
            </button>

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

      {themeOptions.ads.playerAdEnabled && (
        <div 
          dangerouslySetInnerHTML={{ __html: themeOptions.ads.playerAdHtml }}
          className="border-t border-[#1a1c23] overflow-hidden"
        />
      )}
      {playbackError && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={event => {
            if (event.target === event.currentTarget) dismissPlaybackError();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="playback-error-title"
            aria-describedby="playback-error-description"
            className="relative w-full max-w-md rounded-2xl border border-[#343b4a] bg-[#1e2129] p-6 text-center shadow-2xl sm:p-8"
          >
            <button
              onClick={dismissPlaybackError}
              className="absolute right-3 top-3 rounded-full p-2 text-[#858b98] transition-colors hover:bg-[#2e3442] hover:text-white"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-[#db6937]" />
            <h3 id="playback-error-title" className="text-lg font-bold text-white">
              {playbackError === 'SUBSCRIPTION_REQUIRED' ? 'Subscription required' : 'Sign in to watch'}
            </h3>
            <p id="playback-error-description" className="mt-2 text-sm text-[#b2b1ad]">
              {playbackError === 'SUBSCRIPTION_REQUIRED'
                ? 'An active subscription is required to watch movies and series. You can still browse the entire catalog.'
                : 'Sign in and check your subscription options to start playback.'}
            </p>
            <button
              onClick={() => {
                dismissPlaybackError();
                navigateTo('subscription');
              }}
              className="mt-5 rounded-xl bg-gradient-flixer px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View subscription options
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};