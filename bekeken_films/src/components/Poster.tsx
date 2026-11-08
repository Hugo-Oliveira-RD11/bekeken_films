import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import type { Movie } from '../data/movies';

type Props = {
  movie: Movie;
  style?: StyleProp<ViewStyle>;
  glyphSize?: number;
  rounded?: number;
};

// Poster placeholder: gradiente + glifo. Proporção 2:3 por padrão.
export function Poster({ movie, style, glyphSize = 48, rounded = radius.md }: Props) {
  return (
    <View style={[styles.wrap, { borderRadius: rounded }, style]}>
      <LinearGradient
        colors={movie.poster}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Text style={{ fontSize: glyphSize, opacity: 0.9 }}>{movie.glyph}</Text>
      </View>
      {/* escurece a base, dá clima de cinema */}
      <LinearGradient
        colors={['transparent', 'rgba(10,4,4,0.55)']}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
