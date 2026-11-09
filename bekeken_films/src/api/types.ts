// Tipos compartilhados entre os serviços (src/services) e as telas.
//
// Apesar do nome "Movie*", os tipos servem para FILMES e SÉRIES do TMDB.
// ATENÇÃO: o TMDB numera filmes e séries separadamente, então um filme e uma série
// podem ter o MESMO id. Por isso um título sempre é identificado por (mediaType, id).

export type MediaType = 'movie' | 'tv';

/** Identifica um filme ou série: tipo + id do TMDB. */
export interface TitleRef {
  mediaType: MediaType;
  id: number;
}

/** Identifica um episódio: série + temporada + número do episódio. */
export interface EpisodeRef {
  seriesId: number;
  season: number;
  episode: number;
}

export interface MovieSummary {
  mediaType: MediaType;
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

export interface SeasonSummary {
  /** 0 = "Especiais". */
  number: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterUrl: string | null;
}

export interface MovieDetails extends MovieSummary {
  tagline: string;
  /** Só filmes. */
  director: string | null;
  /** Só séries: criadores. */
  creators: string[];
  /** Só séries: temporadas (inclui "Especiais" quando existirem). */
  seasons: SeasonSummary[];
  /** Só séries: total de episódios (sem especiais). */
  episodeCount: number | null;
  /** Filme: duração total. Série: duração típica de um episódio. */
  runtimeMinutes: number | null;
  voteCount: number;
  imdbId: string | null;
  cast: CastMember[];
}

export interface EpisodeSummary {
  season: number;
  number: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtimeMinutes: number | null;
  stillUrl: string | null;
  /** Nota do TMDB para o episódio, 0–10. */
  voteAverage: number;
}

export interface EpisodeDetails extends EpisodeSummary {
  seriesId: number;
  director: string | null;
  guestStars: CastMember[];
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

/** Dados pessoais de um filme ou série. */
export interface UserMovie {
  mediaType: MediaType;
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

/** Dados pessoais de UM episódio (nota, assistido, coração, anotação) — separados da série. */
export interface UserEpisode {
  seriesId: number;
  season: number;
  episode: number;
  status: 'watched' | null;
  rating: number | null;
  liked: boolean;
  note: string;
  watchedAt: string | null;
}

export interface UserEpisodePatch {
  status?: 'watched' | null;
  rating?: number | null;
  liked?: boolean;
  note?: string;
  watchedAt?: string;
}

/**
 * Seções da home (todas vêm das listas do TMDB; mesmas chaves para filmes e séries):
 * - nowPlaying:  filmes: em cartaz agora | séries: no ar (episódios novos nesta semana)
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
  /** Só as seções que carregaram e têm títulos, na ordem de exibição. */
  sections: HomeSection[];
}

export interface DetailsResponse {
  movie: MovieDetails;
  watchmode: WatchmodeInfo;
  user: UserMovie;
  /** Só séries: quantos episódios (sem especiais) o usuário já marcou como assistidos. */
  watchedEpisodes: number;
}

export interface SeasonResponse {
  season: SeasonSummary;
  episodes: EpisodeSummary[];
  /** Dados pessoais dos episódios desta temporada que têm algum dado. */
  user: UserEpisode[];
}

export interface EpisodeResponse {
  /** Resumo da série (título, imagens). */
  series: MovieSummary;
  episode: EpisodeDetails;
  /** Streaming da SÉRIE (o Watchmode não tem fontes por episódio). */
  watchmode: WatchmodeInfo;
  user: UserEpisode;
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
