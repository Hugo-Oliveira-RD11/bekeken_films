import React, { useState } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import type { HomeSectionKey, MovieSummary } from '../api/types';
import { useApi } from '../api/useApi';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Eyebrow } from '../components/Eyebrow';
import { MovieCard } from '../components/MovieCard';
import { ScoreBadge } from '../components/ScoreBadge';
import { Screen } from '../components/Screen';
import { Stars } from '../components/Stars';
import { EmptyState, ErrorBox, Loading } from '../components/States';
import { colors, fonts, spacing } from '../theme';

function Hero({ movie }: { movie: MovieSummary }) {
  const navigation = useNavigation();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMovie(movie.id, { status: 'watchlist' });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ImageBackground source={movie.backdropUrl ? { uri: movie.backdropUrl } : undefined} style={styles.hero}>
      <LinearGradient
        colors={['rgba(78,34,16,0.55)', 'rgba(42,19,14,0.55)', colors.bg]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <Eyebrow>Destaque da semana</Eyebrow>
        <Text style={styles.heroTitle}>{movie.title}</Text>
        <Text style={styles.heroMeta}>
          {[movie.year, movie.genres.slice(0, 2).join(' / ')].filter(Boolean).join(' · ').toUpperCase()}
        </Text>
        <View style={styles.ratingRow}>
          <Stars rating={movie.voteAverage / 2} size={20} gap={3} />
          <ScoreBadge voteAverage={movie.voteAverage} size={15} />
        </View>
        <Text style={styles.synopsis} numberOfLines={4}>
          {movie.overview}
        </Text>
        <View style={styles.buttons}>
          <PrimaryButton
            label="Ver detalhes"
            icon="play-arrow"
            onPress={() => navigation.navigate('Detalhes', { movieId: movie.id })}
          />
          <SecondaryButton
            label={saved ? 'Na lista' : 'Quero ver'}
            icon={saved ? 'check' : 'add'}
            onPress={save}
            disabled={saving || saved}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

export function FilmesScreen() {
  const { data, error, loading, reload } = useApi(() => api.home());

  return (
    <Screen hero={data?.featured ? <Hero movie={data.featured} /> : undefined} padded={false}>
      {loading && <Loading />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {data && data.sections.length === 0 && (
        <EmptyState icon="movie" text="Nenhum filme para mostrar agora." />
      )}
      {data?.sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eyebrow>{SECTION_TEXT[section.key].title}</Eyebrow>
            <Text style={styles.sectionHint}>{SECTION_TEXT[section.key].hint}</Text>
          </View>
          <FlatList
            data={section.movies}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            renderItem={({ item }) => <MovieCard movie={item} style={styles.card} />}
          />
        </View>
      ))}
    </Screen>
  );
}

// Títulos das seções. O TMDB não informa "quantas vezes foi assistido", então
// "Mais assistidos" usa a popularidade dele e "Mais gostados" as maiores notas.
const SECTION_TEXT: Record<HomeSectionKey, { title: string; hint: string }> = {
  nowPlaying: { title: 'Em cartaz', hint: 'nos cinemas agora' },
  mostWatched: { title: 'Mais assistidos', hint: 'popularidade no TMDB' },
  topRated: { title: 'Mais gostados', hint: 'maiores notas no TMDB' },
  trending: { title: 'Em alta', hint: 'esta semana' },
};

const styles = StyleSheet.create({
  hero: { minHeight: 540, justifyContent: 'flex-end' },
  heroContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: 70,
    paddingBottom: 28,
    gap: 14,
  },
  heroTitle: {
    color: colors.creamBright,
    fontFamily: fonts.serif,
    fontSize: 54,
    lineHeight: 58,
  },
  heroMeta: {
    color: colors.textMuted,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 2,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  synopsis: {
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 25,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  section: { gap: 16, paddingTop: 8, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
  },
  sectionHint: { color: colors.textDim, fontFamily: fonts.sans, fontSize: 12 },
  list: { paddingHorizontal: spacing.screen },
  card: { width: 150 },
});
