import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export function PrimaryButton({ label, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[colors.goldDark, '#A97B2A', colors.goldDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        {icon && <Ionicons name={icon} size={16} color={colors.creamBright} />}
        <Text style={[styles.label, { color: colors.creamBright }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ label, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      <View style={[styles.btn, styles.outline]}>
        {icon && <Ionicons name={icon} size={16} color={colors.text} />}
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: radius.pill },
  pressed: { opacity: 0.8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
  },
  outline: {
    backgroundColor: 'rgba(36,18,16,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontFamily: fonts.sansSemi, fontSize: 14 },
});
