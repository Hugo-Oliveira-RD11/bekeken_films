import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';

type Props = { size?: number };

export function Logo({ size = 28 }: Props) {
  return (
    <Text style={[styles.logo, { fontSize: size, lineHeight: size * 1.2 }]}>
      <Text style={styles.main}>Bekeken</Text>
      <Text style={styles.accent}>films</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: { fontFamily: fonts.serif },
  main: { color: colors.creamBright, fontFamily: fonts.serif },
  accent: { color: colors.gold, fontFamily: fonts.serifItalic },
});
