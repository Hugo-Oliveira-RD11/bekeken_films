import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EpisodeRef, TitleRef } from '../src/api/types';
import { MemoryStore } from '../src/services/storage';
import { localDate, UserData, ValidationError } from '../src/services/userdata';

const NOW = new Date(2026, 10, 2, 12, 0, 0); // 02/11/2026 (hora local)
const make = (store = new MemoryStore()) => new UserData(store, () => NOW);
const M = (id: number): TitleRef => ({ mediaType: 'movie', id });
const T = (id: number): TitleRef => ({ mediaType: 'tv', id });
const E = (seriesId: number, season: number, episode: number): EpisodeRef => ({ seriesId, season, episode });

test('localDate usa a data local, não UTC', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('estado vazio por padrão', async () => {
  assert.deepEqual(await make().get(M(1)), {
    mediaType: 'movie', tmdbId: 1, status: null, rating: null, liked: false, note: '', watchedAt: null,
  });
});

test('marcar como assistido grava a data de hoje', async () => {
  const r = await make().patch(M(1), { status: 'watched' });
  assert.equal(r.status, 'watched');
  assert.equal(r.watchedAt, '2026-11-02');
});

test('dar nota marca como assistido automaticamente', async () => {
  const r = await make().patch(M(1), { rating: 4.5 });
  assert.equal(r.status, 'watched');
  assert.equal(r.rating, 4.5);
});

test('desmarcar "assistido" (status null) limpa nota e data', async () => {
  const u = make();
  await u.patch(M(1), { rating: 4, liked: true });
  const r = await u.patch(M(1), { status: null });
  assert.deepEqual([r.status, r.rating, r.watchedAt, r.liked], [null, null, null, true]);
});

test('"Quero ver" num filme já assistido é ignorado (não apaga a nota)', async () => {
  const u = make();
  await u.patch(M(1), { rating: 4 });
  const r = await u.patch(M(1), { status: 'watchlist' });
  assert.deepEqual([r.status, r.rating, r.watchedAt], ['watched', 4, '2026-11-02']);
});

test('anotação é guardada e atualizada sem mexer no resto', async () => {
  const u = make();
  await u.patch(M(1), { status: 'watchlist' });
  await u.patch(M(1), { note: 'ver com a Ana' });
  const r = await u.patch(M(1), { liked: true });
  assert.deepEqual([r.status, r.note, r.liked], ['watchlist', 'ver com a Ana', true]);
  assert.equal((await u.get(M(1))).note, 'ver com a Ana');
});

test('filme e série com o MESMO id não se misturam (chave = tipo + id)', async () => {
  const u = make();
  await u.patch(M(101), { rating: 5, note: 'filme' });
  assert.deepEqual(await u.get(T(101)), {
    mediaType: 'tv', tmdbId: 101, status: null, rating: null, liked: false, note: '', watchedAt: null,
  });
  await u.patch(T(101), { status: 'watchlist', note: 'série' });
  assert.equal((await u.get(M(101))).note, 'filme');
  assert.equal((await u.get(T(101))).note, 'série');
  assert.equal((await u.get(M(101))).status, 'watched');
  assert.equal((await u.get(T(101))).status, 'watchlist');
  assert.deepEqual([...(await u.knownKeys())].sort(), ['movie:101', 'tv:101']);
});

test('os dados ficam salvos no aparelho e voltam ao reabrir o app', async () => {
  const store = new MemoryStore();
  await make(store).patch(T(7), { rating: 5, note: 'obra-prima', liked: true });
  assert.deepEqual(await make(store).get(T(7)), {
    mediaType: 'tv', tmdbId: 7, status: 'watched', rating: 5, liked: true, note: 'obra-prima', watchedAt: '2026-11-02',
  });
});

test('migração: dados salvos antes das séries (sem mediaType) viram filmes', async () => {
  const store = new MemoryStore();
  await store.setItem(
    'user:movies:v1',
    JSON.stringify([{ tmdbId: 55, status: 'watched', rating: 4, liked: true, note: 'antigo', watchedAt: '2026-01-02' }]),
  );
  const u = make(store);
  assert.deepEqual(await u.get(M(55)), {
    mediaType: 'movie', tmdbId: 55, status: 'watched', rating: 4, liked: true, note: 'antigo', watchedAt: '2026-01-02',
  });
  assert.equal((await u.get(T(55))).status, null); // a série 55 NÃO herda o dado do filme
  assert.equal((await u.list('watched')).length, 1);
  // e continua gravável no formato novo
  await u.patch(M(55), { note: 'novo' });
  assert.equal((await make(store).get(M(55))).note, 'novo');
});

test('registro sem nada útil é removido', async () => {
  const u = make();
  await u.patch(M(1), { liked: true });
  await u.patch(M(1), { liked: false });
  assert.equal((await u.list('watched')).length + (await u.list('watchlist')).length, 0);
  assert.equal((await u.signals()).length, 0);
});

test('validações (e erro não deixa lixo)', async () => {
  const u = make();
  for (const bad of [0, 5.5, 3.3, -1, NaN, '4' as unknown as number]) {
    await assert.rejects(u.patch(M(1), { rating: bad }), ValidationError, `rating ${String(bad)}`);
  }
  await assert.rejects(u.patch(M(1), { status: 'x' as never }), ValidationError);
  await assert.rejects(u.patch(M(1), { watchedAt: '2026-02-30' }), ValidationError);
  await assert.rejects(u.patch(M(1), { note: 'a'.repeat(5001) }), ValidationError);
  await assert.rejects(u.patch(M(1), { liked: 'sim' as never }), ValidationError);
  assert.equal((await u.get(M(1))).status, null);
});

test('se não conseguir gravar no aparelho, desfaz a alteração e avisa', async () => {
  const store = new MemoryStore();
  const u = make(store);
  await u.patch(M(1), { note: 'antes' });
  store.setItem = async () => {
    throw new Error('QuotaExceeded');
  };
  await assert.rejects(u.patch(M(1), { note: 'depois' }), /Não foi possível salvar/);
  assert.equal((await u.get(M(1))).note, 'antes');
  await assert.rejects(u.patch(M(2), { liked: true }), /Não foi possível salvar/);
  assert.equal((await u.get(M(2))).liked, false);
});

test('gravações simultâneas não se perdem', async () => {
  const store = new MemoryStore();
  const u = make(store);
  await Promise.all([1, 2, 3, 4, 5].map((id) => u.patch(M(id), { status: 'watchlist' })));
  assert.equal((await make(store).list('watchlist')).length, 5);
});

test('estatísticas e ordenação do diário', async () => {
  const u = make();
  await u.patch(M(1), { rating: 5, watchedAt: '2026-11-01' });
  await u.patch(M(2), { rating: 4, watchedAt: '2026-11-02' });
  await u.patch(T(3), { rating: 3, watchedAt: '2025-12-30' });
  await u.patch(M(4), { status: 'watchlist' });
  assert.deepEqual((await u.list('watched')).map((m) => `${m.mediaType}:${m.tmdbId}`), ['movie:2', 'movie:1', 'tv:3']);
  assert.deepEqual(await u.stats(), { total: 3, thisYear: 2, average: 4 });
});

// ---------- Episódios ----------

test('episódio: nota, assistido, coração e anotação são só dele', async () => {
  const u = make();
  const r = await u.patchEpisode(E(10, 1, 3), { rating: 4.5, note: 'ótimo plot twist', liked: true });
  assert.deepEqual(r, {
    seriesId: 10, season: 1, episode: 3, status: 'watched', rating: 4.5, liked: true,
    note: 'ótimo plot twist', watchedAt: '2026-11-02',
  });
  // outro episódio e a própria série continuam vazios
  assert.equal((await u.getEpisode(E(10, 1, 4))).rating, null);
  assert.equal((await u.getEpisode(E(10, 2, 3))).rating, null);
  assert.equal((await u.get(T(10))).rating, null);
});

test('nota da série e nota do episódio são independentes', async () => {
  const u = make();
  await u.patch(T(10), { rating: 5 });
  await u.patchEpisode(E(10, 1, 1), { rating: 2 });
  assert.equal((await u.get(T(10))).rating, 5);
  assert.equal((await u.getEpisode(E(10, 1, 1))).rating, 2);
});

test('episódio não tem "quero ver"; desmarcar limpa a nota', async () => {
  const u = make();
  await assert.rejects(u.patchEpisode(E(10, 1, 1), { status: 'watchlist' as never }), ValidationError);
  await u.patchEpisode(E(10, 1, 1), { rating: 4 });
  const r = await u.patchEpisode(E(10, 1, 1), { status: null });
  assert.deepEqual([r.status, r.rating, r.watchedAt], [null, null, null]);
});

test('episódios ficam fora do diário, das estatísticas e do perfil de gosto', async () => {
  const u = make();
  await u.patchEpisode(E(10, 1, 1), { rating: 5, liked: true });
  assert.deepEqual(await u.list('watched'), []);
  assert.deepEqual(await u.stats(), { total: 0, thisYear: 0, average: null });
  assert.deepEqual(await u.signals(), []);
  assert.equal((await u.knownKeys()).size, 0);
});

test('episódios da temporada e contagem de assistidos (especiais não contam)', async () => {
  const u = make();
  await u.patchEpisode(E(10, 1, 1), { status: 'watched' });
  await u.patchEpisode(E(10, 1, 2), { rating: 3 });
  await u.patchEpisode(E(10, 2, 1), { status: 'watched' });
  await u.patchEpisode(E(10, 0, 1), { status: 'watched' }); // especial
  await u.patchEpisode(E(11, 1, 1), { status: 'watched' }); // outra série
  await u.patchEpisode(E(10, 1, 3), { liked: true }); // só coração: não é "assistido"
  assert.deepEqual((await u.episodesOfSeason(10, 1)).map((e) => e.episode).sort(), [1, 2, 3]);
  assert.equal(await u.watchedEpisodeCount(10), 3);
});

test('episódios persistem ao reabrir o app e não se misturam com filmes', async () => {
  const store = new MemoryStore();
  await make(store).patchEpisode(E(10, 1, 1), { rating: 5, note: 'x' });
  await make(store).patch(M(10), { note: 'filme 10' });
  const u = make(store);
  assert.equal((await u.getEpisode(E(10, 1, 1))).note, 'x');
  assert.equal((await u.get(M(10))).note, 'filme 10');
});

test('episódio: falha ao gravar desfaz e avisa', async () => {
  const store = new MemoryStore();
  const u = make(store);
  await u.patchEpisode(E(10, 1, 1), { note: 'antes' });
  store.setItem = async () => {
    throw new Error('QuotaExceeded');
  };
  await assert.rejects(u.patchEpisode(E(10, 1, 1), { note: 'depois' }), /Não foi possível salvar/);
  assert.equal((await u.getEpisode(E(10, 1, 1))).note, 'antes');
});
