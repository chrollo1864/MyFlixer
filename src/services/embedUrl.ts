import { Movie } from '../types/movie';

/** Resolve a configured media URL template for an imported title. */
export function buildEmbedUrl(
  template: string,
  type: Movie['type'],
  mediaId: string,
  season?: number,
  episode?: number
): string {
  const [path, suffix = ''] = template.trim().split(/(?=[?#])/, 2);
  const encodedId = encodeURIComponent(mediaId);
  const hasIdPlaceholder = /\{(?:id|tmdb_id|tmdbId)\}/i.test(template);
  const hasEpisodePlaceholder = /\{(?:season|s|ep|episode|e)\}/i.test(template);
  let resolvedPath = path;

  const replacePlaceholders = (value: string) => value
    .replace(/\{(?:id|tmdb_id|tmdbId)\}/gi, encodedId)
    .replace(/\{(?:season|s)\}/gi, season === undefined ? '{season}' : String(season))
    .replace(/\{(?:ep|episode|e)\}/gi, episode === undefined ? '{episode}' : String(episode));

  resolvedPath = replacePlaceholders(resolvedPath);
  let resolvedSuffix = replacePlaceholders(suffix);

  if (!hasIdPlaceholder) {
    const route = new RegExp(`/${type}(?=/|$)`, 'i').exec(resolvedPath);
    if (route) {
      const routeEnd = route.index + route[0].length;
      const base = resolvedPath.slice(0, routeEnd).replace(/\/+$/, '');
      const segments = resolvedPath.slice(routeEnd).split('/').filter(Boolean);
      const startsWithEpisodePlaceholder = type === 'tv'
        && (/^\{(?:season|ep|episode)\}$/.test(segments[0] || '')
          || (segments.length >= 2 && /^\d+$/.test(segments[0]) && /^\d+$/.test(segments[1])));

      if (segments.length === 0 || startsWithEpisodePlaceholder) {
        segments.unshift(encodedId);
      } else {
        // The first segment after /movie or /tv is the media ID. Correct stale
        // or malformed values to the current title's TMDB ID.
        segments[0] = encodedId;
      }

      while (segments[1] === encodedId) segments.splice(1, 1);
      resolvedPath = `${base}/${segments.join('/')}`;
    }
  }

  if (type === 'tv' && season !== undefined && episode !== undefined) {
    if (!hasEpisodePlaceholder) {
      resolvedPath = resolvedPath.replace(
        /(\/tv\/[^/?#]+)(?:\/\d+\/\d+)?\/?$/i,
        `$1/${season}/${episode}`
      );
    }
  }

  return `${resolvedPath}${resolvedSuffix}`;
}
