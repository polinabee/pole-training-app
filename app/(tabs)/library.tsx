import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTricksStore } from '../../src/stores/tricksStore';
import { TrickCard } from '../../src/components/TrickCard';
import { FilterBar } from '../../src/components/FilterBar';
import { colors } from '../../src/constants/colors';
import { PREDEFINED_TAGS } from '../../src/constants/tags';
import type { PoleType } from '../../src/types';

export default function LibraryScreen() {
  const router = useRouter();
  const tricks = useTricksStore((s) => s.tricks);
  const userTricks = useTricksStore((s) => s.userTricks);
  const addCustomTrick = useTricksStore((s) => s.addCustomTrick);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPoleType, setSelectedPoleType] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // New trick form state
  const [newName, setNewName] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(3);
  const [newPoleType, setNewPoleType] = useState<PoleType>('both');
  const [newHasSides, setNewHasSides] = useState(true);
  const [newTags, setNewTags] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return tricks.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedPoleType && t.poleType !== selectedPoleType) return false;
      if (selectedDifficulty && t.difficulty !== selectedDifficulty) return false;
      if (selectedTags.length > 0 && !selectedTags.every((tag) => t.tags.includes(tag))) return false;
      return true;
    });
  }, [tricks, search, selectedPoleType, selectedDifficulty, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

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

      <FilterBar
        selectedTags={selectedTags}
        onTagPress={toggleTag}
        selectedPoleType={selectedPoleType}
        onPoleTypePress={setSelectedPoleType}
        selectedDifficulty={selectedDifficulty}
        onDifficultyPress={setSelectedDifficulty}
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
            {PREDEFINED_TAGS.map((tag) => {
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
