// Séries, temporadas e episódios: a lógica do app falando com o servidor falso (dev/stub.ts).
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { EpisodeRef, TitleRef } from '../src/api/types';
import { startStub, type Stub } from '../dev/stub';
import { loadConfig } from '../src/services/config';
import { HttpError } from '../src/services/http';
import { createLibrary } from '../src/services/library';
import { MemoryStore } from '../src/services/storage';
import { ValidationError } from '../src/services/userdata';

let stub: Stub;
const clock = new Date(2026, 10, 2, 12).getTime();
const M = (id: number): TitleRef => ({ mediaType: 'movie', id });
const T = (id: number): TitleRef => ({ mediaType: 'tv', id });
const E = (seriesId: number, season: number, episode: number): EpisodeRef => ({ seriesId, season, episode });

const makeCfg = (extra: Record<string, string> = {}) =>
  loadConfig({
    EXPO_PUBLIC_TMDB_API_KEY: 'testkey',
    EXPO_PUBLIC_WATCHMODE_API_KEY: 'testkey',
    EXPO_PUBLIC_TMDB_BASE_URL: `${stub.url}/tmdb`,
    EXPO_PUBLIC_TMDB_IMAGE_BASE: `${stub.url}/img`,
    EXPO_PUBLIC_WATCHMODE_BASE_URL: `${stub.url}/wm`,
    ...extra,
  });
const make = (store = new MemoryStore()) => createLibrary(makeCfg(), store, { now: () => clock });

before(async () => {
  stub = await startStub();
});
after(async () => {
  await stub.close();
});

test('detalhes de série: criadores, temporadas, gêneros equivalentes e nota do Watchmode', async () => {
  const r = await make().title(T(101));
  const s = r.movie;
  assert.equal(s.mediaType, 'tv');
  assert.equal(s.title, 'Ecos de Neon');
  assert.equal(s.year, 2024);
  assert.deepEqual(s.creators, ['Rin Okada']);
  assert.equal(s.director, null);
  assert.equal(s.runtimeMinutes, 48);
  assert.equal(s.episodeCount, 7); // 4 + 3 (especiais não entram)
  // temporadas em ordem, com "Especiais" por último
  assert.deepEqual(s.seasons.map((x) => [x.number, x.name, x.episodeCount]), [
    [1, 'Temporada 1', 4],
    [2, 'Temporada 2', 3],
    [0, 'Especiais', 1],
  ]);
  // "Sci-Fi & Fantasy" vira Ficção científica + Fantasia (mesmos nomes dos filmes)
  assert.deepEqual(s.genres, ['Ficção científica', 'Fantasia', 'Drama']);
  assert.equal(s.imdbId, 'tt101777');
  assert.deepEqual(s.cast.map((c) => c.name), ['Aki Mori', 'Dante Cruz', 'Lia Park']);
  // Watchmode: usa a busca por tmdb_tv_id (série tem nota diferente do filme de mesmo id)
  assert.equal(r.watchmode.status, 'ok');
  assert.equal(r.watchmode.userRating, 8.4);
  assert.equal(r.watchmode.criticScore, 88);
  assert.equal(r.watchedEpisodes, 0);
  assert.ok(stub.calls.some((c) => c === '/wm/search/'));
});

test('filme 101 e série 101 são títulos diferentes (detalhes, Watchmode e dados pessoais)', async () => {
  const lib = make();
  const [movie, series] = await Promise.all([lib.title(M(101)), lib.title(T(101))]);
  assert.equal(movie.movie.title, 'Duas Luas');
  assert.equal(series.movie.title, 'Ecos de Neon');
  assert.equal(movie.watchmode.criticScore, 79);
  assert.equal(series.watchmode.criticScore, 88);

  await lib.updateTitle(M(101), { rating: 5, note: 'filme' });
  await lib.updateTitle(T(101), { status: 'watchlist', note: 'série' });
  const [m2, s2] = await Promise.all([lib.title(M(101)), lib.title(T(101))]);
  assert.deepEqual([m2.user.status, m2.user.rating, m2.user.note], ['watched', 5, 'filme']);
  assert.deepEqual([s2.user.status, s2.user.rating, s2.user.note], ['watchlist', null, 'série']);

  // diário e lista mostram cada um com o seu tipo
  assert.deepEqual((await lib.watched()).entries.map((e) => [e.movie.mediaType, e.movie.title]), [['movie', 'Duas Luas']]);
  assert.deepEqual((await lib.watchlist()).movies.map((m) => [m.mediaType, m.title]), [['tv', 'Ecos de Neon']]);
});

