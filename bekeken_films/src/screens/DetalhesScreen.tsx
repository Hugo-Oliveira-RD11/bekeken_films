import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import type { MovieDetails, UserMovie, UserMoviePatch } from '../api/types';
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
  Tags,
  tmdbPercent,
  WhereToWatch,
} from '../components/DetailParts';
import { Eyebrow } from '../components/Eyebrow';
import { Poster } from '../components/Poster';
import { RatingInput } from '../components/RatingInput';
import { Seasons } from '../components/Seasons';
import { ErrorBox, Loading } from '../components/States';
import type { RootStackParamList } from '../navigation/types';
import { radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Detalhes'>;

/** Detalhe de um filme OU de uma série (a série ganha temporadas e episódios). */
export function DetalhesScreen({ route, navigation }: Props) {
  const { mediaType, id } = route.params;
  const isTv = mediaType === 'tv';
  const { data, error, loading, reload } = useApi(() => api.title({ mediaType, id }), [mediaType, id]);
  const [user, setUser] = useState<UserMovie | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Primeira carga do estado do usuário (nas próximas, o app é a fonte da verdade).
  useEffect(() => {
    if (data) setUser((u) => u ?? data.user);
  }, [data]);

  /** Salva no aparelho; devolve false (e mostra o erro) se falhar. */
  const update = async (patch: UserMoviePatch): Promise<boolean> => {
    setActionError(null);
    try {
      const res = await api.updateTitle({ mediaType, id }, patch);
      setUser(res.user);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return false;
    }
  };

  const movie = data?.movie;

  return (
    <DetailFrame backdropUrl={movie?.backdropUrl} onBack={() => navigation.goBack()}>
      {loading && <Loading />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}

      {data && movie && user && (
        <>
          <View style={styles.posterWrap}>
            <Poster uri={movie.posterUrl} title={movie.title} style={styles.poster} rounded={radius.lg} />
          </View>

          <View style={ds.body}>
            <Tags items={[...(isTv ? ['Série'] : []), ...movie.genres]} />

            <Text style={ds.title}>{movie.title}</Text>
            <Meta movie={movie} />
            {movie.overview ? <Text style={ds.synopsis}>{movie.overview}</Text> : null}

            <View style={ds.scores}>
              <ScoreCard label="TMDB" value={tmdbPercent(movie.voteAverage)} />
              <ScoreCard
                label="Público"
                value={data.watchmode.userRating != null ? data.watchmode.userRating.toFixed(1) : '—'}
              />
              <ScoreCard
                label="Crítica"
                value={data.watchmode.criticScore != null ? String(Math.round(data.watchmode.criticScore)) : '—'}
              />
            </View>

            {/* ---------- Sua nota + ações (da série inteira, não de um episódio) ---------- */}
            <View style={ds.userCard}>
              <Eyebrow>{isTv ? 'Sua nota da série' : 'Sua nota'}</Eyebrow>
              <RatingInput value={user.rating} onChange={(rating) => update({ rating })} size={32} />
              <View style={ds.actions}>
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
              {user.watchedAt && <Text style={ds.small}>Assistido em {formatDate(user.watchedAt)}</Text>}
              {isTv && <Text style={ds.small}>Cada episódio tem a sua própria nota, na lista abaixo.</Text>}
              {actionError && <Text style={ds.errorText}>{actionError}</Text>}
            </View>

            {isTv && movie.seasons.length > 0 && (
              <Seasons series={movie} watchedEpisodes={data.watchedEpisodes} onChanged={reload} />
            )}

            {movie.cast.length > 0 && <Cast cast={movie.cast} />}

            <WhereToWatch info={data.watchmode} subject={isTv ? 'esta série' : 'este filme'} />

            <Notes note={user.note} onSave={(note) => update({ note })} />
          </View>
        </>
      )}
    </DetailFrame>
  );
}

function Meta({ movie }: { movie: MovieDetails }) {
  const isTv = movie.mediaType === 'tv';
  const seasons = movie.seasons.filter((s) => s.number > 0).length;
  const parts = [
    movie.year,
    isTv && seasons ? `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}` : null,
    isTv && movie.episodeCount ? `${movie.episodeCount} episódios` : null,
    isTv && movie.runtimeMinutes ? `${formatRuntime(movie.runtimeMinutes)} por ep.` : formatRuntime(movie.runtimeMinutes),
  ].filter(Boolean);
  const credit = isTv ? movie.creators.join(', ') : movie.director;
  return (
    <Text style={ds.meta}>
      {parts.join(' · ').toUpperCase()}
      {credit ? (
        <>
          {parts.length ? ' · ' : ''}
          {isTv ? 'CRIADO POR ' : 'DIRIGIDO POR '}
          <Text style={ds.metaAccent}>{credit.toUpperCase()}</Text>
        </>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
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
});
