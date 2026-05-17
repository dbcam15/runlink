import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { colors, spacing, radius } from '../theme';
import { RunnerAvatar } from '../components/RunnerAvatar';
import { useRoom } from '../hooks/useRoom';
import { useLocation } from '../hooks/useLocation';
import { useTranscription } from '../hooks/useTranscription';
import { useMicrophone } from '../hooks/useMicrophone';
import { useVAD } from '../hooks/useVAD';
import { useWebRTC } from '../hooks/useWebRTC';
import { saveRun } from '../storage/runs';
import { getSocket } from '../services/socket';
import {
  hasClientId, getStoredToken, initiateSpotifyAuth,
  initPlayer, duckVolume, restoreVolume,
} from '../services/spotify';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Running'>;

function formatPace(s: number) {
  if (!s) return '--:--';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function Running({ route, navigation }: Props) {
  const { name, code, startedAt } = route.params;
  const { room, myId, emitSpeaking, emitTranscript, endRun } = useRoom();

  const [elapsed, setElapsed] = useState(Date.now() - startedAt);
  const [transcript, setTranscript] = useState<Array<{ runnerName: string; text: string; timestamp: number }>>([]);
  const [spotifyPlayer, setSpotifyPlayer] = useState<Spotify.Player | null>(null);
  const [spotifyTrack, setSpotifyTrack] = useState<string | null>(null);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const spotifyPlayerRef = useRef<Spotify.Player | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const runnerIds = room?.runners.map(r => r.id) ?? [];

  // Microphone + WebRTC + VAD (web-first, native gets mic via Voice)
  const { stream: localStream } = useMicrophone(Platform.OS === 'web');

  useVAD(localStream, useCallback((speaking: boolean) => {
    emitSpeaking(speaking);
  }, [emitSpeaking]));

  useWebRTC(
    Platform.OS === 'web',
    myId,
    runnerIds.filter(id => id !== myId),
    localStream,
    useCallback((runnerId: string, stream: MediaStream) => {
      // Play remote audio through a hidden audio element
      const existing = document.getElementById(`audio-${runnerId}`) as HTMLAudioElement;
      const el = existing ?? document.createElement('audio');
      el.id = `audio-${runnerId}`;
      el.autoplay = true;
      el.srcObject = stream;
      if (!existing) document.body.appendChild(el);
    }, []),
  );

  // Transcription
  useTranscription(true, useCallback((text: string) => {
    const entry = { runnerName: name, text, timestamp: Date.now() };
    setTranscript(prev => [...prev, entry]);
    emitTranscript(text);
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [name, emitTranscript]));

  // Incoming transcript from peers
  useEffect(() => {
    const socket = getSocket();
    socket.on('new_transcript_entry', (entry: { runnerName: string; text: string; timestamp: number }) => {
      setTranscript(prev => [...prev, entry]);
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => { socket.off('new_transcript_entry'); };
  }, []);

  // Duck/unduck Spotify when any peer speaks
  useEffect(() => {
    const player = spotifyPlayerRef.current;
    if (!player) return;
    const anyoneSpeaking = room?.runners.some(r => r.id !== myId && r.speaking);
    if (anyoneSpeaking) { duckVolume(player); } else { restoreVolume(player); }
  }, [room?.runners, myId]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // GPS stats
  const stats = useLocation(true);

  // Spotify OAuth callback (token in sessionStorage after redirect)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const token = getStoredToken();
    if (token && !spotifyPlayer) connectSpotify(token);
  }, []);

  async function connectSpotify(existingToken?: string) {
    if (!hasClientId()) {
      Alert.alert('Spotify not configured', 'Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID in Vercel env vars.');
      return;
    }
    const token = existingToken ?? getStoredToken();
    if (!token) { initiateSpotifyAuth(); return; }

    setSpotifyConnecting(true);
    try {
      const player = await initPlayer(token);
      spotifyPlayerRef.current = player;
      setSpotifyPlayer(player);

      player.addListener('player_state_changed', (state: any) => {
        const track = state?.track_window?.current_track;
        if (track) setSpotifyTrack(`${track.name} — ${track.artists[0]?.name}`);
      });
    } catch (e) {
      console.warn('Spotify init failed', e);
    }
    setSpotifyConnecting(false);
  }

  function handleEndRun() {
    Alert.alert('End Run?', 'This will finish the run for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Run', style: 'destructive',
        onPress: () => {
          spotifyPlayerRef.current?.disconnect();
          // Clean up audio elements
          if (Platform.OS === 'web') {
            document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove());
          }
          endRun();
          try {
            saveRun({
              id: `${code}-${startedAt}`,
              date: startedAt,
              durationMs: elapsed,
              distanceMeters: stats.distanceMeters,
              participants: room?.runners.map(r => r.name) ?? [name],
              transcript,
            });
          } catch (e) { console.warn('saveRun failed', e); }
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
      {/* Runner avatars */}
      <View style={styles.runnersBar}>
        {room?.runners.map(r => (
          <View key={r.id} style={styles.miniRunner}>
            <RunnerAvatar name={r.name} speaking={r.speaking} ready size={40} />
            <Text style={styles.miniName}>{r.name.split(' ')[0]}</Text>
          </View>
        ))}
      </View>

      {/* Stats */}
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

      {/* Spotify */}
      {Platform.OS === 'web' && (
        <TouchableOpacity
          style={styles.spotifyRow}
          onPress={() => connectSpotify()}
          activeOpacity={spotifyPlayer ? 1 : 0.7}
          disabled={!!spotifyPlayer || spotifyConnecting}
        >
          <Text style={styles.spotifyIcon}>♪</Text>
          <Text style={styles.spotifyText} numberOfLines={1}>
            {spotifyConnecting
              ? 'connecting...'
              : spotifyTrack
              ? spotifyTrack
              : spotifyPlayer
              ? 'spotify connected'
              : 'connect spotify'}
          </Text>
          {room?.runners.some(r => r.id !== myId && r.speaking) && spotifyPlayer && (
            <Text style={styles.duckedBadge}>ducked</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Transcript */}
      <View style={styles.transcriptHeader}>
        <Text style={styles.transcriptLabel}>CHAT</Text>
        {localStream && <Text style={styles.micOn}>● mic on</Text>}
      </View>
      <ScrollView ref={scrollRef} style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
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
    flexDirection: 'row', gap: spacing.lg,
    paddingHorizontal: spacing.xl, paddingTop: 70, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  miniRunner: { alignItems: 'center', gap: 4 },
  miniName: { color: colors.textMuted, fontSize: 10 },
  statsBlock: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, alignItems: 'center' },
  timer: { color: colors.text, fontSize: 52, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  stat: { alignItems: 'center' },
  statVal: { color: colors.accent, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  spotifyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  spotifyIcon: { color: '#1DB954', fontSize: 16, fontWeight: '700' },
  spotifyText: { color: colors.textMuted, fontSize: 13, flex: 1 },
  duckedBadge: {
    color: colors.bg, backgroundColor: colors.accent,
    fontSize: 10, fontWeight: '700', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, letterSpacing: 1,
  },
  transcriptHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  transcriptLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 3, fontWeight: '600' },
  micOn: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  transcript: { flex: 1 },
  transcriptContent: { padding: spacing.xl, gap: spacing.md },
  noChat: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.xl },
  entry: { gap: 2 },
  entryName: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  entryText: { color: colors.text, fontSize: 15 },
  endBtn: {
    margin: spacing.xl, marginBottom: 40, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center',
  },
  endBtnText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
