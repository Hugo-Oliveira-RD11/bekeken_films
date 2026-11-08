import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { colors, fonts } from '../theme';

type Props = { children: string; style?: StyleProp<TextStyle> };

// Rótulo pequeno, dourado, em caixa alta (ex.: "SEU DIÁRIO").
export function Eyebrow({ children, style }: Props) {
  return <Text style={[styles.text, style]}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.gold,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 2.2,
  },
});
