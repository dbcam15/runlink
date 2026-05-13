import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  name: string;
  speaking: boolean;
  ready: boolean;
  size?: number;
}

export function RunnerAvatar({ name, speaking, ready, size = 56 }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (speaking) {
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.18, duration: 300, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      );
      anim.current.start();
    } else {
      anim.current?.stop();
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [speaking, pulse]);

  const initials = name.slice(0, 2).toUpperCase();
  const ringColor = speaking ? colors.speaking : ready ? colors.accentDim : colors.border;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.ring,
          { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderColor: ringColor, transform: [{ scale: pulse }] },
        ]}
      >
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      </Animated.View>
      {speaking && (
        <View style={styles.speakingDot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text,
    fontWeight: '600',
    letterSpacing: 1,
  },
  speakingDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.speaking,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
