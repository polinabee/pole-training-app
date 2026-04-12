import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTricksStore } from '../../src/stores/tricksStore';
import { TrickCard } from '../../src/components/TrickCard';
import { colors } from '../../src/constants/colors';
import type { Trick, UserTrick } from '../../src/types';

type RecentItem = {
  key: string;
  trick: Trick;
  userTrick: UserTrick;
  lastPracticed: string;
  side: string;
};

function formatDaysSince(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function PoleIcon() {
  return (
    <View style={icon.wrapper}>
      <View style={icon.ring} />
      <View style={icon.pole} />
      <View style={icon.base} />
    </View>
  );
}

const icon = StyleSheet.create({
  wrapper: { alignItems: 'center', marginBottom: 8 },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.accent,
    marginBottom: -12,
    zIndex: 1,
  },
  pole: {
    width: 6,
    height: 90,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  base: {
    width: 48,
    height: 8,
    backgroundColor: colors.accentDim,
    borderRadius: 4,
    marginTop: 2,
  },
});

export default function RecentScreen() {
  const router = useRouter();
  const tricks = useTricksStore((s) => s.tricks);
  const userTricks = useTricksStore((s) => s.userTricks);

  const recentItems = useMemo(() => {
    const items: RecentItem[] = [];
    for (const ut of userTricks) {
      const trick = tricks.find((t) => t.id === ut.trickId);
      if (!trick) continue;
      if (trick.hasSides) {
        if (ut.lastPracticed_left) items.push({ key: `${ut.trickId}-left`, trick, userTrick: ut, lastPracticed: ut.lastPracticed_left, side: 'Left' });
        if (ut.lastPracticed_right) items.push({ key: `${ut.trickId}-right`, trick, userTrick: ut, lastPracticed: ut.lastPracticed_right, side: 'Right' });
      } else if (ut.lastPracticed_left) {
        items.push({ key: `${ut.trickId}-none`, trick, userTrick: ut, lastPracticed: ut.lastPracticed_left, side: '' });
      }
    }
    return items.sort((a, b) => b.lastPracticed.localeCompare(a.lastPracticed));
  }, [tricks, userTricks]);

  // Pick a random trick suggestion — changes daily
  const randomTrick = useMemo(() => {
    if (tricks.length === 0) return null;
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return tricks[seed % tricks.length];
  }, [tricks]);

  if (recentItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <PoleIcon />
        <Text style={styles.emptyTitle}>Ready to train?</Text>
        <Text style={styles.emptyText}>
          Log a training session to see your recent tricks and suggestions here.
        </Text>

        {randomTrick ? (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionLabel}>✨ Out of ideas? Try:</Text>
            <TouchableOpacity
              style={styles.suggestionCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/trick/${randomTrick.id}`)}
            >
              <Text style={styles.suggestionName}>{randomTrick.name}</Text>
              <Text style={styles.suggestionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      data={recentItems}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        recentItems.length > 0 && randomTrick ? (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionLabel}>✨ Try today:</Text>
            <TouchableOpacity
              style={styles.suggestionCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/trick/${randomTrick.id}`)}
            >
              <Text style={styles.suggestionName}>{randomTrick.name}</Text>
              <Text style={styles.suggestionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TrickCard
          trick={item.trick}
          userTrick={item.userTrick}
          onPress={() => router.push(`/trick/${item.trick.id}`)}
          subtitle={`${item.side ? item.side + ' · ' : ''}${formatDaysSince(item.lastPracticed)}`}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  separator: { height: 10 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 12,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  suggestionBox: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  suggestionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accent + '55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionName: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  suggestionChevron: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '600',
  },
});
