import type {
  CastMember,
  EpisodeDetails,
  EpisodeSummary,
  MediaType,
  MovieDetails,
  MovieSummary,
  SeasonSummary,
  TitleRef,
} from '../api/types';
import { Cache, DAY, HOUR } from './cache';
import type { Config } from './config';
import { getJson, HttpError } from './http';

// ---------- Formato cru do TMDB (somente o que usamos) ----------

interface RawListItem {
  id: number;
  // filmes usam title/release_date; séries usam name/first_air_date
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
  /** só em /search/multi */
  media_type?: string;
}
interface RawList {
  results: RawListItem[];
}
interface RawGenres {
  genres: { id: number; name: string }[];
}
interface RawCredits {
  cast?: { name: string; character?: string; profile_path?: string | null; order?: number }[];
  crew?: { name: string; job: string }[];
}
interface RawDetails extends RawListItem {
  tagline?: string;
  runtime?: number | null;
  vote_count?: number;
  genres?: { id: number; name: string }[];
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  credits?: RawCredits;
  // séries
  created_by?: { name: string }[];
  seasons?: {
    season_number: number;
    name?: string;
    episode_count?: number;
    air_date?: string | null;
    poster_path?: string | null;
  }[];
  number_of_episodes?: number;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime?: number | null } | null;
}
interface RawEpisode {
  episode_number: number;
  season_number: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
  vote_average?: number;
  crew?: { name: string; job: string }[];
  guest_stars?: { name: string; character?: string; profile_path?: string | null; order?: number }[];
}
interface RawSeason {
  season_number: number;
  name?: string;
  air_date?: string | null;
  poster_path?: string | null;
  episodes?: RawEpisode[];
}

export type ListKind = 'now_playing' | 'popular' | 'top_rated' | 'trending';

const yearOf = (date?: string | null) => (date ? Number(date.slice(0, 4)) || null : null);

/**
 * Gêneros "compostos" das séries viram os gêneros equivalentes de filmes, para
 * que os dois tipos conversem entre si nas recomendações
 * (ex.: "Sci-Fi & Fantasy" -> "Ficção científica" + "Fantasia").
 * Números são ids de gênero de filmes; textos são nomes literais.
 */
const TV_GENRE_SPLIT: Record<number, (number | string)[]> = {
  10759: [28, 12], // Action & Adventure -> Ação + Aventura
  10765: [878, 14], // Sci-Fi & Fantasy   -> Ficção científica + Fantasia
  10768: [10752, 'Política'], // War & Politics -> Guerra + Política
};

export class Tmdb {
  constructor(
    private cfg: Config,
    private cache: Cache,
  ) {}

  get configured(): boolean {
    return this.cfg.tmdbApiKey !== '';
  }

