import { Movie } from '../types/movie';

export const GENRE_LIST = [
  'Action', 'Action & Adventure', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Kids', 'Music',
  'Mystery', 'News', 'Reality', 'Romance', 'Science Fiction', 'Sci-Fi & Fantasy',
  'Soap', 'Talk', 'Thriller', 'TV Movie', 'War', 'War & Politics', 'Western'
];

export const getCatalogGenres = (movies: Movie[]): string[] =>
  Array.from(new Set(movies.flatMap(movie => Array.isArray(movie.genres) ? movie.genres : [])
    .filter((genre): genre is string => typeof genre === 'string')
    .map(genre => genre.trim())
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

export const getCatalogCountries = (movies: Movie[]): string[] =>
  Array.from(new Set(
    movies
      .flatMap(movie => Array.isArray(movie.countries)
        ? movie.countries
        : typeof movie.country === 'string' ? movie.country.split(',') : [])
      .map(country => country.trim())
      .filter(Boolean)
  ))
    .sort((a, b) => a.localeCompare(b));

const currentYear = new Date().getFullYear();
export const YEAR_LIST = Array.from({ length: currentYear - 1950 + 1 }, (_, index) => String(currentYear - index));
