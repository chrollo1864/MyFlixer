import React, { useEffect, useRef, useState } from 'react';
import { Camera, Clock3, Film, LockKeyhole, Save, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { readProfileImage } from '../services/profileImage';
import { Movie } from '../types/movie';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop';

export const AccountPage: React.FC = () => {
  const { currentUser, watchHistory, updateAccountProfile, navigateTo, openModal } = useApp();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [imageError, setImageError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAllMovies().then(setMovies).catch(() => setMovies([]));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setDisplayName(currentUser.displayName || currentUser.username);
    setUsername(currentUser.username);
    setEmail(currentUser.email);
    setAvatar(currentUser.avatar || '');
  }, [currentUser]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await readProfileImage(file));
      setImageError('');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not load profile image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      await updateAccountProfile({
        displayName,
        username,
        email,
        avatar,
        currentPassword,
        ...(newPassword ? { newPassword } : {})
      });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-[#2e3442] bg-[#242832] p-8 text-center">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-[#4f83d3]" />
          <h1 className="text-xl font-bold text-white">Sign in to your account</h1>
          <p className="mt-2 text-sm text-[#b2b1ad]">Your profile and watch history are available after signing in.</p>
          <button onClick={() => openModal('login')} className="mt-5 rounded-xl bg-gradient-flixer px-5 py-2.5 text-sm font-semibold text-white">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-8 sm:px-6">
      <header className="rounded-3xl border border-[#2e3442] bg-gradient-to-r from-[#242832] to-[#1a1c23] p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <img
            src={avatar || FALLBACK_AVATAR}
            alt={displayName || username}
            className="h-16 w-16 rounded-full border-2 border-[#4f83d3] object-cover"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4f83d3]">My account</p>
            <h1 className="text-2xl font-bold text-white">{displayName || username}</h1>
            <p className="text-sm text-[#b2b1ad]">{email}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
            <UserRound className="h-5 w-5 text-[#4f83d3]" /> Profile settings
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={avatar || FALLBACK_AVATAR} alt="Profile preview" className="h-16 w-16 rounded-full object-cover" />
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2 text-xs font-semibold text-white hover:border-[#4f83d3]"
                >
                  <Camera className="h-4 w-4" /> Upload profile photo
                </button>
                <p className="text-[11px] text-[#858b98]">JPG, PNG, WebP or GIF; up to 500 KB.</p>
              </div>
            </div>
            {imageError && <p className="text-xs text-rose-400" role="alert">{imageError}</p>}

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#b2b1ad]">Display name</span>
              <input value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={80}
                className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2.5 text-sm text-white focus:border-[#4f83d3] focus:outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#b2b1ad]">Username</span>
              <input value={username} onChange={event => setUsername(event.target.value)} required maxLength={64}
                className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2.5 text-sm text-white focus:border-[#4f83d3] focus:outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#b2b1ad]">Email address</span>
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}
                className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2.5 text-sm text-white focus:border-[#4f83d3] focus:outline-none" />
            </label>
            <div className="border-t border-[#343b4a] pt-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <LockKeyhole className="h-4 w-4 text-[#db6937]" /> Change password
              </h3>
              <label className="mb-3 block space-y-1">
                <span className="text-xs font-semibold text-[#b2b1ad]">Current password (required to save)</span>
                <input type="password" autoComplete="current-password" value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)} required
                  className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2.5 text-sm text-white focus:border-[#4f83d3] focus:outline-none" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#b2b1ad]">New password (optional, 12+ characters)</span>
                <input type="password" autoComplete="new-password" value={newPassword}
                  onChange={event => setNewPassword(event.target.value)} minLength={12} maxLength={128}
                  className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2.5 text-sm text-white focus:border-[#4f83d3] focus:outline-none" />
              </label>
            </div>
            {formError && <p className="text-xs text-rose-400" role="alert">{formError}</p>}
            <button type="submit" disabled={isSaving || Boolean(imageError)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-flixer px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Clock3 className="h-5 w-5 text-[#4f83d3]" /> Watch history
            </h2>
            <span className="rounded-full bg-[#1a1c23] px-3 py-1 text-xs text-[#b2b1ad]">{watchHistory.length} titles</span>
          </div>
          {watchHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3e4555] p-8 text-center text-sm text-[#858b98]">
              <Film className="mx-auto mb-2 h-7 w-7" />
              Your watched titles will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {watchHistory.map((entry, index) => {
                const movie = movies.find(item => item.id === entry.movieId);
                return (
                  <button
                    key={`${entry.movieId}-${index}`}
                    onClick={() => movie && navigateTo('watch', movie.id)}
                    disabled={!movie}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#343b4a] bg-[#1a1c23] p-3 text-left hover:border-[#4f83d3] disabled:cursor-default"
                  >
                    {movie?.posterUrl ? (
                      <img src={movie.posterUrl} alt="" className="h-16 w-11 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-11 items-center justify-center rounded-lg bg-[#242832]"><Film className="h-5 w-5 text-[#858b98]" /></div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{movie?.title || 'Title unavailable'}</span>
                      <span className="mt-1 block text-xs text-[#858b98]">
                        {entry.season !== undefined && entry.episode !== undefined ? `Season ${entry.season}, Episode ${entry.episode} · ` : ''}
                        {entry.lastWatched}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#4f83d3]">{entry.progressPercent}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
