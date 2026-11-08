import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryStore } from '../src/services/storage';
import { localDate, UserData, ValidationError } from '../src/services/userdata';

const NOW = new Date(2026, 10, 2, 12, 0, 0); // 02/11/2026 (hora local)
const make = (store = new MemoryStore()) => new UserData(store, () => NOW);

test('localDate usa a data local, não UTC', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('estado vazio por padrão', async () => {
  assert.deepEqual(await make().get(1), {
    tmdbId: 1, status: null, rating: null, liked: false, note: '', watchedAt: null,
  });
});

test('marcar como assistido grava a data de hoje', async () => {
  const r = await make().patch(1, { status: 'watched' });
  assert.equal(r.status, 'watched');
  assert.equal(r.watchedAt, '2026-11-02');
});

test('dar nota marca como assistido automaticamente', async () => {
  const r = await make().patch(1, { rating: 4.5 });
  assert.equal(r.status, 'watched');
  assert.equal(r.rating, 4.5);
});

test('desmarcar "assistido" (status null) limpa nota e data', async () => {
  const u = make();
  await u.patch(1, { rating: 4, liked: true });
  const r = await u.patch(1, { status: null });
  assert.deepEqual([r.status, r.rating, r.watchedAt, r.liked], [null, null, null, true]);
});

test('"Quero ver" num filme já assistido é ignorado (não apaga a nota)', async () => {
  const u = make();
  await u.patch(1, { rating: 4 });
  const r = await u.patch(1, { status: 'watchlist' });
  assert.deepEqual([r.status, r.rating, r.watchedAt], ['watched', 4, '2026-11-02']);
});

test('anotação é guardada e atualizada sem mexer no resto', async () => {
  const u = make();
  await u.patch(1, { status: 'watchlist' });
  await u.patch(1, { note: 'ver com a Ana' });
  const r = await u.patch(1, { liked: true });
  assert.deepEqual([r.status, r.note, r.liked], ['watchlist', 'ver com a Ana', true]);
  assert.equal((await u.get(1)).note, 'ver com a Ana');
});

test('os dados ficam salvos no aparelho e voltam ao reabrir o app', async () => {
  const store = new MemoryStore();
  await make(store).patch(7, { rating: 5, note: 'obra-prima', liked: true });
  const reopened = make(store);
  assert.deepEqual(await reopened.get(7), {
    tmdbId: 7, status: 'watched', rating: 5, liked: true, note: 'obra-prima', watchedAt: '2026-11-02',
  });
});

test('registro sem nada útil é removido', async () => {
  const u = make();
  await u.patch(1, { liked: true });
  await u.patch(1, { liked: false });
  assert.equal((await u.list('watched')).length + (await u.list('watchlist')).length, 0);
  assert.equal((await u.signals()).length, 0);
});

test('validações (e erro não deixa lixo)', async () => {
  const u = make();
  for (const bad of [0, 5.5, 3.3, -1, NaN, '4' as unknown as number]) {
    await assert.rejects(u.patch(1, { rating: bad }), ValidationError, `rating ${String(bad)}`);
  }
  await assert.rejects(u.patch(1, { status: 'x' as never }), ValidationError);
  await assert.rejects(u.patch(1, { watchedAt: '2026-02-30' }), ValidationError);
  await assert.rejects(u.patch(1, { note: 'a'.repeat(5001) }), ValidationError);
  await assert.rejects(u.patch(1, { liked: 'sim' as never }), ValidationError);
  assert.equal((await u.get(1)).status, null);
});

test('se não conseguir gravar no aparelho, desfaz a alteração e avisa', async () => {
  const store = new MemoryStore();
  const u = make(store);
  await u.patch(1, { note: 'antes' });
  store.setItem = async () => {
    throw new Error('QuotaExceeded');
  };
  await assert.rejects(u.patch(1, { note: 'depois' }), /Não foi possível salvar/);
  assert.equal((await u.get(1)).note, 'antes');
  await assert.rejects(u.patch(2, { liked: true }), /Não foi possível salvar/);
  assert.equal((await u.get(2)).liked, false);
});

test('gravações simultâneas não se perdem', async () => {
  const store = new MemoryStore();
  const u = make(store);
  await Promise.all([1, 2, 3, 4, 5].map((id) => u.patch(id, { status: 'watchlist' })));
  assert.equal((await make(store).list('watchlist')).length, 5);
});

test('estatísticas e ordenação do diário', async () => {
  const u = make();
  await u.patch(1, { rating: 5, watchedAt: '2026-11-01' });
  await u.patch(2, { rating: 4, watchedAt: '2026-11-02' });
  await u.patch(3, { rating: 3, watchedAt: '2025-12-30' });
  await u.patch(4, { status: 'watchlist' });
  assert.deepEqual((await u.list('watched')).map((m) => m.tmdbId), [2, 1, 3]);
  assert.deepEqual(await u.stats(), { total: 3, thisYear: 2, average: 4 });
  assert.deepEqual([...(await u.knownIds())].sort(), [1, 2, 3, 4]);
});
