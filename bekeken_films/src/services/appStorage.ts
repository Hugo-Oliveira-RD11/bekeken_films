import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from './storage';

// No celular grava em disco; no navegador usa o localStorage.
export const appStorage: KeyValueStore = AsyncStorage;
