import type {
  EpisodeRef,
  MediaType,
  Status,
  TitleRef,
  UserEpisode,
  UserEpisodePatch,
  UserMovie,
  UserMoviePatch,
  WatchedResponse,
} from '../api/types';
import type { KeyValueStore } from './storage';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type UserStats = WatchedResponse['stats'];

// Filmes e séries ficam juntos (a chave inclui o tipo, então ids iguais não colidem).
// Episódios ficam em outra chave de armazenamento.
const MOVIES_KEY = 'user:movies:v1';
const EPISODES_KEY = 'user:episodes:v1';
const MAX_NOTE = 5000;

/** Chave estável de um título: "movie:101" ou "tv:101". */
export const refKey = (ref: TitleRef): string => `${ref.mediaType}:${ref.id}`;
export const episodeKey = (r: EpisodeRef): string => `tv:${r.seriesId}:s${r.season}e${r.episode}`;

export const emptyUserMovie = (ref: TitleRef): UserMovie => ({
  mediaType: ref.mediaType,
  tmdbId: ref.id,
  status: null,
  rating: null,
  liked: false,
  note: '',
  watchedAt: null,
});

export const emptyUserEpisode = (ref: EpisodeRef): UserEpisode => ({
  seriesId: ref.seriesId,
  season: ref.season,
  episode: ref.episode,
  status: null,
  rating: null,
  liked: false,
  note: '',
  watchedAt: null,
});

/** yyyy-mm-dd na data LOCAL do aparelho (não em UTC). */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

interface Core {
  status: Status | null;
  rating: number | null;
  liked: boolean;
  note: string;
  watchedAt: string | null;
}
interface CorePatch {
  status?: Status | null;
  rating?: number | null;
  liked?: boolean;
  note?: string;
  watchedAt?: string;
}

/**
 * Regras de edição, iguais para filmes/séries e episódios:
 * - marcar assistido grava a data de hoje; dar nota marca como assistido;
 * - desmarcar (status null) limpa nota e data;
 * - "quero ver" em algo já assistido é ignorado (não apaga a nota).
 * Episódios não têm "quero ver" (allowWatchlist = false).
 */
function applyPatch<T extends Core>(cur: T, patch: CorePatch, today: string, allowWatchlist: boolean): T {
  const next: T = { ...cur };

  if (patch.watchedAt !== undefined && !validDate(patch.watchedAt)) {
    throw new ValidationError('A data deve ser válida (aaaa-mm-dd).');
  }
  if ('status' in patch) {
    const s = patch.status;
    const ok = s === null || s === 'watched' || (allowWatchlist && s === 'watchlist');
    if (!ok) {
      throw new ValidationError(
        allowWatchlist ? "status deve ser 'watched', 'watchlist' ou null" : "status deve ser 'watched' ou null",
      );
    }
    if (s === 'watchlist' && cur.status === 'watched') {
      next.status = 'watched'; // toque errado não apaga a nota nem a data
    } else {
      next.status = s ?? null;
      if (next.status === 'watched') {
        next.watchedAt = patch.watchedAt ?? cur.watchedAt ?? today;
      } else {
        next.watchedAt = null;
        next.rating = null;
      }
    }
  } else if (patch.watchedAt !== undefined && next.status === 'watched') {
    next.watchedAt = patch.watchedAt;
  }
  if ('rating' in patch) {
    const r = patch.rating;
    if (r !== null && r !== undefined) {
      if (typeof r !== 'number' || !Number.isFinite(r) || r < 0.5 || r > 5 || (r * 2) % 1 !== 0) {
        throw new ValidationError('A nota deve ser de 0.5 a 5, em passos de 0.5.');
      }
      next.rating = r;
      if (next.status !== 'watched') {
        next.status = 'watched';
        next.watchedAt = patch.watchedAt ?? today;
      }
    } else {
      next.rating = null;
    }
  }
  if (patch.liked !== undefined) {
    if (typeof patch.liked !== 'boolean') throw new ValidationError('liked deve ser boolean');
    next.liked = patch.liked;
  }
  if (patch.note !== undefined) {
    if (typeof patch.note !== 'string') throw new ValidationError('A anotação deve ser texto.');
    if (patch.note.length > MAX_NOTE) throw new ValidationError(`A anotação passa de ${MAX_NOTE} caracteres.`);
    next.note = patch.note;
  }
  return next;
}

const isEmpty = (c: Core) => !c.status && c.rating == null && !c.liked && c.note.trim() === '';

/**
 * Dados pessoais: nota, "assistido/quero ver", coração e anotações — de filmes, séries
 * e episódios. Ficam SÓ no aparelho (AsyncStorage): não há login nem servidor.
 */
export class UserData {
  private titles: Map<string, UserMovie> | null = null;
  private episodes: Map<string, UserEpisode> | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(
    private store: KeyValueStore,
    private now: () => Date = () => new Date(),
  ) {}

