# MyFlixer WordPress Theme to React Application Conversion

Convert the provided **MyFlixer** WordPress theme (v1.0.1 by fr0zen) into a production-grade, pixel-accurate React single-page application. Replicate the dark cinema aesthetic, layout architecture, interactive components, responsive mechanics, and data workflows without design drift or mock placeholders.

## User Review & Critical Decisions

> [!IMPORTANT]
> The original theme is built specifically for movie, TV series, and anime streaming databases with custom post types, taxonomy filtering, a video player sandbox, and bookmarking. We have extracted the exact visual styles, color tokens, and UI layout directly from the uploaded theme stylesheets and templates (`style_5f26be5e.css`, `screenshot_425a434d.png`, and PHP templates).

- **Backend Architecture**: Implemented with a modular API service layer. Ships with rich, authentic streaming catalog data (titles, high-res posters, backdrop stills, seasons/episodes, streaming servers, ratings, and cast) while providing a direct toggle configuration to switch to a live WordPress REST API (`/wp-json/wp/v2/posts`) endpoint at any time.
- **State Management & Persistence**: Client-side reactive store for User Auth status, Watchlist/Favorites, Watch History with episode progress tracking, and Dark/Cinema mode state, backed by `localStorage` persistence.
- **Iconography**: Clean Lucide React icons precisely matching the theme's original Unicons Line icon set (`uil-film`, `uil-search`, `uil-filter`, `uil-play`, `uil-bookmark`, `uil-star`, `uil-moon`, `uil-sliders-v-alt`).

---

## 1. Overview & Core Concept

- **What It Does**: A modern streaming media portal and catalog for movies and TV series featuring a full-width hero slider, genre/country filtering, A-Z directory, real-time live search suggestions, video player interface with server switching and cinema light dimming, episode guide drawer, interactive 10-star rating system, watchlist bookmarking, user authentication modals, and threaded comments.
- **Target Audience**: Film and television enthusiasts seeking a smooth, ad-free, responsive dark-mode streaming directory with fast filtering and desktop-to-mobile parity.
- **Key Value**: Preserves 100% of the original MyFlixer design language while replacing outdated PHP/jQuery dependencies with reactive React 19 components, smooth state transitions, instant client-side search, and type-safe data models.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Browse & Discovery**: Explore featured movies via the swiping hero banner; switch between *Recommended* (`Movies`, `TV Shows`, `Trending`) and *Most Viewed* (`Day`, `Week`, `Month`); filter by year or A-Z alphabet strip.
2. **Instant Search & Advanced Filtering**: Type into the header search bar with immediate animated suggestions dropdown. Click "Filter" to access multi-parameter search (Type, Quality, Genre, Release Year, Sort By).
3. **Stream & Episode Selection**: Click any title to open the Watch Page. Toggle video playback, switch between streaming sources ("UpCloud", "VidCloud", "StreamSB"), dim surrounding elements ("Turn off light" cinema mode), report issues, and select seasons & episodes.
4. **Community & Rating**: Rate titles from 1–10 stars with live average recalculation; post and view comments.
5. **Personal Watchlist & History**: Bookmark titles to Favorites; monitor recently watched items with visual completion progress bars.

### Visual Identity & Theme Tokens
- **Canvas Atmosphere**: Deep obsidian-navy background (`#1e2129`).
- **Surface Elevation**: Elevated panel surfaces (`#242832` and `#292d38`) with dark border outlines (`#1a1c23` and `#3e4555`).
- **Signature Gradient**: Vibrant linear gradient `linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #ec4899 100%)` for primary CTAs, active badges, and search bar borders.
- **Typography**: Clean display and body hierarchy pairing Google Fonts `Poppins` with `Titillium Web` accents for movie titles and metadata tags.
- **Card Mechanics**: Poster aspect ratio ~2:3 with rounded corners (`rounded-2xl`), top-left "HD" badge, top-right bookmark button, and hover play overlay with gradient backlight.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Service Layer for Data Integration**
  - *Chosen Approach*: Build a unified `MovieService` that supplies rich realistic seed data by default and supports seamless switching to a live WordPress REST API by specifying `VITE_WP_API_URL`.
  - *Why*: Allows immediate, zero-setup interactive usage in any sandbox while ensuring turnkey WordPress backend compatibility.
