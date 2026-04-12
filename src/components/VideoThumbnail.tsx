import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { colors } from '../constants/colors';
import type { Video as VideoType } from '../types';

interface Props {
  video: VideoType;
  onRemove?: () => void;
  onNotesChange?: (notes: string) => void;
}

export function VideoThumbnail({ video, onRemove, onNotesChange }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const videoRef = useRef<Video>(null);

  return (
    <>
      <Pressable style={styles.thumb} onPress={() => setModalVisible(true)}>
        <Video
          ref={videoRef}
          source={{ uri: video.localUri }}
          style={styles.thumbVideo}
          resizeMode={ResizeMode.COVER}
          isMuted
          shouldPlay={false}
        />
        <View style={styles.overlay}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
        {video.notes ? (
          <View style={styles.notesBadge}>
            <Text style={styles.notesText} numberOfLines={1}>
              {video.notes}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <Video
            source={{ uri: video.localUri }}
            style={styles.fullVideo}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
          />
          <View style={styles.modalContent}>
            <TextInput
              style={styles.notesInput}
              value={video.notes ?? ''}
              onChangeText={onNotesChange}
              placeholder="Add notes..."
              placeholderTextColor={colors.textDim}
              multiline
            />
            {onRemove ? (
              <Pressable
                style={styles.removeBtn}
                onPress={() => {
                  setModalVisible(false);
                  onRemove();
                }}
              >
                <Text style={styles.removeBtnText}>Remove Video</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbVideo: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: {
    fontSize: 24,
    color: colors.text,
  },
  notesBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
  },
  notesText: {
    color: colors.text,
    fontSize: 10,
  },
  modalBg: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fullVideo: {
    width: '100%',
    aspectRatio: 9 / 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
    gap: 12,
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
  removeBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  removeBtnText: {
    color: colors.error,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
});
