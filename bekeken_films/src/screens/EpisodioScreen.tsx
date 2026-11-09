import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import type { UserEpisode, UserEpisodePatch } from '../api/types';
import { useApi } from '../api/useApi';
import { IconButton, PrimaryButton, SecondaryButton } from '../components/Buttons';
import {
  Cast,
  DetailFrame,
  ds,
  formatDate,
  formatRuntime,
  Notes,
  ScoreCard,
  tmdbPercent,
  WhereToWatch,
} from '../components/DetailParts';
import { Eyebrow } from '../components/Eyebrow';
import { RatingInput } from '../components/RatingInput';
import { ErrorBox, Loading } from '../components/States';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Episodio'>;

/**
 * Tela de UM episódio. A nota, o "assistido", o coração e a anotação daqui são só do
 * episódio — a série tem os dela, na tela da série.
 */
export function EpisodioScreen({ route, navigation }: Props) {
  const ref = route.params;
  const { data, error, loading, reload } = useApi(
    () => api.episode(ref),
    [ref.seriesId, ref.season, ref.episode],
  );
  const [user, setUser] = useState<UserEpisode | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setUser((u) => u ?? data.user);
  }, [data]);

  const update = async (patch: UserEpisodePatch): Promise<boolean> => {
    setActionError(null);
    try {
      const res = await api.updateEpisode(ref, patch);
      setUser(res.user);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return false;
    }
  };

  const ep = data?.episode;
  const series = data?.series;
  const label = ref.season === 0 ? `Especial ${ref.episode}` : `Temporada ${ref.season} · Episódio ${ref.episode}`;

  return (
    <DetailFrame backdropUrl={ep?.stillUrl ?? series?.backdropUrl} onBack={() => navigation.goBack()}>
      {loading && <Loading />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}

      {data && ep && series && user && (
        <>
          {/* imagem do episódio (formato horizontal) */}
          <View style={styles.stillWrap}>
            <View style={styles.still}>
              <LinearGradient colors={['#5A2C20', '#2A130E']} style={StyleSheet.absoluteFill} />
              {ep.stillUrl ? (
                <Image source={{ uri: ep.stillUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : null}
            </View>
          </View>

          <View style={ds.body}>
            <Eyebrow>{`${series.title} · ${label}`}</Eyebrow>
            <Text style={[ds.title, styles.title]}>{ep.name}</Text>
            <Text style={ds.meta}>
              {[ep.airDate ? formatDate(ep.airDate) : null, formatRuntime(ep.runtimeMinutes)]
                .filter(Boolean)
                .join(' · ')
                .toUpperCase()}
              {ep.director ? (
                <>
                  {ep.airDate || ep.runtimeMinutes ? ' · ' : ''}
                  {'DIRIGIDO POR '}
                  <Text style={ds.metaAccent}>{ep.director.toUpperCase()}</Text>
                </>
              ) : null}
            </Text>
            <Text style={ds.synopsis}>{ep.overview || 'Sem sinopse disponível para este episódio.'}</Text>

            <View style={ds.scores}>
              <ScoreCard label="Episódio" value={tmdbPercent(ep.voteAverage)} />
              <ScoreCard label="Série" value={tmdbPercent(series.voteAverage)} />
            </View>

            {/* ---------- Sua nota do EPISÓDIO ---------- */}
            <View style={ds.userCard}>
              <Eyebrow>Sua nota do episódio</Eyebrow>
              <RatingInput value={user.rating} onChange={(rating) => update({ rating })} size={32} />
              <View style={ds.actions}>
                <PrimaryButton
                  label={user.status === 'watched' ? 'Assistido' : 'Já assisti'}
                  icon={user.status === 'watched' ? 'check-circle' : 'visibility'}
                  onPress={() => update({ status: user.status === 'watched' ? null : 'watched' })}
                />
                <IconButton
                  icon={user.liked ? 'favorite' : 'favorite-border'}
                  active={user.liked}
                  label={user.liked ? 'Descurtir' : 'Curtir'}
                  onPress={() => update({ liked: !user.liked })}
                />
              </View>
              {user.watchedAt && <Text style={ds.small}>Assistido em {formatDate(user.watchedAt)}</Text>}
              {actionError && <Text style={ds.errorText}>{actionError}</Text>}
              <SecondaryButton
                label="Ver a série"
                icon="tv"
                onPress={() => navigation.navigate('Detalhes', { mediaType: 'tv', id: ref.seriesId })}
              />
            </View>

            {ep.guestStars.length > 0 && <Cast title="Atores convidados" cast={ep.guestStars} />}

            <WhereToWatch
              info={data.watchmode}
              subject="esta série"
              note="O Watchmode informa a disponibilidade da série inteira, não de episódios."
            />

            <Notes title="Anotações do episódio" note={user.note} onSave={(note) => update({ note })} />
          </View>
        </>
      )}
    </DetailFrame>
  );
}

const styles = StyleSheet.create({
  stillWrap: { paddingHorizontal: 20, marginTop: 16 },
  still: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232,176,74,0.35)',
    backgroundColor: colors.surface,
  },
  title: { fontSize: 36, lineHeight: 42 },
});
