// Dados de teste (mock). Posters são placeholders em gradiente.
// Quando houver backend, basta trocar essa fonte por chamadas de API.

export type Movie = {
  id: string;
  title: string;
  year: number;
  director: string;
  duration: string;
  genres: string[];
  rating: number; // 0–5
  tomato: number; // 0–100
  synopsis: string;
  // cores do poster placeholder: [topo, meio, base]
  poster: [string, string, string];
  // emoji/ícone decorativo do poster
  glyph: string;
};

export type WatchedEntry = {
  id: string;
  movieId: string;
  date: string; // ISO yyyy-mm-dd
  rating: number;
};

export const movies: Movie[] = [
  {
    id: 'duas-luas',
    title: 'Duas Luas',
    year: 2025,
    director: 'Kenji Arata',
    duration: '2h 34m',
    genres: ['Ficção científica', 'Drama'],
    rating: 5,
    tomato: 97,
    synopsis:
      'A última sobrevivente de uma missão a um planeta vermelho precisa decidir se volta para casa ou fica para descobrir o que se esconde sob as dunas.',
    poster: ['#2B1A22', '#8A3B1E', '#D9702E'],
    glyph: '🌑',
  },
  {
    id: 'ultima-estrada',
    title: 'A Última Estrada',
    year: 2024,
    director: 'Marta Vilela',
    duration: '1h 52m',
    genres: ['Drama', 'Aventura'],
    rating: 4,
    tomato: 87,
    synopsis:
      'Dois irmãos cruzam o deserto num conversível antigo para espalhar as cinzas do pai, e descobrem segredos que a família enterrou por décadas.',
    poster: ['#D65A1F', '#F08A2E', '#5B2A1A'],
    glyph: '🌅',
  },
  {
    id: 'valsa-das-velas',
    title: 'Valsa das Velas',
    year: 2023,
    director: 'Isabelle Moreau',
    duration: '2h 08m',
    genres: ['Romance', 'Época'],
    rating: 4,
    tomato: 89,
    synopsis:
      'Em um baile à luz de velas no século XIX, uma dança muda o destino de dois estranhos que jamais deveriam se encontrar.',
    poster: ['#3A2418', '#8C5A32', '#E0B27A'],
    glyph: '🕯️',
  },
  {
    id: 'farol',
    title: 'O Farol Sem Luz',
    year: 2024,
    director: 'Anders Holm',
    duration: '1h 47m',
    genres: ['Suspense', 'Mistério'],
    rating: 4,
    tomato: 92,
    synopsis:
      'Um faroleiro novato percebe que a luz do farol só se acende quando alguém está prestes a desaparecer no mar.',
    poster: ['#0B1A2B', '#1F4A63', '#E0C080'],
    glyph: '🗼',
  },
  {
    id: 'outono-praga',
    title: 'Outono em Praga',
    year: 2022,
    director: 'Lenka Dvořák',
    duration: '1h 58m',
    genres: ['Romance', 'Drama'],
    rating: 4.5,
    tomato: 94,
    synopsis:
      'Uma restauradora de livros raros encontra cartas escondidas numa encadernação e decide seguir o rastro de um amor interrompido.',
    poster: ['#4A2410', '#B8651F', '#F0B060'],
    glyph: '🍂',
  },
  {
    id: 'sal-e-sombra',
    title: 'Sal e Sombra',
    year: 2025,
    director: 'Rafael Quintana',
    duration: '2h 15m',
    genres: ['Crime', 'Drama'],
    rating: 3.5,
    tomato: 81,
    synopsis:
      'Num vilarejo costeiro, um pescador aposentado é arrastado de volta ao crime quando uma antiga dívida finalmente chega.',
    poster: ['#10181C', '#2B3A40', '#8FA3A8'],
    glyph: '⚓',
  },
  {
    id: 'cafe-meia-noite',
    title: 'Café à Meia-Noite',
    year: 2021,
    director: 'Yuki Tanabe',
    duration: '1h 41m',
    genres: ['Comédia', 'Romance'],
    rating: 4,
    tomato: 90,
    synopsis:
      'Numa cafeteria que só abre de madrugada, personagens solitários descobrem que todos buscam a mesma coisa: alguém para conversar.',
    poster: ['#1D1020', '#5A2A4A', '#D08A9A'],
    glyph: '☕',
  },
  {
    id: 'ecos',
    title: 'Ecos do Vale',
    year: 2023,
    director: 'Tomás Beltrán',
    duration: '2h 02m',
    genres: ['Terror', 'Suspense'],
    rating: 3.5,
    tomato: 76,
    synopsis:
      'Uma equipe de geólogos ouve a própria voz ecoando de volta do vale com palavras que nunca disseram.',
    poster: ['#0D1410', '#24402F', '#7FA58A'],
    glyph: '🌲',
  },
  {
    id: 'ultimo-ato',
    title: 'O Último Ato',
    year: 2020,
    director: 'Helena Prado',
    duration: '2h 20m',
    genres: ['Drama'],
    rating: 5,
    tomato: 96,
    synopsis:
      'Na noite de despedida de um teatro centenário, atores e plateia encaram o que ficou por dizer antes de baixar o pano.',
    poster: ['#2A0A10', '#7A1A24', '#D8A24A'],
    glyph: '🎭',
  },
];

export const watched: WatchedEntry[] = [
  { id: 'w1', movieId: 'duas-luas', date: '2026-11-02', rating: 5 },
  { id: 'w2', movieId: 'ultimo-ato', date: '2026-11-01', rating: 5 },
  { id: 'w3', movieId: 'outono-praga', date: '2026-10-27', rating: 4.5 },
  { id: 'w4', movieId: 'farol', date: '2026-10-19', rating: 4 },
  { id: 'w5', movieId: 'cafe-meia-noite', date: '2026-10-11', rating: 4 },
  { id: 'w6', movieId: 'sal-e-sombra', date: '2026-10-04', rating: 3.5 },
  { id: 'w7', movieId: 'ecos', date: '2026-09-21', rating: 3.5 },
];

export const watchlistIds: string[] = [
  'ultima-estrada',
  'valsa-das-velas',
  'farol',
  'outono-praga',
];

export const featuredId = 'duas-luas';

// Estatísticas de exemplo (iguais às da referência).
export const stats = {
  total: 127,
  thisYear: 48,
  average: 4.1,
};

export const getMovie = (id: string): Movie => {
  const movie = movies.find((m) => m.id === id);
  if (!movie) throw new Error(`Filme não encontrado: ${id}`);
  return movie;
};
