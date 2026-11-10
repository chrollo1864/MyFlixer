import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  SlidersHorizontal, 
  User, 
  Film, 
  LogOut, 
  Bookmark, 
  History, 
  ChevronRight, 
  X,
  Star
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCatalogCountries, getCatalogGenres } from '../services/catalogOptions';
import { api } from '../services/api';
import { Movie } from '../types/movie';

export const Header: React.FC = () => {
  const { 
    currentView,
    navigateTo, 
    filterOptions, 
    setFilterOptions, 
    openModal, 
    currentUser, 
    logout,
    favorites,
    themeOptions,
    isAdmin
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filterOptions.query || '');
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [catalogGenres, setCatalogGenres] = useState<string[]>([]);
  const [catalogCountries, setCatalogCountries] = useState<string[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api.getAllMovies().then(movies => {
      if (!active) return;
      setCatalogGenres(getCatalogGenres(movies));
      setCatalogCountries(getCatalogCountries(movies));
    });
    return () => { active = false; };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live auto-suggestions
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      api.searchAndFilter({
        type: 'all',
        quality: 'all',
        genre: 'All',
        year: 'All',
        country: 'All',
        sort: 'views',
        query: searchQuery
      }).then(res => {
        setSuggestions(res.slice(0, 5));
        setIsSuggestOpen(true);
      });
    } else {
      setSuggestions([]);
      setIsSuggestOpen(false);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestOpen(false);
    setIsMobileSearchOpen(false);
    navigateTo('browse', undefined, { query: searchQuery });
  };

  const handleSuggestionClick = (movieId: string) => {
    setIsSuggestOpen(false);
    setSearchQuery('');
    navigateTo('watch', movieId);
  };

  return (
    <header className={`w-full z-50 ${
      currentView === 'home'
        ? 'absolute top-0 inset-x-0 bg-transparent border-b border-transparent'
        : 'sticky top-0 bg-[#292d38] border-b border-[#242832]'
    }`}>
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left Section: Menu Drawer Toggler & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0 min-w-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center text-[#e9ecef] hover:bg-[#242832] transition-colors"
            title="Toggle Menu"
            aria-label="Navigation Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6 text-[#db6937]" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <a
            href="#/home"
            onClick={(e) => { e.preventDefault(); navigateTo('home'); }}
            className="flex min-w-0 items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-tr from-[#db6937] via-[#6366f1] to-[#4f83d3] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg min-[380px]:text-xl sm:text-2xl font-bold tracking-tight text-white font-['Poppins'] whitespace-nowrap">
              My<span className="text-gradient-flixer">Flixer</span>
            </span>
          </a>
        </div>

        {/* Center Section: Gradient Pill Search Form with Live Suggestions */}
        <div className="flex-1 max-w-[580px] relative hidden sm:block" ref={searchRef}>
          <div className="relative rounded-full p-[1.5px] bg-gradient-to-r from-[#db6937] via-[#6366f1] to-[#4f83d3] shadow-md">
            <form 
              onSubmit={handleSearchSubmit} 
              className="bg-[#242832] rounded-full px-2 py-1.5 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => navigateTo('browse')}
                className="bg-[#4f83d3] hover:bg-[#db6937] text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setIsSuggestOpen(true)}
                placeholder="Search movies, TV shows, actors..."
                className="flex-1 bg-transparent border-0 text-[#e9ecef] placeholder-neutral-500 text-sm focus:outline-none px-2"
              />

              <button
                type="submit"
                className="text-[#4f83d3] hover:text-white p-1.5 transition-colors shrink-0"
                aria-label="Submit Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Live Auto-Suggestions Dropdown Popup */}
          {isSuggestOpen && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#292d38] border border-[#1a1c23] rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="divide-y divide-[#1e2129]">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSuggestionClick(item.id)}
                    className="p-3 flex items-center gap-3.5 hover:bg-[#22262f] cursor-pointer transition-colors group"
                  >
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-14 object-cover rounded-lg shrink-0 shadow"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#e9ecef] group-hover:text-[#4f83d3] transition-colors truncate">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#b2b1ad]">
                        <span className="bg-[#1a1c23] px-1.5 py-0.5 rounded text-[10px] text-[#db6937] font-semibold">
                          {item.quality}
                        </span>
                        <span>{item.year}</span>
                        <span>•</span>
                        <span>{item.duration}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {item.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2.5 bg-[#1e2129] text-center border-t border-[#1a1c23]">
                <button
                  onClick={handleSearchSubmit}
                  className="text-xs text-[#4f83d3] hover:text-white font-medium flex items-center justify-center gap-1 mx-auto"
                >
                  View all results for "{searchQuery}" <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Search and Auth */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(open => !open)}
            className="sm:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#242832] hover:bg-[#343b4a] border border-[#3e4555] flex items-center justify-center text-[#e9ecef] transition-colors"
            aria-label={isMobileSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={isMobileSearchOpen}
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('watchlist')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#242832] hover:bg-[#343b4a] border border-[#3e4555] flex items-center justify-center text-[#e9ecef] relative transition-colors"
            title="My Watchlist"
            aria-label={`My Watchlist${favorites.length ? `, ${favorites.length} saved` : ''}`}
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#4f83d3] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>

          {/* User Profile or Login Button */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[#242832] border border-[#3e4555] hover:border-[#4f83d3] transition-colors"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
                  alt={currentUser.displayName || currentUser.username}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="text-xs font-medium text-[#e9ecef] hidden md:inline">
                  {currentUser.displayName || currentUser.username}
                </span>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#292d38] border border-[#1a1c23] rounded-2xl shadow-2xl p-1.5 z-50">
                  <div className="px-3 py-2 border-b border-[#242832] mb-1">
                    <div className="text-xs font-semibold text-[#e9ecef]">{currentUser.displayName || currentUser.username}</div>
                    <div className="text-[10px] text-[#b2b1ad] truncate">{currentUser.email}</div>
                  </div>
                  <button
                    onClick={() => { setIsUserMenuOpen(false); navigateTo('account'); }}
                    className="w-full px-3 py-2 text-xs text-[#b2b1ad] hover:text-[#e9ecef] hover:bg-[#242832] rounded-xl flex items-center gap-2.5 transition-colors"
                  >
                    <User className="w-4 h-4" /> My Profile
                  </button>
                  <button
                    onClick={() => { setIsUserMenuOpen(false); navigateTo('watchlist'); }}
                    className="w-full px-3 py-2 text-xs text-[#b2b1ad] hover:text-[#e9ecef] hover:bg-[#242832] rounded-xl flex items-center gap-2.5 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" /> Watchlist ({favorites.length})
                  </button>
                  <button
                    onClick={() => { setIsUserMenuOpen(false); navigateTo('account'); }}
                    className="w-full px-3 py-2 text-xs text-[#b2b1ad] hover:text-[#e9ecef] hover:bg-[#242832] rounded-xl flex items-center gap-2.5 transition-colors"
                  >
                    <History className="w-4 h-4" /> Watch History
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setIsUserMenuOpen(false); navigateTo('admin'); }}
                      className="w-full px-3 py-2 text-xs text-[#db6937] hover:text-white hover:bg-[#242832] rounded-xl flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <SlidersHorizontal className="w-4 h-4" /> Admin Panel
                    </button>
                  )}
                  <div className="border-t border-[#242832] my-1" />
                  <button
                    onClick={() => { setIsUserMenuOpen(false); logout(); }}
                    className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-xl flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="bg-gradient-flixer hover:opacity-95 text-white text-xs font-semibold px-2.5 min-[380px]:px-3 sm:px-4 py-2 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-md transition-all active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden min-[380px]:inline">Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar Row */}
      {isMobileSearchOpen && <div className="sm:hidden px-3 pb-3">
        <form 
          onSubmit={handleSearchSubmit} 
          className="rounded-full p-[1.5px] bg-gradient-to-r from-[#db6937] via-[#6366f1] to-[#4f83d3] shadow-md"
        >
          <div className="min-w-0 bg-[#242832] rounded-full px-3 py-1.5 flex items-center gap-2">
            <Search className="w-4 h-4 shrink-0 text-neutral-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies..."
              aria-label="Search movies and TV shows"
              className="min-w-0 flex-1 bg-transparent border-0 text-[#e9ecef] text-sm placeholder:text-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[#b2b1ad] hover:text-white hover:bg-[#343b4a] transition-colors"
              aria-label="Submit search"
            >
              <Search className="w-4 h-4" />
            </button>
            <span className="h-6 w-px shrink-0 bg-[#3e4555]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => navigateTo('browse')}
              className="min-h-8 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1a1c23] px-2.5 text-[11px] font-semibold text-[#e9ecef] hover:bg-[#343b4a] transition-colors"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#4f83d3]" />
              <span className="hidden min-[380px]:inline">Filters</span>
            </button>
          </div>
        </form>
      </div>}

      {/* Flyout Navigation Drawer (Header Menu) */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-20 bg-black/70 backdrop-blur-sm z-40 flex">
          <div className="w-72 sm:w-80 bg-[#292d38] h-full border-r border-[#242832] p-5 overflow-y-auto space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#b2b1ad] mb-2 px-2">
                Navigation
              </div>
              <ul className="space-y-1 text-sm font-medium">
                <li>
                  <button
                    onClick={() => { setIsMenuOpen(false); navigateTo('home'); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#e9ecef] hover:bg-[#242832] transition-colors"
                  >
                    Home Page
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setIsMenuOpen(false); navigateTo('browse', undefined, { type: 'movie' }); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#e9ecef] hover:bg-[#242832] transition-colors"
                  >
                    Movies
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setIsMenuOpen(false); navigateTo('browse', undefined, { type: 'tv' }); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#e9ecef] hover:bg-[#242832] transition-colors"
                  >
                    TV Series
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setIsMenuOpen(false); navigateTo('browse', undefined, { sort: 'rating' }); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#e9ecef] hover:bg-[#242832] transition-colors"
                  >
                    Top IMDb Rating
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setIsMenuOpen(false); navigateTo('watchlist'); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#e9ecef] hover:bg-[#242832] transition-colors flex items-center justify-between"
                  >
                    <span>My Watchlist</span>
                    <span className="text-xs bg-[#4f83d3] text-white px-2 py-0.5 rounded-full font-bold">
                      {favorites.length}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="border-t border-[#242832] pt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#b2b1ad] mb-2 px-2">
                Browse Genres
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {catalogGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigateTo('browse', undefined, { genre });
                    }}
                    className="text-left px-2.5 py-1.5 rounded-lg text-[#b2b1ad] hover:text-white hover:bg-[#242832] transition-colors truncate"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#242832] pt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#b2b1ad] mb-2 px-2">
                Popular Countries
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {catalogCountries.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigateTo('browse', undefined, { country: c });
                    }}
                    className="text-left px-2.5 py-1.5 rounded-lg text-[#b2b1ad] hover:text-white hover:bg-[#242832] transition-colors truncate"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#242832] pt-4">
              <button
                onClick={() => { setIsMenuOpen(false); openModal('contact'); }}
                className="w-full text-xs text-[#b2b1ad] hover:text-white py-1.5 text-left px-2"
              >
                Contact Support
              </button>
              <button
                onClick={() => { setIsMenuOpen(false); openModal('request'); }}
                className="w-full text-xs text-[#b2b1ad] hover:text-white py-1.5 text-left px-2"
              >
                Request a Movie / Show
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
