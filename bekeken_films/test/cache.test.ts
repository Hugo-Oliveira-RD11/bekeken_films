import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cache, DAY, HOUR } from '../src/services/cache';
import { MemoryStore } from '../src/services/storage';

function setup() {
  let now = 1_000_000;
  const store = new MemoryStore();
  const cache = new Cache(store, () => now);
  return { cache, store, advance: (ms: number) => (now += ms), clock: () => now };
}

test('segunda chamada vem do cache e não chama a API', async () => {
  const { cache } = setup();
  let calls = 0;
  const fetcher = async () => ({ n: ++calls });
  const a = await cache.getOrFetch('k', { ttlMs: HOUR }, fetcher);
  const b = await cache.getOrFetch('k', { ttlMs: HOUR }, fetcher);
  assert.deepEqual(a, { n: 1 });
  assert.deepEqual(b, { n: 1 });
  assert.equal(calls, 1);
  assert.deepEqual(cache.stats, { hits: 1, misses: 1, stale: 0 });
});

test('o cache sobrevive ao fechar o app (nova instância lê do armazenamento)', async () => {
  const { cache, store, clock } = setup();
  await cache.getOrFetch('k', { ttlMs: HOUR }, async () => 'salvo');
  const reopened = new Cache(store, clock); // memória vazia, mesmo "disco"
  let calls = 0;
  const v = await reopened.getOrFetch('k', { ttlMs: HOUR }, async () => `novo${++calls}`);
  assert.equal(v, 'salvo');
  assert.equal(calls, 0);
});

test('dado expirado é buscado de novo', async () => {
  const { cache, advance } = setup();
  let calls = 0;
  const fetcher = async () => ++calls;
  await cache.getOrFetch('k', { ttlMs: HOUR }, fetcher);
  advance(HOUR + 1);
  assert.equal(await cache.getOrFetch('k', { ttlMs: HOUR }, fetcher), 2);
});

test('se a API falhar, devolve o dado expirado em vez de erro', async () => {
  const { cache, advance } = setup();
  await cache.getOrFetch('k', { ttlMs: HOUR }, async () => 'velho');
  advance(2 * HOUR);
  const v = await cache.getOrFetch('k', { ttlMs: HOUR }, async () => {
    throw new Error('API fora do ar');
  });
  assert.equal(v, 'velho');
  assert.equal(cache.stats.stale, 1);
});

test('sem cache e com a API falhando, o erro é propagado (e nada é gravado)', async () => {
  const { cache } = setup();
  await assert.rejects(
    cache.getOrFetch('k', { ttlMs: HOUR }, async () => {
      throw new Error('boom');
    }),
    /boom/,
  );
  // a falha não foi cacheada: a próxima tentativa chama a API de novo
  assert.equal(await cache.getOrFetch('k', { ttlMs: HOUR }, async () => 'ok'), 'ok');
});

test('chamadas simultâneas para a mesma chave compartilham uma requisição', async () => {
  const { cache } = setup();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 20));
    return 'v';
  };
  const out = await Promise.all([1, 2, 3].map(() => cache.getOrFetch('k', { ttlMs: HOUR }, fetcher)));
  assert.deepEqual(out, ['v', 'v', 'v']);
  assert.equal(calls, 1);
});

test('resultado null usa TTL próprio (nullTtlMs)', async () => {
  const { cache, advance } = setup();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return null;
  };
  const opts = { ttlMs: 10 * HOUR, nullTtlMs: HOUR };
  await cache.getOrFetch('k', opts, fetcher);
  await cache.getOrFetch('k', opts, fetcher); // null também é cacheado
  assert.equal(calls, 1);
  advance(HOUR + 1);
  await cache.getOrFetch('k', opts, fetcher);
  assert.equal(calls, 2);
});

test('dado corrompido no armazenamento é tratado como ausente', async () => {
  const { cache, store } = setup();
  await store.setItem('cache:k', '{não é json');
  assert.equal(await cache.getOrFetch('k', { ttlMs: HOUR }, async () => 'ok'), 'ok');
});

test('falha ao gravar (disco cheio) não derruba a requisição', async () => {
  const { store, clock } = setup();
  store.setItem = async () => {
    throw new Error('QuotaExceeded');
  };
  const cache = new Cache(store, clock);
  let calls = 0;
  const fetcher = async () => ++calls;
  assert.equal(await cache.getOrFetch('k', { ttlMs: HOUR }, fetcher), 1);
  assert.equal(await cache.getOrFetch('k', { ttlMs: HOUR }, fetcher), 1); // ainda vale em memória
});

test('prune apaga só o que venceu há muito tempo (e não mexe em outras chaves)', async () => {
  const { cache, store, advance } = setup();
  await cache.getOrFetch('velho', { ttlMs: HOUR }, async () => 1);
  advance(40 * DAY);
  await cache.getOrFetch('recente', { ttlMs: HOUR }, async () => 2);
  await store.setItem('user:movies:v1', '[]');
  assert.equal(await cache.prune(30 * DAY), 1);
  assert.deepEqual([...store.map.keys()].sort(), ['cache:recente', 'user:movies:v1']);
});
