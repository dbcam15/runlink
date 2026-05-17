import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

// Web uses localhost; mobile Expo Go needs the Mac's LAN IP
const LOCAL_IP = '192.168.99.78';
const LOCAL_URL = Platform.OS === 'web' ? 'http://localhost:3001' : `http://${LOCAL_IP}:3001`;
// Use live server when on web-prod or when not in local dev
const SERVER_URL = (typeof window !== 'undefined' && !window.location?.hostname?.includes('localhost'))
  ? 'https://runlink-server.fly.dev'
  : (__DEV__ ? LOCAL_URL : 'https://runlink-server.fly.dev');

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
