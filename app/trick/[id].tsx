import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTricksStore } from '../../src/stores/tricksStore';
import { useVideosStore } from '../../src/stores/videosStore';
import { SideStatusPicker } from '../../src/components/SideStatusPicker';
import { DifficultyDots } from '../../src/components/DifficultyDots';
import { VideoThumbnail } from '../../src/components/VideoThumbnail';
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

  const tricks = useTricksStore((s) => s.tricks);
  const getUserTrick = useTricksStore((s) => s.getUserTrick);
  const upsertUserTrick = useTricksStore((s) => s.upsertUserTrick);

  const getVideosForTrick = useVideosStore((s) => s.getVideosForTrick);
  const addVideo = useVideosStore((s) => s.addVideo);
  const removeVideo = useVideosStore((s) => s.removeVideo);
  const updateVideoNotes = useVideosStore((s) => s.updateVideoNotes);

  const trick = tricks.find((t) => t.id === id);
  const userTrick = trick ? getUserTrick(trick.id) : undefined;
  const videos = trick ? getVideosForTrick(trick.id) : [];

  const [notesLeft, setNotesLeft] = useState(userTrick?.notes_left ?? '');
  const [notesRight, setNotesRight] = useState(userTrick?.notes_right ?? '');
  const [notesNoSide, setNotesNoSide] = useState(userTrick?.notes_left ?? '');

  React.useEffect(() => {
    if (trick) navigation.setOptions({ title: trick.name });
  }, [trick?.name]);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to attach videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      addVideo({
        localUri: result.assets[0].uri,
        trickId: id ?? null,
        sessionId: null,
        notes: null,
      });
    }
  }, [id, addVideo]);

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
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {trick.isCustom ? (
          <View style={[styles.tag, styles.customTag]}>
            <Text style={[styles.tagText, styles.customTagText]}>custom</Text>
          </View>
        ) : null}
      </View>

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

      <View style={styles.divider} />

      {/* Videos */}
      <Section title="Videos">
        {videos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.videosRow}>
            {videos.map((v) => (
              <VideoThumbnail
                key={v.id}
                video={v}
                onRemove={() => removeVideo(v.id)}
                onNotesChange={(notes) => updateVideoNotes(v.id, notes)}
              />
            ))}
          </ScrollView>
        ) : null}
        <Pressable style={styles.addVideoBtn} onPress={pickVideo}>
          <Text style={styles.addVideoBtnText}>+ Attach Video</Text>
        </Pressable>
      </Section>
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
  videosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addVideoBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  addVideoBtnText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
});
