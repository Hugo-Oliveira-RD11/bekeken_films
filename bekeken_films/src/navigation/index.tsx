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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilmesScreen } from '../screens/FilmesScreen';
import { AssistidosScreen } from '../screens/AssistidosScreen';
import { ParaAssistirScreen } from '../screens/ParaAssistirScreen';
import { DetalhesScreen } from '../screens/DetalhesScreen';
import { BuscarScreen } from '../screens/BuscarScreen';
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
          Assistidos: 'assistidos',
          ParaAssistir: 'para-assistir',
        },
      },
      Buscar: 'buscar',
      Detalhes: {
        path: 'filme/:movieId',
        parse: { movieId: Number },
      },
    },
  },
};

type IconName = keyof typeof Ionicons.glyphMap;

const tabs: {
  name: keyof TabParamList;
  label: string;
  icon: IconName;
  iconActive: IconName;
  component: React.ComponentType;
}[] = [
  { name: 'Filmes', label: 'Filmes', icon: 'film-outline', iconActive: 'film', component: FilmesScreen },
  { name: 'Assistidos', label: 'Assistidos', icon: 'eye-outline', iconActive: 'eye', component: AssistidosScreen },
  { name: 'ParaAssistir', label: 'Para assistir', icon: 'bookmark-outline', iconActive: 'bookmark', component: ParaAssistirScreen },
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
                <Ionicons name={focused ? t.iconActive : t.icon} size={24} color={color} />
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
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  iconPillActive: { backgroundColor: colors.surfacePill },
});
