import React from 'react';
import { Film, Tv, Eye, Server, RefreshCw, Sparkles, TrendingUp, ShieldCheck, Database, HardDrive } from 'lucide-react';
import { Movie } from '../../types/movie';
import { ThemeOptionsConfig, AdminUser } from '../../types/admin';

interface DashboardOverviewTabProps {
  movies: Movie[];
  themeOptions: ThemeOptionsConfig;
  users: AdminUser[];
  onNavigateTab: (tab: string, subSection?: string) => void;
  onClearCache: () => void;
  isClearingCache: boolean;
}

export const DashboardOverviewTab: React.FC<DashboardOverviewTabProps> = ({
  movies,
  themeOptions,
  users,
  onNavigateTab,
  onClearCache,
  isClearingCache
}) => {
  const totalMovies = movies.filter(m => m.type === 'movie').length;
  const totalTv = movies.filter(m => m.type === 'tv').length;
  const totalViews = movies.reduce((acc, m) => acc + (m.viewsCount || 0), 0);
  const activeServers = themeOptions.streamingServers.filter(s => s.enabled).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#242832] via-[#292d38] to-[#1e2129] border border-[#3e4555] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#db6937]/20 text-[#db6937] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Administration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome to {themeOptions.general.siteName} Control Center
          </h2>
          <p className="text-xs sm:text-sm text-[#b2b1ad] leading-relaxed">
            Manage site settings, homepage layout, streaming servers, the media catalog, TMDB imports, and user access from one centralized dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onClearCache}
            disabled={isClearingCache}
            className="px-4 py-2.5 rounded-xl bg-[#1a1c23] hover:bg-[#343b4a] border border-[#3e4555] text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4f83d3] ${isClearingCache ? 'animate-spin' : ''}`} />
            <span>{isClearingCache ? 'Purging Cache...' : 'Purge Cache'}</span>
          </button>
          <button
            onClick={() => onNavigateTab('theme-options', 'homepage')}
            className="px-5 py-2.5 rounded-xl bg-gradient-flixer hover:opacity-95 text-xs font-semibold text-white shadow-lg transition-all cursor-pointer"
          >
            Configure Homepage
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#242832] border border-[#2e3442] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-[#b2b1ad] font-medium uppercase tracking-wider">Movies in Database</div>
            <div className="text-2xl font-bold text-white mt-1">{totalMovies}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Full HD / 4K Titles</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#db6937]/15 text-[#db6937] flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#242832] border border-[#2e3442] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-[#b2b1ad] font-medium uppercase tracking-wider">TV Series Shows</div>
            <div className="text-2xl font-bold text-white mt-1">{totalTv}</div>
            <div className="text-[11px] text-[#4f83d3] mt-1">Multi-Season Supported</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#4f83d3]/15 text-[#4f83d3] flex items-center justify-center">
            <Tv className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#242832] border border-[#2e3442] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-[#b2b1ad] font-medium uppercase tracking-wider">Streaming Servers</div>
            <div className="text-2xl font-bold text-white mt-1">{activeServers} Configured</div>
            <div className="text-[11px] text-amber-400 mt-1">Enabled playback sources</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#242832] border border-[#2e3442] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-[#b2b1ad] font-medium uppercase tracking-wider">Total Stream Views</div>
            <div className="text-2xl font-bold text-white mt-1">{totalViews.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-400 mt-1">Recorded catalog views</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Eye className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* System Status & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System & DB Diagnostics */}
        <div className="bg-[#242832] border border-[#2e3442] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1a1c23]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#db6937]" />
              <span>System & Storage Diagnostics</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
              PostgreSQL
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-[#1e2129] text-[#b2b1ad]">
              <span>Storage Driver</span>
              <span className="text-white font-mono">PostgreSQL / JSONB Schema</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1e2129] text-[#b2b1ad]">
              <span>Maintenance Mode</span>
              <span className={themeOptions.general.maintenanceMode ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {themeOptions.general.maintenanceMode ? 'Active (Restricted)' : 'Disabled (Public)'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1e2129] text-[#b2b1ad]">
              <span>New Registrations</span>
              <span className={themeOptions.general.registrationEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                {themeOptions.general.registrationEnabled ? 'Open to Public' : 'Closed / Invite Only'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1e2129] text-[#b2b1ad]">
              <span>Guest Streaming</span>
              <span className={themeOptions.general.guestBrowsingEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                {themeOptions.general.guestBrowsingEnabled ? 'Enabled' : 'Sign-In Required'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[#b2b1ad]">
              <span>TMDB Synchronization</span>
              <span className={themeOptions.tmdb.autoSync ? 'text-emerald-400' : 'text-[#b2b1ad]'}>
                {themeOptions.tmdb.autoSync ? 'Auto-Sync Active' : 'Manual Ingestion'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="lg:col-span-2 bg-[#242832] border border-[#2e3442] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1a1c23]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#4f83d3]" />
              <span>Theme Admin Shortcuts</span>
            </h3>
              <span className="text-xs text-[#b2b1ad]">Site controls</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => onNavigateTab('media')}
              className="p-3.5 rounded-xl bg-[#1a1c23] hover:bg-[#2e3442] border border-[#343b4a] text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-white group-hover:text-[#db6937] transition-colors flex items-center justify-between">
                <span>Manage Movies & TV</span>
                <Film className="w-4 h-4 text-[#db6937]" />
              </div>
              <p className="text-[11px] text-[#b2b1ad] mt-1">
                View, filter, edit video sources, or add new media titles to catalog.
              </p>
            </button>

            <button
              onClick={() => onNavigateTab('tmdb')}
              className="p-3.5 rounded-xl bg-[#1a1c23] hover:bg-[#2e3442] border border-[#343b4a] text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-white group-hover:text-[#4f83d3] transition-colors flex items-center justify-between">
                <span>TMDB Metadata Importer</span>
                <Sparkles className="w-4 h-4 text-[#4f83d3]" />
              </div>
              <p className="text-[11px] text-[#b2b1ad] mt-1">
                Search TMDB database and import posters, cast, crew, and synopsis in 1-click.
              </p>
            </button>

            <button
              onClick={() => onNavigateTab('theme-options', 'servers')}
              className="p-3.5 rounded-xl bg-[#1a1c23] hover:bg-[#2e3442] border border-[#343b4a] text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                <span>Streaming Server Manager</span>
                <Server className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-[#b2b1ad] mt-1">
                Configure embed URLs for media hosted by a server you own or are authorized to use.
              </p>
            </button>

            <button
              onClick={() => onNavigateTab('users')}
              className="p-3.5 rounded-xl bg-[#1a1c23] hover:bg-[#2e3442] border border-[#343b4a] text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                <span>User Roles & Permissions</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-[#b2b1ad] mt-1">
                Review registered accounts, grant Administrator/Editor roles, or block users.
              </p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
