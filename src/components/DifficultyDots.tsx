import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

interface Props {
  difficulty: number;
  size?: number;
}

export function DifficultyDots({ difficulty, size = 8 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2 },
            i < difficulty ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dotFilled: {
    backgroundColor: colors.accent,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
  },
});