test('home de séries: 4 seções só com séries, e "em cartaz" vira "no ar"', async () => {
  const home = await make().home('tv');
  assert.deepEqual(home.sections.map((s) => s.key), ['nowPlaying', 'mostWatched', 'topRated', 'trending']);
  for (const s of home.sections) {
    assert.ok(s.movies.every((m) => m.mediaType === 'tv'), s.key);
    assert.ok(!s.movies.some((m) => m.id === home.featured!.id), `${s.key} repete o destaque`);
  }
  assert.equal(home.featured!.mediaType, 'tv');
  assert.ok(stub.calls.includes('/tmdb/tv/on_the_air'));
  assert.ok(stub.calls.includes('/tmdb/trending/tv/week'));
  // "Mais gostados" ordenado pelas maiores notas
  const top = home.sections.find((s) => s.key === 'topRated')!.movies.map((m) => m.voteAverage);
  assert.deepEqual(top, [...top].sort((a, b) => b - a));
});

test('busca mista: filmes e séries juntos, pessoas ignoradas', async () => {
  const { results } = await make().search('ecos');
  assert.deepEqual(results.map((r) => [r.mediaType, r.id, r.title]), [
    ['movie', 108, 'Ecos do Vale'],
    ['tv', 101, 'Ecos de Neon'],
  ]);
});

test('temporada: episódios com imagem/duração e o que o usuário já marcou', async () => {
  const lib = make();
  const s1 = await lib.season(101, 1);
  assert.equal(s1.season.name, 'Temporada 1');
  assert.equal(s1.episodes.length, 4);
  assert.deepEqual(s1.episodes.map((e) => e.number), [1, 2, 3, 4]);
  assert.equal(s1.episodes[1].name, 'Ecos de Neon: S1E2');
  assert.equal(s1.episodes[1].runtimeMinutes, 48);
  assert.match(s1.episodes[1].stillUrl!, /\/img\/w500\/s101_1_2\.svg$/);
  assert.deepEqual(s1.user, []);

  await lib.updateEpisode(E(101, 1, 2), { rating: 4.5 });
  await lib.updateEpisode(E(101, 1, 3), { status: 'watched' });
  const again = await lib.season(101, 1);
  assert.deepEqual(again.user.map((u) => [u.episode, u.status, u.rating]).sort(), [[2, 'watched', 4.5], [3, 'watched', null]]);
  assert.deepEqual((await lib.season(101, 2)).user, []); // outra temporada
  assert.equal((await lib.season(101, 0)).season.name, 'Especiais');
});

test('progresso da série conta episódios assistidos (sem especiais)', async () => {
  const lib = make();
  await lib.updateEpisode(E(101, 1, 1), { status: 'watched' });
  await lib.updateEpisode(E(101, 2, 1), { rating: 3 });
  await lib.updateEpisode(E(101, 0, 1), { status: 'watched' }); // especial: não conta
  await lib.updateEpisode(E(202, 1, 1), { status: 'watched' }); // outra série
  const r = await lib.title(T(101));
  assert.equal(r.watchedEpisodes, 2);
  assert.equal(r.movie.episodeCount, 7);
});

test('tela do episódio: detalhes, elenco convidado e streaming da SÉRIE', async () => {
  const r = await make().episode(E(101, 1, 3));
  assert.equal(r.series.title, 'Ecos de Neon');
  assert.equal(r.series.mediaType, 'tv');
  assert.equal(r.episode.name, 'Ecos de Neon: S1E3');
  assert.equal(r.episode.season, 1);
  assert.equal(r.episode.number, 3);
  assert.equal(r.episode.director, 'Diretor Rin Okada');
  assert.deepEqual(r.episode.guestStars.map((g) => g.name), ['Convidado Um', 'Convidada Dois']);
  assert.equal(r.episode.voteAverage, 7); // 7 + (3 % 3) * 0.5
  assert.equal(r.watchmode.status, 'ok');
  assert.equal(r.watchmode.criticScore, 88); // dados da série
  assert.equal(r.user.status, null);
});

