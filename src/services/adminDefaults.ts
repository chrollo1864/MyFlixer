import { ThemeOptionsConfig } from '../types/admin';

export const DEFAULT_THEME_OPTIONS: ThemeOptionsConfig = {
  general: {
    siteName: 'MyFlixer',
    siteDescription: 'Browse the movie and television catalog.',
    siteLogo: '',
    siteFavicon: '',
    siteUrl: '',
    defaultLanguage: 'English (US)',
    timezone: 'UTC',
    defaultThemeMode: 'dark',
    maintenanceMode: false,
    registrationEnabled: false,
    guestBrowsingEnabled: true,
    subscriptionModeEnabled: false
  },
  homepageSections: [
    { id: 'sec-hero', key: 'hero', title: 'Featured Hero Banner', enabled: true, itemsCount: 5, displayOrder: 1 },
    { id: 'sec-recommended', key: 'recommended', title: 'Recommended Titles', enabled: true, itemsCount: 7, displayOrder: 2 },
    { id: 'sec-trending', key: 'trending', title: 'Trending Series', enabled: true, itemsCount: 14, displayOrder: 3 },
    { id: 'sec-latestMovies', key: 'latestMovies', title: 'Latest Movies', enabled: true, itemsCount: 14, displayOrder: 4 },
    { id: 'sec-a2z', key: 'a2z', title: 'A-Z Directory Navigation', enabled: true, itemsCount: 26, displayOrder: 5 },
    { id: 'sec-mostViewed', key: 'mostViewed', title: 'Sidebar Most Viewed', enabled: true, itemsCount: 8, displayOrder: 6 }
  ],
  movieTv: {
    enableMovies: true,
    enableTvSeries: true,
    defaultMovieSort: 'updated',
    defaultTvSort: 'views',
    moviesPerPage: 14,
    tvPerPage: 14,
    displayRating: true,
    displayYear: true,
    displayRuntime: true,
    displayGenres: true,
    displayQuality: true
  },
  player: {
    defaultPlayer: 'Standard Responsive Player',
    defaultServerId: 'custom-default',
    playerAspectRatio: '16:9',
    autoplay: false,
    enableFullscreen: true,
    enableSubtitles: true,
    displayServerSelection: true,
    displayErrorMessages: true,
    enableResumePlayback: true
  },
  streamingServers: [
    {
      id: 'custom-default',
      name: 'Licensed media server',
      serverType: 'custom',
      embedTemplate: 'https://your-media-server.example/embed/movie/{id}',
      tvEmbedTemplate: 'https://your-media-server.example/embed/tv/{id}/{season}/{ep}',
      quality: 'HD',
      priority: 1,
      enabled: true,
      isDefault: true,
      iframeSandboxEnabled: false
    }
  ],
  tmdb: {
    apiKey: '',
    autoSync: false,
    cacheExpirationHours: 24,
    defaultImageSize: 'w780',
    importCast: true,
    importTrailers: true,
    defaultQuality: 'HD'
  },
  appearance: {
    primaryColor: '#db6937',
    secondaryColor: '#4f83d3',
    accentColor: '#6366f1',
    headerBg: '#292d38',
    cardBg: '#242832',
    borderRadius: '1.25rem',
    themeMode: 'dark'
  },
  headerFooter: {
    showSearch: true,
    showLoginButton: true,
    footerDescription: 'Browse the movie and television catalog.',
    copyrightText: '© {year} MyFlixer. All rights reserved.',
    disclaimerText: 'This site does not store any files on our server, we only linked to the media which is hosted on 3rd party services.',
    socialLinks: {
      twitter: 'https://twitter.com',
      telegram: 'https://t.me',
      discord: 'https://discord.gg'
    }
  },
  seo: {
    metaTitle: 'MyFlixer - Movies & TV Catalog',
    metaDescription: 'Browse the movie and television catalog.',
    keywords: 'movies, television, series, catalog',
    ogImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    sitemapEnabled: true,
    robotsIndexing: true
  },
  ads: {
    headerAdEnabled: false,
    headerAdHtml: '<div class="p-3 bg-neutral-800 text-neutral-400 text-center text-xs rounded-xl">Authorized Header Banner Advertisement Placement (728x90)</div>',
    sidebarAdEnabled: false,
    sidebarAdHtml: '<div class="p-4 bg-neutral-800 text-neutral-400 text-center text-xs rounded-xl">Authorized Sidebar Advertisement Placement (300x250)</div>',
    playerAdEnabled: false,
    playerAdHtml: '<div class="p-2 bg-neutral-900 text-neutral-400 text-center text-xs rounded-lg">Pre-roll Banner Placement</div>'
  },
  subscriptionPayments: {
    gcashDisplayName: '',
    gcashAccountNumber: '',
    gcashQrImageUrl: '',
    mayaDisplayName: '',
    mayaAccountNumber: '',
    mayaQrImageUrl: ''
  }
};
