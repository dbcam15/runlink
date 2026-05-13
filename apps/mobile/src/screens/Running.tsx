import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { colors, spacing, radius } from '../theme';
import { RunnerAvatar } from '../components/RunnerAvatar';
import { useRoom } from '../hooks/useRoom';
import { useLocation } from '../hooks/useLocation';
import { useTranscription } from '../hooks/useTranscription';
import { saveRun } from '../storage/runs';
import { getSocket } from '../services/socket';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Running'>;

function formatPace(secPerKm: number): string {
  if (!secPerKm) return '--:--';
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function Running({ route, navigation }: Props) {
  const { name, code, startedAt } = route.params;
  const { room, myId, emitSpeaking, emitTranscript, endRun } = useRoom();
  const [elapsed, setElapsed] = useState(Date.now() - startedAt);
  const [transcript, setTranscript] = useState<Array<{ runnerName: string; text: string; timestamp: number }>>([]);
  const stats = useLocation(true);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // incoming transcript from other runners
  useEffect(() => {
    const socket = getSocket();
    socket.on('new_transcript_entry', (entry: { runnerName: string; text: string; timestamp: number }) => {
      setTranscript(prev => [...prev, entry]);
    });
    return () => socket.off('new_transcript_entry');
  }, []);

  useTranscription(true, text => {
    const entry = { runnerName: name, text, timestamp: Date.now() };
    setTranscript(prev => [...prev, entry]);
    emitTranscript(text);
  });

  async function handleEndRun() {
    Alert.alert('End Run?', 'This will finish the run for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Run',
        style: 'destructive',
        onPress: () => {
          endRun();
          saveRun({
            id: `${code}-${startedAt}`,
            date: startedAt,
            durationMs: elapsed,
            distanceMeters: stats.distanceMeters,
            participants: room?.runners.map(r => r.name) ?? [name],
            transcript,
          });
          navigation.replace('PostRun', {
            durationMs: elapsed,
            distanceMeters: stats.distanceMeters,
            participants: room?.runners.map(r => r.name) ?? [name],
            transcript,
          });
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      {/* runners strip */}
      <View style={styles.runnersBar}>
        {room?.runners.map(r => (
          <View key={r.id} style={styles.miniRunner}>
            <RunnerAvatar name={r.name} speaking={r.speaking} ready size={36} />
            <Text style={styles.miniName}>{r.name.split(' ')[0]}</Text>
          </View>
        ))}
      </View>

      {/* stats */}
      <View style={styles.statsBlock}>
        <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatDist(stats.distanceMeters)}</Text>
            <Text style={styles.statLabel}>distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatPace(stats.paceSecPerKm)}</Text>
            <Text style={styles.statLabel}>/ km</Text>
          </View>
        </View>
      </View>

      {/* transcript */}
      <View style={styles.transcriptHeader}>
        <Text style={styles.transcriptLabel}>CHAT</Text>
      </View>
      <ScrollView
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
      >
        {transcript.length === 0
          ? <Text style={styles.noChat}>conversation will appear here</Text>
          : transcript.map((e, i) => (
            <View key={i} style={styles.entry}>
              <Text style={styles.entryName}>{e.runnerName}</Text>
              <Text style={styles.entryText}>{e.text}</Text>
            </View>
          ))
        }
      </ScrollView>

      <TouchableOpacity style={styles.endBtn} onPress={handleEndRun} activeOpacity={0.8}>
        <Text style={styles.endBtnText}>end run</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  runnersBar: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: 70,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  miniRunner: { alignItems: 'center', gap: 4 },
  miniName: { color: colors.textMuted, fontSize: 10 },
  statsBlock: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, alignItems: 'center' },
  timer: { color: colors.text, fontSize: 54, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  stat: { alignItems: 'center' },
  statVal: { color: colors.accent, fontSize: 24, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  transcriptHeader: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transcriptLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 3, fontWeight: '600' },
  transcript: { flex: 1 },
  transcriptContent: { padding: spacing.xl, gap: spacing.md },
  noChat: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.xl },
  entry: { gap: 2 },
  entryName: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  entryText: { color: colors.text, fontSize: 15 },
  endBtn: {
    margin: spacing.xl,
    marginBottom: 40,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  endBtnText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
