import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import type { EpisodeSummary, MovieDetails, UserEpisode } from '../api/types';
import { useApi } from '../api/useApi';
import { colors, fonts, radius } from '../theme';
import { formatDate, formatRuntime } from './DetailParts';
import { Eyebrow } from './Eyebrow';
import { Icon } from './Icon';
import { Stars } from './Stars';
import { EmptyState, ErrorBox, Loading } from './States';

type Props = {
  series: MovieDetails;
  /** Episódios (sem especiais) que o usuário já marcou como assistidos. */
  watchedEpisodes: number;
  /** Chamado depois de marcar/desmarcar um episódio (para a série atualizar o progresso). */
  onChanged: () => void;
};

/** Temporadas e episódios de uma série. Tocar num episódio abre a tela dele. */
export function Seasons({ series, watchedEpisodes, onChanged }: Props) {
  const navigation = useNavigation();
  const first = series.seasons.find((s) => s.number > 0) ?? series.seasons[0];
  const [selected, setSelected] = useState<number | null>(first?.number ?? null);
  const [actionError, setActionError] = useState<string | null>(null);

  // se a série mudar (ex.: navegou para outra), volta para a primeira temporada
  useEffect(() => setSelected(first?.number ?? null), [series.id, first?.number]);

  const { data, error, loading, reload } = useApi(
    () => (selected == null ? Promise.reject(new Error('Sem temporadas')) : api.season(series.id, selected)),
    [series.id, selected],
  );

  if (!first) return null;

  const total = series.episodeCount ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((watchedEpisodes / total) * 100)) : 0;
  const userByEp = new Map<number, UserEpisode>((data?.user ?? []).map((u) => [u.episode, u]));
  // só mostra a lista da temporada que está selecionada (evita piscar a anterior)
  const current = data && data.season.number === selected ? data : undefined;

  const toggleWatched = async (ep: EpisodeSummary) => {
    setActionError(null);
    const watched = userByEp.get(ep.number)?.status === 'watched';
    try {
      await api.updateEpisode(
        { seriesId: series.id, season: ep.season, episode: ep.number },
        { status: watched ? null : 'watched' },
      );
      reload();
      onChanged();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Eyebrow>Temporadas e episódios</Eyebrow>
        {total > 0 && (
          <Text style={styles.progressText}>
            {watchedEpisodes} de {total} assistidos
          </Text>
        )}
      </View>
      {total > 0 && (
        <View style={styles.bar} accessibilityLabel={`${pct}% da série assistida`}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {series.seasons.map((s) => (
          <Pressable
            key={s.number}
            onPress={() => setSelected(s.number)}
            style={[styles.chip, selected === s.number && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === s.number }}
          >
            <Text style={[styles.chipText, selected === s.number && styles.chipTextActive]}>
              {s.number === 0 ? 'Especiais' : `Temporada ${s.number}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {(loading || (!current && !error)) && <Loading />}
      {error && !current && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <Text style={styles.errorText}>{actionError}</Text>}
      {current && current.episodes.length === 0 && (
        <EmptyState icon="tv" text="Esta temporada ainda não tem episódios cadastrados." />
      )}
      {current?.episodes.map((ep) => {
        const user = userByEp.get(ep.number);
        const watched = user?.status === 'watched';
        return (
          <Pressable
            key={`${ep.season}:${ep.number}`}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            onPress={() =>
              navigation.navigate('Episodio', { seriesId: series.id, season: ep.season, episode: ep.number })
            }
            accessibilityRole="button"
            accessibilityLabel={`Episódio ${ep.number}: ${ep.name}`}
          >
            <View style={styles.still}>
              <LinearGradient colors={['#5A2C20', '#2A130E']} style={StyleSheet.absoluteFill} />
              {ep.stillUrl ? (
                <Image source={{ uri: ep.stillUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={styles.stillFallback}>
                  <Icon name="play-arrow" size={26} color={colors.textDim} />
                </View>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.epNumber}>{ep.season === 0 ? `ESPECIAL ${ep.number}` : `EPISÓDIO ${ep.number}`}</Text>
              <Text style={styles.epName} numberOfLines={2}>
                {ep.name}
              </Text>
              <Text style={styles.epMeta} numberOfLines={1}>
                {[ep.airDate ? formatDate(ep.airDate) : null, formatRuntime(ep.runtimeMinutes)].filter(Boolean).join(' · ')}
              </Text>
              {user?.rating != null && (
                <View style={{ marginTop: 4 }}>
                  <Stars rating={user.rating} size={12} gap={1} />
                </View>
              )}
            </View>
            <Pressable
              onPress={() => toggleWatched(ep)}
              hitSlop={10}
              style={styles.check}
              accessibilityRole="button"
              accessibilityLabel={watched ? 'Desmarcar episódio como assistido' : 'Marcar episódio como assistido'}
            >
              <Icon
                name={watched ? 'check-circle' : 'check-circle-outline'}
                size={26}
                color={watched ? colors.gold : colors.textDim}
              />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { color: colors.textMuted, fontFamily: fonts.sansMedium, fontSize: 12 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: colors.surfacePill, borderColor: colors.gold },
  chipText: { color: colors.textMuted, fontFamily: fonts.sansMedium, fontSize: 13 },
  chipTextActive: { color: colors.goldLight },
  errorText: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'rgba(58,29,21,0.55)',
    padding: 8,
  },
  still: {
    width: 112,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  stillFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  epNumber: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 10, letterSpacing: 1.6 },
  epName: { color: colors.cream, fontFamily: fonts.serif, fontSize: 16, lineHeight: 20 },
  epMeta: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 12 },
  check: { paddingHorizontal: 4 },
});
