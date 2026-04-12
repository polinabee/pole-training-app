import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSessionsStore } from '../../src/stores/sessionsStore';
import { useTricksStore } from '../../src/stores/tricksStore';
import { useVideosStore } from '../../src/stores/videosStore';
import { VideoThumbnail } from '../../src/components/VideoThumbnail';
import { colors } from '../../src/constants/colors';
import type { SessionSide } from '../../src/types';

const SIDES: { value: SessionSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const sessions = useSessionsStore((s) => s.sessions);
  const getSessionTricks = useSessionsStore((s) => s.getSessionTricks);
  const updateSessionNotes = useSessionsStore((s) => s.updateSessionNotes);
  const addSessionTrick = useSessionsStore((s) => s.addSessionTrick);
  const removeSessionTrick = useSessionsStore((s) => s.removeSessionTrick);

  const tricks = useTricksStore((s) => s.tricks);

  const getVideosForSession = useVideosStore((s) => s.getVideosForSession);
  const addVideo = useVideosStore((s) => s.addVideo);
  const removeVideo = useVideosStore((s) => s.removeVideo);
  const updateVideoNotes = useVideosStore((s) => s.updateVideoNotes);

  const session = sessions.find((s) => s.id === id);
  const sessionTricks = id ? getSessionTricks(id) : [];
  const videos = id ? getVideosForSession(id) : [];

  const [notes, setNotes] = useState(session?.notes ?? '');
  const [addTrickModal, setAddTrickModal] = useState(false);
  const [trickSearch, setTrickSearch] = useState('');
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<SessionSide>('both');

  const filteredTricks = tricks.filter((t) =>
    t.name.toLowerCase().includes(trickSearch.toLowerCase())
  );

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
        trickId: null,
        sessionId: id ?? null,
        notes: null,
      });
    }
  }, [id, addVideo]);

  function handleAddTrick() {
    if (!selectedTrickId || !id) return;
    addSessionTrick(id, selectedTrickId, selectedSide);
    setSelectedTrickId(null);
    setTrickSearch('');
    setSelectedSide('both');
    setAddTrickModal(false);
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Session not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.dateHeading}>{formatDate(session.date)}</Text>

      <TextInput
        style={styles.notesInput}
        placeholder="Session notes..."
        placeholderTextColor={colors.textDim}
        value={notes}
        onChangeText={setNotes}
        onBlur={() => updateSessionNotes(session.id, notes)}
        multiline
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tricks Practiced</Text>
        <Pressable onPress={() => setAddTrickModal(true)}>
          <Text style={styles.addLink}>+ Add</Text>
        </Pressable>
      </View>

      {sessionTricks.length === 0 ? (
        <Text style={styles.empty}>No tricks logged yet.</Text>
      ) : (
        <View style={styles.trickList}>
          {sessionTricks.map((st) => {
            const trick = tricks.find((t) => t.id === st.trickId);
            return (
              <View key={st.id} style={styles.sessionTrickRow}>
                <View style={styles.sessionTrickInfo}>
                  <Text style={styles.sessionTrickName}>{trick?.name ?? 'Unknown'}</Text>
                  <SideBadge side={st.side} />
                </View>
                <Pressable onPress={() => removeSessionTrick(st.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Session Videos</Text>
      </View>
      {videos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.videosRow}>
          {videos.map((v) => (
            <VideoThumbnail
              key={v.id}
              video={v}
              onRemove={() => removeVideo(v.id)}
              onNotesChange={(n) => updateVideoNotes(v.id, n)}
            />
          ))}
        </ScrollView>
      ) : null}
      <Pressable style={styles.addVideoBtn} onPress={pickVideo}>
        <Text style={styles.addVideoBtnText}>+ Attach Video</Text>
      </Pressable>

      {/* Add Trick Modal */}
      <Modal visible={addTrickModal} animationType="slide" onRequestClose={() => setAddTrickModal(false)}>
        <View style={styles.modalBg}>
          <Text style={styles.modalTitle}>Add Trick</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search tricks..."
            placeholderTextColor={colors.textDim}
            value={trickSearch}
            onChangeText={setTrickSearch}
          />

          <FlatList
            data={filteredTricks}
            keyExtractor={(t) => t.id}
            style={styles.trickPickerList}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.trickPickerRow, selectedTrickId === item.id && styles.trickPickerRowActive]}
                onPress={() => setSelectedTrickId(item.id)}
              >
                <Text style={[styles.trickPickerName, selectedTrickId === item.id && styles.trickPickerNameActive]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          />

          {selectedTrickId ? (
            <>
              <Text style={styles.fieldLabel}>Side</Text>
              <View style={styles.sideRow}>
                {SIDES.map((s) => (
                  <Pressable
                    key={s.value}
                    style={[styles.sideBtn, selectedSide === s.value && styles.sideBtnActive]}
                    onPress={() => setSelectedSide(s.value)}
                  >
                    <Text style={[styles.sideBtnText, selectedSide === s.value && styles.sideBtnTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setAddTrickModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !selectedTrickId && styles.saveBtnDisabled]}
              onPress={handleAddTrick}
              disabled={!selectedTrickId}
            >
              <Text style={styles.saveBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SideBadge({ side }: { side: SessionSide }) {
  const colors_map: Record<SessionSide, string> = {
    left: colors.statusLearning,
    right: colors.statusPolishing,
    both: colors.statusGotIt,
    none: colors.textMuted,
  };
  return (
    <View style={[sideBadgeStyles.badge, { borderColor: colors_map[side] }]}>
      <Text style={[sideBadgeStyles.text, { color: colors_map[side] }]}>
        {side.toUpperCase()}
      </Text>
    </View>
  );
}

const sideBadgeStyles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText: { color: colors.textMuted, fontSize: 16 },
  dateHeading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
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
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  addLink: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 24,
  },
  trickList: { gap: 8, marginBottom: 24 },
  sessionTrickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionTrickInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionTrickName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 6,
  },
  removeBtnText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  videosRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  addVideoBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 24,
  },
  addVideoBtnText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    paddingTop: 50,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  trickPickerList: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  trickPickerRow: {
    padding: 14,
  },
  trickPickerRowActive: {
    backgroundColor: colors.accent + '22',
  },
  trickPickerName: {
    color: colors.text,
    fontSize: 15,
  },
  trickPickerNameActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sideRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sideBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sideBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sideBtnTextActive: {
    color: colors.bg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
