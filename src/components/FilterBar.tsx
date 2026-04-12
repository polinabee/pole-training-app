import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors } from '../constants/colors';
import { PREDEFINED_TAGS } from '../constants/tags';

export type StatusFilter = 'never_tried' | 'learning' | 'polishing' | 'got_it';

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'never_tried', label: 'Never tried', color: colors.textMuted },
  { value: 'learning',    label: 'Learning',    color: colors.statusLearning },
  { value: 'polishing',   label: 'Polishing',   color: colors.statusPolishing },
  { value: 'got_it',      label: 'Got it',      color: colors.statusGotIt },
];

const POLE_OPTIONS = [
  { value: 'both',        label: 'Both poles' },
  { value: 'static_only', label: 'Static only' },
  { value: 'spin_only',   label: 'Spin only' },
];

interface Props {
  selectedStatuses: StatusFilter[];
  onStatusChange: (values: StatusFilter[]) => void;
  selectedTags: string[];
  onTagChange: (values: string[]) => void;
  selectedPoleTypes: string[];
  onPoleTypeChange: (values: string[]) => void;
  selectedDifficulties: number[];
  onDifficultyChange: (values: number[]) => void;
  customTags?: string[];
}

type OpenDropdown = 'status' | 'tags' | 'pole' | 'difficulty' | null;

export function FilterBar({
  selectedStatuses,
  onStatusChange,
  selectedTags,
  onTagChange,
  selectedPoleTypes,
  onPoleTypeChange,
  selectedDifficulties,
  onDifficultyChange,
  customTags = [],
}: Props) {
  const [open, setOpen] = useState<OpenDropdown>(null);

  const allTags = [...PREDEFINED_TAGS, ...customTags];
  const activeCount =
    selectedStatuses.length +
    selectedTags.length +
    selectedPoleTypes.length +
    selectedDifficulties.length;

  function pillLabel(base: string, count: number) {
    return count > 0 ? `${base} · ${count}` : base;
  }

  return (
    <>
      <View style={styles.row}>
        <Pill
          label={pillLabel('Status', selectedStatuses.length)}
          active={selectedStatuses.length > 0}
          onPress={() => setOpen(open === 'status' ? null : 'status')}
        />
        <Pill
          label={pillLabel('Tags', selectedTags.length)}
          active={selectedTags.length > 0}
          onPress={() => setOpen(open === 'tags' ? null : 'tags')}
        />
        <Pill
          label={pillLabel('Pole', selectedPoleTypes.length)}
          active={selectedPoleTypes.length > 0}
          onPress={() => setOpen(open === 'pole' ? null : 'pole')}
        />
        <Pill
          label={pillLabel('Level', selectedDifficulties.length)}
          active={selectedDifficulties.length > 0}
          onPress={() => setOpen(open === 'difficulty' ? null : 'difficulty')}
        />
        {activeCount > 0 ? (
          <TouchableOpacity
            onPress={() => {
              onStatusChange([]);
              onTagChange([]);
              onPoleTypeChange([]);
              onDifficultyChange([]);
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <DropdownModal
        visible={open === 'status'}
        title="Status"
        onClose={() => setOpen(null)}
        onClear={() => onStatusChange([])}
      >
        {STATUS_OPTIONS.map((opt) => {
          const checked = selectedStatuses.includes(opt.value);
          return (
            <CheckRow
              key={opt.value}
              label={opt.label}
              checked={checked}
              color={opt.color}
              onPress={() =>
                onStatusChange(
                  checked
                    ? selectedStatuses.filter((s) => s !== opt.value)
                    : [...selectedStatuses, opt.value]
                )
              }
            />
          );
        })}
      </DropdownModal>

      <DropdownModal
        visible={open === 'tags'}
        title="Tags"
        onClose={() => setOpen(null)}
        onClear={() => onTagChange([])}
      >
        {allTags.map((tag) => {
          const checked = selectedTags.includes(tag);
          return (
            <CheckRow
              key={tag}
              label={tag}
              checked={checked}
              onPress={() =>
                onTagChange(
                  checked
                    ? selectedTags.filter((t) => t !== tag)
                    : [...selectedTags, tag]
                )
              }
            />
          );
        })}
      </DropdownModal>

      <DropdownModal
        visible={open === 'pole'}
        title="Pole Type"
        onClose={() => setOpen(null)}
        onClear={() => onPoleTypeChange([])}
      >
        {POLE_OPTIONS.map((opt) => {
          const checked = selectedPoleTypes.includes(opt.value);
          return (
            <CheckRow
              key={opt.value}
              label={opt.label}
              checked={checked}
              onPress={() =>
                onPoleTypeChange(
                  checked
                    ? selectedPoleTypes.filter((p) => p !== opt.value)
                    : [...selectedPoleTypes, opt.value]
                )
              }
            />
          );
        })}
      </DropdownModal>

      <DropdownModal
        visible={open === 'difficulty'}
        title="Difficulty"
        onClose={() => setOpen(null)}
        onClear={() => onDifficultyChange([])}
      >
        {[1, 2, 3, 4, 5].map((d) => {
          const checked = selectedDifficulties.includes(d);
          return (
            <CheckRow
              key={d}
              label={`Level ${d} ${'●'.repeat(d)}${'○'.repeat(5 - d)}`}
              checked={checked}
              onPress={() =>
                onDifficultyChange(
                  checked
                    ? selectedDifficulties.filter((x) => x !== d)
                    : [...selectedDifficulties, d]
                )
              }
            />
          );
        })}
      </DropdownModal>
    </>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DropdownModal({
  visible,
  title,
  onClose,
  onClear,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <View style={styles.sheetHeaderRight}>
              <TouchableOpacity onPress={onClear} activeOpacity={0.7}>
                <Text style={styles.sheetClear}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.sheetCloseBtn}>
                <Text style={styles.sheetClose}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView bounces={false}>{children}</ScrollView>
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

function CheckRow({
  label,
  checked,
  color,
  onPress,
}: {
  label: string;
  checked: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.checkRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.checkLabel, color ? { color } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.bg,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  // Modal / sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sheetHeaderRight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  sheetClear: {
    color: colors.textMuted,
    fontSize: 14,
  },
  sheetCloseBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  sheetClose: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  checkLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
