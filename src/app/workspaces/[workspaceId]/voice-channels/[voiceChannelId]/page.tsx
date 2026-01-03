"use client";

import "@livekit/components-styles";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { AlertTriangleIcon, Loader, PhoneCall } from "lucide-react";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import * as React from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  isTrackReference,
  type TrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-core";

export default function VoiceChannelPage() {
  const workspaceId = useWorkspaceId();
  const params = useParams();
  const searchParams = useSearchParams();

  const autoJoin = searchParams.get("join") === "1";

  const voiceChannelId = params.voiceChannelId as Id<"voiceChannels">;

  const { data: currentUser } = useCurrentUser();

  const voiceChannel = useQuery(api.voiceChannels.getById, {
    id: voiceChannelId,
  });

  const [token, setToken] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [needsAudioGesture, setNeedsAudioGesture] = React.useState(false);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const safeTokenPart = React.useCallback((value: unknown) => {
    return String(value ?? "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 200);
  }, []);

  const roomName = React.useMemo(() => {
    const ws = safeTokenPart(workspaceId);
    const vc = safeTokenPart(voiceChannelId);
    return `workspace_${ws}__voice_${vc}`;
  }, [workspaceId, voiceChannelId, safeTokenPart]);

  const identity = React.useMemo(() => {
    return safeTokenPart(currentUser?._id);
  }, [currentUser?._id, safeTokenPart]);

  const displayName = React.useMemo(() => {
    return String(currentUser?.name ?? currentUser?.email ?? "").trim();
  }, [currentUser?.name, currentUser?.email]);

  const room = React.useMemo(() => {
    return new Room({
      adaptiveStream: true,
      dynacast: true,
    });
  }, []);

  const [connectionState, setConnectionState] = React.useState(room.state);
  React.useEffect(() => {
    const onState = () => setConnectionState(room.state);
    room.on("connectionStateChanged", onState);
    return () => {
      room.off("connectionStateChanged", onState);
    };
  }, [room]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setToken(null);
      setTokenError(null);

      if (!livekitUrl) {
        setTokenError("Missing NEXT_PUBLIC_LIVEKIT_URL");
        return;
      }

      if (!voiceChannel || !currentUser?._id) return;

      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomName,
            identity,
            name: displayName,
          }),
        });

        const json = (await res.json()) as {
          token?: unknown;
          error?: unknown;
        };
        if (!res.ok) {
          throw new Error(
            typeof json.error === "string"
              ? json.error
              : "Failed to mint LiveKit token"
          );
        }

        if (typeof json.token !== "string") {
          throw new Error(
            `Token endpoint returned an invalid token (${typeof json.token}).`
          );
        }

        if (!cancelled) setToken(json.token);
      } catch (e) {
        if (!cancelled) {
          setTokenError(e instanceof Error ? e.message : "Failed to mint token");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [livekitUrl, roomName, identity, displayName, voiceChannel, currentUser?._id]);

  React.useEffect(() => {
    setShouldConnect(false);
    setJoinError(null);
    setNeedsAudioGesture(false);
    void room.disconnect();
  }, [room, roomName, token]);

  const autoJoinAttemptedRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoJoin) return;
    if (!livekitUrl) return;
    if (!token) return;
    if (autoJoinAttemptedRef.current) return;

    autoJoinAttemptedRef.current = true;

    void (async () => {
      setJoinError(null);
      setNeedsAudioGesture(false);

      // Try to satisfy autoplay policies. If blocked, still connect, but show a button.
      try {
        await room.startAudio();
      } catch {
        setNeedsAudioGesture(true);
        setJoinError("Audio is blocked by the browser. Click Enable audio.");
      }

      setShouldConnect(true);
    })();
  }, [autoJoin, livekitUrl, token, room]);

  if (voiceChannel === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!voiceChannel) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangleIcon className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Voice channel not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative border-b border-purple-500/50 bg-background px-4 py-3 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-purple-500/50 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={
                "inline-block size-2.5 shrink-0 rounded-full " +
                (connectionState === ConnectionState.Connected
                  ? "bg-emerald-500"
                  : "bg-destructive")
              }
              aria-label={
                connectionState === ConnectionState.Connected
                  ? "Connected"
                  : "Disconnected"
              }
              title={
                connectionState === ConnectionState.Connected
                  ? "Connected"
                  : "Disconnected"
              }
            />
            <span className="text-muted-foreground">
              <PhoneCall className="size-5 align-middle" />
            </span>
            <h1 className="min-w-0 truncate font-semibold text-3xl">{voiceChannel.name}</h1>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Talk with people in this voice channel.</p>
      </div>

      <div className="flex flex-1 flex-col px-4 py-3">
        {!livekitUrl ? (
          <p className="text-sm text-muted-foreground">
            Set `NEXT_PUBLIC_LIVEKIT_URL` to connect.
          </p>
        ) : tokenError ? (
          <p className="text-sm text-destructive">{tokenError}</p>
        ) : token ? (
          <LiveKitRoom
            room={room}
            token={token}
            serverUrl={livekitUrl}
            connect={shouldConnect}
            video={false}
            audio={false}
            data-lk-theme="default"
            className="flex flex-1 flex-col"
          >
            <RoomAudioRenderer />
            <RoomJoinGate
              shouldConnect={shouldConnect}
              setShouldConnect={setShouldConnect}
              joinError={joinError}
              setJoinError={setJoinError}
              needsAudioGesture={needsAudioGesture}
              setNeedsAudioGesture={setNeedsAudioGesture}
            />
            <div className="flex flex-1 flex-col gap-3 min-h-0">
              <Card className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full min-h-0 overflow-auto p-3">
                  <ParticipantsGrid />
                </div>
              </Card>

              <Card className="shrink-0">
                <div className="p-2">
                  <ControlBar
                    controls={{
                      microphone: true,
                      camera: true,
                      chat: false,
                      screenShare: false,
                      leave: true,
                    }}
                  />
                </div>
              </Card>
            </div>
          </LiveKitRoom>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loader className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(displayName: string) {
  const parts = displayName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function ParticipantsGrid() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const tiles = React.useMemo(() => {
    return (tracks ?? []).map((trackRef) => {
      const participant = trackRef.participant;
      const name = String(participant.name ?? participant.identity ?? "").trim() ||
        "Unnamed";
      const initials = getInitials(name);
      const isRef = isTrackReference(trackRef);
      const isMuted = isRef ? Boolean(trackRef.publication.isMuted) : true;
      const showVideo = isRef && !isMuted;

      return {
        key: `${participant.sid}-${trackRef.source}`,
        name,
        initials,
        showVideo,
        trackRef: trackRef as TrackReferenceOrPlaceholder,
        videoRef: isRef ? (trackRef as TrackReference) : null,
      };
    });
  }, [tracks]);

  if (tiles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">No participants yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.key}
          className="flex flex-col rounded-lg border border-border bg-card p-3"
        >
          <div className="relative w-full overflow-hidden rounded-md bg-muted aspect-video">
            {t.showVideo ? (
              <VideoTrack
                trackRef={t.videoRef ?? undefined}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Avatar className="size-16">
                  <AvatarImage alt={t.name} src={undefined} />
                  <AvatarFallback className="bg-muted text-foreground">
                    {t.initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          <div className="mt-3 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomJoinGate({
  shouldConnect,
  setShouldConnect,
  joinError,
  setJoinError,
  needsAudioGesture,
  setNeedsAudioGesture,
}: {
  shouldConnect: boolean;
  setShouldConnect: (v: boolean) => void;
  joinError: string | null;
  setJoinError: (v: string | null) => void;
  needsAudioGesture: boolean;
  setNeedsAudioGesture: (v: boolean) => void;
}) {
  const room = useRoomContext();
  const [state, setState] = React.useState(room.state);

  React.useEffect(() => {
    const onState = () => setState(room.state);
    room.on("connectionStateChanged", onState);
    return () => {
      room.off("connectionStateChanged", onState);
    };
  }, [room]);

  React.useEffect(() => {
    const onDisconnected = (reason: unknown) => {
      const msg = reason ? `Disconnected: ${String(reason)}` : "Disconnected";
      setJoinError(msg);
      setShouldConnect(false);
    };

    const onStateChanged = (s: unknown) => {
      // Some failures (like invalid tokens) can surface as a fast transition
      // to disconnected without a useful reason.
      if (s === ConnectionState.Disconnected && shouldConnect) {
        setJoinError("Failed to connect. Check LiveKit URL and credentials.");
        setShouldConnect(false);
      }
    };

    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.ConnectionStateChanged, onStateChanged);

    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.ConnectionStateChanged, onStateChanged);
    };
  }, [room, setJoinError, setShouldConnect, shouldConnect]);

  React.useEffect(() => {
    if (!shouldConnect) return;
    if (state !== ConnectionState.Connected) return;

    void room.localParticipant.setMicrophoneEnabled(true);
  }, [shouldConnect, state, room]);

  const canJoin = state === ConnectionState.Disconnected && !shouldConnect;

  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {joinError ? <p className="text-xs text-destructive">{joinError}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        {needsAudioGesture ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                setJoinError(null);
                await room.startAudio();
                setNeedsAudioGesture(false);
              } catch (e) {
                setJoinError(e instanceof Error ? e.message : "Failed to enable audio");
              }
            }}
          >
            Enable audio
          </Button>
        ) : null}

        {canJoin ? (
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              try {
                setJoinError(null);
                await room.startAudio();
                setShouldConnect(true);
              } catch (e) {
                setJoinError(e instanceof Error ? e.message : "Failed to start audio");
              }
            }}
          >
            Join voice
          </Button>
        ) : null}
      </div>
    </div>
  );
}