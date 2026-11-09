import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../theme';
import { Logo } from './Logo';

type Props = {
  children: React.ReactNode;
  // Se false, o conteúdo não recebe o padding lateral padrão.
  padded?: boolean;
  // Conteúdo no topo da rolagem, de ponta a ponta (ex.: hero com imagem).
  hero?: React.ReactNode;
};

// Moldura comum das abas: fundo com brilho quente, barra superior (logo + busca)
// e rolagem. A navegação fica na barra inferior.
export function Screen({ children, padded = true, hero }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgTop, colors.bg, colors.bgBottom]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Logo />
        <Pressable
          onPress={() => navigation.navigate('Buscar')}
          style={styles.search}
          accessibilityRole="search"
          accessibilityLabel="Buscar filmes e séries"
        >
          <Icon name="search" size={15} color={colors.textMuted} />
          <Text style={styles.searchText}>Buscar...</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {hero}
        <View style={padded ? styles.padded : undefined}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(42,19,14,0.9)',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(58,29,21,0.6)',
  },
  searchText: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 13 },
  content: { paddingBottom: 32 },
  padded: { paddingHorizontal: spacing.screen },
});
