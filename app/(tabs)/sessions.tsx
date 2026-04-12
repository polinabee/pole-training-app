import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionsStore } from '../../src/stores/sessionsStore';
import { CalendarPicker } from '../../src/components/CalendarPicker';
import { colors } from '../../src/constants/colors';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionsScreen() {
  const router = useRouter();
  const sessions = useSessionsStore((s) => s.sessions);
  const sessionTricks = useSessionsStore((s) => s.sessionTricks);
  const createSession = useSessionsStore((s) => s.createSession);
  const deleteSession = useSessionsStore((s) => s.deleteSession);

  const [modalVisible, setModalVisible] = useState(false);
  const [pickedDate, setPickedDate] = useState(todayISO);
  const [title, setTitle] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  function openModal() {
    setPickedDate(todayISO());
    setTitle('');
    setShowCalendar(false);
    setModalVisible(true);
  }

  function handleCreate() {
    const id = createSession(pickedDate, title.trim() || undefined);
    setModalVisible(false);
    router.push(`/session/${id}`);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySub}>Tap "New Session" to log your first practice.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const count = sessionTricks.filter((st) => st.sessionId === item.id).length;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push(`/session/${item.id}`)}
              onLongPress={() => deleteSession(item.id)}
            >
              <View style={styles.cardMain}>
                <View style={styles.cardLeft}>
                  {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
                  <Text style={[styles.date, item.title && styles.dateSub]}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.count}>{count} trick{count !== 1 ? 's' : ''}</Text>
              </View>
              {item.notes ? (
                <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={openModal}>
        <Text style={styles.fabText}>+ New Session</Text>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <ScrollView
            style={styles.modalSheet}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>New Session</Text>

            <Text style={styles.fieldLabel}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Inversions day"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>Date</Text>
            <Pressable style={styles.datePressable} onPress={() => setShowCalendar((v) => !v)}>
              <Text style={styles.dateValue}>{formatDate(pickedDate)}</Text>
              <Text style={styles.chevron}>{showCalendar ? '▲' : '▼'}</Text>
            </Pressable>

            {showCalendar ? (
              <CalendarPicker
                value={pickedDate}
                onChange={(d) => { setPickedDate(d); setShowCalendar(false); }}
              />
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.createBtn} onPress={handleCreate}>
                <Text style={styles.createBtnText}>Create</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  date: { color: colors.text, fontSize: 15, fontWeight: '500' },
  dateSub: { color: colors.textMuted, fontSize: 13, fontWeight: '400' },
  count: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  notes: { color: colors.textMuted, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalContent: { padding: 24, gap: 12 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePressable: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateValue: { color: colors.text, fontSize: 15 },
  chevron: { color: colors.textMuted, fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  createBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center' },
  createBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
