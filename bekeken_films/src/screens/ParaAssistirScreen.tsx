import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import type { Algorithm } from '../api/types';
import { useApi } from '../api/useApi';
import { Eyebrow } from '../components/Eyebrow';
import { MovieCard } from '../components/MovieCard';
import { Screen } from '../components/Screen';
import { EmptyState, ErrorBox, Loading } from '../components/States';
import { PageHeader } from '../components/Title';
import { colors, fonts, radius } from '../theme';

const OPTIONS: { value: Algorithm; label: string; hint: string }[] = [
  {
    value: 'count',
    label: 'Por gêneros',
    hint: 'Conta os gêneros dos filmes que você curtiu.',
  },
  {
    value: 'weighted',
    label: 'Por nota',
    hint: 'Igual, mas um filme nota 5 pesa mais que um nota 3.',
  },
];

export function ParaAssistirScreen() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('weighted');
  const list = useApi(() => api.watchlist());
  const recs = useApi(() => api.recommendations(algorithm), [algorithm]);
  const movies = list.data?.movies ?? [];

  return (
    <Screen>
      <PageHeader
        eyebrow={`${movies.length} ${movies.length === 1 ? 'filme guardado' : 'filmes guardados'}`}
        title="Para assistir"
        subtitle="Sua sessão da próxima sexta começa aqui."
      />

      {list.loading && <Loading />}
      {list.error && !list.data && <ErrorBox message={list.error} onRetry={list.reload} />}
      {list.data && movies.length === 0 && (
        <EmptyState icon="bookmark-outline" text="Nada guardado ainda. Toque em “Quero ver” em qualquer filme." />
      )}
      <View style={styles.grid}>
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} style={styles.item} />
        ))}
      </View>

      {/* ---------- Recomendações ---------- */}
      <View style={styles.recsHeader}>
        <Eyebrow>Recomendados para você</Eyebrow>
        <View style={styles.segment}>
          {OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setAlgorithm(o.value)}
              style={[styles.segmentItem, algorithm === o.value && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: algorithm === o.value }}
            >
              <Text style={[styles.segmentText, algorithm === o.value && styles.segmentTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{OPTIONS.find((o) => o.value === algorithm)!.hint}</Text>
      </View>

      {recs.loading && <Loading />}
      {recs.error && !recs.data && <ErrorBox message={recs.error} onRetry={recs.reload} />}
      {recs.data && (
        <>
          {recs.data.coldStart ? (
            <Text style={styles.profile}>
              Ainda não conhecemos seu gosto. Dê coração ou nota (3+) a alguns filmes e as sugestões
              passam a combinar com você. Por enquanto, os mais bem avaliados:
            </Text>
          ) : (
            <View style={styles.profileChips}>
              {recs.data.profile.slice(0, 5).map((p) => (
                <View key={p.genre} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {p.genre} <Text style={styles.chipValue}>{p.value}</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.grid}>
            {recs.data.items.map((r) => (
              <MovieCard
                key={r.movie.id}
                movie={r.movie}
                style={styles.item}
                badge={r.matchPercent != null ? `${r.matchPercent}% combina` : undefined}
                caption={r.because.length ? `Porque você curte ${r.because.join(' e ')}` : undefined}
              />
            ))}
          </View>
          {recs.data.items.length === 0 && (
            <EmptyState icon="sparkles-outline" text="Sem sugestões por enquanto." />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 24,
    marginTop: 20,
  },
  item: { width: '47.5%' },
  recsHeader: { marginTop: 44, gap: 12 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segmentItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.surfacePill },
  segmentText: { color: colors.textMuted, fontFamily: fonts.sansMedium, fontSize: 13 },
  segmentTextActive: { color: colors.goldLight },
  hint: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 13 },
  profile: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 12 },
  profileChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipText: { color: colors.text, fontFamily: fonts.sansMedium, fontSize: 12 },
  chipValue: { color: colors.gold },
});
