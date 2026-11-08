import type { Status, UserMovie, UserMoviePatch, WatchedResponse } from '../api/types';
import type { KeyValueStore } from './storage';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type UserStats = WatchedResponse['stats'];

const KEY = 'user:movies:v1';
const MAX_NOTE = 5000;

export const emptyUserMovie = (tmdbId: number): UserMovie => ({
  tmdbId,
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

/**
 * Dados pessoais: nota, "assistido/quero ver", coração e anotações.
 * Ficam SÓ no aparelho (AsyncStorage) — não há login nem servidor, então ninguém mais vê.
 */
export class UserData {
  private data: Map<number, UserMovie> | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(
    private store: KeyValueStore,
    private now: () => Date = () => new Date(),
  ) {}

  private async load(): Promise<Map<number, UserMovie>> {
    if (this.data) return this.data;
    const map = new Map<number, UserMovie>();
    try {
      const raw = await this.store.getItem(KEY);
      if (raw) for (const m of JSON.parse(raw) as UserMovie[]) map.set(m.tmdbId, m);
    } catch (err) {
      console.warn('[userdata] não consegui ler os dados salvos:', err);
    }
    // Se duas chamadas carregarem ao mesmo tempo, a primeira a terminar vence.
    this.data ??= map;
    return this.data;
  }

  private persist(map: Map<number, UserMovie>): Promise<void> {
    const json = JSON.stringify([...map.values()]);
    // Serializa as gravações para a última sempre vencer.
    const run = this.writes.then(() => this.store.setItem(KEY, json));
    this.writes = run.catch(() => undefined);
    return run;
  }

  async get(tmdbId: number): Promise<UserMovie> {
    const map = await this.load();
    return { ...(map.get(tmdbId) ?? emptyUserMovie(tmdbId)) };
  }

  /** Atualização parcial; só os campos enviados mudam. */
  async patch(tmdbId: number, patch: UserMoviePatch): Promise<UserMovie> {
    const map = await this.load();
    const cur = map.get(tmdbId) ?? emptyUserMovie(tmdbId);
    const next: UserMovie = { ...cur };
    const today = localDate(this.now());

    if (patch.watchedAt !== undefined && !validDate(patch.watchedAt)) {
      throw new ValidationError('A data deve ser válida (aaaa-mm-dd).');
    }
    if ('status' in patch) {
      const s = patch.status;
      if (s !== null && s !== 'watched' && s !== 'watchlist') {
        throw new ValidationError("status deve ser 'watched', 'watchlist' ou null");
      }
      if (s === 'watchlist' && cur.status === 'watched') {
        // "Quero ver" num filme já assistido não faz sentido: mantém como assistido
        // (assim um toque errado não apaga a nota nem a data).
        next.status = 'watched';
      } else {
        next.status = s ?? null;
        if (next.status === 'watched') {
          next.watchedAt = patch.watchedAt ?? cur.watchedAt ?? today;
        } else {
          // Saiu de "assistido" (status null): a nota e a data deixam de fazer sentido.
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
        // Dar nota implica que o filme foi assistido.
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
      if (patch.note.length > MAX_NOTE) {
        throw new ValidationError(`A anotação passa de ${MAX_NOTE} caracteres.`);
      }
      next.note = patch.note;
    }

    const empty = !next.status && next.rating == null && !next.liked && next.note.trim() === '';
    const hadBefore = map.has(tmdbId);
    if (empty) map.delete(tmdbId);
    else map.set(tmdbId, next);

    try {
      await this.persist(map);
    } catch (err) {
      // Não conseguiu gravar no aparelho: desfaz na memória para não mostrar algo que não ficou salvo.
      if (hadBefore) map.set(tmdbId, cur);
      else map.delete(tmdbId);
      throw new Error('Não foi possível salvar no aparelho (armazenamento cheio?).');
    }
    return empty ? emptyUserMovie(tmdbId) : { ...next };
  }

  /** watched: mais recentes primeiro; watchlist: adicionados por último primeiro. */
  async list(status: Status): Promise<UserMovie[]> {
    const map = await this.load();
    const items = [...map.values()].filter((m) => m.status === status);
    if (status === 'watched') {
      items.sort((a, b) => (b.watchedAt ?? '').localeCompare(a.watchedAt ?? ''));
    } else {
      items.reverse(); // Map mantém a ordem de inserção
    }
    return items;
  }

  /** Tudo que alimenta o perfil de gosto: curtidos ou com nota. */
  async signals(): Promise<UserMovie[]> {
    const map = await this.load();
    return [...map.values()].filter((m) => m.liked || m.rating != null);
  }

  /** IDs que o usuário já tem em alguma lista (para não recomendar de novo). */
  async knownIds(): Promise<Set<number>> {
    const map = await this.load();
    return new Set([...map.values()].filter((m) => m.status !== null).map((m) => m.tmdbId));
  }

  async stats(): Promise<UserStats> {
    const map = await this.load();
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
}
