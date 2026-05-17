import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

import { NameEntry } from './src/screens/NameEntry';
import { Home } from './src/screens/Home';
import { Lobby } from './src/screens/Lobby';
import { Running } from './src/screens/Running';
import { PostRun } from './src/screens/PostRun';
import { History } from './src/screens/History';
import { initDB } from './src/storage/runs';
import { handleOAuthCallback } from './src/services/spotify';
import { colors } from './src/theme';

export type RootStackParamList = {
  NameEntry: undefined;
  Home: { name: string };
  Lobby: { name: string; code: string };
  Running: { name: string; code: string; startedAt: number };
  PostRun: {
    durationMs: number;
    distanceMeters: number;
    participants: string[];
    transcript: Array<{ runnerName: string; text: string; timestamp: number }>;
  };
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, border: colors.border },
};

export default function App() {
  const [initialName, setInitialName] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try { initDB(); } catch (e) { console.warn('DB init failed', e); }
    if (Platform.OS === 'web') {
      // Handle Spotify OAuth callback
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) handleOAuthCallback(code).catch(console.warn);
      setInitialName(localStorage.getItem('runlink_name'));
    } else {
      AsyncStorage.getItem('runlink_name').then(n => setInitialName(n));
    }
  }, []);

  if (initialName === undefined) return null;

  const Wrapper = Platform.OS === 'web' ? View : GestureHandlerRootView;

  return (
    <Wrapper style={{ flex: 1 }}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: 'fade' }}
          initialRouteName={initialName ? 'Home' : 'NameEntry'}
        >
          <Stack.Screen name="NameEntry" component={NameEntry} />
          <Stack.Screen name="Home" component={Home} initialParams={initialName ? { name: initialName } : undefined} />
          <Stack.Screen name="Lobby" component={Lobby} />
          <Stack.Screen name="Running" component={Running} />
          <Stack.Screen name="PostRun" component={PostRun} />
          <Stack.Screen name="History" component={History} />
        </Stack.Navigator>
      </NavigationContainer>
    </Wrapper>
  );
}
