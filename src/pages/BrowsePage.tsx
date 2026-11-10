import React, { useState, useEffect } from 'react';
import { Film, SlidersHorizontal, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Movie, FilterOptions } from '../types/movie';
import { MovieCard } from '../components/MovieCard';
import { FilterBar } from '../components/FilterBar';
import { A2ZFilter } from '../components/A2ZFilter';
import { getCatalogCountries, getCatalogGenres } from '../services/catalogOptions';

const ITEMS_PER_PAGE = 14;

export const BrowsePage: React.FC = () => {
  const { filterOptions, setFilterOptions } = useApp();
  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const loadCatalog = async () => {
      try {
        const allMovies = await api.getAllMovies();
        if (!active) return;
        setCatalog(allMovies);
        const results = await api.searchAndFilter(filterOptions, allMovies);
        if (!active) return;
        setMovies(results);
        setCurrentPage(1);
      } catch (error) {
        if (!active) return;
        setMovies([]);
        setLoadError(error instanceof Error ? error.message : 'Could not load catalog.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadCatalog();
    return () => { active = false; };
  }, [filterOptions]);

  const genres = getCatalogGenres(catalog);
  const countries = getCatalogCountries(catalog);

  const totalPages = Math.ceil(movies.length / ITEMS_PER_PAGE) || 1;
  const paginatedMovies = movies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleResetFilters = () => {
    setFilterOptions({
      type: 'all',
      quality: 'all',
      genre: 'All',
      year: 'All',
      country: 'All',
      sort: 'updated',
      query: '',
      a2z: ''
    });
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Film className="w-6 h-6 text-[#db6937]" />
          <span>
            {filterOptions.query 
              ? `Search Results for "${filterOptions.query}"` 
              : filterOptions.type === 'tv'
              ? 'TV Series Catalog'
              : filterOptions.type === 'movie'
              ? 'Movies Catalog'
              : filterOptions.genre !== 'All'
              ? `${filterOptions.genre} Titles`
              : 'Browse All Movies & TV Shows'}
          </span>
        </h1>
        <p className="text-xs text-[#b2b1ad]">
          Filter by genre, country, release year, streaming quality, and alphabetical index.
        </p>
      </div>

      {/* Advanced Filter Bar */}
      <FilterBar
        filters={filterOptions}
        genres={genres}
        countries={countries}
        onChange={setFilterOptions}
        onReset={handleResetFilters}
      />

      {/* A-Z Alphabet Filter */}
      <A2ZFilter
        currentLetter={filterOptions.a2z}
        onSelectLetter={(letter) => setFilterOptions(prev => ({ ...prev, a2z: letter }))}
      />

      {/* Results Count & Active Tags */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#b2b1ad] pb-2 border-b border-[#242832]">
        <div>
          Showing <span className="text-white font-semibold">{paginatedMovies.length}</span> of{' '}
          <span className="text-white font-semibold">{movies.length}</span> matching titles
        </div>

        {filterOptions.query && (
          <div className="flex items-center gap-2">
            <span>Query:</span>
            <span className="bg-[#4f83d3] text-white px-2 py-0.5 rounded-full font-medium">
              "{filterOptions.query}"
            </span>
          </div>
        )}
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[#b2b1ad]" role="status">Loading catalog…</div>
      ) : loadError ? (
        <div className="bg-rose-500/10 rounded-3xl p-8 text-center border border-rose-500/30 space-y-3 max-w-lg mx-auto" role="alert">
          <AlertCircle className="w-10 h-10 text-rose-300 mx-auto" />
          <h3 className="text-lg font-bold text-white">Could Not Load Catalog</h3>
          <p className="text-xs text-[#b2b1ad]">{loadError}</p>
        </div>
      ) : paginatedMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
          {paginatedMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="bg-[#242832] rounded-3xl p-12 text-center border border-[#2e3442] space-y-3 max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Movies or Shows Found</h3>
          <p className="text-xs text-[#b2b1ad]">
            Try relaxing your filter criteria, checking your spelling, or selecting "All Genres".
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-2 bg-gradient-flixer text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Pagination Controls (.navigation .pagination) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="w-10 h-10 rounded-xl bg-[#242832] hover:bg-[#4f83d3] disabled:opacity-40 disabled:hover:bg-[#242832] text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isActive = currentPage === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-10 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-flixer text-white shadow-lg scale-105'
                    : 'bg-[#242832] text-[#b2b1ad] hover:text-white hover:bg-[#1a1c23]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="w-10 h-10 rounded-xl bg-[#242832] hover:bg-[#4f83d3] disabled:opacity-40 disabled:hover:bg-[#242832] text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
