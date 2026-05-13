# RunLink

Run together. Talk through music. Sync your pace.

## What it does

- **Lobby** — create or join a run with a 5-letter code, see who's joined with names
- **Voice** — real-time peer audio via WebRTC; speaking indicator pulses on each runner's avatar
- **Music ducking** — Spotify dims when someone talks, comes back up after (V2)
- **Live stats** — distance, pace, elapsed time tracked via GPS
- **Transcription** — Apple Speech Recognition logs who said what during the run
- **Run history** — every run saved locally with stats + full chat log

## Repo structure

```
apps/
  server/   Node.js + Socket.io signaling server (deploys to Fly.io)
  mobile/   Expo bare React Native iOS app
```

## Getting started

### 1. Server

```bash
cd apps/server
npm install
npm run dev          # runs on :3001
```

### 2. Mobile

```bash
cd apps/mobile
npm install
npx expo prebuild    # generates ios/ folder
npx expo run:ios     # builds + launches in Simulator
```

For real device testing, use [EAS Build](https://docs.expo.dev/build/introduction/) + TestFlight.

### 3. Environment

In `apps/mobile/src/services/socket.ts`, update the production URL to your Fly.io server once deployed.

## Deploying the server

```bash
cd apps/server
npm run build
flyctl deploy
```

## Stack

- React Native (Expo bare) · iOS
- `react-native-webrtc` — peer audio
- `@react-native-voice/voice` — on-device speech recognition
- `expo-location` — GPS pace/distance tracking
- `expo-sqlite` — local run history
- `socket.io` — WebRTC signaling + room state
- Fly.io — server hosting
