import React, { createContext, useContext, useState, useEffect } from 'react';
import { FilterOptions, Movie, UserAccount } from '../types/movie';
import { ThemeOptionsConfig } from '../types/admin';
import { DEFAULT_THEME_OPTIONS } from '../services/adminDefaults';
import { api } from '../services/api';

export type AppView = 'home' | 'watch' | 'browse' | 'watchlist' | 'account' | 'privacy' | 'terms' | 'admin' | 'not-found';

interface AppContextType {
  currentView: AppView;
  selectedMovieId: string | null;
  selectedMovie: Movie | null;
  selectedEpisodeNumber: number;
  selectedSeasonNumber: number;
  filterOptions: FilterOptions;
  favorites: string[];
  watchHistory: {
    movieId: string;
    progressPercent: number;
    lastWatched: string;
    season?: number;
    episode?: number;
  }[];
  cinemaMode: boolean;
  activeModal: 'login' | 'report' | 'contact' | 'request' | null;
  toastMessage: string | null;
  currentUser: UserAccount | null;
  themeOptions: ThemeOptionsConfig;
  isAdmin: boolean;
  // Actions
  navigateTo: (view: AppView, movieId?: string, options?: Partial<FilterOptions>) => void;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  toggleFavorite: (movieId: string) => void;
  isFavorite: (movieId: string) => boolean;
  updateWatchProgress: (movieId: string, percent: number, season?: number, episode?: number) => void;
  toggleCinemaMode: () => void;
  setCinemaMode: (active: boolean) => void;
  openModal: (modal: 'login' | 'report' | 'contact' | 'request') => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
  login: (identifier: string, password: string) => Promise<void>;
  verifyRegistration: (email: string, code: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateAccountProfile: (profile: {
    displayName: string;
    username: string;
    email: string;
    avatar: string;
    currentPassword: string;
    newPassword?: string;
  }) => Promise<void>;
  logout: () => void;
  setSelectedSeasonNumber: (s: number) => void;
  setSelectedEpisodeNumber: (e: number) => void;
  updateThemeOptions: (newOpts: Partial<ThemeOptionsConfig>) => Promise<void>;
  refreshAdminSettings: () => Promise<void>;
}

const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  type: 'all',
  quality: 'all',
  genre: 'All',
  year: 'All',
  country: 'All',
  sort: 'updated',
  query: '',
  a2z: ''
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState<number>(1);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);
  const [cinemaMode, setCinemaMode] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<'login' | 'report' | 'contact' | 'request' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme Options & Admin Configuration State
  const [themeOptions, setThemeOptions] = useState<ThemeOptionsConfig>(DEFAULT_THEME_OPTIONS);

  useEffect(() => {
    api.getAdminSettings().then((opts) => {
      if (opts) setThemeOptions(opts);
    });
  }, []);

  const updateThemeOptions = async (newOpts: Partial<ThemeOptionsConfig>) => {
    const updated = await api.saveAdminSettings({ ...themeOptions, ...newOpts });
    setThemeOptions(updated);
    showToast('Theme options updated and saved!');
  };

  const refreshAdminSettings = async () => {
    setThemeOptions(await api.getPrivateAdminSettings());
  };

  // User auth state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const isAdmin = currentUser?.role === 'Administrator';

  useEffect(() => {
    api.getCurrentUser().then(async (user) => {
      setCurrentUser(user);
      if (user) {
        const accountState = await api.getUserState();
        if (accountState) {
          setFavorites(accountState.favorites);
          setWatchHistory(accountState.watchHistory);
        }
      }
    }).catch(() => setCurrentUser(null));
  }, []);

  // Favorites list
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('myflixer_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Watch history
  const [watchHistory, setWatchHistory] = useState<{
    movieId: string;
    progressPercent: number;
    lastWatched: string;
    season?: number;
    episode?: number;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('myflixer_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load selected movie when its ID or slug changes.
  useEffect(() => {
    if (selectedMovieId) {
      let active = true;
      api.getMovieByIdOrSlug(selectedMovieId).then(movie => {
        if (!active) return;
        const playableSeasons = movie?.seasons?.filter(season => season.seasonNumber > 0) || [];
        setSelectedMovie(movie ? { ...movie, seasons: playableSeasons } : null);
        setSelectedSeasonNumber(playableSeasons[0]?.seasonNumber || 1);
        if (playableSeasons.length > 0) {
          setSelectedEpisodeNumber(playableSeasons[0].episodes[0]?.episodeNumber || 1);
        } else {
          setSelectedEpisodeNumber(1);
        }
        if (movie) {
          const slug = movie.slug || movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          window.history.replaceState(null, '', `/${movie.type}/${encodeURIComponent(slug)}`);
        }
      });
      return () => {
        active = false;
      };
    } else {
      setSelectedMovie(null);
    }
  }, [selectedMovieId]);

  // Support clean paths and legacy hash URLs on refresh and browser navigation.
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      const watchMatch = /^\/(movie|tv)\/([^/]+)$/i.exec(path);
      if (watchMatch) {
        setSelectedMovieId(decodeURIComponent(watchMatch[2]));
        setCurrentView('watch');
        return;
      }

      const hash = window.location.hash.replace(/^#\/?/, '');
      if ((path === '/' || path === '/home') && (!hash || hash === 'home')) {
        setSelectedMovieId(null);
        setCurrentView('home');
      } else if (hash.startsWith('watch/')) {
        const id = hash.replace('watch/', '');
        setSelectedMovieId(id);
        setCurrentView('watch');
      } else if (path === '/browse' || hash.startsWith('browse')) {
        setSelectedMovieId(null);
        setCurrentView('browse');
      } else if (path === '/watchlist' || hash === 'watchlist') {
        setSelectedMovieId(null);
        setCurrentView('watchlist');
      } else if (path === '/account') {
        setSelectedMovieId(null);
        setCurrentView('account');
      } else if (path === '/privacy-policy') {
        setSelectedMovieId(null);
        setCurrentView('privacy');
      } else if (path === '/terms-of-service') {
        setSelectedMovieId(null);
        setCurrentView('terms');
      } else if (path === '/admin' || hash.startsWith('admin')) {
        setSelectedMovieId(null);
        setCurrentView('admin');
      } else if (path === '/' || path === '/home' || hash === '404') {
        setSelectedMovieId(null);
        setCurrentView(hash === '404' ? 'not-found' : 'home');
      } else {
        setSelectedMovieId(null);
        setCurrentView('not-found');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (view: AppView, movieId?: string, options?: Partial<FilterOptions>) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCinemaMode(false);

    if (view === 'browse') {
      setFilterOptions({ ...DEFAULT_FILTER_OPTIONS, ...options });
    } else if (options) {
      setFilterOptions(prev => ({ ...prev, ...options }));
    }

    if (view === 'watch' && movieId) {
      setSelectedMovieId(movieId);
      setCurrentView('watch');
      window.history.pushState(null, '', `/movie/${encodeURIComponent(movieId)}`);
    } else if (view === 'browse') {
      setCurrentView('browse');
      setSelectedMovieId(null);
      window.history.pushState(null, '', '/browse');
    } else if (view === 'watchlist') {
      setCurrentView('watchlist');
      setSelectedMovieId(null);
      window.history.pushState(null, '', '/watchlist');
    } else if (view === 'admin') {
      setCurrentView('admin');
      setSelectedMovieId(null);
      window.history.pushState(null, '', '/admin');
    } else if (view === 'privacy' || view === 'terms') {
      setCurrentView(view);
      setSelectedMovieId(null);
      window.history.pushState(null, '', view === 'privacy' ? '/privacy-policy' : '/terms-of-service');
    } else if (view === 'home') {
      setCurrentView('home');
      setSelectedMovieId(null);
      window.history.pushState(null, '', '/');
    } else {
      setCurrentView(view);
      setSelectedMovieId(null);
      window.history.pushState(null, '', `/${view}`);
    }
  };

  const toggleFavorite = (movieId: string) => {
    setFavorites(prev => {
      const exists = prev.includes(movieId);
      const updated = exists ? prev.filter(id => id !== movieId) : [...prev, movieId];
      localStorage.setItem('myflixer_favorites', JSON.stringify(updated));
      if (currentUser) api.saveUserState(updated, watchHistory).catch(() => showToast('Could not sync favorites.'));
      showToast(exists ? 'Removed from favorites' : 'Added to favorites');
      return updated;
    });
  };

  const isFavorite = (movieId: string) => favorites.includes(movieId);

  const updateWatchProgress = (movieId: string, percent: number, season?: number, episode?: number) => {
    setWatchHistory(prev => {
      const filtered = prev.filter(item => item.movieId !== movieId);
      const updated = [
        {
          movieId,
          progressPercent: percent,
          lastWatched: 'Just now',
          season,
          episode
        },
        ...filtered
      ];
      localStorage.setItem('myflixer_history', JSON.stringify(updated));
      if (currentUser) api.saveUserState(favorites, updated).catch(() => showToast('Could not sync watch history.'));
      return updated;
    });
  };

  const toggleCinemaMode = () => setCinemaMode(prev => !prev);

  const openModal = (modal: 'login' | 'report' | 'contact' | 'request') => {
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const establishUserSession = async (user: UserAccount) => {
    setCurrentUser(user);
    const accountState = await api.getUserState();
    if (accountState) {
      setFavorites(accountState.favorites);
      setWatchHistory(accountState.watchHistory);
    }
    closeModal();
  };

  const login = async (identifier: string, password: string) => {
    const user = await api.login(identifier, password);
    await establishUserSession(user);
    showToast(`Welcome back, ${user.displayName || user.username}!`);
  };

  const verifyRegistration = async (email: string, code: string) => {
    const user = await api.verifyRegistration(email, code);
    await establishUserSession(user);
    showToast('Email verified. Your account is ready!');
  };

  const refreshCurrentUser = async () => {
    setCurrentUser(await api.getCurrentUser());
  };

  const updateAccountProfile = async (profile: {
    displayName: string;
    username: string;
    email: string;
    avatar: string;
    currentPassword: string;
    newPassword?: string;
  }) => {
    const updatedUser = await api.updateProfile(profile);
    setCurrentUser(updatedUser);
    showToast('Your profile has been updated.');
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    showToast('Logged out successfully');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        selectedMovieId,
        selectedMovie,
        selectedSeasonNumber,
        selectedEpisodeNumber,
        filterOptions,
        favorites,
        watchHistory,
        cinemaMode,
        activeModal,
        toastMessage,
        currentUser,
        themeOptions,
        isAdmin,
        navigateTo,
        setFilterOptions,
        toggleFavorite,
        isFavorite,
        updateWatchProgress,
        toggleCinemaMode,
        setCinemaMode,
        openModal,
        closeModal,
        showToast,
        login,
        verifyRegistration,
        refreshCurrentUser,
        updateAccountProfile,
        logout,
        setSelectedSeasonNumber,
        setSelectedEpisodeNumber,
        updateThemeOptions,
        refreshAdminSettings
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
