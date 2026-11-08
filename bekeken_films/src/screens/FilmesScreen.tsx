import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Eyebrow } from '../components/Eyebrow';
import { Stars } from '../components/Stars';
import { TomatoScore } from '../components/TomatoScore';
import { Poster } from '../components/Poster';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { featuredId, getMovie, movies } from '../data/movies';
import { colors, fonts, spacing } from '../theme';

export function FilmesScreen() {
  const navigation = useNavigation();
  const featured = getMovie(featuredId);
  const inTheaters = movies.filter((m) => m.id !== featuredId);

  const hero = (
    <View style={styles.hero}>
      {/* "sala de cinema" estilizada: fundo quente com vinheta */}
      <LinearGradient
        colors={['#3B1C12', '#2A130E', '#140A0A']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(201,162,75,0.28)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', colors.bg]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <Eyebrow>Destaque da semana</Eyebrow>
        <Text style={styles.heroTitle}>{featured.title}</Text>
        <Text style={styles.heroMeta}>
          {`${featured.year} · ${featured.director} · ${featured.duration}`.toUpperCase()}
        </Text>
        <View style={styles.ratingRow}>
          <Stars rating={featured.rating} size={20} gap={3} />
          <TomatoScore score={featured.tomato} size={15} />
        </View>
        <Text style={styles.synopsis}>{featured.synopsis}</Text>
        <View style={styles.buttons}>
          <PrimaryButton
            label="Ver detalhes"
            icon="play"
            onPress={() => navigation.navigate('Detalhes', { movieId: featured.id })}
          />
          <SecondaryButton label="Quero ver" icon="add" />
        </View>
      </View>
    </View>
  );

  return (
    <Screen hero={hero} padded={false}>
      <View style={styles.section}>
        <Eyebrow style={styles.sectionLabel}>Em cartaz</Eyebrow>
        <FlatList
          data={inTheaters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('Detalhes', { movieId: item.id })}
            >
              <Poster movie={item} />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.cardRating}>
                <Stars rating={item.rating} size={12} gap={1} />
                <TomatoScore score={item.tomato} size={12} />
              </View>
            </Pressable>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 520, justifyContent: 'flex-end' },
  heroContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: 70,
    paddingBottom: 28,
    gap: 14,
  },
  heroTitle: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 60,
    lineHeight: 64,
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
    fontSize: 17,
    lineHeight: 26,
    opacity: 0.9,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  section: { gap: 16, paddingTop: 8 },
  sectionLabel: { paddingHorizontal: spacing.screen },
  list: { paddingHorizontal: spacing.screen },
  card: { width: 150, gap: 8 },
  cardTitle: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 17,
    marginTop: 2,
  },
  cardRating: { gap: 6 },
});
