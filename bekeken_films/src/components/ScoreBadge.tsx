import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = { voteAverage: number; size?: number };

// Nota do TMDB (0–10) exibida como porcentagem, ex.: "TMDB 82%".
export function ScoreBadge({ voteAverage, size = 12 }: Props) {
  if (!voteAverage) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { fontSize: size - 3 }]}>TMDB</Text>
      <Text style={[styles.score, { fontSize: size }]}>{Math.round(voteAverage * 10)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { color: colors.gold, fontFamily: fonts.sansSemi, letterSpacing: 1 },
  score: { color: colors.text, fontFamily: fonts.sansMedium },
});
