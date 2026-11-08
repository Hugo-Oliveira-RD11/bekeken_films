import type { KeyValueStore } from './storage';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const PREFIX = 'cache:';

export interface CacheOptions {
  /** Tempo de vida do dado em milissegundos. */
  ttlMs: number;
  /** TTL usado quando o resultado é null (ex.: filme que o Watchmode não conhece). */
  nullTtlMs?: number;
}

interface Entry {
  v: unknown;
  /** timestamp (ms) em que o dado expira */
  exp: number;
}

/**
 * Cache no aparelho (o "redis" do app). Regra: SEMPRE consulta o cache primeiro.
 *  1. Dado válido        -> devolve sem chamar a API.
 *  2. Ausente/expirado   -> chama a API e grava o resultado.
 *  3. API falhou         -> devolve o dado expirado (se existir) em vez de dar erro.
 * Chamadas simultâneas para a mesma chave compartilham uma única requisição.
 */
export class Cache {
  private mem = new Map<string, Entry>();
  private inflight = new Map<string, Promise<unknown>>();
  readonly stats = { hits: 0, misses: 0, stale: 0 };

  constructor(
    private store: KeyValueStore,
    private now: () => number = Date.now,
  ) {}

  private async read(key: string): Promise<Entry | undefined> {
    const cached = this.mem.get(key);
    if (cached) return cached;
    try {
      const raw = await this.store.getItem(PREFIX + key);
      if (!raw) return undefined;
      const entry = JSON.parse(raw) as Entry;
      if (typeof entry?.exp !== 'number') return undefined;
      this.mem.set(key, entry);
      return entry;
    } catch {
      return undefined; // dado corrompido: trata como ausente
    }
  }

  private async write(key: string, value: unknown, ttlMs: number): Promise<void> {
    const entry: Entry = { v: value ?? null, exp: this.now() + ttlMs };
    this.mem.set(key, entry);
    try {
      await this.store.setItem(PREFIX + key, JSON.stringify(entry));
    } catch (err) {
      // Disco cheio etc.: o dado continua válido em memória; não derruba a requisição.
      console.warn('[cache] não consegui gravar', key, err);
    }
  }

  getOrFetch<T>(key: string, options: CacheOptions, fetcher: () => Promise<T>): Promise<T> {
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;
    const run = this.resolve(key, options, fetcher).finally(() => this.inflight.delete(key));
    this.inflight.set(key, run);
    return run;
  }

  private async resolve<T>(key: string, options: CacheOptions, fetcher: () => Promise<T>): Promise<T> {
    const entry = await this.read(key);
    if (entry && entry.exp > this.now()) {
      this.stats.hits++;
      return entry.v as T;
    }
    this.stats.misses++;
    try {
      const value = await fetcher();
      const ttl = value == null ? (options.nullTtlMs ?? options.ttlMs) : options.ttlMs;
      await this.write(key, value, ttl);
      return value;
    } catch (err) {
      if (entry) {
        this.stats.stale++;
        console.warn(`[cache] API falhou para "${key}", usando dado expirado:`, (err as Error).message);
        return entry.v as T;
      }
      throw err;
    }
  }

  /** Apaga entradas vencidas há mais de `graceMs` (mantém um tempo para o fallback "stale"). */
  async prune(graceMs = 30 * DAY): Promise<number> {
    const keys = (await this.store.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const dead: string[] = [];
    for (const k of keys) {
      try {
        const raw = await this.store.getItem(k);
        const entry = raw ? (JSON.parse(raw) as Entry) : null;
        if (!entry || typeof entry.exp !== 'number' || entry.exp + graceMs < this.now()) dead.push(k);
      } catch {
        dead.push(k);
      }
    }
    if (dead.length) await this.store.multiRemove(dead);
    return dead.length;
  }
}
