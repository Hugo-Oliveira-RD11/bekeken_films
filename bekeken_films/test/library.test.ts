// Teste de integração: a lógica do app (cache + TMDB + Watchmode + dados do usuário)
// falando com o servidor falso (dev/stub.ts) por HTTP de verdade.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startStub, type Stub } from '../dev/stub';
import { DAY } from '../src/services/cache';
import { loadConfig } from '../src/services/config';
import { HttpError } from '../src/services/http';
import { createLibrary } from '../src/services/library';
import { MemoryStore } from '../src/services/storage';
import { ValidationError } from '../src/services/userdata';

let stub: Stub;
let clock = new Date(2026, 10, 2, 12).getTime();

const makeCfg = (extra: Record<string, string> = {}) =>
  loadConfig({
    EXPO_PUBLIC_TMDB_API_KEY: 'testkey',
    EXPO_PUBLIC_WATCHMODE_API_KEY: 'testkey',
    EXPO_PUBLIC_TMDB_BASE_URL: `${stub.url}/tmdb`,
    EXPO_PUBLIC_TMDB_IMAGE_BASE: `${stub.url}/img`,
    EXPO_PUBLIC_WATCHMODE_BASE_URL: `${stub.url}/wm`,
    ...extra,
  });
const make = (cfg = makeCfg(), store = new MemoryStore()) =>
  createLibrary(cfg, store, { now: () => clock });
const callsTo = (re: RegExp) => stub.calls.filter((c) => re.test(c)).length;

before(async () => {
  stub = await startStub();
});
after(async () => {
  await stub.close();
});

test('detalhes: TMDB + Watchmode, e a 2ª chamada vem 100% do cache', async () => {
  const lib = make();
  const first = await lib.movie(102);
  assert.equal(first.movie.title, 'A Última Estrada');
  assert.equal(first.movie.director, 'Marta Vilela');
  assert.equal(first.movie.runtimeMinutes, 112);
  assert.equal(first.movie.cast[0].name, 'Clara Monti');
  assert.match(first.movie.posterUrl!, /\/img\/w500\/p102\.svg$/);
  assert.equal(first.watchmode.status, 'ok');
  assert.equal(first.watchmode.userRating, 7.6);
  assert.equal(first.watchmode.criticScore, 79);
  // dedupe: Prime Video "rent" aparece uma vez, com o menor preço
  const rent = first.watchmode.sources.filter((s) => s.name === 'Prime Video');
  assert.equal(rent.length, 1);
  assert.equal(rent[0].price, 14.9);
  assert.deepEqual(first.watchmode.sources.map((s) => s.type), ['sub', 'rent', 'buy']);

  const before = stub.calls.length;
  const second = await lib.movie(102);
  assert.equal(stub.calls.length, before, 'não deveria chamar nenhuma API externa');
  assert.deepEqual(second.movie, first.movie);
});

test('o cache vale também depois de "reabrir o app" (mesmo armazenamento)', async () => {
  const store = new MemoryStore();
  await make(makeCfg(), store).movie(104);
  const before = stub.calls.length;
  const reopened = await make(makeCfg(), store).movie(104);
  assert.equal(reopened.movie.title, 'O Farol Sem Luz');
  assert.equal(stub.calls.length, before);
});

test('a chave do Watchmode não vaza em mensagens de erro', async () => {
  stub.failing = true;
  try {
    await make().movie(113).then(
      () => assert.fail('deveria falhar'),
      (e: Error) => assert.ok(!e.message.includes('testkey'), e.message),
    );
  } finally {
    stub.failing = false;
  }
});

test('se as APIs caírem, usa o cache vencido em vez de dar erro', async () => {
  const lib = make();
  await lib.movie(103); // popula o cache
  clock += 30 * DAY; // vence tudo (TTLs são de 12h a 30 dias)
  stub.failing = true;
  try {
    const r = await lib.movie(103);
    assert.equal(r.movie.title, 'Valsa das Velas');
    assert.equal(r.watchmode.status, 'ok');
    assert.ok(lib.cache.stats.stale > 0);
    // filme nunca visto + API fora = erro claro, em vez de dado inventado
    await assert.rejects(lib.movie(114), (e: unknown) => e instanceof HttpError && e.status === 500);
  } finally {
    stub.failing = false;
    clock -= 30 * DAY;
  }
});

