import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Filmes: undefined;
  Assistidos: undefined;
  ParaAssistir: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Buscar: undefined;
  Detalhes: { movieId: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
