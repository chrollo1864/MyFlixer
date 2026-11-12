import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Search, Download, Check, Star, Key, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { api } from '../../services/api';
import { Movie } from '../../types/movie';
import { GENRE_LIST, YEAR_LIST } from '../../services/catalogOptions';

interface TmdbImporterTabProps {
  apiKey: string;
  existingMovies: Movie[];
  onImportSuccess: (movie: Movie) => void;
  showToast: (msg: string) => void;
}

export const TmdbImporterTab: React.FC<TmdbImporterTabProps> = ({
  apiKey,
  existingMovies,
  onImportSuccess,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('All');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [showImportConfirmation, setShowImportConfirmation] = useState(false);
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [refreshingImage, setRefreshingImage] = useState<{
    tmdbId: number;
    field: 'posterUrl' | 'backdropUrl';
  } | null>(null);
  const searchRequestId = useRef(0);

  const runSearch = useCallback(async (nextPage: number) => {
    const requestId = ++searchRequestId.current;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await api.searchTmdb(searchQuery.trim(), apiKey, mediaType, {
        genres: selectedGenres,
        year: selectedYear,
        page: nextPage
      });
      if (requestId !== searchRequestId.current) return;
      setResults(res.results || []);
      setPage(nextPage);
      setTotalPages(Math.max(1, res.totalPages || 1));
      setTotalResults(res.totalResults || 0);
      setHasSearched(true);
    } catch (error) {
      if (requestId === searchRequestId.current) {
        setResults([]);
        setHasSearched(true);
        setSearchError(error instanceof Error ? error.message : 'TMDB search error. Please verify network or API key.');
      }
    } finally {
      if (requestId === searchRequestId.current) setIsSearching(false);
    }
  }, [apiKey, mediaType, searchQuery, selectedGenres, selectedYear]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [runSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(1);
  };

  const alreadyInCatalog = (item: any) => existingMovies.some(movie =>
    String(movie.tmdbId || '') === String(item.tmdbId) || movie.id === `tmdb-${item.tmdbId}`
  );

  const handleImport = async (item: any, publishStatus: 'publish' | 'draft', notify = true, updateExisting = false): Promise<boolean> => {
    setImportingId(item.tmdbId);
    try {
      const res = await api.importTmdb({
        tmdbId: item.tmdbId,
        apiKey,
        title: item.title,
        type: item.type,
        year: item.year,
        overview: item.overview,
        rating: item.rating,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        releaseDate: item.releaseDate,
        publishStatus,
        updateExisting
      });

      if (res.error) {
        if (notify) showToast(res.error);
        return false;
      } else if (res.movie) {
        onImportSuccess(res.movie);
        if (notify && item.type === 'tv' && !res.movie.seasons?.length) {
          showToast(`"${item.title}" imported, but TMDB returned no episodes. Check your API key and try again.`);
        } else if (notify) {
          showToast(`"${item.title}" successfully imported to catalog!`);
        }
        return true;
      }
      return false;
    } catch {
      if (notify) showToast(`Failed to import "${item.title}".`);
      return false;
    } finally {
      setImportingId(null);
    }
  };

  const handleImportAll = async () => {
    const pending = results.filter(item => !alreadyInCatalog(item));
    if (!pending.length) {
      showToast('All titles on this page are already in the catalog.');
      return;
    }
    setShowImportConfirmation(false);
    setIsImportingAll(true);
    let imported = 0;
    let failed = 0;
    try {
      for (let index = 0; index < pending.length; index += 1) {
        setImportProgress(`${index + 1}/${pending.length}`);
        if (await handleImport(pending[index], 'publish', false)) imported += 1;
        else failed += 1;
      }
      showToast(`Imported ${imported} titles${failed ? `; ${failed} failed` : ''}.`);
    } finally {
      setIsImportingAll(false);
      setImportProgress('');
    }
  };

  const handleSyncMetadata = async () => {
    setIsSyncingMetadata(true);
    try {
      const result = await api.syncTmdbCatalogMetadata(apiKey);
      const refreshedMovies = await api.getAdminMedia();
      refreshedMovies.forEach(onImportSuccess);
      showToast(
        `Refreshed genre and country metadata for ${result.updated} of ${result.total} titles${result.failed ? `; ${result.failed} failed` : ''}.`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not refresh catalog metadata.');
    } finally {
      setIsSyncingMetadata(false);
    }
  };

  const handleRefreshImage = async (item: any, field: 'posterUrl' | 'backdropUrl') => {
    setRefreshingImage({ tmdbId: item.tmdbId, field });
    try {
      const movie = await api.refreshTmdbImage(item.tmdbId, field, apiKey);
      onImportSuccess(movie);
      showToast(`"${movie.title}" ${field === 'posterUrl' ? 'poster' : 'backdrop'} refreshed from TMDB.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not refresh the TMDB image.');
    } finally {
      setRefreshingImage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-[#242832] border border-[#2e3442] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#db6937]" />
              <span>TMDB Metadata Search & Ingestion</span>
            </h3>
            <p className="text-xs text-[#b2b1ad]">
              Browse popular titles automatically, or narrow results by media type, year, genre, or title.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium ${
              apiKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey ? 'API Key Active' : 'Server API key or manual key required'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-[#343b4a] bg-[#1a1c23] p-3">
          <p className="text-[11px] leading-relaxed text-[#b2b1ad]">
            TMDB genres and country origins are added to catalog filters automatically. Retry metadata refresh to update existing titles now.
          </p>
          <button
            type="button"
            onClick={() => void handleSyncMetadata()}
            disabled={isSyncingMetadata || isImportingAll}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-[#3e4555] bg-[#242832] px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#343b4a] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingMetadata ? 'animate-spin' : ''}`} />
            {isSyncingMetadata ? 'Refreshing catalog…' : 'Retry metadata refresh'}
          </button>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              aria-label="Search media type"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'all' | 'movie' | 'tv')}
              className="bg-[#1a1c23] border border-[#3e4555] rounded-2xl px-3 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#4f83d3]"
            >
              <option value="all">Movies & Series</option>
              <option value="movie">Movies</option>
              <option value="tv">TV Series</option>
            </select>
            <select
              aria-label="Filter by release year"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-[#1a1c23] border border-[#3e4555] rounded-2xl px-3 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#4f83d3]"
            >
              <option value="All">All years</option>
              {YEAR_LIST.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <details className="relative min-w-0">
              <summary className="list-none cursor-pointer bg-[#1a1c23] border border-[#3e4555] rounded-2xl px-3 py-3 text-xs sm:text-sm text-white flex items-center justify-between gap-2">
                <span className="truncate">
                  {selectedGenres.length ? `${selectedGenres.length} genres selected` : 'All genres'}
                </span>
                <span aria-hidden="true" className="text-[#8f96a3]">▾</span>
              </summary>
              <div className="absolute top-full left-0 mt-1 z-30 w-[min(22rem,calc(100vw-3rem))] max-h-64 overflow-y-auto rounded-xl border border-[#3e4555] bg-[#1a1c23] p-2 shadow-xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedGenres([])}
                  className="col-span-2 text-left rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#4f83d3] hover:bg-[#242832]"
                >
                  Clear genre filters
                </button>
                {GENRE_LIST.map(genre => (
                  <label key={genre} className="min-w-0 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[#e9ecef] hover:bg-[#242832] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre)}
                      onChange={e => setSelectedGenres(current =>
                        e.target.checked ? [...current, genre] : current.filter(item => item !== genre)
                      )}
                      className="accent-[#db6937]"
                    />
                    <span className="truncate">{genre}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles (optional)..."
              className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#4f83d3]"
            />
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 rounded-2xl bg-gradient-flixer hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
            <span>{isSearching ? 'Updating...' : 'Refresh results'}</span>
          </button>
          </div>
        </form>
      </div>

      {/* Results Grid */}
      {searchError && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {searchError}
        </div>
      )}
      {hasSearched && !searchError && results.length === 0 && !isSearching && (
        <div className="rounded-2xl border border-[#2e3442] bg-[#242832] px-4 py-8 text-center text-sm text-[#b2b1ad]">
          No titles match these filters. Try another year or genre.
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs text-[#b2b1ad] flex items-center justify-between">
            <span>
              {isSearching ? 'Updating results… ' : ''}
              Showing {results.length} of {totalResults.toLocaleString()} results · Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setShowImportConfirmation(true)}
              disabled={isImportingAll || results.every(alreadyInCatalog)}
              className="px-3 py-2 rounded-xl bg-gradient-flixer text-white text-[11px] font-bold disabled:opacity-50"
            >
              {isImportingAll ? `Importing ${importProgress}...` : `Import all new on this page (${results.filter(item => !alreadyInCatalog(item)).length})`}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => {
              const alreadyExists = alreadyInCatalog(item);
              const isImporting = importingId === item.tmdbId;
              const isRefreshingPoster = refreshingImage?.tmdbId === item.tmdbId && refreshingImage?.field === 'posterUrl';
              const isRefreshingBackdrop = refreshingImage?.tmdbId === item.tmdbId && refreshingImage?.field === 'backdropUrl';
              const isBusy = isImporting || isImportingAll || refreshingImage !== null;

              return (
                <div
                  key={item.tmdbId}
                  className="bg-[#242832] border border-[#2e3442] hover:border-[#3e4555] rounded-2xl p-4 shadow-lg flex gap-4 transition-all"
                >
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-28 object-cover rounded-xl shrink-0 shadow bg-[#1a1c23]"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-[#1a1c23] text-[#db6937] font-bold px-1.5 py-0.5 rounded uppercase">
                          {item.type}
                        </span>
                        <span className="text-xs text-[#b2b1ad]">{item.year}</span>
                        <span className="flex items-center gap-0.5 text-amber-400 text-xs font-semibold ml-auto">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {item.rating}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-sm mt-1 truncate" title={item.title}>
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-[#b2b1ad] line-clamp-2 mt-1 leading-snug">
                        {item.overview || 'No synopsis available on TMDB.'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      {alreadyExists ? (
                        <>
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5" /><span>In Catalog</span>
                          </span>
                          <button onClick={() => handleImport(item, 'publish', true, true)} disabled={isBusy}
                            className="py-1.5 px-2.5 rounded-xl bg-[#1a1c23] hover:bg-[#343b4a] text-white text-[11px] font-medium disabled:opacity-50">
                            {isImporting ? 'Updating...' : 'Update metadata'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRefreshImage(item, 'posterUrl')}
                            disabled={isBusy}
                            className="py-1.5 px-2.5 rounded-xl bg-[#1a1c23] hover:bg-[#343b4a] text-white text-[11px] font-medium disabled:opacity-50"
                          >
                            {isRefreshingPoster ? 'Refreshing…' : 'Refresh poster'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRefreshImage(item, 'backdropUrl')}
                            disabled={isBusy}
                            className="py-1.5 px-2.5 rounded-xl bg-[#1a1c23] hover:bg-[#343b4a] text-white text-[11px] font-medium disabled:opacity-50"
                          >
                            {isRefreshingBackdrop ? 'Refreshing…' : 'Refresh backdrop'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleImport(item, 'publish')}
                            disabled={isImporting || isImportingAll}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-flixer hover:opacity-95 text-white font-semibold text-[11px] flex items-center justify-center gap-1 shadow cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            <span>{isImporting ? 'Importing...' : 'Import & Publish'}</span>
                          </button>

                          <button
                            onClick={() => handleImport(item, 'draft')}
                            disabled={isImporting || isImportingAll}
                            className="py-1.5 px-2.5 rounded-xl bg-[#1a1c23] hover:bg-[#343b4a] text-[#b2b1ad] hover:text-white text-[11px] font-medium cursor-pointer"
                            title="Import as unlisted Draft"
                          >
                            Draft
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void runSearch(page - 1)}
              disabled={page <= 1 || isSearching || isImportingAll}
              className="inline-flex items-center gap-1 rounded-xl border border-[#3e4555] px-3 py-2 text-xs text-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-[#b2b1ad]">Page {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => void runSearch(page + 1)}
              disabled={page >= totalPages || isSearching || isImportingAll}
              className="inline-flex items-center gap-1 rounded-xl border border-[#3e4555] px-3 py-2 text-xs text-white disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showImportConfirmation && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setShowImportConfirmation(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tmdb-import-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#3e4555] bg-[#242832] shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 id="tmdb-import-confirm-title" className="text-base font-bold text-white">
                    Import {results.filter(item => !alreadyInCatalog(item)).length} titles?
                  </h3>
                  <button
                    type="button"
                    aria-label="Close confirmation"
                    onClick={() => setShowImportConfirmation(false)}
                    className="rounded-lg p-1 text-[#8f96a3] hover:bg-[#343b4a] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#b2b1ad]">
                  The new titles on this page will be imported and published to your catalog. Existing titles will be skipped.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#343b4a] bg-[#1e2129]/70 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowImportConfirmation(false)}
                className="rounded-xl border border-[#3e4555] px-4 py-2 text-xs font-semibold text-[#d0d4dc] transition-colors hover:bg-[#343b4a]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImportAll()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-flixer px-4 py-2 text-xs font-bold text-white shadow transition-opacity hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                Import &amp; Publish
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
