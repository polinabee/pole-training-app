import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../src/constants/colors';
import { PREDEFINED_TAGS } from '../src/constants/tags';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { getDb } from '../src/db';
import * as Crypto from 'expo-crypto';
import type { PoleType } from '../src/types';

// Params passed when opening from trick detail ("Suggest edit")
type SuggestTrickParams = {
  prefillName?: string;
  prefillPoleType?: PoleType;
  prefillDifficulty?: string;
  prefillHasSides?: string;
  prefillTags?: string; // JSON array
};

async function isOnline(): Promise<boolean> {
  try {
    const res = await Promise.race([
      fetch('https://www.google.com/generate_204', { method: 'HEAD' }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]) as Response;
    return res.status === 204;
  } catch {
    return false;
  }
}

async function flushPendingSubmissions(userId: string): Promise<void> {
  const db = getDb();
  const pending = db.getAllSync<{
    id: string;
    name: string;
    pole_type: string;
    difficulty: number;
    has_sides: number;
    tags: string;
    notes: string | null;
  }>('SELECT * FROM pending_submissions');

  for (const row of pending) {
    const { error } = await supabase!.from('trick_submissions').insert({
      user_id: userId,
      name: row.name,
      pole_type: row.pole_type,
      difficulty: row.difficulty,
      has_sides: Boolean(row.has_sides),
      tags: JSON.parse(row.tags) as string[],
      notes: row.notes,
    });
    if (!error) {
      db.runSync('DELETE FROM pending_submissions WHERE id = ?', [row.id]);
    }
  }
}

export default function SuggestTrickScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<SuggestTrickParams>();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(params.prefillName ?? '');
  const [poleType, setPoleType] = useState<PoleType>(
    (params.prefillPoleType as PoleType) ?? 'both'
  );
  const [difficulty, setDifficulty] = useState<number>(
    params.prefillDifficulty ? parseInt(params.prefillDifficulty, 10) : 3
  );
  const [hasSides, setHasSides] = useState<boolean>(
    params.prefillHasSides !== undefined ? params.prefillHasSides === 'true' : true
  );
  const [tags, setTags] = useState<string[]>(
    params.prefillTags ? (JSON.parse(params.prefillTags) as string[]) : []
  );
  const [customTagInput, setCustomTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEdit = Boolean(params.prefillName);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a trick name.');
      return;
    }
    if (!user) {
      Alert.alert(
        'Sign in required',
        'You need to sign in to suggest tricks.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const online = await isOnline();

      if (online) {
        // Flush any queued offline submissions first
        await flushPendingSubmissions(user.id);

        const { error } = await supabase!.from('trick_submissions').insert({
          user_id: user.id,
          name: name.trim(),
          pole_type: poleType,
          difficulty,
          has_sides: hasSides,
          tags,
          notes: notes.trim() || null,
        });
        if (error) throw error;
      } else {
        // Queue locally
        const db = getDb();
        db.runSync(
          `INSERT INTO pending_submissions (id, name, pole_type, difficulty, has_sides, tags, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Crypto.randomUUID(),
            name.trim(),
            poleType,
            difficulty,
            hasSides ? 1 : 0,
            JSON.stringify(tags),
            notes.trim() || null,
            new Date().toISOString(),
          ]
        );
        Alert.alert(
          "You're offline",
          "Submission saved and will be sent when you're connected."
        );
      }

      setSubmitted(true);
    } catch (err) {
      Alert.alert('Submission failed', 'Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Thank you!</Text>
        <Text style={styles.successBody}>
          Your suggestion has been submitted and will be reviewed.
        </Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>
        {isEdit
          ? "Describe the change you'd like to see for this trick."
          : "Know a trick that's missing from the library? Share it with the community."}
      </Text>

      <Text style={styles.fieldLabel}>Trick name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Gemini"
        placeholderTextColor={colors.textDim}
        value={name}
        onChangeText={setName}
        autoFocus={!isEdit}
      />

      <Text style={styles.fieldLabel}>Pole Type</Text>
      <View style={styles.optionRow}>
        {(['both', 'static_only', 'spin_only'] as PoleType[]).map((pt) => (
          <TouchableOpacity
            key={pt}
            style={[styles.optionBtn, poleType === pt && styles.optionBtnActive]}
            onPress={() => setPoleType(pt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionBtnText, poleType === pt && styles.optionBtnTextActive]}>
              {pt === 'both' ? 'Both' : pt === 'static_only' ? 'Static' : 'Spin'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Difficulty</Text>
      <View style={styles.optionRow}>
        {[1, 2, 3, 4, 5].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.optionBtn, difficulty === d && styles.optionBtnActive]}
            onPress={() => setDifficulty(d)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionBtnText, difficulty === d && styles.optionBtnTextActive]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Has Sides?</Text>
      <View style={styles.optionRow}>
        {[true, false].map((v) => (
          <TouchableOpacity
            key={String(v)}
            style={[styles.optionBtn, hasSides === v && styles.optionBtnActive]}
            onPress={() => setHasSides(v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionBtnText, hasSides === v && styles.optionBtnTextActive]}>
              {v ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Tags</Text>
      <View style={styles.tagsGrid}>
        {[...PREDEFINED_TAGS, ...tags.filter((t) => !(PREDEFINED_TAGS as readonly string[]).includes(t))].map((tag) => {
          const active = tags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, active && styles.tagChipActive]}
              onPress={() =>
                setTags((prev) =>
                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                )
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Add custom tag..."
        placeholderTextColor={colors.textDim}
        value={customTagInput}
        onChangeText={setCustomTagInput}
        returnKeyType="done"
        onSubmitEditing={() => {
          const tag = customTagInput.trim().toLowerCase();
          if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
          setCustomTagInput('');
        }}
      />

      <Text style={styles.fieldLabel}>{isEdit ? 'Describe the change' : 'Notes / description'}</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder={
          isEdit
            ? 'What should change and why?'
            : 'Any details about grip, body position, common mistakes…'
        }
        placeholderTextColor={colors.textDim}
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.submitBtnText}>
            {isEdit ? 'Submit Edit Suggestion' : 'Submit Suggestion'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  notesInput: {
    minHeight: 100,
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
    marginBottom: 12,
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
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  successIcon: {
    fontSize: 48,
    color: colors.accent,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  successBody: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  doneBtn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
});