test('nota do episódio é separada da nota da série (e do diário)', async () => {
  const lib = make();
  await lib.updateTitle(T(101), { rating: 5 });
  const ep = await lib.updateEpisode(E(101, 1, 3), { rating: 2, note: 'ritmo caiu', liked: true });
  assert.deepEqual([ep.user.rating, ep.user.status, ep.user.note, ep.user.liked], [2, 'watched', 'ritmo caiu', true]);

  const view = await lib.episode(E(101, 1, 3));
  assert.deepEqual([view.user.rating, view.user.note], [2, 'ritmo caiu']);
  assert.equal((await lib.title(T(101))).user.rating, 5); // a série continua 5
  assert.equal((await lib.episode(E(101, 1, 4))).user.rating, null); // outro episódio intacto

  // diário/estatísticas contam a série, não o episódio
  const w = await lib.watched();
  assert.deepEqual(w.entries.map((e) => [e.movie.mediaType, e.movie.id]), [['tv', 101]]);
  assert.equal(w.stats.total, 1);
  assert.equal(w.stats.average, 5);
});

test('episódio: validações e erros claros', async () => {
  const lib = make();
  await assert.rejects(lib.updateEpisode(E(101, 1, 1), { rating: 7 }), ValidationError);
  await assert.rejects(lib.updateEpisode(E(101, 1, 1), { status: 'watchlist' as never }), ValidationError);
  await assert.rejects(
    lib.episode(E(101, 1, 99)),
    (e: unknown) => e instanceof HttpError && e.status === 404 && /Episódio não encontrado/.test(e.message),
  );
  await assert.rejects(
    lib.season(101, 9),
    (e: unknown) => e instanceof HttpError && e.status === 404 && /Temporada não encontrada/.test(e.message),
  );
  await assert.rejects(
    lib.title(T(999999)),
    (e: unknown) => e instanceof HttpError && e.status === 404,
  );
});

test('temporadas e episódios também passam pelo cache', async () => {
  const lib = make();
  await lib.season(201, 1);
  await lib.episode(E(201, 1, 2));
  const n = stub.calls.length;
  await lib.season(201, 1);
  await lib.episode(E(201, 1, 2));
  assert.equal(stub.calls.length, n, 'segunda vez não deveria chamar a API');
});

test('sem internet com cache vencido: temporada continua aparecendo', async () => {
  let now = clock;
  const lib = createLibrary(makeCfg(), new MemoryStore(), { now: () => now });
  await lib.season(201, 1);
  now += 5 * 24 * 60 * 60 * 1000;
  stub.failing = true;
  try {
    assert.equal((await lib.season(201, 1)).episodes.length, 5);
  } finally {
    stub.failing = false;
  }
});

test('recomendação cruzada: gostar de série sugere filmes do mesmo gênero (e vice-versa)', async () => {
  const lib = make();
  // "Ecos de Neon" (Sci-Fi & Fantasy + Drama) nota 5
  await lib.updateTitle(T(101), { rating: 5 });
  const r = await lib.recommendations('count');
  const genres = r.profile.map((p) => p.genre);
  assert.ok(genres.includes('Ficção científica') && genres.includes('Fantasia') && genres.includes('Drama'), genres.join());
  const keys = r.items.map((i) => `${i.movie.mediaType}:${i.movie.id}`);
  assert.ok(!keys.includes('tv:101'), 'não sugere o que já foi assistido');
  assert.ok(keys.includes('movie:110'), 'Órbita Cinza (filme de ficção científica) deve aparecer');
  assert.ok(r.items.some((i) => i.movie.mediaType === 'tv'), 'deve haver séries também');
  const orbita = r.items.find((i) => i.movie.id === 110 && i.movie.mediaType === 'movie')!;
  assert.ok(orbita.because.includes('Ficção científica'));
});

test('episódios não influenciam as recomendações', async () => {
  const lib = make();
  await lib.updateEpisode(E(205, 1, 1), { rating: 5, liked: true });
  const r = await lib.recommendations('weighted');
  assert.equal(r.coldStart, true); // nada de filme/série avaliado ainda
});
