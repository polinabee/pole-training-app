import React, { useState, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTricksStore } from '../../src/stores/tricksStore';
import { SideStatusPicker } from '../../src/components/SideStatusPicker';
import { DifficultyDots } from '../../src/components/DifficultyDots';
import { colors } from '../../src/constants/colors';
import type { TrickStatus } from '../../src/types';

const POLE_LABEL: Record<string, string> = {
  both: 'Both Poles',
  static_only: 'Static Only',
  spin_only: 'Spin Only',
};

export default function TrickDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const router = useRouter();
  const tricks = useTricksStore((s) => s.tricks);
  const userTricks = useTricksStore((s) => s.userTricks);
  const upsertUserTrick = useTricksStore((s) => s.upsertUserTrick);
  const deleteCustomTrick = useTricksStore((s) => s.deleteCustomTrick);
  const updateTrickTags = useTricksStore((s) => s.updateTrickTags);

  const trick = tricks.find((t) => t.id === id);
  const userTrick = userTricks.find((ut) => ut.trickId === id);

  const [notesLeft, setNotesLeft] = useState(userTrick?.notes_left ?? '');
  const [notesRight, setNotesRight] = useState(userTrick?.notes_right ?? '');
  const [notesNoSide, setNotesNoSide] = useState(userTrick?.notes_left ?? '');
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (trick) navigation.setOptions({ title: trick.name });
  }, [trick?.name]);

  if (!trick) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Trick not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header info */}
      <View style={styles.metaRow}>
        <DifficultyDots difficulty={trick.difficulty} size={10} />
        <Text style={styles.poleType}>{POLE_LABEL[trick.poleType]}</Text>
      </View>

      <View style={styles.tagsRow}>
        {trick.tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            activeOpacity={0.7}
            style={styles.tag}
            onLongPress={() =>
              Alert.alert('Remove tag', `Remove "${tag}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => updateTrickTags(trick.id, trick.tags.filter((t) => t !== tag)) },
              ])
            }
          >
            <Text style={styles.tagText}>{tag}</Text>
          </TouchableOpacity>
        ))}
        {trick.isCustom ? (
          <View style={[styles.tag, styles.customTag]}>
            <Text style={[styles.tagText, styles.customTagText]}>custom</Text>
          </View>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.addTagBtn}
          onPress={() => tagInputRef.current?.focus()}
        >
          <Text style={styles.addTagBtnText}>+ tag</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        ref={tagInputRef}
        style={styles.tagInput}
        placeholder="New tag..."
        placeholderTextColor={colors.textDim}
        value={tagInput}
        onChangeText={setTagInput}
        returnKeyType="done"
        onSubmitEditing={() => {
          const tag = tagInput.trim().toLowerCase();
          if (tag && !trick.tags.includes(tag)) {
            updateTrickTags(trick.id, [...trick.tags, tag]);
          }
          setTagInput('');
        }}
      />

      <View style={styles.divider} />

      {/* Status & Notes */}
      {trick.hasSides ? (
        <>
          <Section title="Left Side">
            <SideStatusPicker
              value={userTrick?.status_left ?? null}
              onChange={(status: TrickStatus) => upsertUserTrick(trick.id, { status_left: status })}
            />
            <TextInput
              style={styles.notesInput}
              placeholder="Notes for left side..."
              placeholderTextColor={colors.textDim}
              value={notesLeft}
              onChangeText={setNotesLeft}
              onBlur={() => upsertUserTrick(trick.id, { notes_left: notesLeft })}
              multiline
            />
          </Section>

          <Section title="Right Side">
            <SideStatusPicker
              value={userTrick?.status_right ?? null}
              onChange={(status: TrickStatus) => upsertUserTrick(trick.id, { status_right: status })}
            />
            <TextInput
              style={styles.notesInput}
              placeholder="Notes for right side..."
              placeholderTextColor={colors.textDim}
              value={notesRight}
              onChangeText={setNotesRight}
              onBlur={() => upsertUserTrick(trick.id, { notes_right: notesRight })}
              multiline
            />
          </Section>
        </>
      ) : (
        <Section title="Status">
          <SideStatusPicker
            value={userTrick?.status ?? null}
            onChange={(status: TrickStatus) => upsertUserTrick(trick.id, { status })}
          />
          <TextInput
            style={styles.notesInput}
            placeholder="Notes..."
            placeholderTextColor={colors.textDim}
            value={notesNoSide}
            onChangeText={setNotesNoSide}
            onBlur={() => upsertUserTrick(trick.id, { notes_left: notesNoSide })}
            multiline
          />
        </Section>
      )}

      {/* Suggest edit — only for built-in (non-custom) tricks */}
      {!trick.isCustom ? (
        <TouchableOpacity
          style={styles.suggestEditBtn}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/suggest-trick',
              params: {
                prefillName: trick.name,
                prefillPoleType: trick.poleType,
                prefillDifficulty: String(trick.difficulty),
                prefillHasSides: String(trick.hasSides),
                prefillTags: JSON.stringify(trick.tags),
              },
            })
          }
        >
          <Text style={styles.suggestEditBtnText}>Suggest edit</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.divider} />

      {/* Delete (custom tricks only) */}
      {trick.isCustom ? (
        <>
          <View style={styles.divider} />
          <Pressable
            style={styles.deleteBtn}
            onPress={() =>
              Alert.alert('Delete trick', `Delete "${trick.name}"? This cannot be undone.`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => { deleteCustomTrick(trick.id); router.back(); },
                },
              ])
            }
          >
            <Text style={styles.deleteBtnText}>Delete Trick</Text>
          </Pressable>
        </>
      ) : null}

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText: { color: colors.textMuted, fontSize: 16 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  poleType: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  customTag: {
    borderColor: colors.accent,
  },
  customTagText: {
    color: colors.accent,
  },
  addTagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addTagBtnText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  tagInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  section: {
    gap: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  notesInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  deleteBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  suggestEditBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: 8,
  },
  suggestEditBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
});
