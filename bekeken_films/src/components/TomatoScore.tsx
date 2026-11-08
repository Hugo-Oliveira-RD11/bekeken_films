import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = { score: number; size?: number };

export function TomatoScore({ score, size = 13 }: Props) {
  return (
    <View style={styles.row}>
      <Text style={{ fontSize: size + 2 }}>🍅</Text>
      <Text style={[styles.score, { fontSize: size }]}>{score}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  score: { color: colors.text, fontFamily: fonts.sansMedium },
});
