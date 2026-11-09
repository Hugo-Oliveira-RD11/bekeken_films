// Servidor falso que imita o TMDB e o Watchmode. Usado nos testes (e para
// desenvolver sem gastar cota das APIs reais: `npm run stub`).
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

interface FakeMovie {
  id: number;
  title: string;
  year: number;
  genres: [number, string][];
  vote: number;
  director: string;
  runtime: number;
  colors: [string, string];
  cast: string[];
}

const G = {
  drama: [18, 'Drama'],
  scifi: [878, 'Ficção científica'],
  crime: [80, 'Crime'],
  romance: [10749, 'Romance'],
  horror: [27, 'Terror'],
  comedy: [35, 'Comédia'],
  adventure: [12, 'Aventura'],
  thriller: [53, 'Thriller'],
  fantasy: [14, 'Fantasia'],
  war: [10752, 'Guerra'],
  mystery: [9648, 'Mistério'],
} as const satisfies Record<string, [number, string]>;

export const FAKE_MOVIES: FakeMovie[] = [
  { id: 101, title: 'Duas Luas', year: 2025, genres: [G.scifi, G.drama], vote: 8.4, director: 'Kenji Arata', runtime: 154, colors: ['#2B1A22', '#D9702E'], cast: ['Mara Silva', 'Jon Weber', 'Ayla Costa'] },
  { id: 102, title: 'A Última Estrada', year: 2024, genres: [G.drama, G.adventure], vote: 8.7, director: 'Marta Vilela', runtime: 112, colors: ['#D65A1F', '#5B2A1A'], cast: ['Clara Monti', 'Jake Ferreira'] },
  { id: 103, title: 'Valsa das Velas', year: 2023, genres: [G.romance, G.drama], vote: 7.9, director: 'Isabelle Moreau', runtime: 128, colors: ['#3A2418', '#E0B27A'], cast: ['Lea Dumont', 'Paul Navarro'] },
  { id: 104, title: 'O Farol Sem Luz', year: 2024, genres: [G.thriller, G.horror], vote: 7.6, director: 'Anders Holm', runtime: 107, colors: ['#0B1A2B', '#E0C080'], cast: ['Nils Berg', 'Tora Lund'] },
  { id: 105, title: 'Outono em Praga', year: 2022, genres: [G.romance, G.drama], vote: 8.1, director: 'Lenka Dvořák', runtime: 118, colors: ['#4A2410', '#F0B060'], cast: ['Eva Novak', 'Tomas Král'] },
  { id: 106, title: 'Sal e Sombra', year: 2025, genres: [G.crime, G.drama], vote: 7.2, director: 'Rafael Quintana', runtime: 135, colors: ['#10181C', '#8FA3A8'], cast: ['Hugo Reyes', 'Ana Prado'] },
  { id: 107, title: 'Café à Meia-Noite', year: 2021, genres: [G.comedy, G.romance], vote: 7.8, director: 'Yuki Tanabe', runtime: 101, colors: ['#1D1020', '#D08A9A'], cast: ['Mei Ito', 'Ken Sato'] },
  { id: 108, title: 'Ecos do Vale', year: 2023, genres: [G.horror, G.thriller], vote: 6.9, director: 'Tomás Beltrán', runtime: 122, colors: ['#0D1410', '#7FA58A'], cast: ['Sol Vega', 'Iñaki Ruiz'] },
  { id: 109, title: 'O Último Ato', year: 2020, genres: [G.drama], vote: 8.8, director: 'Helena Prado', runtime: 140, colors: ['#2A0A10', '#D8A24A'], cast: ['Rita Lobo', 'Caio Mendes'] },
  { id: 110, title: 'Órbita Cinza', year: 2025, genres: [G.scifi, G.thriller], vote: 7.7, director: 'Dana Kerr', runtime: 126, colors: ['#10131F', '#6E7BA8'], cast: ['Ben Ortiz', 'Noa Reed'] },
  { id: 111, title: 'Rota Final', year: 2024, genres: [G.adventure, G.comedy], vote: 7.0, director: 'Otto Brandt', runtime: 104, colors: ['#3B2A10', '#E8C060'], cast: ['Lia Gomes', 'Davi Rocha'] },
  { id: 112, title: 'Noite sem Lei', year: 2023, genres: [G.crime, G.thriller], vote: 7.5, director: 'Mateo Cruz', runtime: 131, colors: ['#1A0D0D', '#A03030'], cast: ['Vito Lima', 'Nora Alves'] },
  { id: 113, title: 'Cartas ao Mar', year: 2022, genres: [G.romance, G.adventure], vote: 7.4, director: 'Sofia Reis', runtime: 115, colors: ['#0F2A3A', '#E8A878'], cast: ['Ivo Paz', 'Lara Maia'] },
  { id: 114, title: 'Casa dos Sussurros', year: 2024, genres: [G.horror, G.drama], vote: 7.1, director: 'Piotr Wen', runtime: 99, colors: ['#15100D', '#8C6A4A'], cast: ['Ela Kim', 'Rui Souza'] },
];

