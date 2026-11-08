import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import type {
  CastMember,
  MovieDetails,
  SourceType,
  StreamingSource,
  UserMovie,
  UserMoviePatch,
  WatchmodeInfo,
} from '../api/types';
import { useApi } from '../api/useApi';
import { IconButton, PrimaryButton, SecondaryButton } from '../components/Buttons';
import { Eyebrow } from '../components/Eyebrow';
import { Poster } from '../components/Poster';
import { RatingInput } from '../components/RatingInput';
import { ErrorBox, Loading } from '../components/States';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Detalhes'>;

const formatRuntime = (min: number | null) =>
  min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : null;

export function DetalhesScreen({ route, navigation }: Props) {
  const { movieId } = route.params;
  const insets = useSafeAreaInsets();
  const { data, error, loading, reload } = useApi(() => api.movie(movieId), [movieId]);
  const [user, setUser] = useState<UserMovie | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Primeira carga do estado do usuário (nas próximas, o app é a fonte da verdade).
  useEffect(() => {
    if (data) setUser((u) => u ?? data.user);
  }, [data]);

  /** Salva no backend; devolve false (e mostra o erro) se falhar. */
  const update = async (patch: UserMoviePatch): Promise<boolean> => {
    setActionError(null);
    try {
      const res = await api.updateMovie(movieId, patch);
      setUser(res.user);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return false;
    }
  };

  const movie = data?.movie;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgTop, colors.bg, colors.bgBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {movie?.backdropUrl && (
        <View style={styles.backdrop} pointerEvents="none">
          <Image source={{ uri: movie.backdropUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(42,19,14,0.45)', colors.bg]}
            locations={[0, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityLabel="Voltar"
            hitSlop={12}
          >
            <Icon name="arrow-back" size={18} color={colors.creamBright} />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>

          {loading && <Loading />}
          {error && !data && <ErrorBox message={error} onRetry={reload} />}

          {data && movie && user && (
            <>
              <View style={styles.posterWrap}>
                <Poster uri={movie.posterUrl} title={movie.title} style={styles.poster} rounded={radius.lg} />
              </View>

              <View style={styles.body}>
                <View style={styles.tags}>
                  {movie.genres.map((g) => (
                    <View key={g} style={styles.tag}>
                      <Text style={styles.tagText}>{g}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.title}>{movie.title}</Text>
                <Meta movie={movie} />
                {movie.overview ? <Text style={styles.synopsis}>{movie.overview}</Text> : null}

                <RatingCards movie={movie} watchmode={data.watchmode} />

                {/* ---------- Sua nota + ações ---------- */}
                <View style={styles.userCard}>
                  <Eyebrow>Sua nota</Eyebrow>
                  <RatingInput
                    value={user.rating}
                    onChange={(rating) => update({ rating })}
                    size={32}
                  />
                  <View style={styles.actions}>
                    <PrimaryButton
                      label={user.status === 'watched' ? 'Assistido' : 'Já assisti'}
                      icon={user.status === 'watched' ? 'check-circle' : 'visibility'}
                      onPress={() => update({ status: user.status === 'watched' ? null : 'watched' })}
                    />
                    <SecondaryButton
                      label={user.status === 'watchlist' ? 'Na lista' : 'Lista'}
                      icon={user.status === 'watchlist' ? 'bookmark' : 'add'}
                      disabled={user.status === 'watched'}
                      onPress={() => update({ status: user.status === 'watchlist' ? null : 'watchlist' })}
                    />
                    <IconButton
                      icon={user.liked ? 'favorite' : 'favorite-border'}
                      active={user.liked}
                      label={user.liked ? 'Descurtir' : 'Curtir'}
                      onPress={() => update({ liked: !user.liked })}
                    />
                  </View>
                  {user.watchedAt && (
                    <Text style={styles.small}>Assistido em {formatDate(user.watchedAt)}</Text>
                  )}
                  {actionError && <Text style={styles.errorText}>{actionError}</Text>}
                </View>

                {movie.cast.length > 0 && <Cast cast={movie.cast} />}

                <WhereToWatch info={data.watchmode} />

                <Notes
                  note={user.note}
                  onSave={(note) => update({ note })}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Meta({ movie }: { movie: MovieDetails }) {
  const parts = [movie.year, formatRuntime(movie.runtimeMinutes)].filter(Boolean);
  return (
    <Text style={styles.meta}>
      {parts.join(' · ').toUpperCase()}
      {movie.director ? (
        <>
          {parts.length ? ' · ' : ''}
          {'DIRIGIDO POR '}
          <Text style={styles.director}>{movie.director.toUpperCase()}</Text>
        </>
      ) : null}
    </Text>
  );
}

function RatingCards({ movie, watchmode }: { movie: MovieDetails; watchmode: WatchmodeInfo }) {
  const tmdb = movie.voteAverage ? `${Math.round(movie.voteAverage * 10)}%` : '—';
  const publico = watchmode.userRating != null ? watchmode.userRating.toFixed(1) : '—';
  const critica = watchmode.criticScore != null ? String(Math.round(watchmode.criticScore)) : '—';
  return (
    <View style={styles.scores}>
      <ScoreCard label="TMDB" value={tmdb} />
      <ScoreCard label="Público" value={publico} />
      <ScoreCard label="Crítica" value={critica} />
    </View>
  );
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scoreCard}>
      <Eyebrow>{label}</Eyebrow>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function Cast({ cast }: { cast: CastMember[] }) {
  return (
    <View style={styles.section}>
      <Eyebrow>Elenco</Eyebrow>
      <View style={styles.castWrap}>
        {cast.slice(0, 8).map((c) => (
          <View key={c.name + c.character} style={styles.castChip}>
            {c.photoUrl ? (
              <Image source={{ uri: c.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{c.name.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.castName}>{c.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Onde assistir (Watchmode) ----------

const TYPE_LABEL: Record<SourceType, string> = {
  sub: 'Assinatura',
  free: 'Grátis',
  rent: 'Alugar',
  buy: 'Comprar',
};

function money(price: number, region: string) {
  const symbol = region === 'BR' ? 'R$' : '$';
  const value = region === 'BR' ? price.toFixed(2).replace('.', ',') : price.toFixed(2);
  return `${symbol} ${value}`;
}

function WhereToWatch({ info }: { info: WatchmodeInfo }) {
  const types = (['sub', 'free', 'rent', 'buy'] as SourceType[]).filter((t) =>
    info.sources.some((s) => s.type === t),
  );

  let message: string | null = null;
  if (info.status === 'no_key') message = 'Configure a WATCHMODE_API_KEY no backend para ver onde assistir.';
  else if (info.status === 'unavailable') message = 'Não consegui consultar o Watchmode agora. Tente mais tarde.';
  else if (info.status === 'not_found') message = 'O Watchmode não tem informações de streaming para este filme.';
  else if (info.sources.length === 0) {
    message = `Não está em nenhum serviço de streaming na região ${info.region} no momento.`;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Eyebrow>Onde assistir</Eyebrow>
        <Text style={styles.small}>via Watchmode · {info.region}</Text>
      </View>
      {message ? (
        <View style={styles.infoBox}>
          <Icon name="tv" size={20} color={colors.textMuted} />
          <Text style={styles.infoText}>{message}</Text>
        </View>
      ) : (
        types.map((t) => (
          <View key={t} style={{ gap: 8 }}>
            <Text style={styles.typeLabel}>{TYPE_LABEL[t]}</Text>
            {info.sources
              .filter((s) => s.type === t)
              .map((s) => (
                <SourceRow key={`${s.id}:${s.type}`} source={s} region={info.region} />
              ))}
          </View>
        ))
      )}
    </View>
  );
}

function SourceRow({ source, region }: { source: StreamingSource; region: string }) {
  const detail = [source.price != null ? money(source.price, region) : null, source.format]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      disabled={!source.webUrl}
      onPress={() => source.webUrl && Linking.openURL(source.webUrl)}
      style={({ pressed }) => [styles.source, pressed && { opacity: 0.8 }]}
      accessibilityRole="link"
    >
      {source.logoUrl ? (
        <Image source={{ uri: source.logoUrl }} style={styles.sourceLogo} />
      ) : (
        <View style={[styles.sourceLogo, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{source.name.charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.sourceName}>{source.name}</Text>
      {detail ? <Text style={styles.sourceDetail}>{detail}</Text> : null}
      {source.webUrl && <Icon name="open-in-new" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

// ---------- Anotações pessoais ----------

function Notes({ note, onSave }: { note: string; onSave: (note: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(note);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== saved;

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      if (await onSave(draft)) setSaved(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Eyebrow>Minhas anotações</Eyebrow>
        <View style={styles.privateTag}>
          <Icon name="lock" size={11} color={colors.textMuted} />
          <Text style={styles.small}>só você vê</Text>
        </View>
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={save}
        placeholder="O que você achou? Onde assistiu, com quem, cenas favoritas…"
        placeholderTextColor={colors.textDim}
        multiline
        maxLength={5000}
        textAlignVertical="top"
        style={styles.notes}
      />
      <View style={styles.notesFooter}>
        <Text style={styles.small}>
          {saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : saved ? 'Salvo ✓' : ''}
        </Text>
        <Pressable
          onPress={save}
          disabled={!dirty || saving}
          style={[styles.saveBtn, (!dirty || saving) && { opacity: 0.4 }]}
        >
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  back: {
    marginLeft: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: { color: colors.creamBright, fontFamily: fonts.sansMedium, fontSize: 14 },
  posterWrap: { alignItems: 'center', marginTop: 16 },
  poster: {
    width: 220,
    borderColor: 'rgba(232,176,74,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  body: { paddingHorizontal: spacing.screen, paddingTop: 24, gap: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(58,29,21,0.5)',
  },
  tagText: { color: colors.text, fontFamily: fonts.sans, fontSize: 12 },
  title: { color: colors.creamBright, fontFamily: fonts.serif, fontSize: 44, lineHeight: 50 },
  meta: { color: colors.textMuted, fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 2, lineHeight: 20 },
  director: { color: colors.gold },
  synopsis: { color: colors.text, fontFamily: fonts.sans, fontSize: 16, lineHeight: 25 },
  scores: { flexDirection: 'row', gap: 10 },
  scoreCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'rgba(58,29,21,0.55)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  scoreValue: { color: colors.creamBright, fontFamily: fonts.serif, fontSize: 26 },
  userCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'rgba(58,29,21,0.55)',
    padding: 16,
    gap: 14,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  small: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 12 },
  errorText: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13 },
  section: { gap: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  castWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  castChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfacePill,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 14,
  },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  avatarFallback: { backgroundColor: colors.goldDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2A130E', fontFamily: fonts.sansSemi, fontSize: 12 },
  castName: { color: colors.text, fontFamily: fonts.sansMedium, fontSize: 13 },
  typeLabel: { color: colors.textMuted, fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 1 },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'rgba(58,29,21,0.55)',
    padding: 10,
  },
  sourceLogo: { width: 34, height: 34, borderRadius: 8 },
  sourceName: { flex: 1, color: colors.cream, fontFamily: fonts.sansMedium, fontSize: 15 },
  sourceDetail: { color: colors.textMuted, fontFamily: fonts.sans, fontSize: 12 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 14,
  },
  infoText: { flex: 1, color: colors.textMuted, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  privateTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notes: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'rgba(30,14,11,0.5)',
    color: colors.cream,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  notesFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saveBtn: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  saveText: { color: colors.goldLight, fontFamily: fonts.sansSemi, fontSize: 13 },
});
