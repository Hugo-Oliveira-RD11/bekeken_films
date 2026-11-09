import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CastMember, SourceType, StreamingSource, WatchmodeInfo } from '../api/types';
import { colors, fonts, radius, spacing } from '../theme';
import { Eyebrow } from './Eyebrow';
import { Icon } from './Icon';

// Peças compartilhadas pelas telas de detalhe (filme, série e episódio).

export const formatRuntime = (min: number | null) =>
  min ? (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min} min`) : null;

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------- Moldura (fundo, imagem de topo, rolagem e botão voltar) ----------

type FrameProps = {
  backdropUrl: string | null | undefined;
  onBack: () => void;
  backLabel?: string;
  children: React.ReactNode;
};

export function DetailFrame({ backdropUrl, onBack, backLabel = 'Voltar', children }: FrameProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={ds.root}>
      <LinearGradient
        colors={[colors.bgTop, colors.bg, colors.bgBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {backdropUrl ? (
        <View style={ds.backdrop} pointerEvents="none">
          <Image source={{ uri: backdropUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(42,19,14,0.45)', colors.bg]} locations={[0, 1]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}
        >
          <Pressable onPress={onBack} style={ds.back} accessibilityLabel="Voltar" hitSlop={12}>
            <Icon name="arrow-back" size={18} color={colors.creamBright} />
            <Text style={ds.backText}>{backLabel}</Text>
          </Pressable>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- Blocos ----------

export function Tags({ items }: { items: string[] }) {
  return (
    <View style={ds.tags}>
      {items.map((g) => (
        <View key={g} style={ds.tag}>
          <Text style={ds.tagText}>{g}</Text>
        </View>
      ))}
    </View>
  );
}

export function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={ds.scoreCard}>
      <Eyebrow>{label}</Eyebrow>
      <Text style={ds.scoreValue}>{value}</Text>
    </View>
  );
}

/** Nota do TMDB (0–10) como porcentagem; "—" quando não há nota. */
export const tmdbPercent = (vote: number) => (vote ? `${Math.round(vote * 10)}%` : '—');

export function Cast({ title = 'Elenco', cast }: { title?: string; cast: CastMember[] }) {
  return (
    <View style={ds.section}>
      <Eyebrow>{title}</Eyebrow>
      <View style={ds.castWrap}>
        {cast.slice(0, 8).map((c) => (
          <View key={c.name + c.character} style={ds.castChip}>
            {c.photoUrl ? (
              <Image source={{ uri: c.photoUrl }} style={ds.avatar} />
            ) : (
              <View style={[ds.avatar, ds.avatarFallback]}>
                <Text style={ds.avatarText}>{c.name.charAt(0)}</Text>
              </View>
            )}
            <Text style={ds.castName}>{c.name}</Text>
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

/** `subject` é o que aparece nas mensagens: "este filme", "esta série". */
export function WhereToWatch({ info, subject, note }: { info: WatchmodeInfo; subject: string; note?: string }) {
  const types = (['sub', 'free', 'rent', 'buy'] as SourceType[]).filter((t) =>
    info.sources.some((s) => s.type === t),
  );

  let message: string | null = null;
  if (info.status === 'no_key') {
    message = 'Configure EXPO_PUBLIC_WATCHMODE_API_KEY em bekeken_films/.env para ver onde assistir.';
  } else if (info.status === 'unavailable') {
    message = 'Não consegui consultar o Watchmode agora. Tente mais tarde.';
  } else if (info.status === 'not_found') {
    message = `O Watchmode não tem informações de streaming para ${subject}.`;
  } else if (info.sources.length === 0) {
    message = `Não está em nenhum serviço de streaming na região ${info.region} no momento.`;
  }

  return (
    <View style={ds.section}>
      <View style={ds.sectionHeader}>
        <Eyebrow>Onde assistir</Eyebrow>
        <Text style={ds.small}>via Watchmode · {info.region}</Text>
      </View>
      {note ? <Text style={ds.small}>{note}</Text> : null}
      {message ? (
        <View style={ds.infoBox}>
          <Icon name="tv" size={20} color={colors.textMuted} />
          <Text style={ds.infoText}>{message}</Text>
        </View>
      ) : (
        types.map((t) => (
          <View key={t} style={{ gap: 8 }}>
            <Text style={ds.typeLabel}>{TYPE_LABEL[t]}</Text>
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
  const detail = [source.price != null ? money(source.price, region) : null, source.format].filter(Boolean).join(' · ');
  return (
    <Pressable
      disabled={!source.webUrl}
      onPress={() => source.webUrl && Linking.openURL(source.webUrl)}
      style={({ pressed }) => [ds.source, pressed && { opacity: 0.8 }]}
      accessibilityRole="link"
    >
      {source.logoUrl ? (
        <Image source={{ uri: source.logoUrl }} style={ds.sourceLogo} />
      ) : (
        <View style={[ds.sourceLogo, ds.avatarFallback]}>
          <Text style={ds.avatarText}>{source.name.charAt(0)}</Text>
        </View>
      )}
      <Text style={ds.sourceName}>{source.name}</Text>
      {detail ? <Text style={ds.sourceDetail}>{detail}</Text> : null}
      {source.webUrl && <Icon name="open-in-new" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

// ---------- Anotações pessoais ----------

export function Notes({
  note,
  onSave,
  title = 'Minhas anotações',
}: {
  note: string;
  onSave: (note: string) => Promise<boolean>;
  title?: string;
}) {
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
    <View style={ds.section}>
      <View style={ds.sectionHeader}>
        <Eyebrow>{title}</Eyebrow>
        <View style={ds.privateTag}>
          <Icon name="lock" size={11} color={colors.textMuted} />
          <Text style={ds.small}>só você vê</Text>
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
        style={ds.notes}
      />
      <View style={ds.notesFooter}>
        <Text style={ds.small}>{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : saved ? 'Salvo ✓' : ''}</Text>
        <Pressable onPress={save} disabled={!dirty || saving} style={[ds.saveBtn, (!dirty || saving) && { opacity: 0.4 }]}>
          <Text style={ds.saveText}>Salvar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Estilos compartilhados (as telas também usam alguns).
export const ds = StyleSheet.create({
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
  metaAccent: { color: colors.gold },
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
