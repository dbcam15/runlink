import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';

export interface RunnerState {
  id: string;
  name: string;
  speaking: boolean;
  ready: boolean;
}

export interface RoomState {
  code: string;
  runners: RunnerState[];
  runStartedAt: number | null;
}

export function useRoom() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('runner_joined', ({ runner }: { runner: RunnerState }) => {
      setRoom(prev => prev ? { ...prev, runners: [...prev.runners, runner] } : prev);
    });

    socket.on('runner_left', ({ runnerId }: { runnerId: string }) => {
      setRoom(prev => prev
        ? { ...prev, runners: prev.runners.filter(r => r.id !== runnerId) }
        : prev,
      );
    });

    socket.on('runner_updated', ({ runnerId, ready }: { runnerId: string; ready: boolean }) => {
      setRoom(prev => prev
        ? { ...prev, runners: prev.runners.map(r => r.id === runnerId ? { ...r, ready } : r) }
        : prev,
      );
    });

    socket.on('runner_speaking', ({ runnerId, speaking }: { runnerId: string; speaking: boolean }) => {
      setRoom(prev => prev
        ? { ...prev, runners: prev.runners.map(r => r.id === runnerId ? { ...r, speaking } : r) }
        : prev,
      );
    });

    socket.on('run_started', ({ startedAt }: { startedAt: number }) => {
      setRoom(prev => prev ? { ...prev, runStartedAt: startedAt } : prev);
    });

    return () => {
      socket.off('runner_joined');
      socket.off('runner_left');
      socket.off('runner_updated');
      socket.off('runner_speaking');
      socket.off('run_started');
    };
  }, []);

  const createRoom = useCallback((name: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('create_room', { name }, (res: { ok: boolean; code: string; runnerId: string; room: RoomState; error?: string }) => {
        if (!res.ok) return reject(res.error);
        setMyId(res.runnerId);
        setRoom(res.room);
        resolve(res.code);
      });
    });
  }, []);

  const joinRoom = useCallback((code: string, name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('join_room', { code, name }, (res: { ok: boolean; runnerId: string; room: RoomState; error?: string }) => {
        if (!res.ok) return reject(res.error ?? 'Failed to join');
        setMyId(res.runnerId);
        setRoom(res.room);
        resolve();
      });
    });
  }, []);

  const setReady = useCallback((ready: boolean) => {
    getSocket().emit('set_ready', { ready });
    setRoom(prev => prev
      ? { ...prev, runners: prev.runners.map(r => r.id === myId ? { ...r, ready } : r) }
      : prev,
    );
  }, [myId]);

  const emitSpeaking = useCallback((speaking: boolean) => {
    getSocket().emit('speaking', { speaking });
    setRoom(prev => prev
      ? { ...prev, runners: prev.runners.map(r => r.id === myId ? { ...r, speaking } : r) }
      : prev,
    );
  }, [myId]);

  const emitTranscript = useCallback((text: string) => {
    getSocket().emit('transcript_entry', { text });
  }, []);

  const endRun = useCallback(() => {
    getSocket().emit('end_run');
  }, []);

  return { room, myId, error, createRoom, joinRoom, setReady, emitSpeaking, emitTranscript, endRun };
}
