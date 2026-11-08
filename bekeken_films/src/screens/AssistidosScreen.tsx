import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { PageHeader } from '../components/Title';
import { StatCard } from '../components/StatCard';
import { Stars } from '../components/Stars';
import { Poster } from '../components/Poster';
import { getMovie, stats, watched, type WatchedEntry } from '../data/movies';
import { colors, fonts } from '../theme';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Group = { key: string; label: string; entries: WatchedEntry[] };

// Agrupa as entradas por mês, do mais recente para o mais antigo.
function groupByMonth(entries: WatchedEntry[]): Group[] {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const groups: Group[] = [];
  for (const entry of sorted) {
    const [year, month] = entry.date.split('-').map(Number);
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
  const groups = useMemo(() => groupByMonth(watched), []);

  return (
    <Screen>
      <PageHeader eyebrow="Seu diário" title="Assistidos" />

      <View style={styles.stats}>
        <StatCard label="Filmes" value={stats.total} />
        <StatCard label="Este ano" value={stats.thisYear} />
        <StatCard label="Nota média" value={stats.average.toFixed(1)} accent />
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.month}>{group.label}</Text>
          {group.entries.map((entry) => {
            const movie = getMovie(entry.movieId);
            const [, , day] = entry.date.split('-');
            const monthIdx = Number(entry.date.split('-')[1]) - 1;
            return (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                onPress={() => navigation.navigate('Detalhes', { movieId: movie.id })}
              >
                <View style={styles.date}>
                  <Text style={styles.day}>{day}</Text>
                  <Text style={styles.dayMonth}>
                    {MONTHS[monthIdx].slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <Poster movie={movie} style={styles.thumb} glyphSize={26} rounded={8} />
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={2}>
                    {`${movie.year} · ${movie.director}`}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <Stars rating={entry.rating} size={14} gap={1} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
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
  day: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 34,
  },
  dayMonth: {
    color: colors.textMuted,
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  thumb: { width: 64 },
  info: { flex: 1 },
  title: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 24,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    marginTop: 2,
  },
});
