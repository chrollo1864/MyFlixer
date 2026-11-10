import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Sliders, 
  Film, 
  Sparkles, 
  Users, 
  Globe, 
  LogOut, 
  ExternalLink, 
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Movie } from '../types/movie';
import { ThemeOptionsConfig, AdminUser } from '../types/admin';
import { DashboardOverviewTab } from '../components/admin/DashboardOverviewTab';
import { ThemeOptionsTab } from '../components/admin/ThemeOptionsTab';
import { MediaManagementTab } from '../components/admin/MediaManagementTab';
import { TmdbImporterTab } from '../components/admin/TmdbImporterTab';
import { UserManagementTab } from '../components/admin/UserManagementTab';

export const AdminPage: React.FC = () => {
  const { 
    navigateTo, 
    themeOptions, 
    updateThemeOptions, 
    refreshAdminSettings,
    currentUser, 
    showToast,
    logout,
    refreshCurrentUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'theme-options' | 'media' | 'tmdb' | 'users'>('overview');
  const [themeOptionsSubSection, setThemeOptionsSubSection] = useState<string>('general');
  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load movies and admin users
  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      try {
        const [movies, users] = await Promise.all([
          api.getAdminMedia(),
          api.getAdminUsers()
        ]);
        await refreshAdminSettings();
        setMoviesList(movies);
        setUsersList(users);
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, []);

  const handleClearCache = async () => {
    setIsPurgingCache(true);
    try {
      const msg = await api.clearCache();
      showToast(msg);
    } finally {
      setTimeout(() => setIsPurgingCache(false), 600);
    }
  };

  const handleAddMovie = async (movie: Partial<Movie>) => {
    const created = await api.addAdminMedia(movie);
    setMoviesList(prev => [created, ...prev]);
    showToast(`"${created.title}" published to catalog!`);
  };

  const handleUpdateMovie = async (id: string, movie: Partial<Movie>) => {
    const updated = await api.updateAdminMedia(id, movie);
    setMoviesList(prev => prev.map(m => m.id === id ? updated : m));
    showToast(`"${updated.title}" updated successfully!`);
  };

  const handleDeleteMovie = async (id: string) => {
    await api.deleteAdminMedia(id);
    setMoviesList(prev => prev.filter(m => m.id !== id));
    showToast('Movie deleted from catalog.');
  };

  const handleSaveUser = async (user: Partial<AdminUser> & { password?: string }) => {
    const saved = await api.saveAdminUser(user);
    if (user.id === currentUser?.username) await refreshCurrentUser();
    setUsersList(prev => {
      const previousId = user.id;
      const exists = previousId ? prev.some(u => u.id === previousId) : false;
      if (exists) {
        return prev.map(u => u.id === previousId ? saved : u);
      }
      return [...prev, saved];
    });
    showToast(`User ${saved.username} saved successfully.`);
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteAdminUser(id);
    setUsersList(prev => prev.filter(u => u.id !== id));
    showToast('User removed.');
  };

  return (
    <div className="min-h-screen bg-[#16181f] text-[#e9ecef] flex flex-col font-['Poppins']">
      
      {/* Admin top bar */}
      <header className="h-14 bg-[#1e2129] border-b border-[#292d38] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigateTo('home')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-flixer flex items-center justify-center text-white shadow">
              <Film className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-white tracking-tight hidden sm:inline">
              {themeOptions.general.siteName}
            </span>
          </div>

          <span className="text-[#3e4555] hidden sm:inline">|</span>

          <button
            onClick={() => navigateTo('home')}
            className="text-xs text-[#b2b1ad] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#4f83d3]" />
            <span>Visit Site</span>
          </button>
        </div>

        {/* Center / Right quick actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearCache}
            disabled={isPurgingCache}
            className="px-3 py-1.5 rounded-xl bg-[#242832] hover:bg-[#2e3442] border border-[#3e4555] text-[11px] font-medium text-[#b2b1ad] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Purge Application Caches"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#db6937] ${isPurgingCache ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isPurgingCache ? 'Purging...' : 'Clear Cache'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('account')}
            title="Edit administrator profile"
            className="flex items-center gap-2 pl-2 border-l border-[#2e3442] text-left"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
              alt={currentUser?.displayName || currentUser?.username || 'Admin'}
              className="w-7 h-7 rounded-full object-cover border border-[#4f83d3]"
            />
            <span className="text-xs font-semibold text-white hidden sm:inline">
              {currentUser?.displayName || currentUser?.username || 'Administrator'}
            </span>
            <span className="text-[10px] bg-[#db6937]/20 text-[#db6937] font-bold px-2 py-0.5 rounded-full hidden md:inline">
              Admin
            </span>
          </button>
        </div>
      </header>

      {/* 2. Admin Body Container with Left Primary Navigation */}
      <div className="flex-1 max-w-[1800px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Primary Admin Navigation */}
        <aside className="w-full md:w-56 shrink-0 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#b2b1ad]">
            System Administration
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-gradient-flixer text-white shadow-lg'
                : 'text-[#b2b1ad] hover:text-white hover:bg-[#242832]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('theme-options')}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
              activeTab === 'theme-options'
                ? 'bg-gradient-flixer text-white shadow-lg'
                : 'text-[#b2b1ad] hover:text-white hover:bg-[#242832]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4" />
              <span>Site Settings</span>
            </div>
            <span className="text-[10px] bg-black/30 text-amber-300 px-1.5 py-0.2 rounded font-bold">
              11
            </span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
              activeTab === 'media'
                ? 'bg-gradient-flixer text-white shadow-lg'
                : 'text-[#b2b1ad] hover:text-white hover:bg-[#242832]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4" />
              <span>Media Catalog</span>
            </div>
            <span className="text-[10px] bg-black/30 text-white px-1.5 py-0.2 rounded font-bold">
              {moviesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tmdb')}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'tmdb'
                ? 'bg-gradient-flixer text-white shadow-lg'
                : 'text-[#b2b1ad] hover:text-white hover:bg-[#242832]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>TMDB Importer</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-flixer text-white shadow-lg'
                : 'text-[#b2b1ad] hover:text-white hover:bg-[#242832]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Users & Roles</span>
            </div>
            <span className="text-[10px] bg-black/30 text-white px-1.5 py-0.2 rounded font-bold">
              {usersList.length}
            </span>
          </button>

          <div className="pt-4 mt-4 border-t border-[#2e3442]">
            <button
              onClick={() => navigateTo('home')}
              className="w-full text-left px-3.5 py-2 rounded-xl text-xs text-[#b2b1ad] hover:text-white hover:bg-[#242832] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#4f83d3]" />
              <span>Back to Public Site</span>
            </button>
          </div>
        </aside>

        {/* Right Admin Main Workspace */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <DashboardOverviewTab
              movies={moviesList}
              themeOptions={themeOptions}
              users={usersList}
              onNavigateTab={(tab, subSec) => {
                setActiveTab(tab as any);
                if (subSec) setThemeOptionsSubSection(subSec);
              }}
              onClearCache={handleClearCache}
              isClearingCache={isPurgingCache}
            />
          )}

          {activeTab === 'theme-options' && (
            <ThemeOptionsTab
              initialOptions={themeOptions}
              movies={moviesList}
              initialSubSection={themeOptionsSubSection}
              onSave={async (opts) => {
                await updateThemeOptions(opts);
              }}
            />
          )}

          {activeTab === 'media' && (
            <MediaManagementTab
              movies={moviesList}
              onAddMovie={handleAddMovie}
              onUpdateMovie={handleUpdateMovie}
              onDeleteMovie={handleDeleteMovie}
              onPreviewMovie={(id) => navigateTo('watch', id)}
            />
          )}

          {activeTab === 'tmdb' && (
            <TmdbImporterTab
              apiKey={themeOptions.tmdb.apiKey}
              existingMovies={moviesList}
              onImportSuccess={(newMovie) => {
                setMoviesList(prev => prev.some(movie => movie.id === newMovie.id)
                  ? prev.map(movie => movie.id === newMovie.id ? newMovie : movie)
                  : [newMovie, ...prev]);
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementTab
              users={usersList}
              generalSettings={themeOptions.general}
              onUpdateGeneralSettings={async (gen) => {
                await updateThemeOptions({
                  general: { ...themeOptions.general, ...gen }
                });
              }}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </main>
      </div>

    </div>
  );
};
