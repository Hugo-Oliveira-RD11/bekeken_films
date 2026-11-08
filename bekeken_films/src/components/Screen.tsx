import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { Logo } from './Logo';

type Props = {
  children: React.ReactNode;
  // Se true, a tela rola e o conteúdo recebe o padding lateral padrão.
  padded?: boolean;
  // Conteúdo extra por cima do fundo (ex.: hero de imagem).
  hero?: React.ReactNode;
};

// Moldura comum das abas: fundo com brilho quente, barra superior com logo
// e rolagem. A navegação fica na barra inferior.
export function Screen({ children, padded = true, hero }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#2A120E', colors.bg, '#0E0707']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Logo />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {hero}
        <View style={padded ? styles.padded : undefined}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(20,10,10,0.85)',
  },
  content: { paddingBottom: 32 },
  padded: { paddingHorizontal: spacing.screen },
});
