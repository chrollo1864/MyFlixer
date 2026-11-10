import { Movie, FilterOptions, Comment, UserAccount } from '../types/movie';
import { ThemeOptionsConfig, AdminUser } from '../types/admin';

class MovieApiService {
  private movies: Movie[] = [];
  private commentsStore: Record<string, Comment[]> = {};

  public async getCurrentUser(): Promise<UserAccount | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  }

  public async login(identifier: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign in failed.');
    return data.user;
  }

  public async register(username: string, email: string, password: string): Promise<{ requiresVerification: boolean; email: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Account creation failed.');
    return data;
  }

  public async verifyRegistration(email: string, code: string): Promise<UserAccount> {
    const res = await fetch('/api/auth/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not verify your email.');
    return data.user;
  }

  public async resendRegistrationCode(email: string): Promise<void> {
    const res = await fetch('/api/auth/register/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not resend verification code.');
  }

  public async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
  }

  public async getUserState(): Promise<{ favorites: string[]; watchHistory: any[] } | null> {
    const res = await fetch('/api/user/state');
    if (res.status === 401) return null;
    if (!res.ok) throw new Error('Could not load account data.');
    return await res.json();
  }

  public async saveUserState(favorites: string[], watchHistory: any[]) {
    const res = await fetch('/api/user/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites, watchHistory })
    });
    if (!res.ok) throw new Error('Could not save account data.');
  }

  public async updateProfile(payload: {
    displayName: string;
    username: string;
    email: string;
    avatar: string;
    currentPassword: string;
    newPassword?: string;
  }): Promise<UserAccount> {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update your profile.');
    return data.user;
  }

  public async getAllMovies(): Promise<Movie[]> {
    try {
      const res = await fetch('/api/movies');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.movies)) {
          this.movies = data.movies;
          return this.movies;
        }
      }
    } catch {
      // fallback to memory
    }
    return this.movies;
  }

  public async getFeaturedMovies(): Promise<Movie[]> {
    try {
      const res = await fetch('/api/movies/featured');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // fallback
    }
    return this.movies.filter(m => m.isFeatured);
  }

  public async getRecommendedMovies(tab: 'all' | 'movies' | 'tv' | 'trending'): Promise<Movie[]> {
    try {
      const res = await fetch(`/api/movies/recommended?tab=${tab}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // fallback
    }
    if (tab === 'movies') {
      return this.movies.filter(m => m.type === 'movie' && (m.isRecommended || m.isTrending));
    }
    if (tab === 'tv') {
      return this.movies.filter(m => m.type === 'tv' && (m.isRecommended || m.isTrending));
    }
    if (tab === 'trending') {
      return this.movies.filter(m => m.isTrending);
    }
    return this.movies.filter(m => m.isRecommended || m.isTrending);
  }

  public async getMostViewed(period: 'day' | 'week' | 'month'): Promise<Movie[]> {
    try {
      const res = await fetch(`/api/movies/most-viewed?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // fallback
    }
    return [...this.movies].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 8);
  }

  public async getMovieByIdOrSlug(identifier: string): Promise<Movie | null> {
    try {
      const res = await fetch(`/api/movies/${identifier}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) return data;
      }
    } catch {
      // fallback
    }
    return this.movies.find(m => m.id === identifier || m.slug === identifier) || null;
  }

  public async searchAndFilter(options: FilterOptions, catalog?: Movie[]): Promise<Movie[]> {
    const movies = catalog ?? await this.getAllMovies();
    return movies.filter(movie => {
      // Type
      if (options.type !== 'all' && movie.type !== options.type) {
        return false;
      }

      // Quality
      if (options.quality !== 'all' && movie.quality !== options.quality) {
        return false;
      }

      // Genre
      const movieGenres = Array.isArray(movie.genres) ? movie.genres : [];
      if (options.genre && options.genre !== 'All' && !movieGenres.some(
        genre => typeof genre === 'string' && genre.trim().toLowerCase() === options.genre.trim().toLowerCase()
      )) {
        return false;
      }

      // Year
      if (options.year && options.year !== 'All') {
        if (options.year === '2000s') {
          if (movie.year < 2000 || movie.year > 2009) return false;
        } else if (options.year === 'Older') {
          if (movie.year >= 2000) return false;
        } else {
          if (movie.year.toString() !== options.year) return false;
        }
      }

      // Country
      const movieCountry = typeof movie.country === 'string' ? movie.country.trim() : '';
      if (options.country && options.country !== 'All'
        && !(Array.isArray(movie.countries) ? movie.countries : movieCountry.split(','))
          .some(country => country.trim().toLowerCase() === options.country.trim().toLowerCase())) {
        return false;
      }

      // A-Z filter
      if (options.a2z) {
        if (options.a2z === '0-9') {
          if (!/^[0-9]/.test(movie.title)) return false;
        } else {
          if (!movie.title.toLowerCase().startsWith(options.a2z.toLowerCase())) return false;
        }
      }

      // Query
      if (options.query && options.query.trim() !== '') {
        const q = options.query.toLowerCase().trim();
        const matchesTitle = movie.title.toLowerCase().includes(q);
        const matchesCast = movie.cast.some(c => c.toLowerCase().includes(q));
        const matchesDirector = movie.director.toLowerCase().includes(q);
        const matchesTags = movie.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCast && !matchesDirector && !matchesTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (options.sort === 'rating') return b.rating - a.rating;
      if (options.sort === 'views') return b.viewsCount - a.viewsCount;
      if (options.sort === 'title') return a.title.localeCompare(b.title);
      // 'updated' default
      return b.year - a.year;
    });
  }

  public async getComments(movieId: string): Promise<Comment[]> {
    try {
      const res = await fetch(`/api/movies/${movieId}/comments`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // fallback
    }
    return this.commentsStore[movieId] || [];
  }

  public async addComment(movieId: string, comment: Omit<Comment, 'id' | 'date' | 'likes'>): Promise<Comment> {
    const res = await fetch(`/api/movies/${movieId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save comment.');
    if (!this.commentsStore[movieId]) this.commentsStore[movieId] = [];
    this.commentsStore[movieId].unshift(data);
    return data;
  }

  public async rateMovie(movieId: string, newScore: number): Promise<{ rating: number; count: number }> {
    try {
      const res = await fetch(`/api/movies/${movieId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: newScore })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // fallback
    }

    throw new Error('Rating service is unavailable.');
  }

  public async submitContactForm(payload: { email: string; subject: string; message: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async submitRequestForm(payload: { email: string; title: string; type: string; note?: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/support/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async submitReportForm(payload: { movieId: string; issueType: string; details?: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/support/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Admin Theme Options Methods
  public async getAdminSettings(): Promise<ThemeOptionsConfig> {
    const res = await fetch('/api/site/settings');
    if (!res.ok) throw new Error('Could not load site settings.');
    return await res.json();
  }

  public async getPrivateAdminSettings(): Promise<ThemeOptionsConfig> {
    const res = await fetch('/api/admin/settings');
    if (!res.ok) throw new Error('Administrator access is required to load private settings.');
    return await res.json();
  }

  public async saveAdminSettings(settings: Partial<ThemeOptionsConfig>): Promise<ThemeOptionsConfig> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save site settings.');
    return data.settings;
  }

  // Admin Media Management Methods
  public async getAdminMedia(): Promise<Movie[]> {
    const res = await fetch('/api/admin/media');
    if (!res.ok) throw new Error('Could not load media.');
    return await res.json();
  }

  public async addAdminMedia(movie: Partial<Movie>): Promise<Movie> {
    const res = await fetch('/api/admin/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movie)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not create media.');
    const created = data as Movie;
    this.movies.unshift(created);
    return created;
  }

  public async updateAdminMedia(id: string, movie: Partial<Movie>): Promise<Movie> {
    const res = await fetch(`/api/admin/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movie)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update media.');
    const updated = data as Movie;
    const idx = this.movies.findIndex(m => m.id === id);
    if (idx !== -1) this.movies[idx] = updated;
    return updated;
  }

  public async deleteAdminMedia(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Could not delete media.');
    this.movies = this.movies.filter(m => m.id !== id);
    return true;
  }

  // Admin Users Methods
  public async getAdminUsers(): Promise<AdminUser[]> {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Could not load accounts.');
    return await res.json();
  }

  public async saveAdminUser(user: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update account.');
    return data;
  }

  public async deleteAdminUser(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Could not delete account.');
    return true;
  }

  // TMDB Methods
  public async searchTmdb(
    query: string,
    apiKey?: string,
    mediaType: 'all' | 'movie' | 'tv' = 'all',
    filters: { genres: string[]; year: string; page: number } = { genres: [], year: 'All', page: 1 }
  ): Promise<{ results: any[]; source: string; totalPages: number; totalResults: number }> {
    const res = await fetch('/api/admin/tmdb/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, apiKey, mediaType, ...filters })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'TMDB search failed.');
    return data;
  }

  public async syncTmdbCatalogMetadata(apiKey?: string): Promise<{ updated: number; failed: number; total: number }> {
    const res = await fetch('/api/admin/tmdb/sync-catalog-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    const responseText = await res.text();
    if (!responseText.trim()) {
      throw new Error(`Metadata refresh returned an empty response (HTTP ${res.status}). Restart the backend and try again.`);
    }

    let data: { updated?: number; failed?: number; total?: number; error?: string };
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Metadata refresh returned an invalid response (HTTP ${res.status}). Restart the backend and try again.`);
    }

    if (!res.ok) throw new Error(data.error || `Could not refresh catalog metadata (HTTP ${res.status}).`);
    if (typeof data.updated !== 'number' || typeof data.failed !== 'number' || typeof data.total !== 'number') {
      throw new Error('Metadata refresh returned an unexpected response. Restart the backend and try again.');
    }
    return { updated: data.updated, failed: data.failed, total: data.total };
  }

  public async importTmdb(payload: any): Promise<any> {
    const res = await fetch('/api/admin/tmdb/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  // Cache Diagnostics
  public async clearCache(): Promise<string> {
    const res = await fetch('/api/admin/cache/clear', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not clear cache.');
    return data.message;
  }
}

export const api = new MovieApiService();