const GENRE_LIST = Object.values(G).map(([id, name]) => ({ id, name }));
const WM_ID = (tmdbId: number) => tmdbId + 9000;
const WM_TV_ID = (tmdbId: number) => tmdbId + 19000;

// Séries usam alguns gêneros "compostos" que só existem no TMDB de séries.
const TV_GENRE_LIST = [
  { id: 18, name: 'Drama' },
  { id: 80, name: 'Crime' },
  { id: 9648, name: 'Mistério' },
  { id: 35, name: 'Comédia' },
  { id: 10759, name: 'Action & Adventure' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10768, name: 'War & Politics' },
];
const TV = {
  drama: [18, 'Drama'],
  crime: [80, 'Crime'],
  mystery: [9648, 'Mistério'],
  comedy: [35, 'Comédia'],
  action: [10759, 'Action & Adventure'],
  scifi: [10765, 'Sci-Fi & Fantasy'],
} as const satisfies Record<string, [number, string]>;

interface FakeSeries {
  id: number;
  name: string;
  year: number;
  genres: [number, string][];
  vote: number;
  creators: string[];
  /** episódios por temporada (temporada 1, 2, ...) */
  seasons: number[];
  /** episódios da temporada 0 ("Especiais"), se houver */
  specials?: number;
  runtime: number;
  colors: [string, string];
  cast: string[];
}

// O id 101 repete o de um FILME ("Duas Luas") de propósito: filme e série não podem colidir.
export const FAKE_SERIES: FakeSeries[] = [
  { id: 101, name: 'Ecos de Neon', year: 2024, genres: [TV.scifi, TV.drama], vote: 8.5, creators: ['Rin Okada'], seasons: [4, 3], specials: 1, runtime: 48, colors: ['#1B1033', '#E04AA0'], cast: ['Aki Mori', 'Dante Cruz', 'Lia Park'] },
  { id: 201, name: 'Última Fronteira', year: 2023, genres: [TV.action, TV.drama], vote: 8.2, creators: ['Marco Villa', 'Ines Pardo'], seasons: [5], runtime: 52, colors: ['#3B2A10', '#D8A24A'], cast: ['Bruno Faro', 'Teo Lins'] },
  { id: 202, name: 'Casa de Papel Branco', year: 2022, genres: [TV.crime, TV.mystery], vote: 8.9, creators: ['Elsa Brandt'], seasons: [3, 3], runtime: 44, colors: ['#0E1A24', '#B8C4CC'], cast: ['Maya Torres', 'Joel Vaz'] },
  { id: 203, name: 'Meia-Noite no Café', year: 2021, genres: [TV.comedy, TV.drama], vote: 7.8, creators: ['Yui Sato'], seasons: [4], runtime: 28, colors: ['#1D1020', '#D08A9A'], cast: ['Nina Alba', 'Gui Prado'] },
  { id: 204, name: 'Cidade Submersa', year: 2025, genres: [TV.scifi, TV.mystery], vote: 7.4, creators: ['Otto Lang'], seasons: [3], runtime: 55, colors: ['#08202B', '#3FA0B8'], cast: ['Vera Holm', 'Ravi Nair'] },
  { id: 205, name: 'Os Herdeiros', year: 2020, genres: [TV.drama, TV.crime], vote: 8.0, creators: ['Paula Reis'], seasons: [4, 4], runtime: 58, colors: ['#2A0A10', '#C0504D'], cast: ['Sol Mendes', 'Caio Ferraz'] },
  { id: 206, name: 'Nova Era', year: 2024, genres: [TV.action], vote: 6.9, creators: ['Ken Doyle'], seasons: [3], runtime: 42, colors: ['#10131F', '#6E7BA8'], cast: ['Ana Dias', 'Leo Prado'] },
];