- **Decision 2: Cinema Mode Screen Dimming (`#overlay`)**
  - *Chosen Approach*: Replicate the theme's `#overlay.active` DOM element as a fixed full-screen backdrop (`rgba(0,0,0,0.96)`) that elevates the player wrapper above all other elements (`z-index: 101`).
  - *Why*: Preserves the signature MyFlixer movie theater experience right inside the browser.
- **Decision 3: Reusable Modal System**
  - *Chosen Approach*: Centralized modal manager for Login/Sign Up, Report Broken Video, and Contact/Request forms.
  - *Why*: Eliminates boilerplate and avoids popup blocking issues.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                   │
│  (Theme & Auth Context, Watchlist Store, Notification Toasts)          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│     Header        │    │    Active View    │    │      Footer       │
│ - Menu drawer     │    │ (Home/Watch/      │    │ - Wordmark & Links│
│ - Search & suggest│    │  Browse/404)      │    │ - Legal disclaimer│
│ - Auth & Watchlist│    │                   │    │ - Copyright       │
└───────────────────┘    └─────────┬─────────┘    └───────────────────┘
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       ▼                                                       ▼
┌────────────────────────────────┐         ┌────────────────────────────────┐
│           HomePage             │         │           WatchPage            │
│ - HeroBanner (Featured Slider) │         │ - MoviePlayer (Video & Lights) │
│ - ContentSection (Recommended) │         │ - ServerSelector & EpisodeList │
│ - MovieGrid (14.2% flex-cols)  │         │ - MovieDetails & StarRating    │
│ - SidebarWidget (Most Viewed)  │         │ - CommentsSection              │
│ - A2ZFilterBar                 │         │ - RelatedTitlesGrid            │
└────────────────────────────────┘         └────────────────────────────────┘
```

### Component Structure
- `src/types/movie.ts`: Complete TypeScript interfaces for `Movie`, `Episode`, `Season`, `Comment`, `FilterOptions`, and `UserProfile`.
- `src/services/movieData.ts`: Realistic catalog with 20+ movies and TV series across Action, Sci-Fi, Drama, Animation, and Comedy with posters, synopses, and episodes.
- `src/services/api.ts`: API service layer for searching, filtering, fetching details, and connecting to WP REST API.
- `src/context/AppContext.tsx`: State management for watchlist, watch progress, current user, active modals, and cinema mode.
- `src/components/Header.tsx`: Responsive navigation, hamburger menu, gradient search bar, and live suggestions.
- `src/components/HeroSlider.tsx`: Swiping featured movie showcase with auto-advance, backdrop stills, and watch actions.
- `src/components/MovieCard.tsx`: Exact card markup with poster, HD badge, play hover effects, and meta strip.
- `src/components/FilterBar.tsx`: Multi-parameter filter bar (Type, Quality, Genre, Release Year, Sort).
- `src/components/MoviePlayer.tsx`: Video stream frame, server switchers, and cinema mode overlay.
- `src/components/EpisodeSelector.tsx`: Season dropdown, episode search, and episode list for TV shows.
- `src/components/StarRating.tsx`: Interactive 10-star rating widget with hover states and live calculations.
- `src/components/CommentsSection.tsx`: Threaded comments with form and timestamps.
- `src/components/Modals.tsx`: Login/Register, Video Report, and Contact/Request modals.
- `src/pages/HomePage.tsx`: Main showcase landing page.
- `src/pages/WatchPage.tsx`: Single movie/show watch view.
- `src/pages/BrowsePage.tsx`: Filterable directory (Movies, TV Series, Genres, A-Z).
- `src/pages/WatchlistPage.tsx`: Saved favorites and viewing history with progress bars.
- `src/pages/NotFoundPage.tsx`: Original 404 page with large display numerals.
