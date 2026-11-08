import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Eyebrow } from './Eyebrow';

type Props = { eyebrow: string; title: string; subtitle?: string };

// Cabeçalho de página: rótulo dourado + título grande em serifa + subtítulo.
export function PageHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 32, paddingBottom: 8, gap: 10 },
  title: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 46,
    lineHeight: 52,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 18,
    lineHeight: 26,
  },
});
