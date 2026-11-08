import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius } from '../theme';

type Props = {
  uri: string | null;
  title: string;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
};

// Pôster 2:3. Sem imagem (ou se falhar ao carregar), mostra um placeholder com a inicial.
export function Poster({ uri, title, style, rounded = radius.md }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  return (
    <View style={[styles.wrap, { borderRadius: rounded }, style]}>
      <LinearGradient
        colors={['#5A2C20', '#2A130E']}
        style={StyleSheet.absoluteFill}
      />
      {!showImage && (
        <View style={styles.center}>
          <Text style={styles.initial}>{title.trim().charAt(0).toUpperCase()}</Text>
        </View>
      )}
      {showImage && (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={`Pôster de ${title}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.textMuted, fontFamily: fonts.serif, fontSize: 40, opacity: 0.7 },
});
