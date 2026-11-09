import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MovieSummary } from '../api/types';
import { colors, fonts } from '../theme';
import { Poster } from './Poster';
import { ScoreBadge } from './ScoreBadge';
import { Stars } from './Stars';

type Props = {
  movie: MovieSummary;
  style?: StyleProp<ViewStyle>;
  /** Texto extra abaixo (ex.: "Combina com Drama"). */
  caption?: string;
  /** Selo no canto do pôster (ex.: "87% match"). */
  badge?: string;
  /** Mostra o selo "SÉRIE" (use onde filmes e séries aparecem misturados). */
  showType?: boolean;
};

// Pôster + título + estrelas (média do TMDB) + nota. Ao tocar, abre os detalhes.
export function MovieCard({ movie, style, caption, badge, showType }: Props) {
  const navigation = useNavigation();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.8 }]}
      onPress={() => navigation.navigate('Detalhes', { mediaType: movie.mediaType, id: movie.id })}
    >
      <View>
        <Poster uri={movie.posterUrl} title={movie.title} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        {showType && movie.mediaType === 'tv' ? (
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>SÉRIE</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {movie.title}
      </Text>
      <View style={styles.rating}>
        <Stars rating={movie.voteAverage / 2} size={12} gap={1} />
        <ScoreBadge voteAverage={movie.voteAverage} />
      </View>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  title: { color: colors.cream, fontFamily: fonts.serif, fontSize: 17, marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caption: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(30,14,11,0.85)',
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(30,14,11,0.85)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeText: { color: colors.creamBright, fontFamily: fonts.sansSemi, fontSize: 10, letterSpacing: 1.2 },
  badgeText: { color: colors.goldLight, fontFamily: fonts.sansSemi, fontSize: 11 },
});
