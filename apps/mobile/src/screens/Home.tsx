import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { colors, spacing, radius } from '../theme';
import { useRoom } from '../hooks/useRoom';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function Home({ route, navigation }: Props) {
  const { name } = route.params;
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const { createRoom, joinRoom } = useRoom();

  async function handleCreate() {
    try {
      const code = await createRoom(name);
      navigation.navigate('Lobby', { name, code });
    } catch (e) {
      Alert.alert('Error', 'Could not create room');
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    setJoining(true);
    try {
      await joinRoom(code, name);
      navigation.navigate('Lobby', { name, code });
    } catch (e: any) {
      Alert.alert('Room not found', e?.message ?? 'Check the code and try again');
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.logo}>RUNLINK</Text>
        <Text style={styles.greeting}>hey, {name}</Text>
      </View>

      <View style={styles.body}>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Text style={styles.createLabel}>start a run</Text>
          <Text style={styles.createSub}>create a new lobby</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>join a run</Text>
        <TextInput
          style={styles.input}
          placeholder="room code"
          placeholderTextColor={colors.textMuted}
          value={joinCode}
          onChangeText={t => setJoinCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={handleJoin}
        />
        <TouchableOpacity
          style={[styles.joinBtn, (!joinCode.trim() || joining) && styles.btnDisabled]}
          onPress={handleJoin}
          disabled={!joinCode.trim() || joining}
          activeOpacity={0.8}
        >
          <Text style={styles.joinBtnText}>{joining ? 'joining...' : 'join'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 4, marginBottom: 4 },
  greeting: { color: colors.text, fontSize: 28, fontWeight: '700' },
  body: { padding: spacing.xl, gap: spacing.md },
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  createLabel: { color: colors.bg, fontSize: 20, fontWeight: '800' },
  createSub: { color: colors.bg, opacity: 0.6, fontSize: 13, marginTop: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 12, letterSpacing: 2, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 22,
    letterSpacing: 4,
    fontWeight: '700',
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  joinBtnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
});
