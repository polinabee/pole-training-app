import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTricksStore } from '../../src/stores/tricksStore';
import { TrickCard } from '../../src/components/TrickCard';
import { colors } from '../../src/constants/colors';
import type { Trick, UserTrick } from '../../src/types';

type PracticeItem = {
  trick: Trick;
  userTrick: UserTrick | undefined;
  lastPracticed: string | null;
  daysSince: number | null;
};

function getDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDaysSince(days: number | null): string {
  if (days === null) return 'Never practiced';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function PracticeScreen() {
  const router = useRouter();
  const tricks = useTricksStore((s) => s.tricks);
  const userTricks = useTricksStore((s) => s.userTricks);

  const sections = useMemo(() => {
    const leftItems: PracticeItem[] = [];
    const rightItems: PracticeItem[] = [];
    const noSideItems: PracticeItem[] = [];

    for (const trick of tricks) {
      const ut = userTricks.find((u) => u.trickId === trick.id);

      if (trick.hasSides) {
        leftItems.push({
          trick,
          userTrick: ut,
          lastPracticed: ut?.lastPracticed_left ?? null,
          daysSince: getDaysSince(ut?.lastPracticed_left ?? null),
        });
        rightItems.push({
          trick,
          userTrick: ut,
          lastPracticed: ut?.lastPracticed_right ?? null,
          daysSince: getDaysSince(ut?.lastPracticed_right ?? null),
        });
      } else {
        noSideItems.push({
          trick,
          userTrick: ut,
          lastPracticed: ut?.lastPracticed_left ?? null,
          daysSince: getDaysSince(ut?.lastPracticed_left ?? null),
        });
      }
    }

    const sortItems = (items: PracticeItem[]) =>
      [...items].sort((a, b) => {
        if (a.lastPracticed === null && b.lastPracticed === null) return 0;
        if (a.lastPracticed === null) return -1;
        if (b.lastPracticed === null) return 1;
        return a.lastPracticed.localeCompare(b.lastPracticed);
      });

    return [
      { title: 'Left Side', data: sortItems(leftItems) },
      { title: 'Right Side', data: sortItems(rightItems) },
      ...(noSideItems.length > 0 ? [{ title: 'No Side', data: sortItems(noSideItems) }] : []),
    ];
  }, [tricks, userTricks]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.trick.id}-${index}`}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <TrickCard
          trick={item.trick}
          userTrick={item.userTrick}
          onPress={() => router.push(`/trick/${item.trick.id}`)}
          subtitle={formatDaysSince(item.daysSince)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderSectionFooter={() => <View style={styles.sectionFooter} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },
  separator: {
    height: 10,
  },
  sectionFooter: {
    height: 24,
  },
});
