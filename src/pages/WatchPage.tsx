import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Calendar, 
  Clock, 
  Globe, 
  Clapperboard, 
  Users, 
  Tag, 
  Building, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MoviePlayer } from '../components/MoviePlayer';
import { EpisodeSelector } from '../components/EpisodeSelector';
import { StarRating } from '../components/StarRating';
import { CommentsSection } from '../components/CommentsSection';
import { MovieCard } from '../components/MovieCard';
import { api } from '../services/api';
import { Movie } from '../types/movie';

export const WatchPage: React.FC = () => {
  const { 
    selectedMovie, 
    selectedMovieId,
    selectedSeasonNumber, 
    selectedEpisodeNumber,
    setSelectedSeasonNumber,
    setSelectedEpisodeNumber,
    navigateTo,
    cinemaMode,
    toggleCinemaMode
  } = useApp();

  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);

  useEffect(() => {
    if (selectedMovie) {
      api.getAllMovies().then((all) => {
        const related = all
          .filter(m => m.id !== selectedMovie.id && m.genres.some(g => selectedMovie.genres.includes(g)))
          .slice(0, 7);
        setRelatedMovies(related);
      });
    }
  }, [selectedMovie]);

  if (!selectedMovie) {
    return (
      <div className="max-w-[1460px] mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Movie or Series Not Found</h2>
        <p className="text-sm text-[#b2b1ad]">The title you requested may have moved or been updated.</p>
        <button
          onClick={() => navigateTo('home')}
          className="bg-gradient-flixer text-white text-xs font-semibold px-6 py-2.5 rounded-full"
        >
          Back to Home Page
        </button>
      </div>
    );
  }

  // Active episode name if TV show
  const currentSeason = selectedMovie.seasons?.find(s => s.seasonNumber === selectedSeasonNumber);
  const activeEpisode = currentSeason?.episodes.find(e => e.episodeNumber === selectedEpisodeNumber);
  const totalEpisodesInSeason = currentSeason?.episodes.length || 0;
  const hasPrevEpisode = selectedMovie.type === 'tv' && selectedEpisodeNumber > 1;
  const hasNextEpisode = selectedMovie.type === 'tv' && selectedEpisodeNumber < totalEpisodesInSeason;

  const handlePrevEpisode = () => {
    if (hasPrevEpisode) {
      setSelectedEpisodeNumber(selectedEpisodeNumber - 1);
    }
  };

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      setSelectedEpisodeNumber(selectedEpisodeNumber + 1);
    }
  };

  return (
    <div className="relative w-full">
      {/* Cinema Mode Lights-Off Overlay */}
      {cinemaMode && (
        <div 
          onClick={toggleCinemaMode}
          className="fixed inset-0 bg-black/95 z-[100] transition-opacity cursor-pointer"
          title="Click anywhere to turn lights back on"
        />
      )}

      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        
        {/* Back button & Breadcrumbs */}
        <div className="flex items-center justify-between text-xs text-[#b2b1ad]">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalog</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="capitalize">{selectedMovie.type === 'tv' ? 'TV Series' : 'Movie'}</span>
            <span>/</span>
            <span className="text-white font-medium">{selectedMovie.title}</span>
          </div>
        </div>

        {/* Video Player */}
        <MoviePlayer 
          key={selectedMovie.id}
          movie={selectedMovie} 
          activeEpisodeTitle={activeEpisode ? `S${selectedSeasonNumber} E${selectedEpisodeNumber}: ${activeEpisode.title}` : undefined}
          activeSeasonNumber={selectedSeasonNumber}
          activeEpisodeNumber={selectedEpisodeNumber}
          hasPrevEpisode={hasPrevEpisode}
          hasNextEpisode={hasNextEpisode}
          onPrevEpisode={handlePrevEpisode}
          onNextEpisode={handleNextEpisode}
        />

        {/* TV Series Episode Drawer (if TV Show) */}
        {selectedMovie.type === 'tv' && selectedMovie.seasons && selectedMovie.seasons.length > 0 && (
          <EpisodeSelector
            seasons={selectedMovie.seasons}
            currentSeasonNumber={selectedSeasonNumber}
            currentEpisodeNumber={selectedEpisodeNumber}
            onSelectEpisode={(sNum, eNum) => {
              setSelectedSeasonNumber(sNum);
              setSelectedEpisodeNumber(eNum);
            }}
          />
        )}

        {/* Movie Info Box (#w-info matching theme) */}
        <div className="bg-[#1a1c23] border border-[#2e3442] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row gap-6 lg:gap-8 relative overflow-hidden">
          
          {/* Poster Column */}
          <div className="w-full md:w-60 lg:w-72 shrink-0">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-[#242832]">
              <img
                src={selectedMovie.posterUrl}
                alt={selectedMovie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0 space-y-4">
            
            {/* Title & Badges */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                {selectedMovie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="bg-[#db6937] text-white px-2.5 py-0.5 rounded-md font-bold">
                  {selectedMovie.quality}
                </span>
                <span className="bg-[#242832] text-amber-400 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {selectedMovie.rating}
                </span>
                <span className="text-[#b2b1ad] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedMovie.duration}
                </span>
                <span className="text-[#b2b1ad]">•</span>
                <span className="text-[#b2b1ad]">{selectedMovie.year}</span>
              </div>
            </div>

            {/* Storyline Overview */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#b2b1ad]">Overview</h3>
              <p className="text-xs sm:text-sm text-[#e9ecef] leading-relaxed font-light">
                {selectedMovie.synopsis}
              </p>
            </div>

            {/* Metadata Detail Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs text-[#b2b1ad] pt-2 border-t border-[#242832]">
              <div className="flex items-start gap-2">
                <Globe className="w-3.5 h-3.5 text-[#4f83d3] shrink-0 mt-0.5" />
                <span><strong className="text-white">Country:</strong> {selectedMovie.country}</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#4f83d3] shrink-0 mt-0.5" />
                <span><strong className="text-white">Released:</strong> {selectedMovie.releaseDate}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clapperboard className="w-3.5 h-3.5 text-[#4f83d3] shrink-0 mt-0.5" />
                <span><strong className="text-white">Director:</strong> {selectedMovie.director}</span>
              </div>
              <div className="flex items-start gap-2">
                <Building className="w-3.5 h-3.5 text-[#4f83d3] shrink-0 mt-0.5" />
                <span><strong className="text-white">Production:</strong> {selectedMovie.production}</span>
              </div>
              <div className="sm:col-span-2 flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-[#4f83d3] shrink-0 mt-0.5" />
                <span><strong className="text-white">Cast:</strong> {selectedMovie.cast.join(', ')}</span>
              </div>
              <div className="sm:col-span-2 flex items-start gap-2">
                <Tag className="w-3.5 h-3.5 text-[#db6937] shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  <strong className="text-white mr-1">Genres:</strong>
                  {selectedMovie.genres.map(g => (
                    <button
                      key={g}
                      onClick={() => navigateTo('browse', undefined, { genre: g })}
                      className="bg-[#242832] hover:bg-[#4f83d3] text-white px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Rating Widget */}
            <div className="pt-2">
              <StarRating 
                movieId={selectedMovie.id} 
                initialRating={selectedMovie.rating} 
                initialCount={selectedMovie.ratingCount} 
              />
            </div>

          </div>
        </div>

        {/* Discussion / Comments Section */}
        <CommentsSection movieId={selectedMovie.id} />

        {/* You May Also Like / Related Titles */}
        {relatedMovies.length > 0 && (
          <section className="space-y-4 pt-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#db6937]" />
              <span>You May Also Like</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
              {relatedMovies.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
