import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import type { TrickStatus } from '../types';

interface Props {
  value: TrickStatus;
  onChange: (status: TrickStatus) => void;
  label?: string;
}

const OPTIONS: { value: TrickStatus; label: string; color: string }[] = [
  { value: 'learning', label: 'Learning', color: colors.statusLearning },
  { value: 'polishing', label: 'Polishing', color: colors.statusPolishing },
  { value: 'got_it', label: 'Got it', color: colors.statusGotIt },
];

export function SideStatusPicker({ value, onChange, label }: Props) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(isActive ? null : opt.value)}
              activeOpacity={0.5}
              style={[
                styles.btn,
                isActive && { backgroundColor: opt.color, borderColor: opt.color },
              ]}
            >
              <Text
                style={[
                  styles.btnText,
                  isActive ? styles.btnTextActive : { color: opt.color },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnTextActive: {
    color: colors.bg,
  },
});
