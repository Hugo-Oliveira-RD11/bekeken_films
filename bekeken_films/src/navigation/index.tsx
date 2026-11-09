import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DarkTheme,
  NavigationContainer,
  type LinkingOptions,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon, type IconName } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilmesScreen, SeriesScreen } from '../screens/FilmesScreen';
import { AssistidosScreen } from '../screens/AssistidosScreen';
import { ParaAssistirScreen } from '../screens/ParaAssistirScreen';
import { DetalhesScreen } from '../screens/DetalhesScreen';
import { BuscarScreen } from '../screens/BuscarScreen';
import { EpisodioScreen } from '../screens/EpisodioScreen';
import { colors, fonts, radius } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    border: colors.border,
    primary: colors.gold,
    text: colors.text,
  },
};

// URLs úteis para pré-visualizar no navegador (expo start --web).
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Tabs: {
        screens: {
          Filmes: 'filmes',
          Series: 'series',
          Assistidos: 'assistidos',
          ParaAssistir: 'para-assistir',
        },
      },
      Buscar: 'buscar',
      // filme e série têm ids separados no TMDB, então o tipo faz parte do endereço
      Detalhes: {
        path: 'titulo/:mediaType/:id',
        parse: { id: Number },
      },
      Episodio: {
        path: 'serie/:seriesId/temporada/:season/episodio/:episode',
        parse: { seriesId: Number, season: Number, episode: Number },
      },
    },
  },
};

const tabs: {
  name: keyof TabParamList;
  label: string;
  icon: IconName;
  iconActive: IconName;
  component: React.ComponentType;
}[] = [
  // Material Icons. Aba ativa = ícone preenchido (+ cor dourada); inativa = contorno.
  { name: 'Filmes', label: 'Filmes', icon: 'movie', iconActive: 'movie', component: FilmesScreen },
  { name: 'Series', label: 'Séries', icon: 'tv', iconActive: 'tv', component: SeriesScreen },
  { name: 'Assistidos', label: 'Assistidos', icon: 'check-circle-outline', iconActive: 'check-circle', component: AssistidosScreen },
  { name: 'ParaAssistir', label: 'Para assistir', icon: 'bookmark-border', iconActive: 'bookmark', component: ParaAssistirScreen },
];

function Tabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          { height: 68 + insets.bottom, paddingBottom: Math.max(insets.bottom, 10) },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {tabs.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            title: t.label,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Icon name={focused ? t.iconActive : t.icon} size={26} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Buscar" component={BuscarScreen} />
        <Stack.Screen name="Detalhes" component={DetalhesScreen} />
        <Stack.Screen name="Episodio" component={EpisodioScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.3 },
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  iconPillActive: { backgroundColor: colors.surfacePill },
});
