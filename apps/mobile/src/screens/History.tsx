import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { getRuns, SavedRun } from '../storage/runs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPace(distM: number, durMs: number): string {
  if (distM < 10) return '--:--';
  const secPerKm = (durMs / 1000) / (distM / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function History({ navigation }: Props) {
  const [runs, setRuns] = useState<SavedRun[]>([]);

  useEffect(() => {
    setRuns(getRuns());
  }, []);

  function goToRun(run: SavedRun) {
    navigation.navigate('PostRun', {
      durationMs: run.durationMs,
      distanceMeters: run.distanceMeters,
      participants: run.participants,
      transcript: run.transcript,
    });
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>history</Text>

      {runs.length === 0
        ? <Text style={styles.empty}>no runs yet — get moving</Text>
        : (
          <FlatList
            data={runs}
            keyExtractor={r => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => goToRun(item)} activeOpacity={0.7}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                  <Text style={styles.cardCrew}>{item.participants.join(', ')}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardDist}>{(item.distanceMeters / 1000).toFixed(2)} km</Text>
                  <Text style={styles.cardPace}>{formatPace(item.distanceMeters, item.durationMs)} /km</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 80 },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: 14,
    letterSpacing: 1,
  },
  list: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLeft: { gap: 3 },
  cardDate: { color: colors.text, fontWeight: '600', fontSize: 15 },
  cardCrew: { color: colors.textMuted, fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  cardDist: { color: colors.accent, fontWeight: '700', fontSize: 18 },
  cardPace: { color: colors.textMuted, fontSize: 12 },
});
