import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { PREDEFINED_TAGS } from '../constants/tags';

interface Props {
  selectedTags: string[];
  onTagPress: (tag: string) => void;
  selectedPoleType: string | null;
  onPoleTypePress: (pt: string | null) => void;
  selectedDifficulty: number | null;
  onDifficultyPress: (d: number | null) => void;
}

const POLE_TYPES = ['both', 'static_only', 'spin_only'] as const;
const POLE_LABELS: Record<string, string> = {
  both: 'Both Poles',
  static_only: 'Static',
  spin_only: 'Spin',
};

export function FilterBar({
  selectedTags,
  onTagPress,
  selectedPoleType,
  onPoleTypePress,
  selectedDifficulty,
  onDifficultyPress,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Pole type filters */}
      {POLE_TYPES.map((pt) => {
        const active = selectedPoleType === pt;
        return (
          <Chip
            key={pt}
            label={POLE_LABELS[pt]}
            active={active}
            onPress={() => onPoleTypePress(active ? null : pt)}
            activeColor={colors.poleBoth}
          />
        );
      })}

      <View style={styles.divider} />

      {/* Difficulty filters */}
      {[1, 2, 3, 4, 5].map((d) => {
        const active = selectedDifficulty === d;
        return (
          <Chip
            key={`d${d}`}
            label={`Lvl ${d}`}
            active={active}
            onPress={() => onDifficultyPress(active ? null : d)}
            activeColor={colors.accent}
          />
        );
      })}

      <View style={styles.divider} />

      {/* Tag filters */}
      {PREDEFINED_TAGS.map((tag) => {
        const active = selectedTags.includes(tag);
        return (
          <Chip
            key={tag}
            label={tag}
            active={active}
            onPress={() => onTagPress(tag)}
            activeColor={colors.accentDim}
          />
        );
      })}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.bg,
    fontWeight: '700',
  },
});
