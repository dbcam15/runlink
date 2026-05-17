import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC(
  active: boolean,
  myId: string | null,
  initialRunnerIds: string[],
  localStream: MediaStream | null,
  onRemoteStream: (runnerId: string, stream: MediaStream) => void,
) {
  const onRemoteRef = useRef(onRemoteStream);
  onRemoteRef.current = onRemoteStream;

  useEffect(() => {
    if (!active || !myId || !localStream || typeof RTCPeerConnection === 'undefined') return;

    const socket = getSocket();
    const pcs = new Map<string, RTCPeerConnection>();
    const remoteStreams = new Map<string, MediaStream>();

    function getOrCreate(remoteId: string): RTCPeerConnection {
      if (pcs.has(remoteId)) return pcs.get(remoteId)!;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcs.set(remoteId, pc);

      // Add local audio tracks
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      // Receive remote audio
      pc.ontrack = e => {
        let rs = remoteStreams.get(remoteId);
        if (!rs) { rs = new MediaStream(); remoteStreams.set(remoteId, rs); }
        e.streams[0]?.getTracks().forEach(t => {
          if (!rs!.getTracks().includes(t)) rs!.addTrack(t);
        });
        onRemoteRef.current(remoteId, rs);
      };

      // ICE
      pc.onicecandidate = e => {
        if (e.candidate) socket.emit('signal', { to: remoteId, signal: { candidate: e.candidate } });
      };

      return pc;
    }

    async function createOffer(remoteId: string) {
      const pc = getOrCreate(remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { to: remoteId, signal: { type: 'offer', sdp: offer.sdp } });
    }

    // Connect to existing runners: the one with the lexicographically greater ID initiates
    initialRunnerIds
      .filter(id => id !== myId && id > myId)
      .forEach(id => createOffer(id).catch(console.warn));

    socket.on('runner_joined', async ({ runner }: { runner: { id: string } }) => {
      if (runner.id > myId!) createOffer(runner.id).catch(console.warn);
    });

    socket.on('signal', async ({ from, signal }: { from: string; signal: any }) => {
      try {
        if (signal.type === 'offer') {
          const pc = getOrCreate(from);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { to: from, signal: { type: 'answer', sdp: answer.sdp } });
        } else if (signal.type === 'answer') {
          await pcs.get(from)?.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pcs.get(from)?.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (e) {
        console.warn('WebRTC signal error', e);
      }
    });

    return () => {
      socket.off('runner_joined');
      socket.off('signal');
      pcs.forEach(pc => pc.close());
    };
  }, [active, myId, localStream]);
}
