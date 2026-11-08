import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Eyebrow } from './Eyebrow';

type Props = { label: string; value: string | number; accent?: boolean };

export function StatCard({ label, value, accent }: Props) {
  return (
    <View style={styles.card}>
      <Eyebrow style={styles.label}>{label}</Eyebrow>
      <Text style={[styles.value, accent && { color: colors.gold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.greenCard,
    borderColor: colors.greenBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    minHeight: 112,
  },
  label: { lineHeight: 16 },
  value: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 44,
  },
});
