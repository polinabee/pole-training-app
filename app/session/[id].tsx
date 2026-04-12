import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSessionsStore } from '../../src/stores/sessionsStore';
import { useTricksStore } from '../../src/stores/tricksStore';
import { colors } from '../../src/constants/colors';
import type { SessionSide, SessionTrick, PoleMode } from '../../src/types';

const SIDES_WITH: { value: SessionSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const SIDES_WITHOUT: { value: SessionSide; label: string }[] = [
  { value: 'none', label: 'No side' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

type SessionTrickWithName = SessionTrick & { trickName: string };

function RepDots({ st, onUpdate }: { st: SessionTrickWithName; onUpdate: (id: string, n: number) => void }) {
  const dots = Array.from({ length: st.reps }, (_, i) => i);
  const done = st.completedReps >= st.reps;

  return (
    <View style={[repStyles.container, done && repStyles.containerDone]}>
      <View style={repStyles.topRow}>
        <Text style={[repStyles.trickName, done && repStyles.trickNameDone]}>{st.trickName}</Text>
        <SideBadge side={st.side} />
        {st.poleMode ? <PoleModeBadge mode={st.poleMode} /> : null}
        {done && <Text style={repStyles.doneTag}>✓ Done</Text>}
      </View>
      <View style={repStyles.dotsRow}>
        {dots.map((i) => {
          const filled = i < st.completedReps;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => {
                // tap filled dot → undo to that point; tap empty dot → fill to that point
                const next = filled ? i : i + 1;
                onUpdate(st.id, next);
              }}
              style={[repStyles.dot, filled && repStyles.dotFilled]}
            />
          );
        })}
        <Text style={repStyles.repCount}>{st.completedReps}/{st.reps}</Text>
      </View>
    </View>
  );
}

function SideBadge({ side }: { side: SessionSide }) {
  const colorMap: Record<SessionSide, string> = {
    left: colors.statusLearning,
    right: colors.statusPolishing,
    both: colors.statusGotIt,
    none: colors.textMuted,
  };
  return (
    <View style={[badgeStyles.badge, { borderColor: colorMap[side] }]}>
      <Text style={[badgeStyles.text, { color: colorMap[side] }]}>{side.toUpperCase()}</Text>
    </View>
  );
}

function PoleModeBadge({ mode }: { mode: 'static' | 'spin' }) {
  const color = mode === 'static' ? colors.poleStatic : colors.poleSpin;
  return (
    <View style={[badgeStyles.badge, { borderColor: color }]}>
      <Text style={[badgeStyles.text, { color }]}>{mode.toUpperCase()}</Text>
    </View>
  );
}


export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();
  const sessions = useSessionsStore((s) => s.sessions);
  const allSessionTricks = useSessionsStore((s) => s.sessionTricks);
  const updateSessionNotes = useSessionsStore((s) => s.updateSessionNotes);
  const updateSessionTitle = useSessionsStore((s) => s.updateSessionTitle);
  const addSessionTrick = useSessionsStore((s) => s.addSessionTrick);
  const removeSessionTrick = useSessionsStore((s) => s.removeSessionTrick);
  const updateCompletedReps = useSessionsStore((s) => s.updateCompletedReps);
  const updateSessionTrick = useSessionsStore((s) => s.updateSessionTrick);
  const deleteSession = useSessionsStore((s) => s.deleteSession);

  const tricks = useTricksStore((s) => s.tricks);

  const session = sessions.find((s) => s.id === id);
  const sessionTricks: SessionTrickWithName[] = allSessionTricks
    .filter((st) => st.sessionId === id)
    .map((st) => ({
      ...st,
      trickName: tricks.find((t) => t.id === st.trickId)?.name ?? 'Unknown',
    }));
  const [title, setTitle] = useState(session?.title ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [addTrickModal, setAddTrickModal] = useState(false);
  const [editingSessionTrickId, setEditingSessionTrickId] = useState<string | null>(null);
  const [trickSearch, setTrickSearch] = useState('');
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<SessionSide>('left');
  const [selectedPoleMode, setSelectedPoleMode] = useState<PoleMode>('static');
  const [selectedReps, setSelectedReps] = useState(5);

  const filteredTricks = tricks.filter((t) =>
    t.name.toLowerCase().includes(trickSearch.toLowerCase())
  );
  const selectedTrick = tricks.find((t) => t.id === selectedTrickId);
  const availableSides = selectedTrick?.hasSides ? SIDES_WITH : SIDES_WITHOUT;

  const isDuplicate = selectedTrickId
    ? sessionTricks.some(
        (st) =>
          st.trickId === selectedTrickId &&
          st.side === selectedSide &&
          st.poleMode === selectedPoleMode &&
          st.id !== editingSessionTrickId
      )
    : false;

  function resetModal() {
    setSelectedTrickId(null);
    setTrickSearch('');
    setSelectedSide('left');
    setSelectedPoleMode('static');
    setSelectedReps(5);
    setEditingSessionTrickId(null);
    setAddTrickModal(false);
  }

  function handleSaveTrick() {
    if (!selectedTrickId || !id || isDuplicate) return;
    if (editingSessionTrickId) {
      updateSessionTrick(editingSessionTrickId, selectedSide, selectedPoleMode, selectedReps);
    } else {
      addSessionTrick(id, selectedTrickId, selectedSide, selectedPoleMode, selectedReps);
    }
    resetModal();
  }

  function openEditModal(st: SessionTrickWithName) {
    const trick = tricks.find((t) => t.id === st.trickId);
    setEditingSessionTrickId(st.id);
    setSelectedTrickId(st.trickId);
    setSelectedSide(st.side);
    setSelectedPoleMode(st.poleMode ?? (trick?.poleType === 'spin_only' ? 'spin' : 'static'));
    setSelectedReps(st.reps);
    setAddTrickModal(true);
  }

  const completedCount = sessionTricks.filter((st) => st.completedReps >= st.reps).length;

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
        style={styles.titleInput}
        placeholder="Add a title..."
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        onBlur={() => updateSessionTitle(session.id, title)}
        returnKeyType="done"
      />

      {/* Plan section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Plan {sessionTricks.length > 0 ? `· ${completedCount}/${sessionTricks.length} done` : ''}
        </Text>
        <TouchableOpacity onPress={() => setAddTrickModal(true)} activeOpacity={0.7}>
          <Text style={styles.addLink}>+ Add trick</Text>
        </TouchableOpacity>
      </View>

      {sessionTricks.length === 0 ? (
        <Text style={styles.empty}>No tricks planned yet. Tap "+ Add trick" to build your session.</Text>
      ) : (
        <View style={styles.trickList}>
          {sessionTricks.map((st) => (
            <View key={st.id}>
              <RepDots st={st} onUpdate={updateCompletedReps} />
              <View style={styles.removeRow}>
                <TouchableOpacity onPress={() => openEditModal(st)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Alert.alert('Remove trick', `Remove "${st.trickName}" from this session?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeSessionTrick(st.id) },
                  ])}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      <Text style={styles.sectionTitle}>Notes</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="How did it go?"
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
        onBlur={() => updateSessionNotes(session.id, notes)}
        multiline
      />

      <TouchableOpacity
        style={styles.deleteBtn}
        activeOpacity={0.7}
        onPress={() =>
          Alert.alert('Delete session', 'Delete this session? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { deleteSession(session.id); router.back(); } },
          ])
        }
      >
        <Text style={styles.deleteBtnText}>Delete Session</Text>
      </TouchableOpacity>

      {/* Add Trick Modal */}
      <Modal visible={addTrickModal} animationType="slide" onRequestClose={resetModal}>
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSessionTrickId ? 'Edit Entry' : 'Add to Plan'}</Text>
            <TouchableOpacity onPress={resetModal} activeOpacity={0.7}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {editingSessionTrickId ? (
            <Text style={styles.editingTrickName}>{selectedTrick?.name}</Text>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                placeholder="Search tricks..."
                placeholderTextColor={colors.textMuted}
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
                    onPress={() => {
                      setSelectedTrickId(item.id);
                      setSelectedSide(item.hasSides ? 'left' : 'none');
                      setSelectedPoleMode(
                        item.poleType === 'static_only' ? 'static' :
                        item.poleType === 'spin_only' ? 'spin' :
                        'static'
                      );
                    }}
                  >
                    <Text style={[styles.trickPickerName, selectedTrickId === item.id && styles.trickPickerNameActive]}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
              />
            </>
          )}

          {selectedTrickId ? (
            <>
              {selectedTrick?.hasSides ? (
                <>
                  <Text style={styles.fieldLabel}>Side</Text>
                  <View style={styles.sideRow}>
                    {availableSides.map((s) => (
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

              <Text style={styles.fieldLabel}>Pole</Text>
              {selectedTrick?.poleType === 'both' ? (
                <View style={styles.sideRow}>
                  {([{ value: 'static', label: 'Static' }, { value: 'spin', label: 'Spin' }] as const).map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      activeOpacity={0.7}
                      style={[styles.sideBtn, selectedPoleMode === p.value && styles.sideBtnActive]}
                      onPress={() => setSelectedPoleMode(p.value)}
                    >
                      <Text style={[styles.sideBtnText, selectedPoleMode === p.value && styles.sideBtnTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.sideRow}>
                  <View style={[styles.sideBtn, styles.sideBtnActive, { flex: 0, paddingHorizontal: 20 }]}>
                    <Text style={styles.sideBtnTextActive}>
                      {selectedPoleMode === 'static' ? 'Static' : 'Spin'}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.fieldLabel}>Target Reps</Text>
              <View style={styles.repsRow}>
                <TouchableOpacity style={styles.repsBtn} activeOpacity={0.6} onPress={() => setSelectedReps(r => Math.max(1, r - 1))}>
                  <Text style={styles.repsBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.repsValue}>{selectedReps}</Text>
                <TouchableOpacity style={styles.repsBtn} activeOpacity={0.6} onPress={() => setSelectedReps(r => Math.min(20, r + 1))}>
                  <Text style={styles.repsBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {isDuplicate ? (
            <Text style={styles.duplicateWarning}>Already in this session with the same side & pole.</Text>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={resetModal}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, (!selectedTrickId || isDuplicate) && styles.saveBtnDisabled]}
              onPress={handleSaveTrick}
              disabled={!selectedTrickId || isDuplicate}
            >
              <Text style={styles.saveBtnText}>{editingSessionTrickId ? 'Save' : 'Add to Plan'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const repStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  containerDone: {
    borderColor: colors.statusGotIt + '88',
    backgroundColor: colors.statusGotIt + '11',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  trickName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  trickNameDone: {
    color: colors.textMuted,
  },
  doneTag: {
    color: colors.statusGotIt,
    fontSize: 12,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.accent,
  },
  repCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

const badgeStyles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText: { color: colors.textMuted, fontSize: 16 },
  dateHeading: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  titleInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 20,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  addLink: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  empty: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  trickList: { gap: 6 },
  removeRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingVertical: 4, paddingHorizontal: 2 },
  editText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  removeText: { color: colors.textMuted, fontSize: 12 },
  editingTrickName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
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
    padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.error, alignItems: 'center',
  },
  deleteBtnText: { color: colors.error, fontWeight: '600', fontSize: 14 },
  // Modal
  modalBg: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  modalClose: { color: colors.textMuted, fontSize: 20, padding: 4 },
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
  trickPickerRow: { padding: 14 },
  trickPickerRowActive: { backgroundColor: colors.accent + '22' },
  trickPickerName: { color: colors.text, fontSize: 15 },
  trickPickerNameActive: { color: colors.accent, fontWeight: '600' },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sideRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sideBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  sideBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sideBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  sideBtnTextActive: { color: colors.bg },
  repsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 20, marginBottom: 16, alignSelf: 'flex-start',
  },
  repsBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  repsBtnText: { color: colors.accent, fontSize: 22, fontWeight: '600', lineHeight: 26 },
  repsValue: { color: colors.text, fontSize: 22, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  duplicateWarning: { color: colors.error, fontSize: 13, textAlign: 'center', marginBottom: 4 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
