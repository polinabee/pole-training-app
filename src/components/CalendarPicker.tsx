import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toLocal(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarPicker({ value, onChange }: Props) {
  const today = toISO(new Date());
  const selected = toLocal(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={styles.row}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={styles.row}>
          {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const cellISO = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = cellISO === value;
            const isToday = cellISO === today;
            return (
              <Pressable
                key={i}
                style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                onPress={() => onChange(cellISO)}
              >
                <Text style={[styles.cellText, isSelected && styles.cellTextSelected, isToday && !isSelected && styles.cellTextToday]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    padding: 6,
    width: 36,
    alignItems: 'center',
  },
  navText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '600',
  },
  monthTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  cellSelected: {
    backgroundColor: colors.accent,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cellText: {
    color: colors.text,
    fontSize: 13,
  },
  cellTextSelected: {
    color: colors.bg,
    fontWeight: '700',
  },
  cellTextToday: {
    color: colors.accent,
    fontWeight: '700',
  },
});
