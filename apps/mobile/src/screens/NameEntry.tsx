import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'NameEntry'>;

export function NameEntry({ navigation }: Props) {
  const [name, setName] = useState('');

  async function proceed() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem('runlink_name', trimmed);
    navigation.replace('Home', { name: trimmed });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.logo}>RUNLINK</Text>
        <Text style={styles.sub}>run together</Text>

        <TextInput
          style={styles.input}
          placeholder="your name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={proceed}
          maxLength={20}
        />

        <TouchableOpacity
          style={[styles.btn, !name.trim() && styles.btnDisabled]}
          onPress={proceed}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>let's go</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  logo: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: spacing.xs,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 18,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: colors.bg, fontWeight: '700', fontSize: 16, letterSpacing: 1 },
});
