import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export interface ApiState<T> {
  data: T | undefined;
  error: string | null;
  /** true só enquanto não há nenhum dado para mostrar. */
  loading: boolean;
  reload: () => void;
}

/**
 * Carrega dados toda vez que a tela ganha foco (ex.: voltar da tela de detalhes
 * e ver a lista atualizada). Mantém o dado antigo na tela enquanto recarrega.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const load = useCallback(() => {
    const mine = ++seq.current;
    fetcher().then(
      (d) => {
        if (mine !== seq.current) return; // resposta velha
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (mine !== seq.current) return;
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(load);
  return { data, error, loading, reload: load };
}
