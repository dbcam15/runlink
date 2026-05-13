import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

interface Runner {
  id: string;
  name: string;
  socketId: string;
  speaking: boolean;
  ready: boolean;
}

interface TranscriptEntry {
  runnerId: string;
  runnerName: string;
  text: string;
  timestamp: number;
}

interface Room {
  code: string;
  runners: Map<string, Runner>;
  runStartedAt: number | null;
  transcript: TranscriptEntry[];
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function roomPublic(room: Room) {
  return {
    code: room.code,
    runners: Array.from(room.runners.values()).map(r => ({
      id: r.id,
      name: r.name,
      speaking: r.speaking,
      ready: r.ready,
    })),
    runStartedAt: room.runStartedAt,
    transcript: room.transcript,
  };
}

io.on('connection', socket => {
  let currentRoomCode: string | null = null;
  let runnerId: string | null = null;

  socket.on('create_room', ({ name }: { name: string }, cb: Function) => {
    const code = generateCode();
    runnerId = uuid();
    currentRoomCode = code;

    const runner: Runner = { id: runnerId, name, socketId: socket.id, speaking: false, ready: false };
    const room: Room = { code, runners: new Map([[runnerId, runner]]), runStartedAt: null, transcript: [] };
    rooms.set(code, room);

    socket.join(code);
    cb({ ok: true, code, runnerId, room: roomPublic(room) });
    console.log(`Room ${code} created by ${name}`);
  });

  socket.on('join_room', ({ code, name }: { code: string; name: string }, cb: Function) => {
    const room = rooms.get(code.toUpperCase());
    if (!room) return cb({ ok: false, error: 'Room not found' });

    runnerId = uuid();
    currentRoomCode = code.toUpperCase();

    const runner: Runner = { id: runnerId, name, socketId: socket.id, speaking: false, ready: false };
    room.runners.set(runnerId, runner);

    socket.join(currentRoomCode);
    cb({ ok: true, runnerId, room: roomPublic(room) });

    socket.to(currentRoomCode).emit('runner_joined', {
      runner: { id: runnerId, name, speaking: false, ready: false },
    });
    console.log(`${name} joined room ${code}`);
  });

  socket.on('set_ready', ({ ready }: { ready: boolean }) => {
    if (!currentRoomCode || !runnerId) return;
    const room = rooms.get(currentRoomCode);
    const runner = room?.runners.get(runnerId);
    if (!runner || !room) return;

    runner.ready = ready;
    io.to(currentRoomCode).emit('runner_updated', { runnerId, ready });

    const allReady = Array.from(room.runners.values()).every(r => r.ready);
    if (allReady && room.runners.size > 1) {
      room.runStartedAt = Date.now();
      io.to(currentRoomCode).emit('run_started', { startedAt: room.runStartedAt });
    }
  });

  // WebRTC signaling
  socket.on('signal', ({ to, signal }: { to: string; signal: unknown }) => {
    if (!currentRoomCode || !runnerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const target = Array.from(room.runners.values()).find(r => r.id === to);
    if (target) {
      io.to(target.socketId).emit('signal', { from: runnerId, signal });
    }
  });

  socket.on('speaking', ({ speaking }: { speaking: boolean }) => {
    if (!currentRoomCode || !runnerId) return;
    const room = rooms.get(currentRoomCode);
    const runner = room?.runners.get(runnerId);
    if (!runner || !room) return;

    runner.speaking = speaking;
    socket.to(currentRoomCode).emit('runner_speaking', { runnerId, speaking });
  });

  socket.on('transcript_entry', ({ text }: { text: string }) => {
    if (!currentRoomCode || !runnerId) return;
    const room = rooms.get(currentRoomCode);
    const runner = room?.runners.get(runnerId);
    if (!runner || !room) return;

    const entry: TranscriptEntry = {
      runnerId,
      runnerName: runner.name,
      text,
      timestamp: Date.now(),
    };
    room.transcript.push(entry);
    io.to(currentRoomCode).emit('new_transcript_entry', entry);
  });

  socket.on('end_run', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    io.to(currentRoomCode).emit('run_ended', { transcript: room.transcript });
  });

  socket.on('disconnect', () => {
    if (!currentRoomCode || !runnerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.runners.delete(runnerId);
    socket.to(currentRoomCode).emit('runner_left', { runnerId });

    if (room.runners.size === 0) {
      rooms.delete(currentRoomCode);
      console.log(`Room ${currentRoomCode} cleaned up`);
    }
  });
});

app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`RunLink server on :${PORT}`));
