import type {
  Algorithm,
  DetailsResponse,
  EpisodeRef,
  EpisodeResponse,
  HomeResponse,
  HomeSectionKey,
  MediaType,
  MovieDetails,
  MovieSummary,
  RecommendationsResponse,
  SeasonResponse,
  TitleRef,
  UserEpisode,
  UserEpisodePatch,
  UserMovie,
  UserMoviePatch,
  WatchedResponse,
} from '../api/types';
import { Cache } from './cache';
import type { Config } from './config';
import { ALGORITHMS, recommend, type Signal } from './recommend';
import type { KeyValueStore } from './storage';
import { Tmdb, type ListKind } from './tmdb';
import { refKey, UserData, ValidationError } from './userdata';
import { Watchmode } from './watchmode';

const toSummary = (d: MovieDetails): MovieSummary => ({
  mediaType: d.mediaType,
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
 * Funciona para filmes, séries e episódios.
 */
export function createLibrary(cfg: Config, store: KeyValueStore, opts: LibraryOptions = {}) {
  const now = opts.now ?? Date.now;
  const cache = new Cache(store, now);
  const tmdb = new Tmdb(cfg, cache);
  const watchmode = new Watchmode(cfg, cache);
  const users = new UserData(store, () => new Date(now()));

  /** Resumos dos títulos do usuário (cache primeiro); os que falharem são ignorados. */
  async function summariesFor(refs: TitleRef[]): Promise<Map<string, MovieSummary>> {
    const settled = await Promise.allSettled(refs.map((r) => tmdb.details(r)));
    const out = new Map<string, MovieSummary>();
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') out.set(refKey(refs[i]), toSummary(r.value));
      else console.warn(`[library] não consegui carregar ${refKey(refs[i])}:`, r.reason?.message);
    });
    return out;
  }
  const refOf = (u: UserMovie): TitleRef => ({ mediaType: u.mediaType, id: u.tmdbId });

  return {
    cache,
    /** Limpeza periódica do cache antigo (chamar ao abrir o app). */
    prune: () => cache.prune(),

    /**
     * Home de filmes ou de séries: destaque + seções. Cada lista é independente: se uma
     * falhar, as outras continuam aparecendo (só dá erro se TODAS falharem).
     */
    async home(mediaType: MediaType): Promise<HomeResponse> {
      const sources: [HomeSectionKey, ListKind][] = [
        ['nowPlaying', 'now_playing'],
        ['mostWatched', 'popular'],
        ['topRated', 'top_rated'],
        ['trending', 'trending'],
      ];
      const settled = await Promise.allSettled(sources.map(([, kind]) => tmdb.list(mediaType, kind)));
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

    /** Busca filmes e séries juntos. */
    async search(query: string): Promise<{ results: MovieSummary[] }> {
      return { results: (await tmdb.search(query)).filter((m) => m.posterUrl) };
    },

    /** TMDB primeiro (sem ele o título não existe); Watchmode depois, sem derrubar a tela. */
    async title(ref: TitleRef): Promise<DetailsResponse> {
      const movie = await tmdb.details(ref);
      const wm = await watchmode.info(ref);
      return {
        movie,
        watchmode: wm,
        user: await users.get(ref),
        watchedEpisodes: ref.mediaType === 'tv' ? await users.watchedEpisodeCount(ref.id) : 0,
      };
    },

    async updateTitle(ref: TitleRef, patch: UserMoviePatch): Promise<{ user: UserMovie }> {
      return { user: await users.patch(ref, patch) };
    },

    // ---------- Temporadas e episódios ----------

    /** Episódios de uma temporada + o que o usuário já marcou neles. */
    async season(seriesId: number, season: number): Promise<SeasonResponse> {
      const [data, user] = await Promise.all([tmdb.season(seriesId, season), users.episodesOfSeason(seriesId, season)]);
      return { season: data.season, episodes: data.episodes, user };
    },

    /** Um episódio. O streaming mostrado é o da série (o Watchmode não tem fonte por episódio). */
    async episode(ref: EpisodeRef): Promise<EpisodeResponse> {
      const seriesRef: TitleRef = { mediaType: 'tv', id: ref.seriesId };
      const [episode, series] = await Promise.all([
        tmdb.episode(ref.seriesId, ref.season, ref.episode),
        tmdb.details(seriesRef),
      ]);
      return {
        series: toSummary(series),
        episode,
        watchmode: await watchmode.info(seriesRef),
        user: await users.getEpisode(ref),
      };
    },

    async updateEpisode(ref: EpisodeRef, patch: UserEpisodePatch): Promise<{ user: UserEpisode }> {
      return { user: await users.patchEpisode(ref, patch) };
    },

    // ---------- Diário, lista e recomendações (filmes e séries juntos) ----------

    async watched(): Promise<WatchedResponse> {
      const entries = await users.list('watched');
      const movies = await summariesFor(entries.map(refOf));
      return {
        stats: await users.stats(),
        entries: entries
          .filter((e) => movies.has(refKey(refOf(e))) && e.watchedAt)
          .map((e) => ({
            movie: movies.get(refKey(refOf(e)))!,
            rating: e.rating,
            liked: e.liked,
            watchedAt: e.watchedAt as string,
          })),
      };
    },

    async watchlist(): Promise<{ movies: MovieSummary[] }> {
      const entries = await users.list('watchlist');
      const movies = await summariesFor(entries.map(refOf));
      return {
        movies: entries.filter((e) => movies.has(refKey(refOf(e)))).map((e) => movies.get(refKey(refOf(e)))!),
      };
    },

    async recommendations(algorithm: Algorithm = 'weighted', limit = 12): Promise<RecommendationsResponse> {
      if (!ALGORITHMS.includes(algorithm)) {
        throw new ValidationError(`algorithm deve ser um de: ${ALGORITHMS.join(', ')}`);
      }

      // 1) Perfil: gêneros dos filmes e séries curtidos/avaliados (episódios não entram).
      const signalRows = await users.signals();
      const signalMovies = await summariesFor(signalRows.map(refOf));
      const signals: Signal[] = signalRows
        .filter((s) => signalMovies.has(refKey(refOf(s))))
        .map((s) => ({ genres: signalMovies.get(refKey(refOf(s)))!.genres, liked: s.liked, rating: s.rating }));

      // 2) Candidatos: listas do TMDB de filmes E séries (em cache), sem o que o usuário já tem.
      const kinds: [ListKind, number][] = [
        ['popular', 1],
        ['popular', 2],
        ['top_rated', 1],
        ['top_rated', 2],
        ['now_playing', 1],
      ];
      const lists = await Promise.allSettled(
        (['movie', 'tv'] as MediaType[]).flatMap((mt) => kinds.map(([kind, page]) => tmdb.list(mt, kind, page))),
      );
      const known = await users.knownKeys();
      const pool = new Map<string, MovieSummary>();
      let failure: unknown;
      for (const r of lists) {
        if (r.status === 'rejected') failure = r.reason;
        else for (const m of r.value) if (!known.has(refKey(m)) && m.posterUrl) pool.set(refKey(m), m);
      }
      if (pool.size === 0 && failure) throw failure;

      const result = recommend(
        signals,
        [...pool.entries()].map(([key, m]) => ({ id: key, genres: m.genres, voteAverage: m.voteAverage })),
        algorithm,
        limit,
      );
      return {
        algorithm,
        coldStart: result.coldStart,
        profile: Object.entries(result.profile)
          .sort((a, b) => b[1] - a[1])
          .map(([genre, value]) => ({ genre, value: Math.round(value * 10) / 10 })),
        items: result.items.map((i) => ({
          movie: pool.get(String(i.id))!,
          score: i.score,
          matchPercent: i.matchPercent,
          because: i.because,
        })),
      };
    },
  };
}

export type Library = ReturnType<typeof createLibrary>;
