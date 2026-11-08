export interface Config {
  tmdbApiKey: string;
  watchmodeApiKey: string;
  region: string;
  language: string;
  tmdbBaseUrl: string;
  tmdbImageBase: string;
  watchmodeBaseUrl: string;
}

type Env = Record<string, string | undefined>;

export function loadConfig(env: Env): Config {
  return {
    tmdbApiKey: (env.EXPO_PUBLIC_TMDB_API_KEY ?? '').trim(),
    watchmodeApiKey: (env.EXPO_PUBLIC_WATCHMODE_API_KEY ?? '').trim(),
    region: (env.EXPO_PUBLIC_REGION ?? 'BR').trim().toUpperCase() || 'BR',
    language: (env.EXPO_PUBLIC_LANGUAGE ?? 'pt-BR').trim() || 'pt-BR',
    // Sobrescrevíveis só para desenvolvimento/testes (servidor falso das APIs).
    tmdbBaseUrl: env.EXPO_PUBLIC_TMDB_BASE_URL?.trim() || 'https://api.themoviedb.org/3',
    tmdbImageBase: env.EXPO_PUBLIC_TMDB_IMAGE_BASE?.trim() || 'https://image.tmdb.org/t/p',
    watchmodeBaseUrl: env.EXPO_PUBLIC_WATCHMODE_BASE_URL?.trim() || 'https://api.watchmode.com/v1',
  };
}