  private async request<T>(
    path: string,
    params: Record<string, string | number> = {},
    notFound = 'Título não encontrado.',
  ): Promise<T> {
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
      if (err instanceof HttpError && err.status === 404) throw new HttpError(404, notFound);
      throw err;
    }
  }

  private image(path: string | null | undefined, size: string): string | null {
    return path ? `${this.cfg.tmdbImageBase}/${size}${path}` : null;
  }

  // ---------- Gêneros ----------

  private rawGenres(kind: 'movie' | 'tv'): Promise<RawGenres> {
    return this.cache.getOrFetch(`tmdb:genres:${kind}:${this.cfg.language}`, { ttlMs: 30 * DAY }, () =>
      this.request<RawGenres>(`/genre/${kind}/list`),
    );
  }

  /** id do gênero -> nomes (série pode virar mais de um nome; ver TV_GENRE_SPLIT). Cache de 30 dias. */
  async genreNames(mediaType: MediaType): Promise<Map<number, string[]>> {
    const movie = await this.rawGenres('movie');
    const movieNames = new Map(movie.genres.map((g) => [g.id, g.name]));
    const out = new Map<number, string[]>(movie.genres.map((g) => [g.id, [g.name]]));
    if (mediaType === 'movie') return out;

    const tv = await this.rawGenres('tv');
    const result = new Map<number, string[]>();
    for (const g of tv.genres) {
      const split = TV_GENRE_SPLIT[g.id];
      const names = split
        ? split.map((x) => (typeof x === 'number' ? movieNames.get(x) : x)).filter((n): n is string => !!n)
        : [g.name];
      result.set(g.id, names.length ? names : [g.name]);
    }
    return result;
  }

  private namesFrom(ids: number[] | undefined, map: Map<number, string[]>): string[] {
    return [...new Set((ids ?? []).flatMap((id) => map.get(id) ?? []))];
  }

  // ---------- Listas e busca ----------

  private summarize(item: RawListItem, mediaType: MediaType, genres: Map<number, string[]>): MovieSummary {
    return {
      mediaType,
      id: item.id,
      title: (mediaType === 'tv' ? item.name : item.title) ?? item.title ?? item.name ?? '',
      year: yearOf(mediaType === 'tv' ? item.first_air_date : item.release_date),
      overview: item.overview ?? '',
      posterUrl: this.image(item.poster_path, 'w500'),
      backdropUrl: this.image(item.backdrop_path, 'w1280'),
      voteAverage: item.vote_average ?? 0,
      genres: this.namesFrom(item.genre_ids, genres),
    };
  }

  async list(mediaType: MediaType, kind: ListKind, page = 1): Promise<MovieSummary[]> {
    // "em cartaz" de filmes corresponde a "no ar" nas séries
    const path =
      kind === 'trending'
        ? `/trending/${mediaType}/week`
        : kind === 'now_playing' && mediaType === 'tv'
          ? '/tv/on_the_air'
          : `/${mediaType}/${kind}`;
    const params: Record<string, string | number> = { page };
    if (mediaType === 'movie' && (kind === 'now_playing' || kind === 'popular')) params.region = this.cfg.region;
    const raw = await this.cache.getOrFetch(
      `tmdb:list:${mediaType}:${kind}:${this.cfg.language}:${this.cfg.region}:${page}`,
      { ttlMs: 6 * HOUR },
      () => this.request<RawList>(path, params),
    );
    const genres = await this.genreNames(mediaType);
    return raw.results.map((r) => this.summarize(r, mediaType, genres));
  }

  /** Busca filmes E séries juntos (ignora pessoas). */
  async search(query: string): Promise<MovieSummary[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const raw = await this.cache.getOrFetch(
      `tmdb:search:${this.cfg.language}:${q}`,
      { ttlMs: 12 * HOUR },
      () => this.request<RawList>('/search/multi', { query: q, include_adult: 'false' }),
    );
    const [movieGenres, tvGenres] = await Promise.all([this.genreNames('movie'), this.genreNames('tv')]);
    return raw.results
      .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
      .map((r) => {
        const mt = r.media_type as MediaType;
        return this.summarize(r, mt, mt === 'tv' ? tvGenres : movieGenres);
      });
  }

  // ---------- Detalhes ----------

  private cast(raw: RawCredits['cast'], limit = 12): CastMember[] {
    return (raw ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .slice(0, limit)
      .map((c) => ({ name: c.name, character: c.character ?? '', photoUrl: this.image(c.profile_path, 'w185') }));
  }

  /** Detalhes completos (com elenco e IDs externos) de um filme ou série – cache de 7 dias. */
  async details(ref: TitleRef): Promise<MovieDetails> {
    const { mediaType, id } = ref;
    const raw = await this.cache.getOrFetch(
      `tmdb:${mediaType}:${this.cfg.language}:${id}`,
      { ttlMs: 7 * DAY },
      () => this.request<RawDetails>(`/${mediaType}/${id}`, { append_to_response: 'credits,external_ids' }),
    );
    const isTv = mediaType === 'tv';
    const genreMap = await this.genreNames(mediaType);
    const base = this.summarize({ ...raw, genre_ids: (raw.genres ?? []).map((g) => g.id) }, mediaType, genreMap);
    const seasons: SeasonSummary[] = isTv
      ? (raw.seasons ?? [])
          .filter((s) => (s.episode_count ?? 0) > 0)
          .map((s) => ({
            number: s.season_number,
            name: s.season_number === 0 ? 'Especiais' : `Temporada ${s.season_number}`,
            episodeCount: s.episode_count ?? 0,
            airDate: s.air_date ?? null,
            posterUrl: this.image(s.poster_path, 'w342'),
          }))
          .sort((a, b) => (a.number === 0 ? 1 : b.number === 0 ? -1 : a.number - b.number)) // especiais por último
      : [];
    return {
      ...base,
      tagline: raw.tagline ?? '',
      director: isTv ? null : (raw.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null),
      creators: isTv ? (raw.created_by ?? []).map((c) => c.name) : [],
      seasons,
      episodeCount: isTv
        ? seasons.filter((s) => s.number > 0).reduce((n, s) => n + s.episodeCount, 0) ||
          raw.number_of_episodes ||
          null
        : null,
      runtimeMinutes: (isTv ? raw.episode_run_time?.[0] || raw.last_episode_to_air?.runtime : raw.runtime) || null,
      voteCount: raw.vote_count ?? 0,
      imdbId: raw.imdb_id || raw.external_ids?.imdb_id || null,
      cast: this.cast(raw.credits?.cast),
    };
  }

  // ---------- Temporadas e episódios (séries) ----------

  private episodeSummary(e: RawEpisode): EpisodeSummary {
    return {
      season: e.season_number,
      number: e.episode_number,
      name: e.name || `Episódio ${e.episode_number}`,
      overview: e.overview ?? '',
      airDate: e.air_date ?? null,
      runtimeMinutes: e.runtime || null,
      stillUrl: this.image(e.still_path, 'w500'),
      voteAverage: e.vote_average ?? 0,
    };
  }

  /** Episódios de uma temporada (cache de 1 dia: temporadas em andamento ganham episódios novos). */
  async season(seriesId: number, season: number): Promise<{ season: SeasonSummary; episodes: EpisodeSummary[] }> {
    const raw = await this.cache.getOrFetch(
      `tmdb:season:${this.cfg.language}:${seriesId}:${season}`,
      { ttlMs: DAY },
      () => this.request<RawSeason>(`/tv/${seriesId}/season/${season}`, {}, 'Temporada não encontrada.'),
    );
    const episodes = (raw.episodes ?? []).map((e) => this.episodeSummary(e));
    return {
      season: {
        number: raw.season_number,
        name: raw.season_number === 0 ? 'Especiais' : `Temporada ${raw.season_number}`,
        episodeCount: episodes.length,
        airDate: raw.air_date ?? null,
        posterUrl: this.image(raw.poster_path, 'w342'),
      },
      episodes,
    };
  }

  /** Um episódio, com diretor e atores convidados (cache de 3 dias). */
  async episode(seriesId: number, season: number, episode: number): Promise<EpisodeDetails> {
    const raw = await this.cache.getOrFetch(
      `tmdb:episode:${this.cfg.language}:${seriesId}:${season}:${episode}`,
      { ttlMs: 3 * DAY },
      () =>
        this.request<RawEpisode>(`/tv/${seriesId}/season/${season}/episode/${episode}`, {}, 'Episódio não encontrado.'),
    );
    return {
      ...this.episodeSummary(raw),
      seriesId,
      director: raw.crew?.find((c) => c.job === 'Director')?.name ?? null,
      guestStars: this.cast(raw.guest_stars, 8),
    };
  }
}
