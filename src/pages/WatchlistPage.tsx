import React, { useState, useEffect } from 'react';
import { Bookmark, History, Trash2, Play, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Movie } from '../types/movie';
import { MovieCard } from '../components/MovieCard';

export const WatchlistPage: React.FC = () => {
  const { favorites, watchHistory, navigateTo } = useApp();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [historyMovies, setHistoryMovies] = useState<{ movie: Movie; progress: number; lastWatched: string }[]>([]);

  useEffect(() => {
    api.getAllMovies().then((all) => {
      // Favorites
      const favs = all.filter(m => favorites.includes(m.id));
      setFavoriteMovies(favs);

      // History
      const hist = watchHistory.map(h => {
        const movie = all.find(m => m.id === h.movieId);
        return movie ? { movie, progress: h.progressPercent, lastWatched: h.lastWatched } : null;
      }).filter(Boolean) as { movie: Movie; progress: number; lastWatched: string }[];
      setHistoryMovies(hist);
    });
  }, [favorites, watchHistory]);

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* User Library Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Bookmark className="w-6 h-6 text-[#db6937]" />
          <span>My Library &amp; History</span>
        </h1>

        {/* Tab switcher: Watchlist vs History */}
        <div className="flex items-center gap-2 bg-[#242832] p-1.5 rounded-2xl w-fit border border-[#2e3442]">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-gradient-flixer text-white shadow'
                : 'text-[#b2b1ad] hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Watchlist ({favoriteMovies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-flixer text-white shadow'
                : 'text-[#b2b1ad] hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Continue Watching ({historyMovies.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Favorites Grid */}
      {activeTab === 'favorites' && (
        <div>
          {favoriteMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
              {favoriteMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="bg-[#242832] border border-[#2e3442] rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#1a1c23] flex items-center justify-center mx-auto text-neutral-500">
                <Bookmark className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Your Watchlist is Empty</h3>
              <p className="text-xs text-[#b2b1ad]">
                Click the bookmark icon on any movie or TV series card to save it for later.
              </p>
              <button
                onClick={() => navigateTo('home')}
                className="bg-gradient-flixer text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow cursor-pointer"
              >
                Browse Movies
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: History Grid with Progress Bars */}
      {activeTab === 'history' && (
        <div>
          {historyMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
              {historyMovies.map(({ movie, progress }) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  showProgress={true} 
                  progressPercent={progress} 
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#242832] border border-[#2e3442] rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#1a1c23] flex items-center justify-center mx-auto text-neutral-500">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No Watch History Yet</h3>
              <p className="text-xs text-[#b2b1ad]">
                When you play streams, your progress and last watched episode will show up here.
              </p>
              <button
                onClick={() => navigateTo('home')}
                className="bg-gradient-flixer text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow cursor-pointer"
              >
                Start Watching
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