export interface Stub {
  url: string;
  /** Caminhos chamados, na ordem (ex.: "/movie/101", "/title/9101/sources/"). */
  calls: string[];
  failing: boolean;
  /** Se definido, só os caminhos que casarem com isso falham (erro 500). */
  failOn: RegExp | null;
  close(): Promise<void>;
}

export async function startStub(port = 0): Promise<Stub> {
  const stub = { url: '', calls: [] as string[], failing: false, failOn: null } as Stub;
  const json = (res: import('node:http').ServerResponse, body: unknown, status = 200) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const listItem = (m: FakeMovie) => ({
    id: m.id,
    title: m.title,
    overview: `Sinopse de ${m.title}: uma história sobre escolhas, estrada e o que fica para trás.`,
    release_date: `${m.year}-06-15`,
    poster_path: `/p${m.id}.svg`,
    backdrop_path: `/b${m.id}.svg`,
    vote_average: m.vote,
    genre_ids: m.genres.map(([id]) => id),
  });

  const seriesItem = (t: FakeSeries) => ({
    id: t.id,
    name: t.name,
    overview: `Sinopse de ${t.name}: uma série sobre segredos, família e o que vem depois.`,
    first_air_date: `${t.year}-03-10`,
    poster_path: `/tp${t.id}.svg`,
    backdrop_path: `/tb${t.id}.svg`,
    vote_average: t.vote,
    genre_ids: t.genres.map(([id]) => id),
  });

  const episodeItem = (t: FakeSeries, season: number, ep: number) => ({
    season_number: season,
    episode_number: ep,
    name: `${t.name}: S${season}E${ep}`,
    overview: `Sinopse do episódio ${ep} da temporada ${season} de ${t.name}.`,
    air_date: `${t.year + Math.max(season - 1, 0)}-02-${String(ep).padStart(2, '0')}`,
    runtime: t.runtime,
    still_path: `/s${t.id}_${season}_${ep}.svg`,
    vote_average: 7 + (ep % 3) * 0.5,
  });

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub');
    const path = url.pathname;

    // CORS: o navegador (versão web do app) exige.
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Imagens (SVG em gradiente)
    const img = path.match(/^\/img\/\w+\/(p|b|tp|tb|s)(\d+)(?:_\d+_\d+)?\.svg$/);
    if (img) {
      const isTv = ['tp', 'tb', 's'].includes(img[1]);
      const m = isTv ? FAKE_SERIES.find((x) => x.id === Number(img[2])) : FAKE_MOVIES.find((x) => x.id === Number(img[2]));
      const [c1, c2] = m?.colors ?? ['#222', '#888'];
      res.writeHead(200, { 'content-type': 'image/svg+xml' });
      res.end(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="200" height="300" fill="url(#g)"/><circle cx="100" cy="130" r="38" fill="#ffffff" fill-opacity="0.18"/></svg>`,
      );
      return;
    }

    stub.calls.push(path);
    if (stub.failing || stub.failOn?.test(path)) return json(res, { status_message: 'stub falhando' }, 500);

    const isWm = path.startsWith('/wm/');
    const key = url.searchParams.get(isWm ? 'apiKey' : 'api_key');
    if (key !== 'testkey' && !req.headers.authorization) return json(res, { error: 'chave inválida' }, 401);

    // ---- TMDB (/tmdb/...) ----
    if (path.startsWith('/tmdb/')) {
      const p = path.slice('/tmdb'.length);
      if (p === '/genre/movie/list') return json(res, { genres: GENRE_LIST });
      if (['/movie/now_playing', '/movie/popular', '/movie/top_rated', '/trending/movie/week'].includes(p)) {
        const page = Number(url.searchParams.get('page') ?? 1);
        const all = p.endsWith('top_rated') ? [...FAKE_MOVIES].sort((a, b) => b.vote - a.vote) : FAKE_MOVIES;
        return json(res, { page, results: all.slice((page - 1) * 10, page * 10).map(listItem) });
      }
      if (p === '/search/movie') {
        const q = (url.searchParams.get('query') ?? '').toLowerCase();
        return json(res, { results: FAKE_MOVIES.filter((m) => m.title.toLowerCase().includes(q)).map(listItem) });
      }
      // ---- séries ----
      if (p === '/genre/tv/list') return json(res, { genres: TV_GENRE_LIST });
      if (['/tv/on_the_air', '/tv/popular', '/tv/top_rated', '/trending/tv/week'].includes(p)) {
        const page = Number(url.searchParams.get('page') ?? 1);
        const all = p.endsWith('top_rated') ? [...FAKE_SERIES].sort((a, b) => b.vote - a.vote) : FAKE_SERIES;
        return json(res, { page, results: all.slice((page - 1) * 10, page * 10).map(seriesItem) });
      }
      if (p === '/search/multi') {
        const q = (url.searchParams.get('query') ?? '').toLowerCase();
        return json(res, {
          results: [
            ...FAKE_MOVIES.filter((m) => m.title.toLowerCase().includes(q)).map((m) => ({ ...listItem(m), media_type: 'movie' })),
            ...FAKE_SERIES.filter((t) => t.name.toLowerCase().includes(q)).map((t) => ({ ...seriesItem(t), media_type: 'tv' })),
            { id: 999, media_type: 'person', name: 'Fulano de Tal' }, // pessoas devem ser ignoradas
          ],
        });
      }
      const tvSeason = p.match(/^\/tv\/(\d+)\/season\/(\d+)$/);
      if (tvSeason) {
        const t = FAKE_SERIES.find((x) => x.id === Number(tvSeason[1]));
        const n = Number(tvSeason[2]);
        const count = n === 0 ? t?.specials : t?.seasons[n - 1];
        if (!t || !count) return json(res, { status_message: 'não encontrado' }, 404);
        return json(res, {
          season_number: n,
          name: n === 0 ? 'Especiais' : `Temporada ${n}`,
          air_date: `${t.year + Math.max(n - 1, 0)}-01-15`,
          poster_path: `/tp${t.id}.svg`,
          episodes: Array.from({ length: count }, (_, i) => episodeItem(t, n, i + 1)),
        });
      }
      const tvEp = p.match(/^\/tv\/(\d+)\/season\/(\d+)\/episode\/(\d+)$/);
      if (tvEp) {
        const t = FAKE_SERIES.find((x) => x.id === Number(tvEp[1]));
        const n = Number(tvEp[2]);
        const e = Number(tvEp[3]);
        const count = n === 0 ? t?.specials : t?.seasons[n - 1];
        if (!t || !count || e < 1 || e > count) return json(res, { status_message: 'não encontrado' }, 404);
        return json(res, {
          ...episodeItem(t, n, e),
          crew: [{ name: 'Diretor ' + t.creators[0], job: 'Director' }, { name: 'Roteirista X', job: 'Writer' }],
          guest_stars: [
            { name: 'Convidado Um', character: 'Vizinho', order: 0, profile_path: null },
            { name: 'Convidada Dois', character: 'Detetive', order: 1, profile_path: null },
          ],
        });
      }
      const tvId = p.match(/^\/tv\/(\d+)$/);
      if (tvId) {
        const t = FAKE_SERIES.find((x) => x.id === Number(tvId[1]));
        if (!t) return json(res, { status_message: 'não encontrado' }, 404);
        return json(res, {
          ...seriesItem(t),
          genres: t.genres.map(([id, name]) => ({ id, name })),
          tagline: 'Uma série para maratonar.',
          vote_count: 4321,
          episode_run_time: [t.runtime],
          created_by: t.creators.map((name) => ({ name })),
          number_of_episodes: t.seasons.reduce((a, b) => a + b, 0),
          seasons: [
            ...(t.specials ? [{ season_number: 0, name: 'Especiais', episode_count: t.specials, air_date: null, poster_path: null }] : []),
            ...t.seasons.map((c, i) => ({ season_number: i + 1, name: `Temporada ${i + 1}`, episode_count: c, air_date: `${t.year + i}-01-15`, poster_path: `/tp${t.id}.svg` })),
          ],
          external_ids: { imdb_id: `tt${t.id}777` },
          credits: {
            cast: t.cast.map((name, order) => ({ name, character: `Personagem ${order + 1}`, order, profile_path: null })),
            crew: [],
          },
        });
      }
      const mv = p.match(/^\/movie\/(\d+)$/);
      if (mv) {
        const m = FAKE_MOVIES.find((x) => x.id === Number(mv[1]));
        if (!m) return json(res, { status_message: 'não encontrado' }, 404);
        return json(res, {
          ...listItem(m),
          genres: m.genres.map(([id, name]) => ({ id, name })),
          tagline: 'Uma história para ver no escuro.',
          runtime: m.runtime,
          vote_count: 1234,
          imdb_id: `tt${m.id}000`,
          credits: {
            cast: m.cast.map((name, order) => ({ name, character: `Personagem ${order + 1}`, order, profile_path: null })),
            crew: [{ name: m.director, job: 'Director' }, { name: 'Fulano', job: 'Producer' }],
          },
        });
      }
    }

    // ---- Watchmode (/wm/...) ----
    if (isWm) {
      const p = path.slice('/wm'.length);
      if (p === '/search/') {
        const id = Number(url.searchParams.get('search_value'));
        const field = url.searchParams.get('search_field');
        if (field === 'tmdb_tv_id') {
          return json(res, { title_results: FAKE_SERIES.some((t) => t.id === id) ? [{ id: WM_TV_ID(id) }] : [] });
        }
        return json(res, { title_results: FAKE_MOVIES.some((m) => m.id === id) ? [{ id: WM_ID(id) }] : [] });
      }
      if (p === '/sources/') {
        return json(res, [
          { id: 203, name: 'Netflix', logo_100px: null },
          { id: 26, name: 'Prime Video', logo_100px: null },
          { id: 387, name: 'Max', logo_100px: null },
        ]);
      }
      const det = p.match(/^\/title\/(\d+)\/details\/$/);
      if (det) {
        const isSeries = Number(det[1]) >= 19000; // ids de séries no Watchmode do stub
        return json(res, { id: Number(det[1]), user_rating: isSeries ? 8.4 : 7.6, critic_score: isSeries ? 88 : 79 });
      }
      const src = p.match(/^\/title\/(\d+)\/sources\/$/);
      if (src) {
        return json(res, [
          { source_id: 203, name: 'Netflix', type: 'sub', region: 'BR', web_url: 'https://netflix.example/title', format: '4K', price: null },
          { source_id: 26, name: 'Prime Video', type: 'rent', region: 'BR', web_url: 'https://prime.example/title', format: 'HD', price: 14.9 },
          { source_id: 26, name: 'Prime Video', type: 'rent', region: 'BR', web_url: 'https://prime.example/title', format: '4K', price: 19.9 },
          { source_id: 387, name: 'Max', type: 'buy', region: 'BR', web_url: 'https://max.example/title', format: 'HD', price: 39.9 },
        ]);
      }
    }
    return json(res, { error: 'rota do stub não existe' }, 404);
  });

  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  const addr = server.address() as AddressInfo;
  stub.url = `http://127.0.0.1:${addr.port}`;
  stub.close = () =>
    new Promise<void>((r) => {
      server.closeAllConnections();
      server.close(() => r());
    });
  return stub;
}

// `npm run stub` -> sobe em 4010 para desenvolver sem gastar a cota das APIs reais.
if (require.main === module) {
  startStub(4010).then((stub) => {
    console.log(`Servidor falso de TMDB/Watchmode em ${stub.url}`);
    console.log(
      `Rode o app apontando para ele (só para a versão web/simulador):\n  ` +
        `EXPO_PUBLIC_TMDB_API_KEY=testkey EXPO_PUBLIC_WATCHMODE_API_KEY=testkey ` +
        `EXPO_PUBLIC_TMDB_BASE_URL=${stub.url}/tmdb EXPO_PUBLIC_TMDB_IMAGE_BASE=${stub.url}/img ` +
        `EXPO_PUBLIC_WATCHMODE_BASE_URL=${stub.url}/wm npx expo start --web -c`,
    );
  });
}
