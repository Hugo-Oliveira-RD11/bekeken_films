import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, icon, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.press, (pressed || disabled) && styles.pressed]}
    >
      <LinearGradient
        colors={[colors.goldDark, '#D69A33', colors.goldDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        {icon && <Ionicons name={icon} size={16} color="#2A130E" />}
        <Text style={[styles.label, { color: '#2A130E' }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ label, icon, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.press, (pressed || disabled) && styles.pressed]}
    >
      <View style={[styles.btn, styles.outline]}>
        {icon && <Ionicons name={icon} size={16} color={colors.text} />}
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Botão redondo só com ícone (ex.: coração). */
export function IconButton({
  icon,
  active,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.icon, active && styles.iconActive, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={18} color={active ? colors.danger : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: radius.pill },
  pressed: { opacity: 0.7 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
  },
  outline: {
    backgroundColor: 'rgba(58,29,21,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontFamily: fonts.sansSemi, fontSize: 14 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(58,29,21,0.7)',
  },
  iconActive: { borderColor: colors.danger, backgroundColor: 'rgba(226,87,60,0.15)' },
});
