/**
 * Recomendação simples baseada em gêneros. Dois algoritmos:
 *
 * 1) "count"    – Contagem de gêneros.
 *    Cada filme CURTIDO soma 1 em cada um dos seus gêneros.
 *    Ex.: {Drama: 3, Ficção: 2, Terror: 0}
 *
 * 2) "weighted" – Perfil ponderado por nota.
 *    Igual ao anterior, mas cada filme soma a SUA NOTA (um 5 pesa mais que um 3).
 *    Curtido sem nota (só coração) conta como 4.
 *    Ex.: {Drama: 13.5, Ficção: 9, Terror: 0}
 *
 * "Curtido" = deu coração OU deu nota >= 3.
 *
 * Nota do candidato = média do valor do perfil nos gêneros dele (média, e não soma,
 * para não favorecer filmes só por terem muitos gêneros). Empate -> maior nota do TMDB.
 */

export type Algorithm = 'count' | 'weighted';

export const ALGORITHMS: Algorithm[] = ['count', 'weighted'];

/** Um filme sobre o qual o usuário já se manifestou. */
export interface Signal {
  genres: string[];
  liked: boolean;
  rating: number | null;
}

/** Chave que identifica um título (ex.: "movie:101"); pode ser número em testes. */
export type Id = string | number;

export interface Candidate {
  id: Id;
  genres: string[];
  voteAverage: number;
}

export interface Scored {
  id: Id;
  /** Nota bruta (unidade do perfil). */
  score: number;
  /** 0–100: nota relativa ao gênero mais forte do perfil. null quando não há perfil. */
  matchPercent: number | null;
  /** Gêneros do filme que mais pesam no perfil. */
  because: string[];
}

export type Profile = Record<string, number>;

const HEART_ONLY_WEIGHT = 4;
export const LIKE_THRESHOLD = 3;

export const isLiked = (s: Signal): boolean =>
  s.liked || (s.rating != null && s.rating >= LIKE_THRESHOLD);

export function buildProfile(signals: Signal[], algorithm: Algorithm): Profile {
  const profile: Profile = {};
  for (const s of signals) {
    if (!isLiked(s)) continue;
    const weight = algorithm === 'count' ? 1 : (s.rating ?? HEART_ONLY_WEIGHT);
    for (const g of new Set(s.genres)) profile[g] = (profile[g] ?? 0) + weight;
  }
  return profile;
}

export function recommend(
  signals: Signal[],
  candidates: Candidate[],
  algorithm: Algorithm,
  limit = 12,
): { profile: Profile; items: Scored[]; coldStart: boolean } {
  const profile = buildProfile(signals, algorithm);
  const max = Math.max(0, ...Object.values(profile));
  const coldStart = max === 0;

  if (coldStart) {
    // Sem histórico: sugere os mais bem avaliados.
    const items = [...candidates]
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, limit)
      .map((c) => ({ id: c.id, score: 0, matchPercent: null, because: [] }));
    return { profile, items, coldStart };
  }

  const items = candidates
    .map((c) => {
      const genres = [...new Set(c.genres)];
      const sum = genres.reduce((acc, g) => acc + (profile[g] ?? 0), 0);
      const score = genres.length ? sum / genres.length : 0;
      const because = genres
        .filter((g) => (profile[g] ?? 0) > 0)
        .sort((a, b) => profile[b] - profile[a])
        .slice(0, 2);
      return { c, score, because };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.c.voteAverage - a.c.voteAverage)
    .slice(0, limit)
    .map(({ c, score, because }) => ({
      id: c.id,
      score: Math.round(score * 100) / 100,
      matchPercent: Math.min(100, Math.round((score / max) * 100)),
      because,
    }));

  return { profile, items, coldStart };
}