test('filme inexistente -> "Filme não encontrado." (404)', async () => {
  await assert.rejects(
    make().movie(999999),
    (e: unknown) => e instanceof HttpError && e.status === 404 && /não encontrado/.test(e.message),
  );
});

test('Watchmode fora do ar não quebra a tela (status unavailable)', async () => {
  const store = new MemoryStore();
  const lib = make(makeCfg(), store);
  await lib.movie(104); // cacheia o TMDB (e o Watchmode)
  // novo "app" sem cache do Watchmode, com tudo fora do ar: TMDB vem do cache, Watchmode falha
  const fresh = new MemoryStore();
  for (const [k, v] of store.map) if (k.startsWith('cache:tmdb:')) fresh.map.set(k, v);
  stub.failing = true;
  try {
    const r = await make(makeCfg(), fresh).movie(104);
    assert.equal(r.movie.title, 'O Farol Sem Luz');
    assert.equal(r.watchmode.status, 'unavailable');
    assert.deepEqual(r.watchmode.sources, []);
  } finally {
    stub.failing = false;
  }
});

test('sem chave do Watchmode: status no_key e nenhuma chamada a ele', async () => {
  const wmBefore = callsTo(/^\/wm\//);
  const r = await make(makeCfg({ EXPO_PUBLIC_WATCHMODE_API_KEY: '' })).movie(105);
  assert.equal(r.watchmode.status, 'no_key');
  assert.equal(callsTo(/^\/wm\//), wmBefore);
});

test('sem chave do TMDB: erro claro dizendo onde configurar', async () => {
  const lib = make(makeCfg({ EXPO_PUBLIC_TMDB_API_KEY: '' }));
  await assert.rejects(lib.home(), (e: unknown) => e instanceof HttpError && /EXPO_PUBLIC_TMDB_API_KEY/.test(e.message));
});

test('chave do TMDB inválida: erro claro', async () => {
  const lib = make(makeCfg({ EXPO_PUBLIC_TMDB_API_KEY: 'errada' }));
  await assert.rejects(lib.home(), (e: unknown) => e instanceof HttpError && e.status === 401 && /inválida/.test(e.message));
});

test('sem internet: mensagem amigável', async () => {
  const lib = make(makeCfg({ EXPO_PUBLIC_TMDB_BASE_URL: 'http://127.0.0.1:1/tmdb' }));
  await assert.rejects(lib.home(), /Sem conexão com a internet/);
});

test('home: destaque + 4 seções, sem repetir o destaque dentro delas', async () => {
  const home = await make().home();
  assert.ok(home.featured?.backdropUrl);
  assert.deepEqual(home.sections.map((s) => s.key), ['nowPlaying', 'mostWatched', 'topRated', 'trending']);
  for (const s of home.sections) {
    assert.ok(s.movies.length > 0, s.key);
    assert.ok(!s.movies.some((m) => m.id === home.featured!.id), `${s.key} repete o destaque`);
    assert.ok(s.movies.every((m) => m.posterUrl));
  }
  assert.ok(home.sections[0].movies[0].genres.length > 0);
  // "Mais gostados" vem ordenado pelas maiores notas
  const top = home.sections.find((s) => s.key === 'topRated')!.movies;
  assert.deepEqual(top.map((m) => m.voteAverage), [...top.map((m) => m.voteAverage)].sort((a, b) => b - a));
});

test('home: se uma lista falhar, as outras continuam aparecendo', async () => {
  stub.failOn = /top_rated/;
  try {
    const home = await make().home();
    assert.deepEqual(home.sections.map((s) => s.key), ['nowPlaying', 'mostWatched', 'trending']);
    assert.ok(home.featured);
  } finally {
    stub.failOn = null;
  }
});

test('home: se TODAS as listas falharem (e sem cache), dá erro', async () => {
  stub.failing = true;
  try {
    await assert.rejects(make().home(), (e: unknown) => e instanceof HttpError);
  } finally {
    stub.failing = false;
  }
});

test('home com cache vencido e API fora: continua mostrando as seções', async () => {
  const lib = make();
  await lib.home();
  clock += 31 * DAY;
  stub.failing = true;
  try {
    assert.equal((await lib.home()).sections.length, 4);
  } finally {
    stub.failing = false;
    clock -= 31 * DAY;
  }
});

test('busca (e repetir home/busca não chama o TMDB)', async () => {
  const lib = make();
  await lib.home();

  const found = await lib.search('Farol');
  assert.deepEqual(found.results.map((m) => m.id), [104]);
  assert.deepEqual((await lib.search('   ')).results, []);

  const n = stub.calls.length;
  await lib.home();
  await lib.search('farol'); // maiúsculas/minúsculas não importam
  assert.equal(stub.calls.length, n);
});

test('anotações pessoais: salvar, ler no detalhe, apagar', async () => {
  const lib = make();
  await lib.updateMovie(102, { note: 'Ótima trilha. Rever com o pai.' });
  assert.equal((await lib.movie(102)).user.note, 'Ótima trilha. Rever com o pai.');
  assert.equal((await lib.updateMovie(102, { note: '' })).user.note, '');
  await assert.rejects(lib.updateMovie(102, { note: 'x'.repeat(5001) }), ValidationError);
});

test('as anotações são só do aparelho: outro armazenamento não vê', async () => {
  const mine = make();
  await mine.updateMovie(102, { note: 'segredo' });
  assert.equal((await make().movie(102)).user.note, '');
});

test('diário, lista e estatísticas', async () => {
  const lib = make();
  await lib.updateMovie(101, { rating: 5, watchedAt: '2026-11-02' });
  await lib.updateMovie(109, { rating: 5, watchedAt: '2026-11-01' });
  await lib.updateMovie(105, { rating: 3.5, watchedAt: '2026-10-10' });
  await lib.updateMovie(102, { status: 'watchlist' });

  const w = await lib.watched();
  assert.deepEqual(w.entries.map((e) => e.movie.id), [101, 109, 105]);
  assert.deepEqual(w.stats, { total: 3, thisYear: 3, average: 4.5 });
  assert.deepEqual((await lib.watchlist()).movies.map((m) => m.id), [102]);
});

test('recomendações: perfil, exclui o que já foi visto/guardado, dois algoritmos', async () => {
  const lib = make();
  // Perfil: Duas Luas (5, Ficção+Drama), Último Ato (5, Drama), Outono (3.5, Romance+Drama)
  await lib.updateMovie(101, { rating: 5 });
  await lib.updateMovie(109, { rating: 5 });
  await lib.updateMovie(105, { rating: 3.5 });
  await lib.updateMovie(102, { status: 'watchlist' });

  const count = await lib.recommendations('count');
  const weighted = await lib.recommendations('weighted');
  assert.equal(count.coldStart, false);
  assert.deepEqual(count.profile[0], { genre: 'Drama', value: 3 });
  assert.deepEqual(weighted.profile[0], { genre: 'Drama', value: 13.5 });

  for (const r of [count, weighted]) {
    const ids = r.items.map((i) => i.movie.id);
    for (const seen of [101, 109, 105, 102]) assert.ok(!ids.includes(seen), `não repete ${seen}`);
    assert.ok(r.items.every((i) => i.because.length > 0 && (i.matchPercent ?? 0) > 0));
  }
  // Valsa das Velas (Romance+Drama): média do perfil = (1+3)/2 = 2, de um máximo de 3 -> 67%
  assert.equal(count.items[0].movie.id, 103);
  assert.equal(count.items[0].matchPercent, 67);
  assert.deepEqual(count.items[0].because, ['Drama', 'Romance']);
  // perfil ponderado: Drama 13.5, Romance 3.5 -> (3.5+13.5)/2 = 8.5 de 13.5 -> 63%
  assert.equal(weighted.items[0].movie.id, 103);
  assert.equal(weighted.items[0].matchPercent, 63);
  await assert.rejects(lib.recommendations('xyz' as never), ValidationError);
});

test('recomendações sem histórico (cold start)', async () => {
  const r = await make().recommendations('count');
  assert.equal(r.coldStart, true);
  assert.equal(r.items[0].matchPercent, null);
  assert.equal(r.items[0].movie.id, 109); // maior nota do TMDB (8.8)
});
