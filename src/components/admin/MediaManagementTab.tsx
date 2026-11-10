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
import { Movie } from '../../types/movie';
import { getCatalogCountries, getCatalogGenres } from '../../services/catalogOptions';

interface MediaManagementTabProps {
  movies: Movie[];
  onAddMovie: (movie: Partial<Movie>) => Promise<void>;
  onUpdateMovie: (id: string, movie: Partial<Movie>) => Promise<void>;
  onDeleteMovie: (id: string) => Promise<void>;
  onPreviewMovie: (id: string) => void;
}

export const MediaManagementTab: React.FC<MediaManagementTabProps> = ({
  movies,
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
    setFormGenres(['Action']);
    setIsModalOpen(true);
  };

  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
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
    setFormGenres(movie.genres);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload: Partial<Movie> = {
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
      videoSources: [
        {
          id: 'srv-1',
          name: 'Server 1 (Default)',
          quality: '1080p HD',
          speed: 'Fast',
          embedUrl: formVideoUrl.trim()
        }
      ]
    };

    if (editingMovie) {
      await onUpdateMovie(editingMovie.id, payload);
    } else {
      await onAddMovie(payload);
    }
    setIsModalOpen(false);
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
          <div className="bg-[#242832] border border-[#3e4555] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e3442]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-[#db6937]" />
                <span>{editingMovie ? `Edit Media: ${editingMovie.title}` : 'Add New Movie / TV Show'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#1a1c23]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-white">Streaming Video URL (Embed or HLS)</label>
                  <input
                    type="text"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white font-mono text-[11px]"
                  />
                </div>

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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2e3442]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1a1c23] text-[#b2b1ad] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-flixer text-white font-bold shadow hover:opacity-95"
                >
                  {editingMovie ? 'Save Changes' : 'Publish to Catalog'}
                </button>
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
