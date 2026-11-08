import { loadConfig } from '../services/config';
import { appStorage } from '../services/appStorage';
import { createLibrary } from '../services/library';

// Não existe servidor: o app chama o TMDB e o Watchmode direto, guarda o cache
// e os dados pessoais no próprio aparelho.
//
// ATENÇÃO: o Expo só embute variáveis lidas como `process.env.EXPO_PUBLIC_X` (acesso direto),
// por isso cada uma é listada aqui em vez de passar `process.env` inteiro.
const config = loadConfig({
  EXPO_PUBLIC_TMDB_API_KEY: process.env.EXPO_PUBLIC_TMDB_API_KEY,
  EXPO_PUBLIC_WATCHMODE_API_KEY: process.env.EXPO_PUBLIC_WATCHMODE_API_KEY,
  EXPO_PUBLIC_REGION: process.env.EXPO_PUBLIC_REGION,
  EXPO_PUBLIC_LANGUAGE: process.env.EXPO_PUBLIC_LANGUAGE,
  // só para desenvolvimento com o servidor falso (npm run stub):
  EXPO_PUBLIC_TMDB_BASE_URL: process.env.EXPO_PUBLIC_TMDB_BASE_URL,
  EXPO_PUBLIC_TMDB_IMAGE_BASE: process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE,
  EXPO_PUBLIC_WATCHMODE_BASE_URL: process.env.EXPO_PUBLIC_WATCHMODE_BASE_URL,
});

export const library = createLibrary(config, appStorage);

// Mesmos nomes de antes, então as telas não precisam mudar.
export const api = {
  home: () => library.home(),
  search: (q: string) => library.search(q),
  movie: (id: number) => library.movie(id),
  updateMovie: library.updateMovie,
  watched: () => library.watched(),
  watchlist: () => library.watchlist(),
  recommendations: (algorithm: Parameters<typeof library.recommendations>[0]) =>
    library.recommendations(algorithm),
};
