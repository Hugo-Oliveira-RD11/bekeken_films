// Espelha as respostas do backend (backend/src/*.ts).

export interface MovieSummary {
  id: number;
  title: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  /** Nota do TMDB, 0–10. */
  voteAverage: number;
  genres: string[];
}

export interface CastMember {
  name: string;
  character: string;
  photoUrl: string | null;
}

export interface MovieDetails extends MovieSummary {
  tagline: string;
  director: string | null;
  runtimeMinutes: number | null;
  voteCount: number;
  imdbId: string | null;
  cast: CastMember[];
}

export type SourceType = 'sub' | 'rent' | 'buy' | 'free';

export interface StreamingSource {
  id: number;
  name: string;
  type: SourceType;
  price: number | null;
  format: string | null;
  webUrl: string | null;
  logoUrl: string | null;
}

export interface WatchmodeInfo {
  status: 'ok' | 'not_found' | 'no_key' | 'unavailable';
  region: string;
  userRating: number | null;
  criticScore: number | null;
  sources: StreamingSource[];
}

export type Status = 'watched' | 'watchlist';

export interface UserMovie {
  tmdbId: number;
  status: Status | null;
  rating: number | null;
  liked: boolean;
  note: string;
  watchedAt: string | null;
}

export interface UserMoviePatch {
  status?: Status | null;
  rating?: number | null;
  liked?: boolean;
  note?: string;
  watchedAt?: string;
}

/**
 * Seções da home (todas vêm das listas do TMDB):
 * - nowPlaying:  em cartaz agora
 * - mostWatched: mais populares (a popularidade do TMDB mistura visualizações, votos e "quero ver")
 * - topRated:    mais gostados (maiores notas dos usuários do TMDB)
 * - trending:    em alta na semana
 */
export type HomeSectionKey = 'nowPlaying' | 'mostWatched' | 'topRated' | 'trending';

export interface HomeSection {
  key: HomeSectionKey;
  movies: MovieSummary[];
}

export interface HomeResponse {
  featured: MovieSummary | null;
  /** Só as seções que carregaram e têm filmes, na ordem de exibição. */
  sections: HomeSection[];
}

export interface DetailsResponse {
  movie: MovieDetails;
  watchmode: WatchmodeInfo;
  user: UserMovie;
}

export interface WatchedResponse {
  stats: { total: number; thisYear: number; average: number | null };
  entries: { movie: MovieSummary; rating: number | null; liked: boolean; watchedAt: string }[];
}

export type Algorithm = 'count' | 'weighted';

export interface RecommendationsResponse {
  algorithm: Algorithm;
  coldStart: boolean;
  profile: { genre: string; value: number }[];
  items: {
    movie: MovieSummary;
    score: number;
    matchPercent: number | null;
    because: string[];
  }[];
}
