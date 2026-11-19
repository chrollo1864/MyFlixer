import React, { useState, useEffect } from 'react';
import { Film, Flame, Sparkles, ChevronRight, Tv } from 'lucide-react';
import { Movie } from '../types/movie';
import { api } from '../services/api';
import { HeroSlider } from '../components/HeroSlider';
import { MovieCard } from '../components/MovieCard';
import { SidebarMostViewed } from '../components/SidebarMostViewed';
import { A2ZFilter } from '../components/A2ZFilter';
import { useApp } from '../context/AppContext';
import { getCatalogGenres } from '../services/catalogOptions';

export const HomePage: React.FC = () => {
  const { navigateTo, themeOptions } = useApp();

  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [recommendedTab, setRecommendedTab] = useState<'all' | 'movies' | 'tv' | 'trending'>('all');
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [latestTvShows, setLatestTvShows] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);

  // Read section settings configured via Theme Options
  const heroSec = themeOptions.homepageSections.find(s => s.key === 'hero');
  const recSec = themeOptions.homepageSections.find(s => s.key === 'recommended');
  const trendingSec = themeOptions.homepageSections.find(s => s.key === 'trending');
  const latestMoviesSec = themeOptions.homepageSections.find(s => s.key === 'latestMovies');
  const a2zSec = themeOptions.homepageSections.find(s => s.key === 'a2z');
  const mostViewedSec = themeOptions.homepageSections.find(s => s.key === 'mostViewed');

  useEffect(() => {
    const loadData = async () => {
      const [featured, recommended, all] = await Promise.all([
        api.getFeaturedMovies(),
        api.getRecommendedMovies(recommendedTab),
        api.getAllMovies()
      ]);
      setAllMovies(all);
      setFeaturedMovies(featured.slice(0, heroSec?.itemsCount || 5));
      setRecommendedMovies(recommended.slice(0, recSec?.itemsCount || 7));
      setLatestMovies(all.filter(m => m.type === 'movie').slice(0, latestMoviesSec?.itemsCount || 14));
      setLatestTvShows(all.filter(m => m.type === 'tv').slice(0, trendingSec?.itemsCount || 7));
    };
    loadData();
  }, [recommendedTab, heroSec?.itemsCount, recSec?.itemsCount, latestMoviesSec?.itemsCount, trendingSec?.itemsCount]);

  const curatedMovies = (section: typeof heroSec, mediaType?: Movie['type']) => {
    if (!section?.movieIds?.length) return undefined;
    return section.movieIds
      .map(id => allMovies.find(movie => movie.id === id))
      .filter((movie): movie is Movie => !!movie)
      .filter(movie => !mediaType || movie.type === mediaType)
      .slice(0, section.itemsCount);
  };

  const heroContent = curatedMovies(heroSec) ?? featuredMovies;
  const recommendedContent = curatedMovies(recSec) ?? recommendedMovies;
  const latestMovieContent = curatedMovies(latestMoviesSec, 'movie') ?? latestMovies;
  const trendingContent = curatedMovies(trendingSec, 'tv') ?? latestTvShows;
  const mostViewedContent = curatedMovies(mostViewedSec);
  const catalogGenres = getCatalogGenres(allMovies);

  return (
    <div className="w-full space-y-8 sm:space-y-12">
      {/* 0. Optional Header Ad Placement */}
      {themeOptions.ads.headerAdEnabled && (
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-3">
          <div 
            dangerouslySetInnerHTML={{ __html: themeOptions.ads.headerAdHtml }} 
            className="w-full overflow-hidden"
          />
        </div>
      )}

      {/* 1. Hero Featured Slider */}
      {heroSec?.enabled !== false && <HeroSlider movies={heroContent} />}

      {/* 2. Main Content & Sidebar Layout */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Main Content Area */}
          <main className="w-full lg:flex-1 min-w-0 space-y-10">
            
            {/* Recommended Section with [Movies] [TV Shows] [Trending] tabs */}
            {recSec?.enabled !== false && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#242832]">
                  <div className="flex min-w-0 flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="min-w-0 text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#db6937]" />
                      <span className="break-words">{recSec?.title || 'Recommended'}</span>
                    </h2>

                  {/* Tabs */}
                  {!recSec?.movieIds?.length && <div className="max-w-full w-fit flex items-center gap-1 bg-[#242832] p-1 rounded-full text-xs overflow-x-auto">
                    {(['all', 'movies', 'tv', 'trending'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setRecommendedTab(tab)}
                        className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-full font-semibold capitalize transition-all cursor-pointer ${
                          recommendedTab === tab
                            ? 'bg-gradient-flixer text-white shadow-md'
                            : 'text-[#b2b1ad] hover:text-white'
                        }`}
                      >
                        {tab === 'all' ? 'All' : tab === 'tv' ? 'TV Shows' : tab}
                      </button>
                    ))}
                  </div>}
                </div>

                <button
                  onClick={() => navigateTo('browse')}
                  className="self-end sm:self-auto shrink-0 text-xs text-[#4f83d3] hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid: 7 cols on 2xl, 6 cols on xl, 4 cols on lg, 3 cols on sm, 2 cols on mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                {recommendedContent.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
            )}

            {/* Latest Movies Section */}
            {latestMoviesSec?.enabled !== false && (
              <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#242832]">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-[#4f83d3]" />
                    <span>{latestMoviesSec?.title || 'Latest Movies'}</span>
                  </h2>
                  <button
                    onClick={() => navigateTo('browse', undefined, { type: 'movie' })}
                    className="text-xs text-[#4f83d3] hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>See More</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                  {latestMovieContent.slice(0, latestMoviesSec?.itemsCount || 14).map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </section>
            )}

            {/* Latest TV Series Section */}
            {trendingSec?.enabled !== false && (
              <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#242832]">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Tv className="w-5 h-5 text-[#db6937]" />
                    <span>{trendingSec?.title || 'Trending TV Series'}</span>
                  </h2>
                  <button
                    onClick={() => navigateTo('browse', undefined, { type: 'tv' })}
                    className="text-xs text-[#4f83d3] hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>See More</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                  {trendingContent.map((tv) => (
                    <MovieCard key={tv.id} movie={tv} />
                  ))}
                </div>
              </section>
            )}

            {/* A-Z Alphabetical Filter Strip */}
            {a2zSec?.enabled !== false && (
              <A2ZFilter onSelectLetter={(letter) => navigateTo('browse', undefined, { a2z: letter })} />
            )}

          </main>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 2xl:w-96 shrink-0 space-y-6">
            {/* Optional Sidebar Ad Placement */}
            {themeOptions.ads.sidebarAdEnabled && (
              <div 
                dangerouslySetInnerHTML={{ __html: themeOptions.ads.sidebarAdHtml }}
                className="overflow-hidden"
              />
            )}

            {mostViewedSec?.enabled !== false && (
              <SidebarMostViewed
                curatedMovies={mostViewedContent}
                title={mostViewedSec?.title}
                itemsCount={mostViewedSec?.itemsCount}
              />
            )}

            {/* Popular Genres Widget */}
            <div className="bg-[#242832] rounded-2xl p-4 border border-[#2e3442] shadow-lg space-y-3">
              <div className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-[#1e2129]">
                Popular Genres
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catalogGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => navigateTo('browse', undefined, { genre })}
                    className="bg-[#1a1c23] hover:bg-[#4f83d3] hover:text-white text-[#b2b1ad] text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
