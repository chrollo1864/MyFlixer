export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  duration: string;
  thumbnail: string;
  overview?: string;
  videoUrl?: string;
  videoSources?: StreamingServer[];
}

export interface Season {
  id?: string;
  tmdbId?: string;
  seasonNumber: number;
  title: string;
  overview?: string;
  airDate?: string;
  posterUrl?: string;
  episodeCount?: number;
  episodes: Episode[];
}

export interface StreamingServer {
  id: string;
  name: string;
  quality: string;
  speed: string;
  embedUrl: string;
  sourceType?: 'direct' | 'hls' | 'dash' | 'embed' | 'hosted';
  isDefault?: boolean;
  isActive?: boolean;
  clearKeyId?: string;
  clearKey?: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  date: string;
  content: string;
  likes: number;
  replies?: Comment[];
}

export interface Movie {
  id: string;
  /** Original TMDB ID, retained even if the catalog uses a different local ID. */
  tmdbId?: string;
  metadataSource?: 'tmdb';
  title: string;
  slug: string;
  type: 'movie' | 'tv';
  year: number;
  duration: string;
  quality: 'HD' | '4K' | 'CAM' | 'SD';
  rating: number; // 0-10
  ratingCount: number;
  genres: string[];
  country: string;
  countries?: string[];
  director: string;
  cast: string[];
  production: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl?: string;
  videoSources: StreamingServer[];
  seasons?: Season[];
  viewsCount: number;
  isFeatured?: boolean;
  isRecommended?: boolean;
  isTrending?: boolean;
  tags: string[];
  releaseDate: string;
}

export interface FilterOptions {
  type: 'all' | 'movie' | 'tv';
  quality: 'all' | 'HD' | '4K' | 'CAM';
  genre: string;
  year: string;
  country: string;
  sort: 'updated' | 'views' | 'rating' | 'title';
  query?: string;
  a2z?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  displayName?: string;
  favorites: string[]; // movie IDs
  watchHistory: {
    movieId: string;
    progressPercent: number;
    lastWatched: string;
    season?: number;
    episode?: number;
  }[];
}

export interface UserAccount {
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  role: string;
}
