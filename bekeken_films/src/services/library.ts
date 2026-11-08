import type {
  Algorithm,
  DetailsResponse,
  HomeResponse,
  HomeSectionKey,
  MovieDetails,
  MovieSummary,
  RecommendationsResponse,
  UserMovie,
  UserMoviePatch,
  WatchedResponse,
} from '../api/types';
import { Cache } from './cache';
import type { Config } from './config';
import { ALGORITHMS, recommend, type Signal } from './recommend';
import type { KeyValueStore } from './storage';
import { Tmdb, type ListKind } from './tmdb';
import { UserData, ValidationError } from './userdata';
import { Watchmode } from './watchmode';

const toSummary = (d: MovieDetails): MovieSummary => ({
  id: d.id,
  title: d.title,
  year: d.year,
  overview: d.overview,
  posterUrl: d.posterUrl,
  backdropUrl: d.backdropUrl,
  voteAverage: d.voteAverage,
  genres: d.genres,
});

export interface LibraryOptions {
  /** Relógio injetável (testes). */
  now?: () => number;
}

/**
 * Tudo que o app precisa, rodando dentro do próprio app:
 * TMDB + Watchmode (sempre via cache), dados pessoais no aparelho e recomendações.
 */
export function createLibrary(cfg: Config, store: KeyValueStore, opts: LibraryOptions = {}) {
  const now = opts.now ?? Date.now;
  const cache = new Cache(store, now);
  const tmdb = new Tmdb(cfg, cache);
  const watchmode = new Watchmode(cfg, cache);
  const users = new UserData(store, () => new Date(now()));

  /** Resumos dos filmes do usuário (cache primeiro); os que falharem são ignorados. */
  async function summariesFor(ids: number[]): Promise<Map<number, MovieSummary>> {
    const settled = await Promise.allSettled(ids.map((id) => tmdb.details(id)));
    const out = new Map<number, MovieSummary>();
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') out.set(ids[i], toSummary(r.value));
      else console.warn(`[library] não consegui carregar o filme ${ids[i]}:`, r.reason?.message);
    });
    return out;
  }

  return {
    cache,
    /** Limpeza periódica do cache antigo (chamar ao abrir o app). */
    prune: () => cache.prune(),

    /**
     * Home: destaque + seções. Cada lista é independente: se uma falhar, as outras
     * continuam aparecendo (só dá erro se TODAS falharem). Tudo passa pelo cache.
     */
    async home(): Promise<HomeResponse> {
      const sources: [HomeSectionKey, ListKind][] = [
        ['nowPlaying', 'now_playing'],
        ['mostWatched', 'popular'],
        ['topRated', 'top_rated'],
        ['trending', 'trending'],
      ];
      const settled = await Promise.allSettled(sources.map(([, kind]) => tmdb.list(kind)));
      const lists = new Map<HomeSectionKey, MovieSummary[]>();
      let failure: unknown;
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') lists.set(sources[i][0], r.value);
        else failure ??= r.reason;
      });
      if (lists.size === 0) throw failure;

      const featured =
        [lists.get('trending'), lists.get('nowPlaying'), lists.get('mostWatched')]
          .flatMap((l) => l ?? [])
          .find((m) => m.backdropUrl && m.overview) ?? null;

      const sections = sources
        .map(([key]) => ({
          key,
          movies: (lists.get(key) ?? []).filter((m) => m.id !== featured?.id && m.posterUrl),
        }))
        .filter((s) => s.movies.length > 0);
      return { featured, sections };
    },

    async search(query: string): Promise<{ results: MovieSummary[] }> {
      return { results: (await tmdb.search(query)).filter((m) => m.posterUrl) };
    },

    /** TMDB primeiro (sem ele o filme não existe); Watchmode depois, sem derrubar a tela. */
    async movie(id: number): Promise<DetailsResponse> {
      const movie = await tmdb.details(id);
      const wm = await watchmode.info(id);
      return { movie, watchmode: wm, user: await users.get(id) };
    },

    async updateMovie(id: number, patch: UserMoviePatch): Promise<{ user: UserMovie }> {
      return { user: await users.patch(id, patch) };
    },

    async watched(): Promise<WatchedResponse> {
      const entries = await users.list('watched');
      const movies = await summariesFor(entries.map((e) => e.tmdbId));
      return {
        stats: await users.stats(),
        entries: entries
          .filter((e) => movies.has(e.tmdbId) && e.watchedAt)
          .map((e) => ({
            movie: movies.get(e.tmdbId)!,
            rating: e.rating,
            liked: e.liked,
            watchedAt: e.watchedAt as string,
          })),
      };
    },

    async watchlist(): Promise<{ movies: MovieSummary[] }> {
      const entries = await users.list('watchlist');
      const movies = await summariesFor(entries.map((e) => e.tmdbId));
      return { movies: entries.filter((e) => movies.has(e.tmdbId)).map((e) => movies.get(e.tmdbId)!) };
    },

    async recommendations(algorithm: Algorithm = 'weighted', limit = 12): Promise<RecommendationsResponse> {
      if (!ALGORITHMS.includes(algorithm)) {
        throw new ValidationError(`algorithm deve ser um de: ${ALGORITHMS.join(', ')}`);
      }

      // 1) Perfil: gêneros dos filmes curtidos/avaliados.
      const signalRows = await users.signals();
      const signalMovies = await summariesFor(signalRows.map((s) => s.tmdbId));
      const signals: Signal[] = signalRows
        .filter((s) => signalMovies.has(s.tmdbId))
        .map((s) => ({ genres: signalMovies.get(s.tmdbId)!.genres, liked: s.liked, rating: s.rating }));

      // 2) Candidatos: listas do TMDB (em cache), sem o que o usuário já tem.
      const lists = await Promise.allSettled([
        tmdb.list('popular', 1),
        tmdb.list('popular', 2),
        tmdb.list('top_rated', 1),
        tmdb.list('top_rated', 2),
        tmdb.list('now_playing', 1),
      ]);
      const known = await users.knownIds();
      const pool = new Map<number, MovieSummary>();
      let failure: unknown;
      for (const r of lists) {
        if (r.status === 'rejected') failure = r.reason;
        else for (const m of r.value) if (!known.has(m.id) && m.posterUrl) pool.set(m.id, m);
      }
      if (pool.size === 0 && failure) throw failure;

      const result = recommend(signals, [...pool.values()], algorithm, limit);
      return {
        algorithm,
        coldStart: result.coldStart,
        profile: Object.entries(result.profile)
          .sort((a, b) => b[1] - a[1])
          .map(([genre, value]) => ({ genre, value: Math.round(value * 10) / 10 })),
        items: result.items.map((i) => ({
          movie: pool.get(i.id)!,
          score: i.score,
          matchPercent: i.matchPercent,
          because: i.because,
        })),
      };
    },
  };
}

export type Library = ReturnType<typeof createLibrary>;
