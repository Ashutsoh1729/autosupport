# Voice Test Console (Browser)

Status: Done
Branch: plan/m4-voice-runtime

## Description
A dashboard test console that places a real browser call to a published **voice** agent:
requests a LiveKit session token (plan 01), connects mic + speaker via `livekit-client`,
shows a live transcript of the conversation, and supports start/end/mute. This is the
browser half of the M4 end-to-end voice runtime, and the human side of plan 02's worker.

## Goals
- Install `livekit-client` in the app.
- Add a `TestCallDialog` that joins a room, publishes the mic, and plays remote audio.
- Render a live transcript from the agent's speech events / local STT when available.
- Controls: connect (call), disconnect (end), mute/unmute; error + permission states.
- Add a "Test call" button on published **voice** agents in `agent-list`.
- Verify a full browser call: connect → greeting → Q&A → end.

## Workflow
1. User opens the agent's "Test call" dialog; it calls `POST /api/agents/[id]/test-token`.
2. Dialog connects `Room` from `livekit-client` using `{ url, token }`, publishes the mic track,
   subscribes to the agent's audio track, and plays it through the speaker.
3. Speech events (agent + user) render into a scrolling transcript; mute toggles the mic track.
4. "End" disconnects the room and closes the dialog.

## Implementation Steps

### Step 1: Dependency
- [x] `npm install livekit-client`

### Step 2: TestCallDialog component
- [x] Create `src/components/test-call-dialog.tsx` (client) with connect/end/mute controls and status text.
- [x] On connect: fetch `POST /api/agents/[id]/test-token`; `Room.connect(url, token)`; publish mic;
      subscribe to `remoteAudioTrack`; play via `AudioContext`.
- [x] Render a live transcript list (user + agent turns); handle mic permission denied and connect errors.
- [x] On end: disconnect room, clean up tracks and audio context.

### Step 3: Wire into agent list
- [x] In `src/components/agent-list.tsx`, add a "Test call" button for published **voice** agents
      (alongside the existing Test chat / Embed actions for text agents).
- [x] Hold open dialog state per row (mirror the existing `setTestAgent` / `setEmbedAgent` pattern).

### Step 4: Verify
- [x] `npm run build` and `npm run lint` pass.
- [x] With `mprocs` running (worker from plan 02 up), start a call on a published voice agent:
      agent greets, answers a question, ends on disconnect. Confirm transcript updates live.
      (Headless Chrome: fake-mic WAV via `--use-file-for-fake-audio-capture`; logged in as
      `plan03-console@test.dev`; Voice Demo Agent greeted, STT heard both "What is your refund
      policy?" and "Can you tell me about the shipping policy?", the agent answered from the KB,
      and "End call." triggered `end_call_keyword` → room deleted → dialog shows "Call ended".)

---

## Files to Modify
- `src/components/test-call-dialog.tsx` — new browser call dialog
- `src/components/agent-list.tsx` — Test call action for voice agents
- `package.json` — add `livekit-client`

## Functional Components

| Function | File | Role |
|----------|------|------|
| `TestCallDialog` | `src/components/test-call-dialog.tsx` | Browser call UI: connect/end/mute + transcript |
| `Room.connect` usage | `src/components/test-call-dialog.tsx` | WebRTC session to the LiveKit room |
| agent-list "Test call" | `src/components/agent-list.tsx` | Entry point for voice agents |

## Data Model
No new tables. Consumes the plan-01 session payload:
```ts
{ url: string; room: string; token: string }
```
plus `agent.name` for the dialog header.

## Boundaries
- Browser only; requires microphone permission and a LiveKit-accessible `url` (localhost in dev).
- LiveKit Build free tier: 5,000 WebRTC minutes / month — no card required.
- Transcript is client-side only (no persistence — M5 handles recording/transcripts).

## Considerations
- Autoplay policies: resume the `AudioContext` on a user gesture (the call button) to avoid
  blocking agent audio.
- Handle the case where the worker (plan 02) isn't running: the room connects but no agent
  joins — surface a clear "agent not available" state after a timeout.
- Mirror the existing M3 dialog patterns (`TestChatDialog`, `EmbedAgentDialog`) for consistency.
