import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MediaType } from '../api/types';

export type TabParamList = {
  Filmes: undefined;
  Series: undefined;
  Assistidos: undefined;
  ParaAssistir: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Buscar: undefined;
  /** Filme ou série (tipo + id do TMDB: ids de filme e série podem coincidir). */
  Detalhes: { mediaType: MediaType; id: number };
  Episodio: { seriesId: number; season: number; episode: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
