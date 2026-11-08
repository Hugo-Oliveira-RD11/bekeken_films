import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { PageHeader } from '../components/Title';
import { Poster } from '../components/Poster';
import { Stars } from '../components/Stars';
import { TomatoScore } from '../components/TomatoScore';
import { getMovie, watchlistIds } from '../data/movies';
import { colors, fonts } from '../theme';

export function ParaAssistirScreen() {
  const navigation = useNavigation();
  const list = watchlistIds.map(getMovie);

  return (
    <Screen>
      <PageHeader
        eyebrow={`${list.length} filmes guardados`}
        title="Para assistir"
        subtitle="Sua sessão da próxima sexta começa aqui."
      />
      <View style={styles.grid}>
        {list.map((movie) => (
          <Pressable
            key={movie.id}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('Detalhes', { movieId: movie.id })}
          >
            <Poster movie={movie} glyphSize={56} />
            <Text style={styles.title} numberOfLines={1}>
              {movie.title}
            </Text>
            <View style={styles.rating}>
              <Stars rating={movie.rating} size={12} gap={1} />
              <TomatoScore score={movie.tomato} size={12} />
            </View>
          </Pressable>
        ))}
      </View>
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
  // 2 colunas: (100% - gap) / 2
  item: { width: '47.5%', gap: 8 },
  title: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 18,
    marginTop: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
