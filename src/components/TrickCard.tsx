import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { DifficultyDots } from './DifficultyDots';
import type { Trick, UserTrick } from '../types';

interface Props {
  trick: Trick;
  userTrick?: UserTrick;
  onPress: () => void;
  subtitle?: string;
}

const POLE_LABEL: Record<string, string> = {
  both: 'Both',
  static_only: 'Static',
  spin_only: 'Spin',
};

const POLE_COLOR: Record<string, string> = {
  both: colors.poleBoth,
  static_only: colors.poleStatic,
  spin_only: colors.poleSpin,
};

export function TrickCard({ trick, userTrick, onPress, subtitle }: Props) {
  const hasAnyStatus =
    userTrick?.status || userTrick?.status_left || userTrick?.status_right;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {trick.name}
        </Text>
        {trick.source === 'community' && (
          <View style={styles.communityBadge}>
            <Text style={styles.communityBadgeText}>Community</Text>
          </View>
        )}
        <View style={[styles.poleBadge, { borderColor: POLE_COLOR[trick.poleType] }]}>
          <Text style={[styles.poleBadgeText, { color: POLE_COLOR[trick.poleType] }]}>
            {POLE_LABEL[trick.poleType]}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <DifficultyDots difficulty={trick.difficulty} />
        {hasAnyStatus ? (
          <View style={styles.statusRow}>
            {trick.hasSides ? (
              <>
                {userTrick?.status_left ? (
                  <StatusChip status={userTrick.status_left} label="L" />
                ) : null}
                {userTrick?.status_right ? (
                  <StatusChip status={userTrick.status_right} label="R" />
                ) : null}
              </>
            ) : userTrick?.status ? (
              <StatusChip status={userTrick.status} />
            ) : null}
          </View>
        ) : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

function StatusChip({ status, label }: { status: string; label?: string }) {
  const statusColors: Record<string, string> = {
    learning: colors.statusLearning,
    polishing: colors.statusPolishing,
    got_it: colors.statusGotIt,
  };
  const color = statusColors[status] ?? colors.textMuted;
  const text = label ? `${label}: ${status.replace('_', ' ')}` : status.replace('_', ' ');
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  poleBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  poleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 'auto',
  },
  communityBadge: {
    backgroundColor: colors.accentDim,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  communityBadgeText: {
    color: colors.bg,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
