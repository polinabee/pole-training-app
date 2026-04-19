import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Text,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTricksStore } from '../../src/stores/tricksStore';
import { TrickCard } from '../../src/components/TrickCard';
import { FilterBar } from '../../src/components/FilterBar';
import type { StatusFilter } from '../../src/components/FilterBar';
import { colors } from '../../src/constants/colors';
import { PREDEFINED_TAGS } from '../../src/constants/tags';
import type { PoleType, TrickStatus } from '../../src/types';

export default function LibraryScreen() {
  const router = useRouter();
  const tricks = useTricksStore((s) => s.tricks);
  const communityTricks = useTricksStore((s) => s.communityTricks);
  const userTricks = useTricksStore((s) => s.userTricks);
  const addCustomTrick = useTricksStore((s) => s.addCustomTrick);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPoleTypes, setSelectedPoleTypes] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusFilter[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // New trick form state
  const [newName, setNewName] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(3);
  const [newPoleType, setNewPoleType] = useState<PoleType>('both');
  const [newHasSides, setNewHasSides] = useState(true);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // All unique custom tags across all tricks (not in predefined list)
  const customTags = useMemo(() => {
    const predefined = new Set(PREDEFINED_TAGS as readonly string[]);
    const all = new Set<string>();
    for (const t of tricks) {
      for (const tag of t.tags) {
        if (!predefined.has(tag)) all.add(tag);
      }
    }
    return Array.from(all).sort();
  }, [tricks]);

  const allTricks = useMemo(
    () => [...tricks, ...communityTricks],
    [tricks, communityTricks]
  );

  const filtered = useMemo(() => {
    return allTricks.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedPoleTypes.length > 0 && !selectedPoleTypes.includes(t.poleType)) return false;
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(t.difficulty)) return false;
      if (selectedTags.length > 0 && !selectedTags.every((tag) => t.tags.includes(tag))) return false;
      if (selectedStatuses.length > 0) {
        const ut = userTricks.find((u) => u.trickId === t.id);
        const statuses: TrickStatus[] = t.hasSides
          ? [ut?.status_left ?? null, ut?.status_right ?? null]
          : [ut?.status ?? null];
        const matchesStatus = selectedStatuses.some((sf) => {
          if (sf === 'never_tried') return statuses.every((s) => s === null);
          return statuses.some((s) => s === sf);
        });
        if (!matchesStatus) return false;
      }
      return true;
    });
  }, [allTricks, userTricks, search, selectedPoleTypes, selectedDifficulties, selectedTags, selectedStatuses]);

  function handleAddTrick() {
    if (!newName.trim()) return;
    addCustomTrick({
      name: newName.trim(),
      poleType: newPoleType,
      difficulty: newDifficulty,
      diagramUrl: null,
      referenceVideoUrl: null,
      tags: newTags,
      hasSides: newHasSides,
    });
    setNewName('');
    setNewDifficulty(3);
    setNewPoleType('both');
    setNewHasSides(true);
    setNewTags([]);
    setCustomTagInput('');
    setAddModalVisible(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search tricks..."
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <View style={styles.suggestRow}>
        <TouchableOpacity
          onPress={() => router.push('/suggest-trick')}
          activeOpacity={0.7}
        >
          <Text style={styles.suggestLink}>+ Suggest a trick</Text>
        </TouchableOpacity>
        <View style={styles.suggestRowRight}>
          <TouchableOpacity onPress={() => router.push('/submissions')} activeOpacity={0.7}>
            <Text style={styles.metaLink}>My submissions</Text>
          </TouchableOpacity>
          <Text style={styles.metaDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.7}>
            <Text style={styles.metaLink}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FilterBar
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        selectedTags={selectedTags}
        onTagChange={setSelectedTags}
        selectedPoleTypes={selectedPoleTypes}
        onPoleTypeChange={setSelectedPoleTypes}
        selectedDifficulties={selectedDifficulties}
        onDifficultyChange={setSelectedDifficulties}
        customTags={customTags}
      />

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <TrickCard
            trick={item}
            userTrick={userTricks.find((u) => u.trickId === item.id)}
            onPress={() => router.push(`/trick/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No tricks match your filters.</Text>
        }
      />

      {/* Add custom trick modal */}
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBg}>
          <Text style={styles.modalTitle}>Add Custom Trick</Text>

          <TextInput
            style={styles.input}
            placeholder="Trick name"
            placeholderTextColor={colors.textDim}
            value={newName}
            onChangeText={setNewName}
          />

          <Text style={styles.fieldLabel}>Pole Type</Text>
          <View style={styles.optionRow}>
            {(['both', 'static_only', 'spin_only'] as PoleType[]).map((pt) => (
              <Pressable
                key={pt}
                style={[styles.optionBtn, newPoleType === pt && styles.optionBtnActive]}
                onPress={() => setNewPoleType(pt)}
              >
                <Text style={[styles.optionBtnText, newPoleType === pt && styles.optionBtnTextActive]}>
                  {pt === 'both' ? 'Both' : pt === 'static_only' ? 'Static' : 'Spin'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Difficulty</Text>
          <View style={styles.optionRow}>
            {[1, 2, 3, 4, 5].map((d) => (
              <Pressable
                key={d}
                style={[styles.optionBtn, newDifficulty === d && styles.optionBtnActive]}
                onPress={() => setNewDifficulty(d)}
              >
                <Text style={[styles.optionBtnText, newDifficulty === d && styles.optionBtnTextActive]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Has Sides?</Text>
          <View style={styles.optionRow}>
            {[true, false].map((v) => (
              <Pressable
                key={String(v)}
                style={[styles.optionBtn, newHasSides === v && styles.optionBtnActive]}
                onPress={() => setNewHasSides(v)}
              >
                <Text style={[styles.optionBtnText, newHasSides === v && styles.optionBtnTextActive]}>
                  {v ? 'Yes' : 'No'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Tags</Text>
          <View style={styles.tagsGrid}>
            {[...PREDEFINED_TAGS, ...newTags.filter((t) => !(PREDEFINED_TAGS as readonly string[]).includes(t))].map((tag) => {
              const active = newTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                  onPress={() =>
                    setNewTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                >
                  <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              placeholder="Add custom tag..."
              placeholderTextColor={colors.textDim}
              value={customTagInput}
              onChangeText={setCustomTagInput}
              returnKeyType="done"
              onSubmitEditing={() => {
                const tag = customTagInput.trim().toLowerCase();
                if (tag && !newTags.includes(tag)) setNewTags((prev) => [...prev, tag]);
                setCustomTagInput('');
              }}
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleAddTrick}>
              <Text style={styles.saveBtnText}>Add Trick</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    alignItems: 'center',
  },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  suggestRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestLink: {
    color: colors.accentDim,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLink: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaDot: {
    color: colors.textMuted,
    fontSize: 12,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  optionBtnTextActive: {
    color: colors.bg,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accentDim,
  },
  tagChipText: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  tagChipTextActive: {
    color: colors.bg,
    fontWeight: '700',
  },
  customTagRow: {
    marginBottom: 16,
  },
  customTagInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 15,
  },
});
