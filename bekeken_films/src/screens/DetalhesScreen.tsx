import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Eyebrow } from '../components/Eyebrow';
import { Poster } from '../components/Poster';
import { Stars } from '../components/Stars';
import { TomatoScore } from '../components/TomatoScore';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { getMovie } from '../data/movies';
import { colors, fonts, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Detalhes'>;

export function DetalhesScreen({ route, navigation }: Props) {
  const movie = getMovie(route.params.movieId);
  const insets = useSafeAreaInsets();
  const [watched, setWatched] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[movie.poster[1], '#2A120E', colors.bg]}
        locations={[0, 0.35, 0.7]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(20,10,10,0.35)', colors.bg]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityLabel="Voltar"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={colors.creamBright} />
        </Pressable>

        <View style={styles.posterWrap}>
          <Poster movie={movie} style={styles.poster} glyphSize={90} rounded={radius.lg} />
        </View>

        <View style={styles.body}>
          <Eyebrow>{movie.genres.join(' · ')}</Eyebrow>
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.meta}>
            {`${movie.year} · ${movie.director} · ${movie.duration}`.toUpperCase()}
          </Text>

          <View style={styles.ratingRow}>
            <Stars rating={movie.rating} size={22} gap={3} />
            <TomatoScore score={movie.tomato} size={15} />
          </View>

          <Eyebrow style={{ marginTop: 12 }}>Sinopse</Eyebrow>
          <Text style={styles.synopsis}>{movie.synopsis}</Text>

          <View style={styles.buttons}>
            <PrimaryButton
              label={watched ? 'Assistido' : 'Marcar como assistido'}
              icon={watched ? 'checkmark' : 'eye'}
              onPress={() => setWatched((v) => !v)}
            />
            <SecondaryButton
              label={saved ? 'Na lista' : 'Quero ver'}
              icon={saved ? 'bookmark' : 'add'}
              onPress={() => setSaved((v) => !v)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  back: {
    marginLeft: spacing.screen,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,10,10,0.6)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterWrap: { alignItems: 'center', marginTop: 16 },
  poster: { width: 210 },
  body: { paddingHorizontal: spacing.screen, paddingTop: 28, gap: 12 },
  title: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 48,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 2,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  synopsis: {
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 26,
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
});
