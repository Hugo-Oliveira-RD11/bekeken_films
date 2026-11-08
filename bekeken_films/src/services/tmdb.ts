import type { MovieDetails, MovieSummary } from '../api/types';
import { Cache, DAY, HOUR } from './cache';
import type { Config } from './config';
import { getJson, HttpError } from './http';

// Formato cru do TMDB (somente o que usamos).
interface RawListItem {
  id: number;
  title: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
}
interface RawList {
  results: RawListItem[];
}
interface RawGenres {
  genres: { id: number; name: string }[];
}
interface RawDetails {
  id: number;
  title: string;
  overview?: string;
  tagline?: string;
  release_date?: string;
  runtime?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  genres?: { id: number; name: string }[];
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  credits?: {
    cast?: { name: string; character?: string; profile_path?: string | null; order?: number }[];
    crew?: { name: string; job: string }[];
  };
}

export type ListKind = 'now_playing' | 'popular' | 'top_rated' | 'trending';

const yearOf = (date?: string) => (date ? Number(date.slice(0, 4)) || null : null);

export class Tmdb {
  constructor(
    private cfg: Config,
    private cache: Cache,
  ) {}

  get configured(): boolean {
    return this.cfg.tmdbApiKey !== '';
  }

  private async request<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!this.configured) {
      throw new HttpError(
        503,
        'Chave do TMDB não configurada. Preencha EXPO_PUBLIC_TMDB_API_KEY em bekeken_films/.env e reinicie o Expo (npx expo start -c).',
      );
    }
    const url = new URL(this.cfg.tmdbBaseUrl + path);
    const headers: Record<string, string> = {};
    // Aceita a chave v3 (na URL) ou o token v4 "Read Access Token" (Bearer, começa com eyJ).
    if (this.cfg.tmdbApiKey.startsWith('eyJ')) headers.Authorization = `Bearer ${this.cfg.tmdbApiKey}`;
    else url.searchParams.set('api_key', this.cfg.tmdbApiKey);
    url.searchParams.set('language', this.cfg.language);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    try {
      return await getJson<T>(url, headers);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        throw new HttpError(401, 'Chave do TMDB inválida. Confira EXPO_PUBLIC_TMDB_API_KEY em bekeken_films/.env.');
      }
      if (err instanceof HttpError && err.status === 404) throw new HttpError(404, 'Filme não encontrado.');
      throw err;
    }
  }

  private image(path: string | null | undefined, size: string): string | null {
    return path ? `${this.cfg.tmdbImageBase}/${size}${path}` : null;
  }

  /** id -> nome do gênero (cache de 30 dias). */
  async genreMap(): Promise<Map<number, string>> {
    const raw = await this.cache.getOrFetch(
      `tmdb:genres:${this.cfg.language}`,
      { ttlMs: 30 * DAY },
      () => this.request<RawGenres>('/genre/movie/list'),
    );
    return new Map(raw.genres.map((g) => [g.id, g.name]));
  }

  private summarize(item: RawListItem, genres: Map<number, string>): MovieSummary {
    return {
      id: item.id,
      title: item.title,
      year: yearOf(item.release_date),
      overview: item.overview ?? '',
      posterUrl: this.image(item.poster_path, 'w500'),
      backdropUrl: this.image(item.backdrop_path, 'w1280'),
      voteAverage: item.vote_average ?? 0,
      genres: (item.genre_ids ?? []).map((id) => genres.get(id)).filter((g): g is string => !!g),
    };
  }

  async list(kind: ListKind, page = 1): Promise<MovieSummary[]> {
    const path = kind === 'trending' ? '/trending/movie/week' : `/movie/${kind}`;
    const params: Record<string, string | number> = { page };
    if (kind === 'now_playing' || kind === 'popular') params.region = this.cfg.region;
    const raw = await this.cache.getOrFetch(
      `tmdb:list:${kind}:${this.cfg.language}:${this.cfg.region}:${page}`,
      { ttlMs: 6 * HOUR },
      () => this.request<RawList>(path, params),
    );
    const genres = await this.genreMap();
    return raw.results.map((r) => this.summarize(r, genres));
  }

  async search(query: string): Promise<MovieSummary[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const raw = await this.cache.getOrFetch(
      `tmdb:search:${this.cfg.language}:${q}`,
      { ttlMs: 12 * HOUR },
      () => this.request<RawList>('/search/movie', { query: q, include_adult: 'false' }),
    );
    const genres = await this.genreMap();
    return raw.results.map((r) => this.summarize(r, genres));
  }

  /** Detalhes completos (com elenco e IDs externos) – cache de 7 dias. */
  async details(id: number): Promise<MovieDetails> {
    const raw = await this.cache.getOrFetch(
      `tmdb:movie:${this.cfg.language}:${id}`,
      { ttlMs: 7 * DAY },
      () => this.request<RawDetails>(`/movie/${id}`, { append_to_response: 'credits,external_ids' }),
    );
    return {
      id: raw.id,
      title: raw.title,
      year: yearOf(raw.release_date),
      overview: raw.overview ?? '',
      tagline: raw.tagline ?? '',
      posterUrl: this.image(raw.poster_path, 'w500'),
      backdropUrl: this.image(raw.backdrop_path, 'w1280'),
      voteAverage: raw.vote_average ?? 0,
      voteCount: raw.vote_count ?? 0,
      genres: (raw.genres ?? []).map((g) => g.name),
      runtimeMinutes: raw.runtime || null,
      imdbId: raw.imdb_id || raw.external_ids?.imdb_id || null,
      director: raw.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null,
      cast: (raw.credits?.cast ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, 12)
        .map((c) => ({
          name: c.name,
          character: c.character ?? '',
          photoUrl: this.image(c.profile_path, 'w185'),
        })),
    };
  }
}
