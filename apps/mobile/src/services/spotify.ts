const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state';

function getRedirectURI() {
  return typeof window !== 'undefined' ? `${window.location.origin}/` : '';
}

function base64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function pkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

export function hasClientId() { return !!CLIENT_ID; }

export async function initiateSpotifyAuth() {
  const { verifier, challenge } = await pkce();
  sessionStorage.setItem('spotify_verifier', verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectURI(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleOAuthCallback(code: string): Promise<string> {
  const verifier = sessionStorage.getItem('spotify_verifier') ?? '';
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectURI(),
      code_verifier: verifier,
    }),
  });
  const data = await res.json();
  const token = data.access_token;
  sessionStorage.setItem('spotify_token', token);
  sessionStorage.removeItem('spotify_verifier');
  window.history.replaceState({}, '', '/');
  return token;
}

export function getStoredToken(): string | null {
  return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('spotify_token') : null;
}

let sdkReady = false;
function loadSDK(): Promise<void> {
  if (sdkReady || !window.Spotify) {
    return new Promise(resolve => {
      window.onSpotifyWebPlaybackSDKReady = () => { sdkReady = true; resolve(); };
      if (!document.querySelector('script[src*="spotify-player"]')) {
        const s = document.createElement('script');
        s.src = 'https://sdk.scdn.co/spotify-player.js';
        document.body.appendChild(s);
      }
    });
  }
  return Promise.resolve();
}

export async function initPlayer(token: string): Promise<Spotify.Player> {
  await loadSDK();
  return new Promise((resolve, reject) => {
    const player = new window.Spotify.Player({
      name: 'RunLink',
      getOAuthToken: cb => cb(token),
      volume: 1,
    });
    player.addListener('ready', async ({ device_id }: { device_id: string }) => {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [device_id] }),
      });
      resolve(player);
    });
    player.addListener('not_ready', () => reject(new Error('Spotify player not ready')));
    player.connect();
  });
}

const DUCK = 0.12;

export function duckVolume(player: Spotify.Player) {
  player.setVolume(DUCK);
}

export function restoreVolume(player: Spotify.Player) {
  const steps = [0.15, 0.3, 0.5, 0.72, 0.9, 1.0];
  steps.forEach((v, i) => setTimeout(() => player.setVolume(v), i * 90));
}
