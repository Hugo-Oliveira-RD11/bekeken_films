import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildProfile, recommend, type Candidate, type Signal } from '../src/services/recommend';

const signals: Signal[] = [
  { genres: ['Drama', 'Romance'], liked: false, rating: 5 },
  { genres: ['Drama', 'Crime'], liked: true, rating: 3 },
  { genres: ['Terror'], liked: true, rating: 1 }, // coração vence a nota baixa
  { genres: ['Comédia'], liked: false, rating: 2 }, // nota baixa e sem coração: ignorado
  { genres: ['Ficção'], liked: true, rating: null }, // só coração: peso 4
];

test('count: soma 1 por gênero de cada filme curtido', () => {
  assert.deepEqual(buildProfile(signals, 'count'), {
    Drama: 2,
    Romance: 1,
    Crime: 1,
    Terror: 1,
    Ficção: 1,
  });
});

test('weighted: soma a nota (nota 5 pesa mais que 3; só coração vale 4)', () => {
  assert.deepEqual(buildProfile(signals, 'weighted'), {
    Drama: 8, // 5 + 3
    Romance: 5,
    Crime: 3,
    Terror: 1,
    Ficção: 4,
  });
});

test('os dois algoritmos podem ordenar de forma diferente', () => {
  // 2 filmes de Terror (curtidos, mas nota 1) vs 1 filme de Romance nota 5.
  const sig: Signal[] = [
    { genres: ['Terror'], liked: true, rating: 1 },
    { genres: ['Terror'], liked: true, rating: 1 },
    { genres: ['Romance'], liked: false, rating: 5 },
  ];
  const cands: Candidate[] = [
    { id: 1, genres: ['Terror'], voteAverage: 7 },
    { id: 2, genres: ['Romance'], voteAverage: 7 },
  ];
  // count: Terror 2 > Romance 1  |  weighted: Romance 5 > Terror 2
  assert.deepEqual(recommend(sig, cands, 'count').items.map((i) => i.id), [1, 2]);
  assert.deepEqual(recommend(sig, cands, 'weighted').items.map((i) => i.id), [2, 1]);
});

test('nota do candidato é a média do perfil nos gêneros (não favorece muitos gêneros)', () => {
  const sig: Signal[] = [{ genres: ['Drama'], liked: true, rating: null }];
  const cands: Candidate[] = [
    { id: 1, genres: ['Drama'], voteAverage: 5 },
    { id: 2, genres: ['Drama', 'Comédia', 'Terror'], voteAverage: 9 },
  ];
  const { items } = recommend(sig, cands, 'count');
  assert.equal(items[0].id, 1);
  assert.equal(items[0].matchPercent, 100);
  assert.equal(items[1].matchPercent, 33);
  assert.deepEqual(items[0].because, ['Drama']);
});

test('candidatos sem nenhum gênero em comum são descartados; empate usa nota do TMDB', () => {
  const sig: Signal[] = [{ genres: ['Drama'], liked: true, rating: null }];
  const cands: Candidate[] = [
    { id: 1, genres: ['Terror'], voteAverage: 9 },
    { id: 2, genres: ['Drama'], voteAverage: 6 },
    { id: 3, genres: ['Drama'], voteAverage: 8 },
  ];
  assert.deepEqual(recommend(sig, cands, 'count').items.map((i) => i.id), [3, 2]);
});

test('sem histórico (cold start): devolve os mais bem avaliados, sem match', () => {
  const cands: Candidate[] = [
    { id: 1, genres: ['Drama'], voteAverage: 6 },
    { id: 2, genres: ['Terror'], voteAverage: 9 },
  ];
  const r = recommend([], cands, 'weighted');
  assert.equal(r.coldStart, true);
  assert.deepEqual(r.items.map((i) => [i.id, i.matchPercent]), [[2, null], [1, null]]);
});

test('respeita o limite', () => {
  const sig: Signal[] = [{ genres: ['Drama'], liked: true, rating: null }];
  const cands: Candidate[] = Array.from({ length: 10 }, (_, i) => ({ id: i, genres: ['Drama'], voteAverage: i }));
  assert.equal(recommend(sig, cands, 'count', 3).items.length, 3);
});
