import React, { useState } from 'react';
import { 
  Sliders, 
  Layout, 
  Film, 
  Tv, 
  PlaySquare, 
  Server, 
  Sparkles, 
  Palette, 
  PanelTop, 
  Search, 
  Megaphone, 
  Save, 
  RotateCcw, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2,
  Lock,
  Globe,
  HelpCircle,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { ThemeOptionsConfig, HomepageSectionItem, StreamingServerConfig } from '../../types/admin';
import { Movie } from '../../types/movie';
import { DEFAULT_THEME_OPTIONS } from '../../services/adminDefaults';

interface ThemeOptionsTabProps {
  initialOptions: ThemeOptionsConfig;
  movies: Movie[];
  onSave: (options: ThemeOptionsConfig) => Promise<void>;
  initialSubSection?: string;
}

export const ThemeOptionsTab: React.FC<ThemeOptionsTabProps> = ({
  initialOptions,
  movies,
  onSave,
  initialSubSection = 'general'
}) => {
  const [activeSubSection, setActiveSubSection] = useState<string>(initialSubSection);
  const [options, setOptions] = useState<ThemeOptionsConfig>(initialOptions);
  const [openContentPicker, setOpenContentPicker] = useState<string | null>(null);
  const [contentSearch, setContentSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sub-section sidebar tabs definition
  const subSections = [
    { id: 'general', label: '1. General Settings', icon: Sliders },
    { id: 'homepage', label: '2. Homepage Sections', icon: Layout },
    { id: 'movietv', label: '3. Movie & TV Settings', icon: Film },
    { id: 'player', label: '4. Player Settings', icon: PlaySquare },
    { id: 'servers', label: '5. Streaming Servers', icon: Server },
    { id: 'tmdb', label: '6. TMDB Integration', icon: Sparkles },
    { id: 'appearance', label: '7. Appearance & Colors', icon: Palette },
    { id: 'headerfooter', label: '8. Header & Footer', icon: PanelTop },
    { id: 'seo', label: '9. SEO & Social Cards', icon: Globe },
    { id: 'ads', label: '10. Advertisement Placements', icon: Megaphone },
    { id: 'advanced', label: '11. Backup & Maintenance', icon: Lock }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(options);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSection = () => {
    if (confirm(`Reset ${activeSubSection} settings back to theme defaults?`)) {
      setOptions(prev => ({
        ...prev,
        [activeSubSection]: (DEFAULT_THEME_OPTIONS as any)[activeSubSection]
      }));
    }
  };

  // Reorder homepage section
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const list = [...options.homepageSections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    // update displayOrder
    list.forEach((item, idx) => { item.displayOrder = idx + 1; });
    setOptions(prev => ({ ...prev, homepageSections: list }));
  };

  const handleSectionMovieToggle = (sectionId: string, movieId: string, selected: boolean) => {
    setOptions(prev => ({
      ...prev,
      homepageSections: prev.homepageSections.map(section => {
        if (section.id !== sectionId) return section;
        const movieIds = section.movieIds || [];
        return {
          ...section,
          movieIds: selected
            ? movieIds.includes(movieId) ? movieIds : [...movieIds, movieId]
            : movieIds.filter(id => id !== movieId)
        };
      })
    }));
  };

  const getPickerMediaType = (sectionKey: string): Movie['type'] | undefined => {
    if (sectionKey === 'latestMovies') return 'movie';
    if (sectionKey === 'trending') return 'tv';
    return undefined;
  };

  // Streaming server management
  const handleAddServer = () => {
    const newServer: StreamingServerConfig = {
      id: `srv-${Date.now()}`,
      name: `Custom Server ${options.streamingServers.length + 1}`,
      serverType: 'custom',
      embedTemplate: 'https://your-media-server.example/embed/movie/{id}',
      tvEmbedTemplate: 'https://your-media-server.example/embed/tv/{id}/{season}/{ep}',
      quality: '1080p HD',
      priority: options.streamingServers.length + 1,
      enabled: true,
      isDefault: false,
      iframeSandboxEnabled: false
    };
    setOptions(prev => ({
      ...prev,
      streamingServers: [...prev.streamingServers, newServer]
    }));
  };

  const handleRemoveServer = (id: string) => {
    if (options.streamingServers.length <= 1) {
      alert('At least one streaming server must be configured.');
      return;
    }
    const remainingServers = options.streamingServers.filter(server => server.id !== id);
    const nextDefault = remainingServers.find(server => server.enabled) || remainingServers[0];
    setOptions(prev => ({
      ...prev,
      streamingServers: prev.streamingServers.filter(server => server.id !== id),
      player: prev.player.defaultServerId === id
        ? { ...prev.player, defaultServerId: nextDefault.id }
        : prev.player
    }));
  };

  return (
    <div className="bg-[#242832] border border-[#2e3442] rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[750px]">
      
      {/* 1. Theme Options Left Navigation Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#1e2129] border-r border-[#242832] p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="px-3 py-2 mb-3 border-b border-[#2e3442]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#b2b1ad]">
              Site Configuration
            </span>
          </div>

          <nav className="space-y-1">
            {subSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSubSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSubSection(sec.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-flixer text-white shadow-md'
                      : 'text-[#b2b1ad] hover:text-white hover:bg-[#242832]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Action Buttons in Sidebar */}
        <div className="pt-4 border-t border-[#2e3442] space-y-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-flixer hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Changes...' : savedSuccess ? 'Settings Saved!' : 'Save Changes'}</span>
          </button>

          <button
            onClick={handleResetSection}
            className="w-full py-2 px-3 rounded-xl bg-[#242832] hover:bg-[#292d38] text-[#b2b1ad] hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Section</span>
          </button>
        </div>
      </aside>

      {/* 2. Theme Options Main Workspace */}
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-h-[850px] space-y-6">
        
        {/* Workspace Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#2e3442]">
          <div>
            <h3 className="text-xl font-bold text-white capitalize">
              {subSections.find(s => s.id === activeSubSection)?.label}
            </h3>
            <p className="text-xs text-[#b2b1ad] mt-0.5">
              Settings persist in PostgreSQL and immediately update the public streaming site.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-gradient-flixer text-white text-xs font-semibold shadow hover:opacity-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* ---------------- 1. GENERAL SETTINGS ---------------- */}
        {activeSubSection === 'general' && (
          <div className="space-y-5 text-xs text-[#e9ecef]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-white">Website Name</label>
                <input
                  type="text"
                  value={options.general.siteName}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, siteName: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4f83d3]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white">Website URL</label>
                <input
                  type="text"
                  value={options.general.siteUrl}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, siteUrl: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4f83d3]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="font-semibold text-white">Website Tagline / Description</label>
                <input
                  type="text"
                  value={options.general.siteDescription}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, siteDescription: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4f83d3]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white">Default Language</label>
                <select
                  value={options.general.defaultLanguage}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, defaultLanguage: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4f83d3]"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="Spanish (ES)">Spanish (ES)</option>
                  <option value="French (FR)">French (FR)</option>
                  <option value="German (DE)">German (DE)</option>
                  <option value="Japanese (JA)">Japanese (JA)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white">Timezone</label>
                <select
                  value={options.general.timezone}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, timezone: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4f83d3]"
                >
                  <option value="UTC">UTC (Universal)</option>
                  <option value="America/New_York">America / New York (EST)</option>
                  <option value="America/Los_Angeles">America / Los Angeles (PST)</option>
                  <option value="Europe/London">Europe / London (GMT)</option>
                  <option value="Asia/Tokyo">Asia / Tokyo (JST)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-[#2e3442] pt-4 space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Access & Governance</h4>
              
              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1a1c23] border border-[#343b4a]">
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Maintenance Mode</span>
                    {options.general.maintenanceMode && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#b2b1ad] mt-0.5">
                    When active, public visitors will see a maintenance notice while logged-in administrators maintain full access.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={options.general.maintenanceMode}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, maintenanceMode: e.target.checked }
                  }))}
                  className="w-5 h-5 accent-[#db6937] rounded cursor-pointer"
                />
              </div>

              {/* Registration Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1a1c23] border border-[#343b4a]">
                <div>
                  <div className="font-semibold text-white">Enable User Registration</div>
                  <p className="text-[11px] text-[#b2b1ad] mt-0.5">
                    Allow new guests to create personal accounts, save watchlists, and leave movie comments.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={options.general.registrationEnabled}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, registrationEnabled: e.target.checked }
                  }))}
                  className="w-5 h-5 accent-[#db6937] rounded cursor-pointer"
                />
              </div>

              {/* Guest Browsing Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1a1c23] border border-[#343b4a]">
                <div>
                  <div className="font-semibold text-white">Allow Guest Browsing</div>
                  <p className="text-[11px] text-[#b2b1ad] mt-0.5">
                    If disabled, users must sign in or register before they can stream videos or browse catalog items.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={options.general.guestBrowsingEnabled}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    general: { ...prev.general, guestBrowsingEnabled: e.target.checked }
                  }))}
                  className="w-5 h-5 accent-[#db6937] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. HOMEPAGE SECTIONS ---------------- */}
        {activeSubSection === 'homepage' && (
          <div className="space-y-4 text-xs">
            <p className="text-[#b2b1ad]">
              Reorder, rename, or toggle homepage sections, and choose titles for content sections. Leave a selection empty to keep that section automatically populated.
            </p>

            <div className="space-y-2.5">
              {options.homepageSections.map((sec, idx) => (
                <div key={sec.id} className="space-y-2">
                  <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(idx, 'up')}
                          className="p-1 rounded bg-[#242832] hover:bg-[#343b4a] disabled:opacity-30 text-white"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === options.homepageSections.length - 1}
                          onClick={() => handleMoveSection(idx, 'down')}
                          className="p-1 rounded bg-[#242832] hover:bg-[#343b4a] disabled:opacity-30 text-white"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{sec.title}</span>
                          <span className="text-[10px] bg-[#242832] text-[#b2b1ad] px-1.5 py-0.5 rounded font-mono">
                            {sec.key}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#b2b1ad]">
                          Order #{sec.displayOrder} • {sec.itemsCount} items displayed
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#b2b1ad]">Items:</span>
                        <input
                          type="number"
                          min="2"
                          max="30"
                          value={sec.itemsCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 5;
                            const list = [...options.homepageSections];
                            list[idx].itemsCount = val;
                            setOptions(prev => ({ ...prev, homepageSections: list }));
                          }}
                          className="w-14 bg-[#242832] border border-[#3e4555] rounded-lg px-2 py-1 text-center text-white"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[11px] text-[#b2b1ad]">
                          {sec.enabled ? 'Enabled' : 'Hidden'}
                        </span>
                        <input
                          type="checkbox"
                          checked={sec.enabled}
                          onChange={(e) => {
                            const list = [...options.homepageSections];
                            list[idx].enabled = e.target.checked;
                            setOptions(prev => ({ ...prev, homepageSections: list }));
                          }}
                          className="w-5 h-5 accent-[#db6937] rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {sec.key === 'a2z' ? (
                    <p className="px-4 text-[11px] text-[#8f96a3]">This directory section is generated from the catalog and does not use a title list.</p>
                  ) : (
                    <div className="px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenContentPicker(openContentPicker === sec.id ? null : sec.id);
                          setContentSearch('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#242832] hover:bg-[#343b4a] px-3 py-1.5 text-[11px] font-semibold text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {sec.movieIds?.length ? `Manage titles (${sec.movieIds.length} selected)` : 'Choose titles'}
                      </button>

                      {openContentPicker === sec.id && (
                        <div className="mt-2 rounded-xl border border-[#343b4a] bg-[#1a1c23] p-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] text-[#b2b1ad]">
                              Selected titles replace automatic content and display in the order selected. Clear the selection to restore automatic content.
                            </p>
                            {!!sec.movieIds?.length && (
                              <button
                                type="button"
                                onClick={() => setOptions(prev => ({
                                  ...prev,
                                  homepageSections: prev.homepageSections.map(section =>
                                    section.id === sec.id ? { ...section, movieIds: [] } : section
                                  )
                                }))}
                                className="text-[11px] text-rose-300 hover:text-rose-200"
                              >
                                Clear selection
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8f96a3]" />
                            <input
                              type="search"
                              value={contentSearch}
                              onChange={e => setContentSearch(e.target.value)}
                              placeholder="Search catalog titles..."
                              className="w-full rounded-lg border border-[#3e4555] bg-[#242832] py-2 pl-9 pr-3 text-xs text-white placeholder:text-[#8f96a3] focus:outline-none focus:border-[#4f83d3]"
                            />
                          </div>
                          <div className="max-h-56 overflow-y-auto divide-y divide-[#2e3442]">
                            {movies
                              .filter(movie => {
                                const mediaType = getPickerMediaType(sec.key);
                                const matchesType = !mediaType || movie.type === mediaType;
                                const matchesSearch = movie.title.toLowerCase().includes(contentSearch.trim().toLowerCase());
                                return matchesType && matchesSearch;
                              })
                              .map(movie => (
                                <label key={movie.id} className="flex items-center gap-2.5 py-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={sec.movieIds?.includes(movie.id) || false}
                                    onChange={e => handleSectionMovieToggle(sec.id, movie.id, e.target.checked)}
                                    className="w-4 h-4 accent-[#db6937] rounded"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-xs text-white">{movie.title}</span>
                                  <span className="text-[10px] text-[#8f96a3]">{movie.type === 'tv' ? 'TV' : 'Movie'} · {movie.year}</span>
                                </label>
                              ))}
                            {!movies.some(movie => {
                              const mediaType = getPickerMediaType(sec.key);
                              return (!mediaType || movie.type === mediaType)
                                && movie.title.toLowerCase().includes(contentSearch.trim().toLowerCase());
                            }) && (
                              <p className="py-4 text-center text-[11px] text-[#8f96a3]">
                                {movies.length ? 'No matching catalog titles.' : 'Add titles in Media Management first.'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- 3. MOVIE & TV SETTINGS ---------------- */}
        {activeSubSection === 'movietv' && (
          <div className="space-y-5 text-xs text-[#e9ecef]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#db6937]" />
                  <span>Movie Configuration</span>
                </h4>
                
                <div className="flex items-center justify-between">
                  <span>Enable Movies Section</span>
                  <input
                    type="checkbox"
                    checked={options.movieTv.enableMovies}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      movieTv: { ...prev.movieTv, enableMovies: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#b2b1ad]">Default Movie Sort</label>
                  <select
                    value={options.movieTv.defaultMovieSort}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      movieTv: { ...prev.movieTv, defaultMovieSort: e.target.value as any }
                    }))}
                    className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white"
                  >
                    <option value="updated">Latest Updated</option>
                    <option value="views">Most Viewed</option>
                    <option value="rating">Top Rated (IMDb)</option>
                    <option value="title">Alphabetical (A-Z)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#b2b1ad]">Movies Per Browse Page</label>
                  <input
                    type="number"
                    value={options.movieTv.moviesPerPage}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      movieTv: { ...prev.movieTv, moviesPerPage: parseInt(e.target.value, 10) || 14 }
                    }))}
                    className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#4f83d3]" />
                  <span>TV Series Configuration</span>
                </h4>

                <div className="flex items-center justify-between">
                  <span>Enable TV Series Section</span>
                  <input
                    type="checkbox"
                    checked={options.movieTv.enableTvSeries}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      movieTv: { ...prev.movieTv, enableTvSeries: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#b2b1ad]">Default TV Series Sort</label>
                  <select
                    value={options.movieTv.defaultTvSort}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      movieTv: { ...prev.movieTv, defaultTvSort: e.target.value as any }
                    }))}
                    className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white"
                  >
                    <option value="updated">Latest Episodes</option>
                    <option value="views">Trending / Views</option>
                    <option value="rating">Top Rated</option>
                    <option value="title">Alphabetical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#b2b1ad]">TV Shows Per Browse Page</label>
                  <input
                    type="number"
                    value={options.movieTv.tvPerPage}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      movieTv: { ...prev.movieTv, tvPerPage: parseInt(e.target.value, 10) || 14 }
                    }))}
                    className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-2">
              <h4 className="font-bold text-white mb-2">Card Metadata Display Toggles</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'displayRating', label: 'Star Rating' },
                  { key: 'displayYear', label: 'Release Year' },
                  { key: 'displayRuntime', label: 'Duration / Runtime' },
                  { key: 'displayGenres', label: 'Genre Tags' },
                  { key: 'displayQuality', label: 'Quality Badges (HD/4K)' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(options.movieTv as any)[item.key]}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        movieTv: { ...prev.movieTv, [item.key]: e.target.checked }
                      }))}
                      className="w-4 h-4 accent-[#db6937]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 4. PLAYER SETTINGS ---------------- */}
        {activeSubSection === 'player' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-white">Default Video Player Engine</label>
                <select
                  value={options.player.defaultPlayer}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    player: { ...prev.player, defaultPlayer: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                >
                  <option value="Standard Responsive Player">Standard Responsive Player (HTML5/Iframe)</option>
                  <option value="HLS Multi-Bitrate Engine">HLS Multi-Bitrate Engine</option>
                  <option value="Cinema Theater Player">Cinema Theater Player</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white">Player Aspect Ratio</label>
                <select
                  value={options.player.playerAspectRatio}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    player: { ...prev.player, playerAspectRatio: e.target.value }
                  }))}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                >
                  <option value="16:9">16:9 (Standard Widescreen HD)</option>
                  <option value="21:9">21:9 (Cinematic UltraWide)</option>
                  <option value="4:3">4:3 (Classic Academy)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Playback Features</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-2 rounded-xl bg-[#242832] cursor-pointer">
                  <span>Resume Playback Memory</span>
                  <input
                    type="checkbox"
                    checked={options.player.enableResumePlayback}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      player: { ...prev.player, enableResumePlayback: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-[#242832] cursor-pointer">
                  <span>Server Selection Bar</span>
                  <input
                    type="checkbox"
                    checked={options.player.displayServerSelection}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      player: { ...prev.player, displayServerSelection: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-[#242832] cursor-pointer">
                  <span>Fullscreen Button Allowed</span>
                  <input
                    type="checkbox"
                    checked={options.player.enableFullscreen}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      player: { ...prev.player, enableFullscreen: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-[#242832] cursor-pointer">
                  <span>Autoplay Next Episode</span>
                  <input
                    type="checkbox"
                    checked={options.player.autoplay}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      player: { ...prev.player, autoplay: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 5. STREAMING SERVERS MANAGER ---------------- */}
        {activeSubSection === 'servers' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-[#b2b1ad]">
                Configure playback servers. Enabled servers appear in the player; the default is selected automatically.
              </p>
              <button
                onClick={handleAddServer}
                className="px-3 py-1.5 rounded-xl bg-[#4f83d3] hover:bg-[#db6937] text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Server</span>
              </button>
            </div>

            <div className="space-y-3">
              {options.streamingServers.map((srv, idx) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3 shadow"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{srv.name}</span>
                      <span className="text-[10px] bg-[#242832] text-amber-400 font-semibold px-2 py-0.5 rounded-md">
                        {srv.quality}
                      </span>
                      {srv.isDefault && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                          DEFAULT
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        srv.enabled
                          ? 'bg-sky-500/15 text-sky-300'
                          : 'bg-[#242832] text-[#858b98]'
                      }`}>
                        {srv.enabled ? 'VISIBLE IN PLAYER' : 'DISABLED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-pressed={srv.enabled}
                        onClick={() => {
                          const updated = options.streamingServers.map((server, i) => ({
                            ...server,
                            enabled: i === idx ? !server.enabled : server.enabled
                          }));
                          const nextEnabledDefault = updated.find(server => server.enabled && server.isDefault)
                            || updated.find(server => server.enabled);
                          if (nextEnabledDefault) {
                            updated.forEach(server => {
                              server.isDefault = server.id === nextEnabledDefault.id;
                            });
                          }
                          setOptions(prev => ({
                            ...prev,
                            streamingServers: updated,
                            player: nextEnabledDefault
                              ? { ...prev.player, defaultServerId: nextEnabledDefault.id }
                              : prev.player
                          }));
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                          srv.enabled
                            ? 'bg-sky-600/20 text-sky-300 border-sky-500/40'
                            : 'bg-[#242832] hover:bg-[#343b4a] text-[#b2b1ad] border-[#3e4555]'
                        }`}
                      >
                        {srv.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = options.streamingServers.map((s, i) => ({
                            ...s,
                            isDefault: i === idx
                          }));
                          setOptions(prev => ({
                            ...prev,
                            streamingServers: updated,
                            player: { ...prev.player, defaultServerId: srv.id }
                          }));
                        }}
                        disabled={!srv.enabled}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                          srv.isDefault
                            ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50' 
                            : 'bg-[#242832] hover:bg-[#343b4a] text-[#b2b1ad] border-[#3e4555]'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {srv.isDefault ? 'Current Default' : 'Set as Default'}
                      </button>

                      <button
                        onClick={() => handleRemoveServer(srv.id)}
                        className="text-rose-400 hover:text-white p-1 rounded hover:bg-rose-950/40"
                        title="Delete Server"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] text-[#b2b1ad]">Server Name</label>
                      <input
                        type="text"
                        value={srv.name}
                        onChange={(e) => {
                          const updated = [...options.streamingServers];
                          updated[idx].name = e.target.value;
                          setOptions(prev => ({ ...prev, streamingServers: updated }));
                        }}
                        className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[#b2b1ad]">Server Type</label>
                      <select
                        value={srv.serverType}
                        onChange={(e) => {
                          const updated = [...options.streamingServers];
                          updated[idx].serverType = e.target.value as any;
                          setOptions(prev => ({ ...prev, streamingServers: updated }));
                        }}
                        className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white text-xs mt-1"
                      >
                        <option value="embed">Embed / Iframe</option>
                        <option value="custom">Custom Endpoint</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#b2b1ad]">Stream Quality</label>
                      <input
                        type="text"
                        value={srv.quality}
                        onChange={(e) => {
                          const updated = [...options.streamingServers];
                          updated[idx].quality = e.target.value;
                          setOptions(prev => ({ ...prev, streamingServers: updated }));
                        }}
                        className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white text-xs mt-1"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-[#b2b1ad]">Embed URL / Stream Template</label>
                      <input
                        type="text"
                        value={srv.embedTemplate}
                        onChange={(e) => {
                          const updated = [...options.streamingServers];
                          updated[idx].embedTemplate = e.target.value;
                          setOptions(prev => ({ ...prev, streamingServers: updated }));
                        }}
                        className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white font-mono text-xs mt-1"
                      />
                      <p className="text-[10px] text-[#858b98] mt-1">
                        Use {`{id}`} or {`{tmdb_id}`} for the movie ID.
                      </p>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-[#b2b1ad]">TV Episode URL Template</label>
                      <input
                        type="text"
                        value={srv.tvEmbedTemplate || ''}
                        onChange={(e) => {
                          const updated = [...options.streamingServers];
                          updated[idx].tvEmbedTemplate = e.target.value;
                          setOptions(prev => ({ ...prev, streamingServers: updated }));
                        }}
                        placeholder="https://your-media-server.example/embed/tv/{id}/{season}/{ep}"
                        className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white font-mono text-xs mt-1"
                      />
                      <p className="text-[10px] text-[#858b98] mt-1">
                        Supports {`{id}`} or {`{tmdb_id}`}, plus {`{season}`} or {`{s}`} and {`{episode}`}, {`{ep}`}, or {`{e}`} in the path or query string.
                      </p>
                    </div>

                    <div className={`sm:col-span-3 flex items-center justify-between gap-4 rounded-xl border p-3 transition-colors ${
                      srv.iframeSandboxEnabled
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-[#343b4a] bg-[#242832]'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">Block pop-up &amp; pop-under ads</span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            srv.iframeSandboxEnabled
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-[#343b4a] text-[#a0a6b2]'
                          }`}>
                            {srv.iframeSandboxEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                        <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#858b98]">
                          Keeps the stream URL unchanged and blocks the player from opening popups or redirecting the page. Ads displayed inside the player itself cannot be removed by the browser sandbox.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={srv.iframeSandboxEnabled === true}
                        aria-label={`Block pop-up and pop-under ads for ${srv.name}`}
                        onClick={() => {
                          const updated = [...options.streamingServers];
                          updated[idx].iframeSandboxEnabled = !srv.iframeSandboxEnabled;
                          setOptions(prev => ({ ...prev, streamingServers: updated }));
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f83d3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242832] ${
                          srv.iframeSandboxEnabled
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-[#535b6b] bg-[#343b4a]'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          srv.iframeSandboxEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- 6. TMDB SETTINGS ---------------- */}
        {activeSubSection === 'tmdb' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#db6937]" />
                <span>TheMovieDatabase (TMDB) API Configuration</span>
              </h4>
              <p className="text-[11px] text-[#b2b1ad]">
                Providing your TMDB API v3 read token enables live multi-search and automatic sync of cast, crew, high-res posters, and backdrops.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-white">TMDB API Key (v3 auth)</label>
                <input
                  type="password"
                  value={options.tmdb.apiKey}
                  placeholder="Enter TMDB 32-character API key..."
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    tmdb: { ...prev.tmdb, apiKey: e.target.value }
                  }))}
                  className="w-full bg-[#242832] border border-[#3e4555] rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-[#b2b1ad]">Default Image Poster Resolution</label>
                  <select
                    value={options.tmdb.defaultImageSize}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      tmdb: { ...prev.tmdb, defaultImageSize: e.target.value as any }
                    }))}
                    className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white mt-1"
                  >
                    <option value="original">Original (Full Ultra HD)</option>
                    <option value="w1280">w1280 (High Resolution)</option>
                    <option value="w780">w780 (Standard HD - Recommended)</option>
                    <option value="w500">w500 (Mobile Optimized)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#b2b1ad]">Metadata Cache Expiration</label>
                  <select
                    value={options.tmdb.cacheExpirationHours}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      tmdb: { ...prev.tmdb, cacheExpirationHours: parseInt(e.target.value, 10) || 24 }
                    }))}
                    className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2 text-white mt-1"
                  >
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours (Daily Refresh)</option>
                    <option value="72">72 Hours</option>
                    <option value="168">7 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.tmdb.autoSync}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      tmdb: { ...prev.tmdb, autoSync: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                  <span>Enable Daily Automatic Metadata Sync</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.tmdb.importCast}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      tmdb: { ...prev.tmdb, importCast: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                  <span>Import Actor & Director Credits</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 7. APPEARANCE SETTINGS ---------------- */}
        {activeSubSection === 'appearance' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 p-3 rounded-2xl bg-[#1a1c23] border border-[#343b4a]">
                <label className="font-semibold text-white">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={options.appearance.primaryColor}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, primaryColor: e.target.value }
                    }))}
                    className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={options.appearance.primaryColor}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, primaryColor: e.target.value }
                    }))}
                    className="flex-1 bg-[#242832] border border-[#3e4555] rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-2xl bg-[#1a1c23] border border-[#343b4a]">
                <label className="font-semibold text-white">Secondary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={options.appearance.secondaryColor}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, secondaryColor: e.target.value }
                    }))}
                    className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={options.appearance.secondaryColor}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, secondaryColor: e.target.value }
                    }))}
                    className="flex-1 bg-[#242832] border border-[#3e4555] rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-2xl bg-[#1a1c23] border border-[#343b4a]">
                <label className="font-semibold text-white">Card & Element Radius</label>
                <select
                  value={options.appearance.borderRadius}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    appearance: { ...prev.appearance, borderRadius: e.target.value }
                  }))}
                  className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2.5 text-white"
                >
                  <option value="1.25rem">Modern Rounded (1.25rem - Default)</option>
                  <option value="0.75rem">Subtle Rounded (0.75rem)</option>
                  <option value="0.25rem">Sharp / Classic (0.25rem)</option>
                  <option value="1.75rem">Ultra Rounded (1.75rem)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 8. HEADER & FOOTER ---------------- */}
        {activeSubSection === 'headerfooter' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <h4 className="font-bold text-white text-sm">Header Components</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.headerFooter.showSearch}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      headerFooter: { ...prev.headerFooter, showSearch: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                  <span>Show Centered Search Bar</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.headerFooter.showLoginButton}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      headerFooter: { ...prev.headerFooter, showLoginButton: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#db6937]"
                  />
                  <span>Show Login / Profile Button</span>
                </label>

              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <h4 className="font-bold text-white text-sm">Footer Content & Disclaimer</h4>
              
              <div className="space-y-1">
                <label className="text-[11px] text-[#b2b1ad]">Footer About Text</label>
                <textarea
                  rows={2}
                  value={options.headerFooter.footerDescription}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    headerFooter: { ...prev.headerFooter, footerDescription: e.target.value }
                  }))}
                  className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#b2b1ad]">Copyright Notice</label>
                <p className="text-[10px] text-[#8b909b]">Use {'{year}'} to show the current year automatically.</p>
                <input
                  type="text"
                  value={options.headerFooter.copyrightText}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    headerFooter: { ...prev.headerFooter, copyrightText: e.target.value }
                  }))}
                  className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#b2b1ad]">Legal DMCA Disclaimer</label>
                <textarea
                  rows={2}
                  value={options.headerFooter.disclaimerText}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    headerFooter: { ...prev.headerFooter, disclaimerText: e.target.value }
                  }))}
                  className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 9. SEO & SOCIAL CARDS ---------------- */}
        {activeSubSection === 'seo' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <div className="space-y-1.5">
              <label className="font-semibold text-white">Default Meta Title</label>
              <input
                type="text"
                value={options.seo.metaTitle}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  seo: { ...prev.seo, metaTitle: e.target.value }
                }))}
                className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-white">Default Meta Description</label>
              <textarea
                rows={3}
                value={options.seo.metaDescription}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  seo: { ...prev.seo, metaDescription: e.target.value }
                }))}
                className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-white">Search Engine Keywords</label>
              <input
                type="text"
                value={options.seo.keywords}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  seo: { ...prev.seo, keywords: e.target.value }
                }))}
                className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-white">Open Graph Social Banner URL</label>
              <input
                type="text"
                value={options.seo.ogImage}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  seo: { ...prev.seo, ogImage: e.target.value }
                }))}
                className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* ---------------- 10. ADVERTISEMENT SETTINGS ---------------- */}
        {activeSubSection === 'ads' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <p className="text-[#b2b1ad]">
              Manage authorized banner placements on your streaming platform. Placements can be toggled on/off instantly.
            </p>

            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">Top Header Advertisement (728x90)</span>
                  <p className="text-[11px] text-[#b2b1ad]">Appears beneath the header banner on desktop viewports</p>
                </div>
                <input
                  type="checkbox"
                  checked={options.ads.headerAdEnabled}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    ads: { ...prev.ads, headerAdEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 accent-[#db6937]"
                />
              </div>
              <textarea
                rows={2}
                value={options.ads.headerAdHtml}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  ads: { ...prev.ads, headerAdHtml: e.target.value }
                }))}
                className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2.5 text-white font-mono text-[11px]"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">Sidebar Advertisement (300x250)</span>
                  <p className="text-[11px] text-[#b2b1ad]">Appears alongside Most Viewed widgets</p>
                </div>
                <input
                  type="checkbox"
                  checked={options.ads.sidebarAdEnabled}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    ads: { ...prev.ads, sidebarAdEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 accent-[#db6937]"
                />
              </div>
              <textarea
                rows={2}
                value={options.ads.sidebarAdHtml}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  ads: { ...prev.ads, sidebarAdHtml: e.target.value }
                }))}
                className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-2.5 text-white font-mono text-[11px]"
              />
            </div>
          </div>
        )}

        {/* ---------------- 11. ADVANCED & BACKUP ---------------- */}
        {activeSubSection === 'advanced' && (
          <div className="space-y-4 text-xs text-[#e9ecef]">
            <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] space-y-3">
              <h4 className="font-bold text-white text-sm">Theme Settings Backup & Export</h4>
              <p className="text-[11px] text-[#b2b1ad]">
                Download or copy your complete theme options configuration JSON file for safe disaster recovery or migrating between instances.
              </p>

              <textarea
                readOnly
                rows={8}
                value={JSON.stringify(options, null, 2)}
                className="w-full bg-[#242832] border border-[#3e4555] rounded-xl p-3 text-white font-mono text-[10px]"
              />

              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(options, null, 2));
                  alert('Theme options JSON copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-[#4f83d3] hover:bg-[#db6937] text-white font-semibold transition-colors cursor-pointer"
              >
                Copy Backup JSON
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
