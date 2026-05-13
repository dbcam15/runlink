import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Share,
} from 'react-native';
import { colors, spacing, radius } from '../theme';
import { RunnerAvatar } from '../components/RunnerAvatar';
import { useRoom } from '../hooks/useRoom';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

export function Lobby({ route, navigation }: Props) {
  const { name, code } = route.params;
  const { room, myId, setReady } = useRoom();

  const me = room?.runners.find(r => r.id === myId);
  const others = room?.runners.filter(r => r.id !== myId) ?? [];
  const allReady = (room?.runners.length ?? 0) > 0 && room?.runners.every(r => r.ready);

  useEffect(() => {
    if (room?.runStartedAt) {
      navigation.replace('Running', { name, code, startedAt: room.runStartedAt });
    }
  }, [room?.runStartedAt, navigation, name, code]);

  function shareCode() {
    Share.share({ message: `join my RunLink run! code: ${code}` });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.label}>LOBBY</Text>
        <TouchableOpacity onPress={shareCode} style={styles.codeBox}>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.shareHint}>tap to share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.runnersGrid}>
        {room?.runners.map(runner => (
          <View key={runner.id} style={styles.runnerCard}>
            <RunnerAvatar
              name={runner.name}
              speaking={runner.speaking}
              ready={runner.ready}
              size={64}
            />
            <Text style={styles.runnerName}>{runner.name}</Text>
            <Text style={styles.runnerStatus}>
              {runner.ready ? '✓ ready' : 'waiting...'}
            </Text>
          </View>
        ))}
      </ScrollView>

      {others.length === 0 && !me?.ready && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingText}>tap ready to start solo or share the code to invite others</Text>
        </View>
      )}

      <View style={styles.footer}>
        {allReady
          ? <Text style={styles.startingSoon}>starting...</Text>
          : (
            <TouchableOpacity
              style={[styles.readyBtn, me?.ready && styles.readyBtnActive]}
              onPress={() => setReady(!me?.ready)}
              activeOpacity={0.8}
            >
              <Text style={[styles.readyBtnText, me?.ready && styles.readyBtnTextActive]}>
                {me?.ready ? 'i\'m ready ✓' : 'i\'m ready'}
              </Text>
            </TouchableOpacity>
          )
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 70,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: 11, letterSpacing: 4, fontWeight: '600' },
  codeBox: { alignItems: 'center' },
  code: { color: colors.accent, fontSize: 42, fontWeight: '800', letterSpacing: 10 },
  shareHint: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  runnersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  runnerCard: { alignItems: 'center', gap: spacing.sm, width: 90 },
  runnerName: { color: colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  runnerStatus: { color: colors.textMuted, fontSize: 11 },
  waitingBanner: { alignItems: 'center', padding: spacing.lg },
  waitingText: { color: colors.textMuted, fontSize: 13, letterSpacing: 1 },
  footer: {
    padding: spacing.xl,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  readyBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  readyBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}18` },
  readyBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 16 },
  readyBtnTextActive: { color: colors.accent },
  startingSoon: { color: colors.accent, fontWeight: '700', fontSize: 18, textAlign: 'center', letterSpacing: 2 },
});
