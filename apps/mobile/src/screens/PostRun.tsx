import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'PostRun'>;

function formatPace(distM: number, durMs: number): string {
  if (distM < 10) return '--:--';
  const secPerKm = (durMs / 1000) / (distM / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')} /km`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export function PostRun({ route, navigation }: Props) {
  const { durationMs, distanceMeters, participants, transcript } = route.params;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>RUN SUMMARY</Text>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{(distanceMeters / 1000).toFixed(2)}</Text>
            <Text style={styles.statUnit}>km</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{formatDuration(durationMs)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{formatPace(distanceMeters, durationMs)}</Text>
          </View>
          <View style={styles.crewRow}>
            <Text style={styles.crewLabel}>crew</Text>
            <Text style={styles.crewNames}>{participants.join(', ')}</Text>
          </View>
        </View>

        {transcript.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: spacing.xl }]}>CHAT LOG</Text>
            <View style={styles.transcriptCard}>
              {transcript.map((e, i) => (
                <View key={i} style={styles.entry}>
                  <Text style={styles.entryName}>{e.runnerName}</Text>
                  <Text style={styles.entryText}>{e.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.popToTop()}
        activeOpacity={0.8}
      >
        <Text style={styles.doneBtnText}>done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: 80, gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 11, letterSpacing: 4, fontWeight: '600' },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  statVal: { color: colors.text, fontSize: 32, fontWeight: '700' },
  statUnit: { color: colors.textMuted, fontSize: 16 },
  crewRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  crewLabel: { color: colors.textMuted, fontSize: 12 },
  crewNames: { color: colors.text, fontSize: 12, fontWeight: '600', flex: 1 },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entry: { gap: 2 },
  entryName: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  entryText: { color: colors.text, fontSize: 14 },
  doneBtn: {
    margin: spacing.xl,
    marginBottom: 40,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  doneBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});
