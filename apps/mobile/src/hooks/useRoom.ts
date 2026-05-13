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

// module-level cache so state survives navigation between screens
let _room: RoomState | null = null;
let _myId: string | null = null;
const _listeners = new Set<() => void>();

function setGlobalRoom(updater: (prev: RoomState | null) => RoomState | null) {
  _room = updater(_room);
  _listeners.forEach(fn => fn());
}

function setGlobalMyId(id: string) {
  _myId = id;
}

export function useRoom() {
  const [room, setRoom] = useState<RoomState | null>(_room);
  const [myId, setMyId] = useState<string | null>(_myId);

  // sync local state when global cache changes
  useEffect(() => {
    const sync = () => {
      setRoom(_room);
      setMyId(_myId);
    };
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('runner_joined', ({ runner }: { runner: RunnerState }) => {
      setGlobalRoom(prev => prev ? { ...prev, runners: [...prev.runners, runner] } : prev);
    });

    socket.on('runner_left', ({ runnerId }: { runnerId: string }) => {
      setGlobalRoom(prev => prev
        ? { ...prev, runners: prev.runners.filter(r => r.id !== runnerId) }
        : prev);
    });

    socket.on('runner_updated', ({ runnerId, ready }: { runnerId: string; ready: boolean }) => {
      setGlobalRoom(prev => prev
        ? { ...prev, runners: prev.runners.map(r => r.id === runnerId ? { ...r, ready } : r) }
        : prev);
    });

    socket.on('runner_speaking', ({ runnerId, speaking }: { runnerId: string; speaking: boolean }) => {
      setGlobalRoom(prev => prev
        ? { ...prev, runners: prev.runners.map(r => r.id === runnerId ? { ...r, speaking } : r) }
        : prev);
    });

    socket.on('run_started', ({ startedAt }: { startedAt: number }) => {
      setGlobalRoom(prev => prev ? { ...prev, runStartedAt: startedAt } : prev);
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
        setGlobalMyId(res.runnerId);
        setMyId(res.runnerId);
        setGlobalRoom(() => res.room);
        resolve(res.code);
      });
    });
  }, []);

  const joinRoom = useCallback((code: string, name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('join_room', { code, name }, (res: { ok: boolean; runnerId: string; room: RoomState; error?: string }) => {
        if (!res.ok) return reject(res.error ?? 'Failed to join');
        setGlobalMyId(res.runnerId);
        setMyId(res.runnerId);
        setGlobalRoom(() => res.room);
        resolve();
      });
    });
  }, []);

  const setReady = useCallback((ready: boolean) => {
    getSocket().emit('set_ready', { ready });
    setGlobalRoom(prev => prev
      ? { ...prev, runners: prev.runners.map(r => r.id === _myId ? { ...r, ready } : r) }
      : prev);
  }, []);

  const emitSpeaking = useCallback((speaking: boolean) => {
    getSocket().emit('speaking', { speaking });
    setGlobalRoom(prev => prev
      ? { ...prev, runners: prev.runners.map(r => r.id === _myId ? { ...r, speaking } : r) }
      : prev);
  }, []);

  const emitTranscript = useCallback((text: string) => {
    getSocket().emit('transcript_entry', { text });
  }, []);

  const endRun = useCallback(() => {
    getSocket().emit('end_run');
    setGlobalRoom(() => null);
    _myId = null;
  }, []);

  return { room, myId, createRoom, joinRoom, setReady, emitSpeaking, emitTranscript, endRun };
}
