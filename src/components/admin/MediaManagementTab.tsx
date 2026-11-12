import React, { useState } from 'react';
import { 
  Film, 
  Tv, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  ExternalLink, 
  Star, 
  Eye, 
  Clock, 
  Check, 
  X,
  Sparkles,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { api } from '../../services/api';
import { Movie } from '../../types/movie';
import { getCatalogCountries, getCatalogGenres } from '../../services/catalogOptions';

const getPlaylistSourceType = (value: string): 'hls' | 'dash' | undefined => {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    if (pathname.endsWith('.m3u8')) return 'hls';
    if (pathname.endsWith('.mpd')) return 'dash';
  } catch {
    const trimmed = value.trim();
    if (/\.m3u8(?:$|[?#])/i.test(trimmed)) return 'hls';
    if (/\.mpd(?:$|[?#])/i.test(trimmed)) return 'dash';
  }
  return undefined;
};

interface MediaManagementTabProps {
  movies: Movie[];
  apiKey: string;
  onAddMovie: (movie: Partial<Movie>) => Promise<void>;
  onUpdateMovie: (id: string, movie: Partial<Movie>) => Promise<void>;
  onDeleteMovie: (id: string) => Promise<void>;
  onPreviewMovie: (id: string) => void;
}

export const MediaManagementTab: React.FC<MediaManagementTabProps> = ({
  movies,
  apiKey,
  onAddMovie,
  onUpdateMovie,
  onDeleteMovie,
  onPreviewMovie
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterQuality, setFilterQuality] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [moviePendingDelete, setMoviePendingDelete] = useState<Movie | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'movie' | 'tv'>('movie');
  const [formYear, setFormYear] = useState<number>(2024);
  const [formDuration, setFormDuration] = useState('110 min');
  const [formQuality, setFormQuality] = useState<'HD' | '4K' | 'CAM'>('HD');
  const [formRating, setFormRating] = useState<number>(7.5);
  const [formCountry, setFormCountry] = useState('United States');
  const [formDirector, setFormDirector] = useState('');
  const [formCast, setFormCast] = useState('');
  const [formSynopsis, setFormSynopsis] = useState('');
  const [formPosterUrl, setFormPosterUrl] = useState('');
  const [formBackdropUrl, setFormBackdropUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formSources, setFormSources] = useState<Array<{id:string;name:string;url:string;sourceType:string;isDefault:boolean;isActive:boolean;clearKeyId?:string;clearKey?:string}>>([]);
  const [formSeasons, setFormSeasons] = useState<NonNullable<Movie['seasons']>>([]);
  const [formTmdbId, setFormTmdbId] = useState<string>();
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<Array<{tmdbId:number;title:string;type:'movie'|'tv';year:number;posterUrl:string;overview:string}>>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [fetchingTmdbId, setFetchingTmdbId] = useState<number | null>(null);
  const [tmdbError, setTmdbError] = useState('');
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [formError, setFormError] = useState('');
  const uploadImage = async (file: File | undefined, setter: (url: string) => void) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      window.alert('Choose a JPEG, PNG, or WebP image under 8 MB.'); return;
    }
    const image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
    });
    const response = await fetch('/api/admin/media-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Image upload failed.');
    setter(result.url);
  };
  const [formGenres, setFormGenres] = useState<string[]>(['Action']);

  // Filter movies
  const filtered = movies.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterQuality !== 'all' && m.quality !== filterQuality) return false;
    if (filterGenre !== 'All' && !m.genres.includes(filterGenre)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const catalogGenres = getCatalogGenres(movies);
  const catalogCountries = Array.from(new Set([...getCatalogCountries(movies), formCountry, ...formCountry.split(',').map(country => country.trim())].filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  const openCreateModal = () => {
    setEditingMovie(null);
    setFormTmdbId(undefined);
    setTmdbQuery('');
    setTmdbResults([]);
    setTmdbError('');
    setFormError('');
    setIsSavingMedia(false);
    setFormTitle('');
    setFormType('movie');
    setFormYear(2024);
    setFormDuration('115 min');
    setFormQuality('HD');
    setFormRating(7.5);
    setFormCountry('United States');
    setFormDirector('');
    setFormCast('');
    setFormSynopsis('');
    setFormPosterUrl('https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=600&auto=format&fit=crop');
    setFormBackdropUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600&auto=format&fit=crop');
    setFormVideoUrl('');
    setFormSources([{ id: `source-${Date.now()}`, name: 'Source 1', url: '', sourceType: 'embed', isDefault: true, isActive: true }]);
    setFormSeasons([]);
    setFormGenres(['Action']);
    setIsModalOpen(true);
  };

  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
    setFormTmdbId(movie.tmdbId);
    setTmdbQuery('');
    setTmdbResults([]);
    setTmdbError('');
    setFormError('');
    setFormTitle(movie.title);
    setFormType(movie.type);
    setFormYear(movie.year);
    setFormDuration(movie.duration);
    setFormQuality(movie.quality as any);
    setFormRating(movie.rating);
    setFormCountry(movie.country);
    setFormDirector(movie.director || '');
    setFormCast(movie.cast?.join(', ') || '');
    setFormSynopsis(movie.synopsis);
    setFormPosterUrl(movie.posterUrl);
    setFormBackdropUrl(movie.backdropUrl);
    setFormVideoUrl(movie.videoSources?.[0]?.embedUrl || '');
    setFormSources((movie.videoSources || []).map((source, index) => ({
      id: source.id || `source-${index}`, name: source.name || `Source ${index + 1}`, url: source.embedUrl || '',
      sourceType: source.sourceType || 'embed', isDefault: source.isDefault ?? index === 0, isActive: source.isActive !== false,
      clearKeyId: source.clearKeyId || '', clearKey: source.clearKey || ''
    })));
    setFormSeasons(movie.seasons || []);
    setFormGenres(movie.genres);
    setIsModalOpen(true);
  };

  const searchTmdbTitles = async () => {
    const query = tmdbQuery.trim();
    if (!query) {
      setTmdbError('Enter a title to search TMDB.');
      return;
    }

    setIsSearchingTmdb(true);
    setTmdbError('');
    setTmdbResults([]);
    try {
      const response = await api.searchTmdb(query, apiKey, formType, { genres: [], year: 'All', page: 1 });
      setTmdbResults(response.results);
      if (!response.results.length) setTmdbError('No matching titles found. Try a different search.');
    } catch (error) {
      setTmdbError(error instanceof Error ? error.message : 'TMDB search failed. Please try again.');
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const fetchTmdbTitle = async (result: typeof tmdbResults[number]) => {
    setFetchingTmdbId(result.tmdbId);
    setTmdbError('');
    try {
      const movie = await api.fetchTmdbDetails({
        tmdbId: result.tmdbId,
        apiKey,
        type: result.type,
        previewOnly: true
      });
      setFormTmdbId(movie.tmdbId);
      setFormTitle(movie.title);
      setFormType(movie.type);
      setFormYear(movie.year);
      setFormDuration(movie.duration);
      setFormRating(movie.rating);
      setFormCountry(movie.country || '');
      setFormDirector(movie.director || '');
      setFormCast(movie.cast?.join(', ') || '');
      setFormSynopsis(movie.synopsis || '');
      setFormPosterUrl(movie.posterUrl || '');
      setFormBackdropUrl(movie.backdropUrl || '');
      setFormGenres(movie.genres || []);
      setFormSeasons(movie.seasons || []);
      setFormSources((movie.videoSources || []).map((source, index) => ({
        id: source.id || `source-${index}`,
        name: source.name || `Source ${index + 1}`,
        url: source.embedUrl || '',
        sourceType: source.sourceType || 'embed',
        isDefault: source.isDefault ?? index === 0,
        isActive: source.isActive !== false,
        clearKeyId: source.clearKeyId || '',
        clearKey: source.clearKey || ''
      })));
      setFormVideoUrl(movie.videoSources?.[0]?.embedUrl || '');
      setTmdbResults([]);
      setTmdbQuery('');
    } catch (error) {
      setTmdbError(error instanceof Error ? error.message : 'Could not fetch title details from TMDB.');
    } finally {
      setFetchingTmdbId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || isSavingMedia) return;
    setFormError('');
    const sourcesWithKeys = [
      ...formSources,
      ...formSeasons.flatMap(season => season.episodes.flatMap(episode => episode.videoSources || []))
    ];
    const invalidClearKey = sourcesWithKeys.find(source =>
      source.sourceType === 'dash'
      && (source.clearKeyId?.trim() || source.clearKey?.trim())
      && (!/^[\da-f]{32}$/i.test(source.clearKeyId?.trim() || '')
        || !/^[\da-f]{32}$/i.test(source.clearKey?.trim() || ''))
    );
    if (invalidClearKey) {
      setFormError('For ClearKey DASH playback, enter both the KID and key as 32 hexadecimal characters each.');
      return;
    }
    setIsSavingMedia(true);

    try {
      const payload: Partial<Movie> = {
        ...(formTmdbId ? { tmdbId: formTmdbId, metadataSource: 'tmdb' as const } : {}),
        title: formTitle.trim(),
        type: formType,
        year: formYear,
        duration: formDuration,
        quality: formQuality,
        rating: formRating,
        country: formCountry,
        countries: formCountry.split(',').map(country => country.trim()).filter(Boolean),
        director: formDirector,
        cast: formCast.split(',').map(s => s.trim()).filter(Boolean),
        synopsis: formSynopsis,
        posterUrl: formPosterUrl,
        backdropUrl: formBackdropUrl,
        genres: formGenres,
        videoSources: formSources.filter(source => source.url.trim()).map(source => ({
          id: source.id, name: source.name, quality: '1080p HD', speed: 'Fast', embedUrl: source.url.trim(),
          sourceType: source.sourceType as any, isDefault: source.isDefault, isActive: source.isActive,
          clearKeyId: source.clearKeyId?.trim() || undefined,
          clearKey: source.clearKey?.trim() || undefined
        })),
        ...(formType === 'tv' ? { seasons: formSeasons } : {})
      };

      if (editingMovie) {
        await onUpdateMovie(editingMovie.id, payload);
      } else {
        await onAddMovie(payload);
      }
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not publish this title. Please try again.');
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!moviePendingDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteMovie(moviePendingDelete.id);
      setMoviePendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-[#242832] border border-[#2e3442] rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Controls */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or director..."
              className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#4f83d3]"
            />
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#b2b1ad] focus:text-white"
          >
            <option value="all">All Media</option>
            <option value="movie">Movies Only</option>
            <option value="tv">TV Series Only</option>
          </select>

          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#b2b1ad] focus:text-white"
          >
            <option value="All">All Genres</option>
            {catalogGenres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={filterQuality}
            onChange={(e) => setFilterQuality(e.target.value)}
            className="bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-[#b2b1ad] focus:text-white"
          >
            <option value="all">All Qualities</option>
            <option value="HD">HD</option>
            <option value="4K">4K</option>
            <option value="CAM">CAM</option>
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#b2b1ad] hidden sm:inline">
            Total: <strong className="text-white">{filtered.length}</strong> items
          </span>
          <button
            onClick={openCreateModal}
            className="bg-gradient-flixer hover:opacity-95 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Media</span>
          </button>
        </div>
      </div>

      {/* Media Data Table */}
      <div className="bg-[#242832] border border-[#2e3442] rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#b2b1ad]">
            <thead className="bg-[#1e2129] text-[11px] uppercase tracking-wider text-[#e9ecef] border-b border-[#2e3442]">
              <tr>
                <th className="py-3.5 px-4">Poster</th>
                <th className="py-3.5 px-4">Title & Meta</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Views</th>
                <th className="py-3.5 px-4">Genres</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2129]">
              {paginated.map((movie) => (
                <tr key={movie.id} className="hover:bg-[#1f232c] transition-colors">
                  <td className="py-3 px-4 w-16">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-16 object-cover rounded-lg shadow shrink-0"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white text-sm hover:text-[#4f83d3] cursor-pointer" onClick={() => onPreviewMovie(movie.id)}>
                      {movie.title}
                    </div>
                    <div className="text-[11px] text-[#b2b1ad] mt-0.5 flex items-center gap-2">
                      <span className="bg-[#1a1c23] px-1.5 py-0.2 rounded text-[10px] text-[#db6937] font-bold">
                        {movie.quality}
                      </span>
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span>{movie.duration}</span>
                      <span>•</span>
                      <span>{movie.country}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      movie.type === 'tv'
                        ? 'bg-[#4f83d3]/20 text-[#4f83d3]'
                        : 'bg-[#db6937]/20 text-[#db6937]'
                    }`}>
                      {movie.type === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                      {movie.type === 'tv' ? 'TV Show' : 'Movie'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {movie.rating}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-white">
                    {movie.viewsCount?.toLocaleString() || 0}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate">
                    {movie.genres?.join(', ')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPreviewMovie(movie.id)}
                        className="p-1.5 rounded-lg bg-[#1a1c23] hover:bg-[#343b4a] text-[#b2b1ad] hover:text-white"
                        title="Preview on Public Site"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(movie)}
                        className="p-1.5 rounded-lg bg-[#1a1c23] hover:bg-[#343b4a] text-[#4f83d3] hover:text-white"
                        title="Edit Media"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setMoviePendingDelete(movie)}
                        className="p-1.5 rounded-lg bg-[#1a1c23] hover:bg-rose-950/60 text-rose-400 hover:text-rose-200"
                        title="Delete Media"
                        aria-label={`Delete ${movie.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#1e2129] border-t border-[#2e3442] flex items-center justify-between text-xs">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx + 1}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-7 h-7 rounded-lg font-semibold cursor-pointer ${
                    currentPage === idx + 1
                      ? 'bg-gradient-flixer text-white'
                      : 'bg-[#242832] text-[#b2b1ad] hover:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Media Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-editor-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#3e4555] bg-[#242832] shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#2e3442] px-5 pb-3 pt-5 sm:px-6">
              <h3 id="media-editor-title" className="flex min-w-0 items-center gap-2 text-lg font-bold text-white">
                <Film className="w-5 h-5 text-[#db6937]" />
                <span className="truncate">{editingMovie ? `Edit Media: ${editingMovie.title}` : 'Add New Movie / TV Show'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close media editor"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-[#1a1c23] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col text-xs">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                {!editingMovie && (
                  <section className="space-y-3 rounded-2xl border border-[#4f83d3]/30 bg-[#1a1c23] p-3.5">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#db6937]" />
                      <div>
                        <h4 className="font-semibold text-white">Import details from TMDB</h4>
                        <p className="mt-0.5 text-[11px] text-[#b2b1ad]">Search for a title to fill in its metadata, artwork, cast, and TV episodes.</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="search"
                        value={tmdbQuery}
                        onChange={event => setTmdbQuery(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void searchTmdbTitles();
                          }
                        }}
                        placeholder="Search movies or series..."
                        aria-label="Search TMDB titles"
                        className="min-w-0 flex-1 rounded-xl border border-[#3e4555] bg-[#242832] px-3 py-2.5 text-white placeholder:text-[#858b98]"
                      />
                      <button
                        type="button"
                        onClick={() => void searchTmdbTitles()}
                        disabled={isSearchingTmdb || fetchingTmdbId !== null}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#343b4a] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#414b5e] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Search className="h-4 w-4" />
                        {isSearchingTmdb ? 'Searching…' : 'Search TMDB'}
                      </button>
                    </div>
                    {tmdbError && <p role="status" className="text-[11px] text-amber-300">{tmdbError}</p>}
                    {tmdbResults.length > 0 && (
                      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                        {tmdbResults.map(result => (
                          <button
                            key={`${result.type}-${result.tmdbId}`}
                            type="button"
                            onClick={() => void fetchTmdbTitle(result)}
                            disabled={fetchingTmdbId !== null}
                            className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-transparent bg-[#242832] p-2 text-left transition-colors hover:border-[#4f83d3]/50 hover:bg-[#292d38] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <img src={result.posterUrl} alt="" className="h-14 w-10 shrink-0 rounded-md bg-[#1a1c23] object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-white">{result.title}</span>
                              <span className="mt-0.5 block text-[10px] capitalize text-[#b2b1ad]">{result.type === 'tv' ? 'TV Series' : 'Movie'} · {result.year || 'Year unknown'}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold text-[#8ab4ff]">
                              {fetchingTmdbId === result.tmdbId ? 'Fetching…' : 'Use details'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  >
                    <option value="movie">Movie</option>
                    <option value="tv">TV Series</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Release Year</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10) || 2024)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Quality</label>
                  <select
                    value={formQuality}
                    onChange={(e) => setFormQuality(e.target.value as any)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  >
                    <option value="HD">HD</option>
                    <option value="4K">4K UHD</option>
                    <option value="CAM">CAM</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Duration</label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Rating (0 - 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formRating}
                    onChange={(e) => setFormRating(parseFloat(e.target.value) || 7.0)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white">Country</label>
                  <select
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  >
                    {catalogCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Director</label>
                  <input
                    type="text"
                    value={formDirector}
                    onChange={(e) => setFormDirector(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Cast (comma separated)</label>
                  <input
                    type="text"
                    value={formCast}
                    onChange={(e) => setFormCast(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Poster Image URL</label>
                  <input
                    type="text"
                    value={formPosterUrl}
                    onChange={(e) => setFormPosterUrl(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white font-mono text-[11px]"
                  />
                  <input aria-label="Upload custom poster" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void uploadImage(e.target.files?.[0],setFormPosterUrl).catch(error=>window.alert(error.message))} className="block w-full text-[11px] text-[#b2b1ad]" />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Backdrop Image URL</label>
                  <input type="text" value={formBackdropUrl} onChange={e=>setFormBackdropUrl(e.target.value)} className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white font-mono text-[11px]" />
                  <input aria-label="Upload custom backdrop" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void uploadImage(e.target.files?.[0],setFormBackdropUrl).catch(error=>window.alert(error.message))} className="block w-full text-[11px] text-[#b2b1ad]" />
                </div>

                <section className="sm:col-span-2 min-w-0 rounded-xl border border-[#3e4555] bg-[#1a1c23] p-3 space-y-3">
                  <div className="flex items-center justify-between"><label className="font-semibold text-white">Playback sources</label>
                    <button type="button" onClick={() => setFormSources(rows => [...rows, {id:`source-${Date.now()}`,name:`Source ${rows.length+1}`,url:'',sourceType:'embed',isDefault:rows.length===0,isActive:true}])} className="rounded-lg bg-[#343b4a] px-2.5 py-1.5 text-white">Add source</button>
                  </div>
                  {formSources.map((source, index) => <div key={source.id} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-[#343b4a] p-2 sm:grid-cols-2">
                    <input aria-label="Source name" value={source.name} onChange={e=>setFormSources(rows=>rows.map((row,i)=>i===index?{...row,name:e.target.value}:row))} placeholder="Name" className="w-full min-w-0 rounded-lg bg-[#242832] p-2 text-white" />
                    <input aria-label="Streaming URL" type="url" value={source.url} onChange={e=>setFormSources(rows=>rows.map((row,i)=>i===index?{...row,url:e.target.value,sourceType:getPlaylistSourceType(e.target.value) || row.sourceType}:row))} placeholder="https://..." className="w-full min-w-0 rounded-lg bg-[#242832] p-2 font-mono text-white" />
                    <select aria-label="Source type" value={source.sourceType} onChange={e=>setFormSources(rows=>rows.map((row,i)=>i===index?{...row,sourceType:e.target.value}:row))} className="w-full min-w-0 rounded-lg bg-[#242832] p-2 text-white">
                      <option value="direct">Direct video file</option><option value="hls">Shaka HLS playlist (.m3u8)</option><option value="dash">Shaka MPEG-DASH playlist (.mpd)</option><option value="embed">Embedded player page</option><option value="hosted">Hosted player page</option>
                    </select>
                    <p className="sm:col-span-2 text-[10px] leading-relaxed text-[#858b98]">
                      Shaka plays browser-accessible HLS (.m3u8) and DASH (.mpd) manifests. The stream must allow browser access; DRM-protected streams require the provider’s licensed player.
                    </p>
                    {source.sourceType === 'dash' && (
                      <>
                        <input
                          aria-label="ClearKey key ID in hexadecimal"
                          value={source.clearKeyId || ''}
                          onChange={event => setFormSources(rows => rows.map((row, i) => i === index ? { ...row, clearKeyId: event.target.value.trim() } : row))}
                          placeholder="ClearKey KID (32 hex characters)"
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full min-w-0 rounded-lg bg-[#242832] p-2 font-mono text-white"
                        />
                        <input
                          aria-label="ClearKey content key in hexadecimal"
                          type="password"
                          value={source.clearKey || ''}
                          onChange={event => setFormSources(rows => rows.map((row, i) => i === index ? { ...row, clearKey: event.target.value.trim() } : row))}
                          placeholder="ClearKey (32 hex characters)"
                          autoComplete="new-password"
                          spellCheck={false}
                          className="w-full min-w-0 rounded-lg bg-[#242832] p-2 font-mono text-white"
                        />
                        <p className="sm:col-span-2 text-[10px] leading-relaxed text-amber-200/80">
                          ClearKey is for content you own or are authorized to serve. The key must reach the browser to play and can be inspected by viewers; don’t use it for secrets or third-party DRM.
                        </p>
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex items-center gap-1 text-white"><input type="checkbox" checked={source.isDefault} onChange={e=>setFormSources(rows=>rows.map((row,i)=>({...row,isDefault:i===index?e.target.checked:false})))} />Default</label>
                      <label className="flex items-center gap-1 text-white"><input type="checkbox" checked={source.isActive} onChange={e=>setFormSources(rows=>rows.map((row,i)=>i===index?{...row,isActive:e.target.checked}:row))} />Active</label>
                      <button type="button" onClick={()=>setFormSources(rows=>rows.filter((_,i)=>i!==index))} className="text-rose-300">Delete</button>
                    </div>
                  </div>)}
                </section>

                {formType === 'tv' && <section className="sm:col-span-2 min-w-0 rounded-xl border border-[#3e4555] bg-[#1a1c23] p-3 space-y-3">
                  <div className="flex items-center justify-between"><label className="font-semibold text-white">Seasons and episode sources</label>
                    <button type="button" onClick={()=>setFormSeasons(rows=>[...rows,{seasonNumber:rows.length+1,title:`Season ${rows.length+1}`,episodes:[]}])} className="rounded-lg bg-[#343b4a] px-2.5 py-1.5 text-white">Add season</button>
                  </div>
                  {formSeasons.map((season,si)=><details key={`${season.seasonNumber}-${si}`} className="min-w-0 rounded-lg border border-[#343b4a] p-2" open>
                    <summary className="cursor-pointer text-white font-semibold">Season {season.seasonNumber}: {season.title}</summary>
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-2"><input aria-label="Season name" value={season.title} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,title:e.target.value}:s))} className="flex-1 rounded-lg bg-[#242832] p-2 text-white" />
                        <button type="button" onClick={()=>setFormSeasons(rows=>rows.filter((_,i)=>i!==si))} className="px-2 text-rose-300">Delete season</button></div>
                      <textarea aria-label="Season description" value={season.overview || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,overview:e.target.value}:s))} placeholder="Season description" className="w-full rounded-lg bg-[#242832] p-2 text-white" />
                      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2"><input aria-label="Season air date" type="date" value={season.airDate || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,airDate:e.target.value}:s))} className="w-full min-w-0 rounded-lg bg-[#242832] p-2 text-white" />
                        <input aria-label="Season poster URL" value={season.posterUrl || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,posterUrl:e.target.value}:s))} placeholder="Season poster URL" className="w-full min-w-0 rounded-lg bg-[#242832] p-2 font-mono text-white" /></div>
                      {season.episodes.map((episode,ei)=><div key={episode.id || `${si}-${ei}`} className="min-w-0 space-y-2 rounded-lg bg-[#242832] p-2">
                        <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(4rem,0.35fr)_minmax(0,1fr)_auto]"><input aria-label="Episode number" type="number" value={episode.episodeNumber} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,episodeNumber:Number(e.target.value)}:ep)}:s))} className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 text-white" />
                          <input aria-label="Episode title" value={episode.title} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,title:e.target.value}:ep)}:s))} className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 text-white" />
                          <button type="button" onClick={()=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.filter((_,j)=>j!==ei)}:s))} className="justify-self-start text-rose-300">Delete episode</button></div>
                        <textarea aria-label="Episode description" value={episode.overview || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,overview:e.target.value}:ep)}:s))} placeholder="Episode description" className="w-full rounded-lg bg-[#1a1c23] p-2 text-white" />
                        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2"><input aria-label="Episode runtime" value={episode.duration || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,duration:e.target.value}:ep)}:s))} placeholder="Runtime" className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 text-white" />
                          <input aria-label="Episode thumbnail path" value={episode.thumbnail || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,thumbnail:e.target.value}:ep)}:s))} placeholder="Thumbnail URL" className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 font-mono text-white" />
                          <input aria-label="Upload episode thumbnail" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void uploadImage(e.target.files?.[0],url=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,thumbnail:url}:ep)}:s))).catch(error=>window.alert(error.message))} className="max-w-full text-[11px] text-[#b2b1ad]" /></div>
                        {(episode.videoSources || []).map((source,xi)=><div key={source.id} className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                          <input aria-label="Episode source name" value={source.name} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:ep.videoSources?.map((x,k)=>k===xi?{...x,name:e.target.value}:x)}:ep)}:s))} className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 text-white" />
                          <input aria-label="Episode source URL" type="url" value={source.embedUrl} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:ep.videoSources?.map((x,k)=>k===xi?{...x,embedUrl:e.target.value,sourceType:getPlaylistSourceType(e.target.value) || x.sourceType}:x)}:ep)}:s))} placeholder="https://..." className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 font-mono text-white" />
                          <div className="flex min-w-0 gap-2"><select aria-label="Episode source type" value={source.sourceType || 'embed'} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:ep.videoSources?.map((x,k)=>k===xi?{...x,sourceType:e.target.value as any}:x)}:ep)}:s))} className="min-w-0 flex-1 rounded-lg bg-[#1a1c23] p-2 text-white"><option value="direct">Direct video</option><option value="hls">Shaka HLS (.m3u8)</option><option value="dash">Shaka DASH (.mpd)</option><option value="embed">Embedded player</option><option value="hosted">Hosted player</option></select><button type="button" onClick={()=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:ep.videoSources?.filter((_,k)=>k!==xi)}:ep)}:s))} className="text-rose-300">×</button></div>
                          {source.sourceType === 'dash' && (
                            <>
                              <input aria-label="Episode ClearKey key ID in hexadecimal" value={source.clearKeyId || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:ep.videoSources?.map((x,k)=>k===xi?{...x,clearKeyId:e.target.value.trim()}:x)}:ep)}:s))} placeholder="ClearKey KID (32 hex characters)" autoComplete="off" spellCheck={false} className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 font-mono text-white" />
                              <input aria-label="Episode ClearKey content key in hexadecimal" type="password" value={source.clearKey || ''} onChange={e=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:ep.videoSources?.map((x,k)=>k===xi?{...x,clearKey:e.target.value.trim()}:x)}:ep)}:s))} placeholder="ClearKey (32 hex characters)" autoComplete="new-password" spellCheck={false} className="w-full min-w-0 rounded-lg bg-[#1a1c23] p-2 font-mono text-white" />
                            </>
                          )}
                        </div>)}
                        <button type="button" onClick={()=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:s.episodes.map((ep,j)=>j===ei?{...ep,videoSources:[...(ep.videoSources||[]),{id:`ep-src-${Date.now()}`,name:`Source ${(ep.videoSources?.length||0)+1}`,quality:'HD',speed:'',embedUrl:'',sourceType:'embed',isDefault:(ep.videoSources?.length||0)===0,isActive:true}]}:ep)}:s))} className="text-[#8ab4ff]">Add episode source</button>
                      </div>)}
                      <button type="button" onClick={()=>setFormSeasons(rows=>rows.map((s,i)=>i===si?{...s,episodes:[...s.episodes,{id:`manual-s${s.seasonNumber}-e${s.episodes.length+1}`,seasonNumber:s.seasonNumber,episodeNumber:s.episodes.length+1,title:`Episode ${s.episodes.length+1}`,duration:'',thumbnail:'',videoSources:[]}]}:s))} className="text-[#8ab4ff]">Add episode</button>
                    </div>
                  </details>)}
                </section>}

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Storyline / Synopsis</label>
                  <textarea
                    rows={3}
                    value={formSynopsis}
                    onChange={(e) => setFormSynopsis(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              </div>

              <div className="shrink-0 border-t border-[#2e3442] bg-[#242832] px-5 py-4 shadow-[0_-8px_20px_rgb(0_0_0/0.18)] sm:px-6">
                {formError && <p role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{formError}</p>}
                <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingMedia}
                  className="px-4 py-2 rounded-xl bg-[#1a1c23] text-[#b2b1ad] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMedia}
                  className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-gradient-flixer px-5 py-2 font-bold text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingMedia ? 'Publishing…' : editingMovie ? 'Save Changes' : 'Publish to Catalog'}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {moviePendingDelete && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !isDeleting) setMoviePendingDelete(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-media-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#3e4555] bg-[#242832] shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="delete-media-title" className="text-base font-bold text-white">
                  Delete this title?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#b2b1ad]">
                  <span className="font-semibold text-white">{moviePendingDelete.title}</span> will be permanently removed from your catalog. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#343b4a] bg-[#1e2129]/70 px-5 py-4">
              <button
                type="button"
                onClick={() => setMoviePendingDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-[#3e4555] px-4 py-2 text-xs font-semibold text-[#d0d4dc] transition-colors hover:bg-[#343b4a] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Deleting…' : 'Delete title'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
