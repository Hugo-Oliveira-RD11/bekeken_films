import type { SourceType, StreamingSource, WatchmodeInfo } from '../api/types';
import { Cache, DAY, HOUR } from './cache';
import type { Config } from './config';
import { getJson, HttpError } from './http';

interface RawSearch {
  title_results?: { id: number }[];
}
interface RawDetails {
  user_rating?: number | null;
  critic_score?: number | null;
}
interface RawSource {
  source_id: number;
  name: string;
  type: string;
  region?: string;
  web_url?: string | null;
  format?: string | null;
  price?: number | null;
}
interface RawCatalog {
  id: number;
  logo_100px?: string | null;
}

const TYPE_ORDER: SourceType[] = ['sub', 'free', 'rent', 'buy'];

export class Watchmode {
  constructor(
    private cfg: Config,
    private cache: Cache,
  ) {}

  get configured(): boolean {
    return this.cfg.watchmodeApiKey !== '';
  }

  private request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(this.cfg.watchmodeBaseUrl + path);
    url.searchParams.set('apiKey', this.cfg.watchmodeApiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return getJson<T>(url);
  }

  /** TMDB id -> id interno do Watchmode (cache de 30 dias; "não achei" dura 1 dia). */
  private resolveId(tmdbId: number): Promise<number | null> {
    return this.cache.getOrFetch(`wm:id:${tmdbId}`, { ttlMs: 30 * DAY, nullTtlMs: DAY }, async () => {
      const raw = await this.request<RawSearch>('/search/', {
        search_field: 'tmdb_movie_id',
        search_value: String(tmdbId),
      });
      return raw.title_results?.[0]?.id ?? null;
    });
  }

  /** Logos dos serviços (uma chamada só, cache de 30 dias). */
  private async logos(): Promise<Map<number, string>> {
    const raw = await this.cache.getOrFetch(`wm:catalog`, { ttlMs: 30 * DAY }, () =>
      this.request<RawCatalog[]>('/sources/'),
    );
    return new Map(raw.filter((s) => s.logo_100px).map((s) => [s.id, s.logo_100px as string]));
  }

  /**
   * Onde assistir + notas. Nunca lança: se o Watchmode falhar (limite de uso, sem rede),
   * devolve status "unavailable" e a tela segue funcionando só com o TMDB.
   */
  async info(tmdbId: number): Promise<WatchmodeInfo> {
    const region = this.cfg.region;
    const base: WatchmodeInfo = { status: 'ok', region, userRating: null, criticScore: null, sources: [] };
    if (!this.configured) return { ...base, status: 'no_key' };

    try {
      const wmId = await this.resolveId(tmdbId);
      if (wmId == null) return { ...base, status: 'not_found' };

      const [details, rawSources, logos] = await Promise.all([
        this.cache.getOrFetch(`wm:details:${wmId}`, { ttlMs: 7 * DAY }, () =>
          this.request<RawDetails>(`/title/${wmId}/details/`),
        ),
        this.cache.getOrFetch(`wm:sources:${wmId}:${region}`, { ttlMs: 12 * HOUR }, () =>
          this.request<RawSource[]>(`/title/${wmId}/sources/`, { regions: region }),
        ),
        // Logo é só enfeite: se falhar, seguimos sem.
        this.logos().catch(() => new Map<number, string>()),
      ]);

      return {
        status: 'ok',
        region,
        userRating: details.user_rating ?? null,
        criticScore: details.critic_score ?? null,
        sources: dedupeSources(rawSources, logos),
      };
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 0;
      console.warn(`[watchmode] indisponível para tmdb ${tmdbId} (${status || 'rede'}):`, (err as Error).message);
      return { ...base, status: 'unavailable' };
    }
  }
}

/** Mantém 1 entrada por (serviço, tipo), preferindo o menor preço, ordenado por tipo. */
export function dedupeSources(raw: RawSource[], logos: Map<number, string>): StreamingSource[] {
  const byKey = new Map<string, StreamingSource>();
  for (const s of raw) {
    if (!TYPE_ORDER.includes(s.type as SourceType)) continue;
    const item: StreamingSource = {
      id: s.source_id,
      name: s.name,
      type: s.type as SourceType,
      price: s.price ?? null,
      format: s.format ?? null,
      webUrl: s.web_url ?? null,
      logoUrl: logos.get(s.source_id) ?? null,
    };
    const key = `${item.id}:${item.type}`;
    const prev = byKey.get(key);
    if (!prev || (item.price ?? Infinity) < (prev.price ?? Infinity)) byKey.set(key, item);
  }
  return [...byKey.values()].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name),
  );
}
