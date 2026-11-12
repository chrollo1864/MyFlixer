import { Movie, FilterOptions, Comment, UserAccount } from '../types/movie';
import { ThemeOptionsConfig, AdminUser, AdminSubscription, SubscriptionStatus, UserSubscription } from '../types/admin';
import { SubscriptionPaymentRequest, SubscriptionPaymentSettings, SubscriptionPlanId, PaymentProvider } from './subscriptionPlans';

async function readPasswordResetResponse(
  response: Response,
  fallbackMessage: string
): Promise<Record<string, unknown>> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(response.ok
      ? 'The server returned an empty response. Restart the application server and try again.'
      : `${fallbackMessage} (HTTP ${response.status}).`);
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    if (response.status === 404) {
      throw new Error('Password reset is not available on the running server. Rebuild and restart the backend, then try again.');
    }
    throw new Error(response.ok
      ? 'The server returned an invalid response. Restart the application server and try again.'
      : `${fallbackMessage} (HTTP ${response.status}).`);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The server returned an invalid response. Please try again.');
  }
  const payload = data as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `${fallbackMessage} (HTTP ${response.status}).`);
  }
  return payload;
}

function includesSearchTerm(value: unknown, term: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(term);
}

function includesSearchTermIn(values: unknown, term: string): boolean {
  return Array.isArray(values) && values.some(value => includesSearchTerm(value, term));
}

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

  public async requestPasswordReset(email: string): Promise<void> {
    const res = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    await readPasswordResetResponse(res, 'Could not request a password reset.');
  }

  public async verifyPasswordResetCode(email: string, code: string): Promise<string> {
    const res = await fetch('/api/auth/password-reset/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await readPasswordResetResponse(res, 'Could not verify the reset code.');
    if (typeof data.resetToken !== 'string' || !data.resetToken) {
      throw new Error('The server did not return a valid reset token. Restart the application server and try again.');
    }
    return data.resetToken;
  }

  public async resetPassword(email: string, resetToken: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/password-reset/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetToken, password })
    });
    const data = await readPasswordResetResponse(res, 'Could not reset the password.');
    if (data.success !== true) throw new Error('The server did not confirm the password reset. Please try again.');
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

  public async getUserSubscription(): Promise<UserSubscription> {
    const res = await fetch('/api/user/subscription');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load subscription status.');
    return data;
  }

  public async getSubscriptionPaymentRequests(): Promise<SubscriptionPaymentRequest[]> {
    const res = await fetch('/api/user/subscription-payment-requests');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load payment requests.');
    return data;
  }

  public async createSubscriptionPaymentRequest(payload: {
    planId: SubscriptionPlanId;
    provider: PaymentProvider;
    transactionReference: string;
  }): Promise<SubscriptionPaymentRequest> {
    const res = await fetch('/api/user/subscription-payment-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not submit payment for review.');
    return data;
  }

  public async authorizePlayback(
    movieId: string,
    serverId: string,
    season?: number,
    episode?: number
  ): Promise<{ url: string; sourceType: Movie['videoSources'][number]['sourceType']; clearKeyId?: string; clearKey?: string }> {
    const res = await fetch('/api/playback/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId, serverId, season, episode })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Playback authorization failed.') as Error & { code?: string };
      error.code = data.code;
      throw error;
    }
    return data;
  }

  public async checkPlaybackAccess(): Promise<void> {
    const res = await fetch('/api/playback/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Playback authorization expired.') as Error & { code?: string };
      error.code = data.code;
      throw error;
    }
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
        const matchesTitle = includesSearchTerm(movie.title, q);
        const matchesCast = includesSearchTermIn(movie.cast, q);
        const matchesDirector = includesSearchTerm(movie.director, q);
        const matchesTags = includesSearchTermIn(movie.tags, q);
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

  public async getAdminSubscriptions(): Promise<AdminSubscription[]> {
    const res = await fetch('/api/admin/subscriptions');
    if (!res.ok) throw new Error('Could not load subscription statuses.');
    return await res.json();
  }

  public async saveAdminSubscription(
    username: string,
    subscription: { status: SubscriptionStatus; expiresAt: string | null }
  ): Promise<void> {
    const res = await fetch(`/api/admin/subscriptions/${encodeURIComponent(username)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update subscription.');
  }

  public async getAdminSubscriptionPaymentRequests(): Promise<SubscriptionPaymentRequest[]> {
    const res = await fetch('/api/admin/subscription-payment-requests');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load payment requests.');
    return data;
  }

  public async reviewSubscriptionPaymentRequest(id: number, decision: 'approved' | 'rejected'): Promise<void> {
    const res = await fetch(`/api/admin/subscription-payment-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not review payment request.');
  }

  public async saveSubscriptionPaymentSettings(settings: SubscriptionPaymentSettings): Promise<ThemeOptionsConfig> {
    return this.saveAdminSettings({ subscriptionPayments: settings });
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

  public async fetchTmdbDetails(payload: {
    tmdbId: number;
    apiKey?: string;
    type: 'movie' | 'tv';
    previewOnly: true;
  }): Promise<Movie> {
    const res = await fetch('/api/admin/tmdb/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not fetch title details from TMDB.');
    if (!data.movie || typeof data.movie !== 'object') {
      throw new Error('TMDB returned incomplete title details. Please try again.');
    }
    return data.movie as Movie;
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

  public async refreshTmdbImage(
    tmdbId: number,
    field: 'posterUrl' | 'backdropUrl',
    apiKey?: string
  ): Promise<Movie> {
    const res = await fetch('/api/admin/tmdb/refresh-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, field, apiKey })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not refresh the TMDB image.');
    if (!data.movie || typeof data.movie !== 'object') {
      throw new Error('TMDB image refresh returned an unexpected response.');
    }
    return data.movie as Movie;
  }

  public async importTmdb(payload: any): Promise<any> {
    const res = await fetch('/api/admin/tmdb/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  public async savePlaybackProgress(movieId: string, positionSeconds: number, durationSeconds: number, season?: number, episode?: number): Promise<void> {
    const res = await fetch(`/api/playback/progress/${encodeURIComponent(movieId)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionSeconds, durationSeconds, season, episode })
    });
    if (!res.ok && res.status !== 401) throw new Error('Could not save playback progress.');
  }

  public async getPlaybackProgress(movieId: string, season?: number, episode?: number): Promise<{positionSeconds:number;durationSeconds:number}|null> {
    const query = season !== undefined && episode !== undefined ? `?season=${season}&episode=${episode}` : '';
    const res = await fetch(`/api/playback/progress/${encodeURIComponent(movieId)}${query}`);
    if (res.status === 401 || res.status === 404) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not retrieve playback progress.');
    return data;
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
