import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
};

// Estrelas tocáveis. Tocar numa estrela dá a nota cheia; tocar de novo vira meia estrela;
// tocar mais uma vez limpa a nota.
export function RatingInput({ value, onChange, size = 30 }: Props) {
  const press = (i: number) => {
    if (value === i) onChange(i - 0.5);
    else if (value === i - 0.5) onChange(null);
    else onChange(i);
  };
  const v = value ?? 0;
  return (
    <View style={styles.row} accessibilityLabel={value ? `Sua nota: ${value} de 5` : 'Sem nota'}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = v >= i ? 'star' : v >= i - 0.5 ? 'star-half' : 'star-outline';
        return (
          <Pressable key={i} onPress={() => press(i)} hitSlop={4} accessibilityRole="button">
            <Ionicons
              name={name}
              size={size}
              color={name === 'star-outline' ? colors.textDim : colors.gold}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
