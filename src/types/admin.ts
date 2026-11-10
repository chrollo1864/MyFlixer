export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteLogo: string;
  siteFavicon: string;
  siteUrl: string;
  defaultLanguage: string;
  timezone: string;
  defaultThemeMode: 'dark' | 'light';
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  guestBrowsingEnabled: boolean;
}

export interface HomepageSectionItem {
  id: string;
  key: string;
  title: string;
  enabled: boolean;
  itemsCount: number;
  displayOrder: number;
  movieIds?: string[];
}

export interface MovieTvSettings {
  enableMovies: boolean;
  enableTvSeries: boolean;
  defaultMovieSort: 'updated' | 'views' | 'rating' | 'title';
  defaultTvSort: 'updated' | 'views' | 'rating' | 'title';
  moviesPerPage: number;
  tvPerPage: number;
  displayRating: boolean;
  displayYear: boolean;
  displayRuntime: boolean;
  displayGenres: boolean;
  displayQuality: boolean;
}

export interface PlayerSettings {
  defaultPlayer: string;
  defaultServerId: string;
  playerAspectRatio: string;
  autoplay: boolean;
  enableFullscreen: boolean;
  enableSubtitles: boolean;
  displayServerSelection: boolean;
  displayErrorMessages: boolean;
  enableResumePlayback: boolean;
}

export interface StreamingServerConfig {
  id: string;
  name: string;
  serverType: 'embed' | 'custom';
  embedTemplate: string;
  tvEmbedTemplate?: string;
  quality: string;
  priority: number;
  enabled: boolean;
  isDefault: boolean;
  iframeSandboxEnabled?: boolean;
}

export interface TmdbSettings {
  apiKey: string;
  autoSync: boolean;
  cacheExpirationHours: number;
  defaultImageSize: 'original' | 'w1280' | 'w780' | 'w500';
  importCast: boolean;
  importTrailers: boolean;
  defaultQuality: 'HD' | '4K' | 'CAM';
}

export interface AppearanceSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerBg: string;
  cardBg: string;
  borderRadius: string;
  themeMode: 'dark' | 'light';
}

export interface HeaderFooterSettings {
  showSearch: boolean;
  showLoginButton: boolean;
  footerDescription: string;
  copyrightText: string;
  disclaimerText: string;
  socialLinks: {
    twitter: string;
    telegram: string;
    discord: string;
  };
  customLinks?: { label: string; url: string }[];
}

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
  sitemapEnabled: boolean;
  robotsIndexing: boolean;
}

export interface AdsSettings {
  headerAdEnabled: boolean;
  headerAdHtml: string;
  sidebarAdEnabled: boolean;
  sidebarAdHtml: string;
  playerAdEnabled: boolean;
  playerAdHtml: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  role: 'Administrator' | 'Editor' | 'Subscriber';
  status: 'active' | 'suspended';
  lastLogin: string;
  avatar: string;
}

export interface ThemeOptionsConfig {
  general: GeneralSettings;
  homepageSections: HomepageSectionItem[];
  movieTv: MovieTvSettings;
  player: PlayerSettings;
  streamingServers: StreamingServerConfig[];
  tmdb: TmdbSettings;
  appearance: AppearanceSettings;
  headerFooter: HeaderFooterSettings;
  seo: SeoSettings;
  ads: AdsSettings;
}
