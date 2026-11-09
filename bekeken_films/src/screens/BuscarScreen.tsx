import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import type { MovieSummary } from '../api/types';
import { MovieCard } from '../components/MovieCard';
import { EmptyState, ErrorBox, Loading } from '../components/States';
import { colors, fonts, radius, spacing } from '../theme';

export function BuscarScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Espera o usuário parar de digitar (400 ms) antes de buscar.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.search(q).then(
        (r) => {
          if (cancelled) return;
          setResults(r.results);
          setError(null);
          setLoading(false);
        },
        (e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Erro na busca');
          setLoading(false);
        },
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgTop, colors.bg, colors.bgBottom]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Voltar">
          <Icon name="arrow-back" size={24} color={colors.creamBright} />
        </Pressable>
        <View style={styles.input}>
          <Icon name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar filmes e séries..."
            placeholderTextColor={colors.textDim}
            style={styles.text}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Limpar">
              <Icon name="cancel" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {loading && <Loading />}
        {error && <ErrorBox message={error} />}
        {!loading && !error && results === null && (
          <EmptyState icon="search" text="Digite o nome de um filme ou série para buscar." />
        )}
        {!loading && !error && results?.length === 0 && (
          <EmptyState icon="movie" text={`Nada encontrado para “${query.trim()}”.`} />
        )}
        {!loading && !error && results && results.length > 0 && (
          <View style={styles.grid}>
            {results.map((m) => (
              <MovieCard
                key={`${m.mediaType}:${m.id}`}
                movie={m}
                style={styles.item}
                showType
                caption={m.year ? String(m.year) : undefined}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(58,29,21,0.6)',
    paddingHorizontal: 14,
  },
  text: {
    flex: 1,
    color: colors.cream,
    fontFamily: fonts.sans,
    fontSize: 15,
    paddingVertical: 10,
    // remove o contorno branco do navegador (só afeta a versão web)
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  content: { padding: spacing.screen },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 24 },
  item: { width: '47.5%' },
});
