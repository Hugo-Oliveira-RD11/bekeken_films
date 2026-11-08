/**
 * Armazenamento chave-valor do aparelho. No app é o AsyncStorage (ver appStorage.ts);
 * nos testes, um Map em memória. Tudo que é persistido (cache e dados do usuário)
 * passa por aqui.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

export class MemoryStore implements KeyValueStore {
  readonly map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
  async getAllKeys() {
    return [...this.map.keys()];
  }
  async multiRemove(keys: readonly string[]) {
    for (const k of keys) this.map.delete(k);
  }
}