  private async loadJson<T>(key: string): Promise<T[]> {
    try {
      const raw = await this.store.getItem(key);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch (err) {
      console.warn('[userdata] não consegui ler os dados salvos:', err);
      return [];
    }
  }

  private async loadTitles(): Promise<Map<string, UserMovie>> {
    if (this.titles) return this.titles;
    const map = new Map<string, UserMovie>();
    // Dados salvos antes de existirem séries não têm mediaType: eram todos filmes.
    for (const m of await this.loadJson<Partial<UserMovie> & { tmdbId: number }>(MOVIES_KEY)) {
      const full = { ...emptyUserMovie({ mediaType: m.mediaType ?? 'movie', id: m.tmdbId }), ...m } as UserMovie;
      full.mediaType = m.mediaType ?? 'movie';
      map.set(refKey({ mediaType: full.mediaType, id: full.tmdbId }), full);
    }
    this.titles ??= map; // se duas chamadas carregarem juntas, a primeira a terminar vence
    return this.titles;
  }

  private async loadEpisodes(): Promise<Map<string, UserEpisode>> {
    if (this.episodes) return this.episodes;
    const map = new Map<string, UserEpisode>();
    for (const e of await this.loadJson<UserEpisode>(EPISODES_KEY)) map.set(episodeKey(e), e);
    this.episodes ??= map;
    return this.episodes;
  }

  /** Serializa as gravações (a última sempre vence). */
  private persist(key: string, values: unknown[]): Promise<void> {
    const json = JSON.stringify(values);
    const run = this.writes.then(() => this.store.setItem(key, json));
    this.writes = run.catch(() => undefined);
    return run;
  }

  // ---------- Filmes e séries ----------

  async get(ref: TitleRef): Promise<UserMovie> {
    const map = await this.loadTitles();
    return { ...(map.get(refKey(ref)) ?? emptyUserMovie(ref)) };
  }

  async patch(ref: TitleRef, patch: UserMoviePatch): Promise<UserMovie> {
    const map = await this.loadTitles();
    const key = refKey(ref);
    const cur = map.get(key) ?? emptyUserMovie(ref);
    const next = applyPatch(cur, patch, localDate(this.now()), true);

    const had = map.get(key);
    if (isEmpty(next)) map.delete(key);
    else map.set(key, next);
    try {
      await this.persist(MOVIES_KEY, [...map.values()]);
    } catch {
      if (had) map.set(key, had);
      else map.delete(key);
      throw new Error('Não foi possível salvar no aparelho (armazenamento cheio?).');
    }
    return isEmpty(next) ? emptyUserMovie(ref) : { ...next };
  }

  /** watched: mais recentes primeiro; watchlist: adicionados por último primeiro. */
  async list(status: Status): Promise<UserMovie[]> {
    const map = await this.loadTitles();
    const items = [...map.values()].filter((m) => m.status === status);
    if (status === 'watched') items.sort((a, b) => (b.watchedAt ?? '').localeCompare(a.watchedAt ?? ''));
    else items.reverse(); // Map mantém a ordem de inserção
    return items;
  }

  /** Tudo que alimenta o perfil de gosto: filmes e séries curtidos ou com nota (episódios não entram). */
  async signals(): Promise<UserMovie[]> {
    const map = await this.loadTitles();
    return [...map.values()].filter((m) => m.liked || m.rating != null);
  }

  /** Chaves ("movie:1", "tv:1") que o usuário já tem em alguma lista (para não recomendar de novo). */
  async knownKeys(): Promise<Set<string>> {
    const map = await this.loadTitles();
    return new Set([...map.values()].filter((m) => m.status !== null).map((m) => refKey({ mediaType: m.mediaType, id: m.tmdbId })));
  }

  /** Estatísticas do diário (filmes e séries; episódios não contam). */
  async stats(): Promise<UserStats> {
    const map = await this.loadTitles();
    const year = String(this.now().getFullYear());
    const watched = [...map.values()].filter((m) => m.status === 'watched');
    const ratings = watched.map((m) => m.rating).filter((r): r is number => r != null);
    const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return {
      total: watched.length,
      thisYear: watched.filter((m) => m.watchedAt?.startsWith(year)).length,
      average: average == null ? null : Math.round(average * 10) / 10,
    };
  }

  // ---------- Episódios (separados da série) ----------

  async getEpisode(ref: EpisodeRef): Promise<UserEpisode> {
    const map = await this.loadEpisodes();
    return { ...(map.get(episodeKey(ref)) ?? emptyUserEpisode(ref)) };
  }

  async patchEpisode(ref: EpisodeRef, patch: UserEpisodePatch): Promise<UserEpisode> {
    const map = await this.loadEpisodes();
    const key = episodeKey(ref);
    const cur = map.get(key) ?? emptyUserEpisode(ref);
    const next = applyPatch(cur as UserEpisode & Core, patch, localDate(this.now()), false) as UserEpisode;

    const had = map.get(key);
    if (isEmpty(next)) map.delete(key);
    else map.set(key, next);
    try {
      await this.persist(EPISODES_KEY, [...map.values()]);
    } catch {
      if (had) map.set(key, had);
      else map.delete(key);
      throw new Error('Não foi possível salvar no aparelho (armazenamento cheio?).');
    }
    return isEmpty(next) ? emptyUserEpisode(ref) : { ...next };
  }

  /** Dados pessoais dos episódios de uma temporada (só os que têm algo). */
  async episodesOfSeason(seriesId: number, season: number): Promise<UserEpisode[]> {
    const map = await this.loadEpisodes();
    return [...map.values()].filter((e) => e.seriesId === seriesId && e.season === season);
  }

  /** Quantos episódios (sem especiais) da série estão marcados como assistidos. */
  async watchedEpisodeCount(seriesId: number): Promise<number> {
    const map = await this.loadEpisodes();
    return [...map.values()].filter((e) => e.seriesId === seriesId && e.season > 0 && e.status === 'watched').length;
  }
}

export type { MediaType };
