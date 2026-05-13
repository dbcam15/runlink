import { io, Socket } from 'socket.io-client';

const SERVER_URL = __DEV__ ? 'http://localhost:3001' : 'https://runlink-server.fly.dev';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { transports: ['websocket'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
