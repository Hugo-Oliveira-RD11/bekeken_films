import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import type { WatchedResponse } from '../api/types';
import { useApi } from '../api/useApi';
import { Poster } from '../components/Poster';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { Stars } from '../components/Stars';
import { EmptyState, ErrorBox, Loading } from '../components/States';
import { PageHeader } from '../components/Title';
import { colors, fonts } from '../theme';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Entry = WatchedResponse['entries'][number];
type Group = { key: string; label: string; entries: Entry[] };

// O backend já devolve do mais recente para o mais antigo; só agrupamos por mês.
function groupByMonth(entries: Entry[]): Group[] {
  const groups: Group[] = [];
  for (const entry of entries) {
    const [year, month] = entry.watchedAt.split('-').map(Number);
    const key = `${year}-${month}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: `${MONTHS[month - 1]} ${year}`, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

export function AssistidosScreen() {
  const navigation = useNavigation();
  const { data, error, loading, reload } = useApi(() => api.watched());
  const groups = useMemo(() => (data ? groupByMonth(data.entries) : []), [data]);

  return (
    <Screen>
      <PageHeader eyebrow="Seu diário" title="Assistidos" />

      {loading && <Loading />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          <View style={styles.stats}>
            <StatCard label="Filmes" value={data.stats.total} />
            <StatCard label="Este ano" value={data.stats.thisYear} />
            <StatCard
              label="Nota média"
              value={data.stats.average == null ? '—' : data.stats.average.toFixed(1)}
              accent
            />
          </View>

          {groups.length === 0 && (
            <EmptyState
              icon="visibility"
              text="Você ainda não marcou nenhum filme como assistido. Abra um filme e toque em “Assistido”."
            />
          )}

          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.month}>{group.label}</Text>
              {group.entries.map((entry) => {
                const [, m, day] = entry.watchedAt.split('-');
                return (
                  <Pressable
                    key={entry.movie.id}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                    onPress={() => navigation.navigate('Detalhes', { movieId: entry.movie.id })}
                  >
                    <View style={styles.date}>
                      <Text style={styles.day}>{day}</Text>
                      <Text style={styles.dayMonth}>{MONTHS[Number(m) - 1].slice(0, 3).toUpperCase()}</Text>
                    </View>
                    <Poster uri={entry.movie.posterUrl} title={entry.movie.title} style={styles.thumb} rounded={8} />
                    <View style={styles.info}>
                      <Text style={styles.title} numberOfLines={2}>
                        {entry.movie.title}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {entry.movie.year ?? ''}
                      </Text>
                      <View style={{ marginTop: 6 }}>
                        {entry.rating != null ? (
                          <Stars rating={entry.rating} size={14} gap={1} />
                        ) : (
                          <Text style={styles.meta}>Sem nota</Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12, marginTop: 20 },
  group: { marginTop: 32, gap: 18 },
  month: {
    color: colors.cream,
    fontFamily: fonts.serifItalic,
    fontSize: 30,
    lineHeight: 36,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  date: { width: 42, alignItems: 'center' },
  day: { color: colors.gold, fontFamily: fonts.serif, fontSize: 30, lineHeight: 34 },
  dayMonth: {
    color: colors.textMuted,
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  thumb: { width: 64 },
  info: { flex: 1 },
  title: { color: colors.cream, fontFamily: fonts.serif, fontSize: 20, lineHeight: 24 },
  meta: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 13, marginTop: 2 },
});
