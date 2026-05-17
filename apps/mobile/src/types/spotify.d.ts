declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, cb: (data: any) => void): void;
    removeListener(event: string): void;
    setVolume(vol: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    getCurrentState(): Promise<PlaybackState | null>;
  }
  interface PlaybackState {
    track_window: { current_track: { name: string; artists: Array<{ name: string }> } };
    paused: boolean;
  }
  interface PlayerConstructorOptions {
    name: string;
    getOAuthToken(cb: (token: string) => void): void;
    volume?: number;
  }
  const Player: new (opts: PlayerConstructorOptions) => Player;
}

interface Window {
  Spotify: typeof Spotify;
  onSpotifyWebPlaybackSDKReady: () => void;
}
