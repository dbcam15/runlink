import { io, Socket } from 'socket.io-client';

// When testing locally with Expo Go on a real device, use your Mac's local IP (not localhost)
const LOCAL_IP = '192.168.99.78';
const SERVER_URL = __DEV__ ? `http://${LOCAL_IP}:3001` : 'https://runlink-server.fly.dev';

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
