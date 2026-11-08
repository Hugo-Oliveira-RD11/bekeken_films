import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Filmes: undefined;
  Assistidos: undefined;
  ParaAssistir: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Detalhes: { movieId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
