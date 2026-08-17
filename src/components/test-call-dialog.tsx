"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLocalAudioTrack,
  Room,
  RoomEvent,
  type LocalAudioTrack,
  type TranscriptionSegment,
} from "livekit-client";
import {
  MicIcon,
  MicOffIcon,
  PhoneCallIcon,
  PhoneOffIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CallStatus = "idle" | "connecting" | "connected" | "ended" | "error";

type Turn = {
  id: string;
  role: "user" | "agent";
  text: string;
  final: boolean;
};

/** How long to wait for the voice agent worker to join the room before
 *  surfacing the "agent not available" state. */
const AGENT_JOIN_TIMEOUT_MS = 10_000;

/**
 * Browser test console for a published **voice** agent (M4 plan 03).
 *
 * Places a real call: fetches a short-lived LiveKit session from
 * `/api/agents/[id]/test-token`, connects the room with `livekit-client`,
 * publishes the mic, plays the agent's audio through an `AudioContext`, and
 * renders a live transcript fed by the framework's `lk.transcription` data
 * streams (agent TTS + user STT both arrive as transcription segments).
 */
export function TestCallDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);
  const [agentMissing, setAgentMissing] = useState(false);
  const [transcript, setTranscript] = useState<Turn[]>([]);

  const roomRef = useRef<Room | null>(null);
  const micRef = useRef<LocalAudioTrack | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<MediaStreamAudioSourceNode[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live transcript state, kept in refs so the room event handlers can mutate
  // it without stale-closure issues; the derived array is committed to state.
  const segmentsRef = useRef<Map<string, Turn>>(new Map());
  const orderRef = useRef<string[]>([]);

  const agentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (agentTimeoutRef.current) {
      clearTimeout(agentTimeoutRef.current);
      agentTimeoutRef.current = null;
    }
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }
    const mic = micRef.current;
    if (mic) {
      mic.stop();
      micRef.current = null;
    }
    for (const source of audioSourcesRef.current) {
      source.disconnect();
    }
    audioSourcesRef.current = [];
    const ctx = audioCtxRef.current;
    if (ctx) {
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMuted(false);
    setAgentJoined(false);
    setAgentMissing(false);
  }, []);

  // If the dialog unmounts mid-call (parent closes it), tear the call down.
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript, status]);

  /** Merges incoming transcription segments into the transcript list. */
  const mergeSegments = useCallback(
    (segments: TranscriptionSegment[], role: "user" | "agent") => {
      const map = segmentsRef.current;
      const order = orderRef.current;
      for (const seg of segments) {
        const existing = map.get(seg.id);
        const turn: Turn = {
          id: seg.id,
          role: existing?.role ?? role,
          text: seg.text || existing?.text || "",
          final: seg.final || existing?.final || false,
        };
        map.set(seg.id, turn);
        if (!order.includes(seg.id)) order.push(seg.id);
      }
      setTranscript(order.map((id) => map.get(id)!));
    },
    [],
  );

  /** Marks the agent as present and cancels the not-available timeout. */
  const markAgentJoined = useCallback(() => {
    setAgentJoined(true);
    setAgentMissing(false);
    if (agentTimeoutRef.current) {
      clearTimeout(agentTimeoutRef.current);
      agentTimeoutRef.current = null;
    }
  }, []);

  const endCall = useCallback(() => {
    cancelledRef.current = true;
    setStatus((prev) => (prev === "ended" ? prev : "ended"));
    cleanup();
  }, [cleanup]);

  async function startCall() {
    cancelledRef.current = false;
    setStatus("connecting");
    setError(null);

    let room: Room | null = null;
    try {
      const res = await fetch(`/api/agents/${agentId}/test-token`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Token request failed (${res.status})`);
      }
      const session: { url: string; room: string; token: string } =
        await res.json();

      // Create the AudioContext from the user gesture so agent audio is not
      // blocked by autoplay policies.
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      await ctx.resume();

      // Request the mic now (user gesture) so permission failures surface as
      // a clear, actionable error instead of a silent dead call.
      let mic: LocalAudioTrack;
      try {
        mic = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
      } catch {
        throw new Error(
          "Microphone permission denied — allow microphone access and try again.",
        );
      }
      micRef.current = mic;

      room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== "audio") return;
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;
        const stream = new MediaStream([track.mediaStreamTrack]);
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(audioCtx.destination);
        audioSourcesRef.current.push(source);
      });

      room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const role = participant?.isLocal ? "user" : "agent";
        mergeSegments(segments, role);
      });

      room.on(RoomEvent.ParticipantConnected, () => markAgentJoined());

      room.on(RoomEvent.Disconnected, () => {
        // The worker can end the call itself (end-call keyword or shutdown),
        // which deletes the room and disconnects us.
        if (!roomRef.current) return;
        cleanup();
        setStatus("ended");
      });

      await room.connect(session.url, session.token);
      if (cancelledRef.current) return;
      await room.startAudio();
      await room.localParticipant.publishTrack(mic);
      if (cancelledRef.current) return;

      if (room.remoteParticipants.size > 0) {
        markAgentJoined();
      } else {
        agentTimeoutRef.current = setTimeout(() => {
          setAgentMissing(true);
        }, AGENT_JOIN_TIMEOUT_MS);
      }

      setStatus("connected");
    } catch (err) {
      cleanup();
      if (cancelledRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to start the call";
      setError(message);
      setStatus("error");
      toast.error(message);
    }
  }

  function toggleMute() {
    const mic = micRef.current;
    if (!mic) return;
    if (mic.isMuted) {
      mic.unmute();
      setMuted(false);
    } else {
      mic.mute();
      setMuted(true);
    }
  }

  const connected = status === "connected";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          // Ending (or already ended) — tear down before closing.
          endCall();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="flex h-[560px] max-w-xl flex-col">
        <DialogHeader>
          <DialogTitle>Test call — {agentName}</DialogTitle>
          <DialogDescription>
            Place a real voice call to the published agent. Your microphone is
            used for speech-to-text; agent replies are spoken back and shown in
            the transcript below.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border p-3"
        >
          {transcript.length === 0 && status !== "error" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {status === "connecting"
                ? "Connecting to the agent…"
                : status === "connected"
                  ? "Agent connected — start speaking."
                  : "The transcript of the call will appear here."}
            </p>
          )}
          {transcript.map((turn) => (
            <div
              key={turn.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                turn.role === "user"
                  ? "self-end bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "self-start border bg-zinc-50 dark:bg-zinc-800"
              }`}
            >
              {turn.text || "…"}
              {!turn.final && (
                <span className="ml-1 opacity-60">(speaking…)</span>
              )}
            </div>
          ))}
          {agentMissing && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              No agent joined the room — is the voice agent worker running?
              End the call and check <code>mprocs</code>.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {status === "connecting"
              ? "Connecting…"
              : status === "connected"
                ? agentJoined
                  ? "On a call with the agent"
                  : "Connected — waiting for the agent"
                : status === "ended"
                  ? "Call ended"
                  : status === "error"
                    ? "Call failed"
                    : "Ready"}
          </p>
          <div className="flex shrink-0 gap-2">
            {connected && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleMute}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              >
                {muted ? <MicOffIcon /> : <MicIcon />}
                {muted ? "Unmute" : "Mute"}
              </Button>
            )}
            {(status === "idle" || status === "error") && (
              <Button type="button" size="sm" onClick={startCall}>
                <PhoneCallIcon />
                {status === "error" ? "Try again" : "Start call"}
              </Button>
            )}
            {(status === "connecting" || status === "connected") && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={endCall}
              >
                <PhoneOffIcon />
                {status === "connecting" ? "Cancel" : "End call"}
              </Button>
            )}
            {status === "ended" && (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
