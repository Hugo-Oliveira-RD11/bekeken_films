import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type Props = { rating: number; size?: number; gap?: number };

export function Stars({ rating, size = 16, gap = 2 }: Props) {
  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name =
          rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline';
        const filled = name !== 'star-outline';
        return (
          <Ionicons
            key={i}
            name={name}
            size={size}
            color={filled ? colors.gold : colors.textDim}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
