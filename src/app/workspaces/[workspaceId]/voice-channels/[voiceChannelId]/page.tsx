"use client";

import "@livekit/components-styles";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { AlertTriangleIcon, Loader } from "lucide-react";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import * as React from "react";
import {
  LiveKitRoom,
  AudioConference,
  RoomAudioRenderer,
  ControlBar,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, Room, RoomEvent } from "livekit-client";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCurrentUser } from "@/features/auth/api/use-current-user";

export default function VoiceChannelPage() {
  const workspaceId = useWorkspaceId();
  const params = useParams();
  const voiceChannelId = params.voiceChannelId as Id<"voiceChannels">;

  const { data: currentUser } = useCurrentUser();

  const voiceChannel = useQuery(api.voiceChannels.getById, {
    id: voiceChannelId,
  });

  const [token, setToken] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);

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
    void room.disconnect();
  }, [room, roomName, token]);

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
      <div className="border-b px-4 py-3">
        <h1 className="text-base font-medium">{voiceChannel.name}</h1>
        <p className="text-xs text-muted-foreground">Voice channel</p>
      </div>

      <div className="flex flex-1 flex-col px-4 py-3">
        {!livekitUrl ? (
          <p className="text-sm text-muted-foreground">
            Set `NEXT_PUBLIC_LIVEKIT_URL` to connect.
          </p>
        ) : tokenError ? (
          <p className="text-sm text-destructive">{tokenError}</p>
        ) : !token ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
            <RoomStatus />
            <RoomJoinGate
              roomName={roomName}
              shouldConnect={shouldConnect}
              setShouldConnect={setShouldConnect}
              joinError={joinError}
              setJoinError={setJoinError}
            />
            <div className="flex flex-1 flex-col overflow-hidden rounded-md border bg-background">
              <div className="flex-1 overflow-auto">
                <AudioConference />
              </div>
              <div className="border-t p-2">
                <ControlBar
                  controls={{
                    microphone: true,
                    camera: false,
                    chat: false,
                    screenShare: false,
                    leave: true,
                  }}
                />
              </div>
            </div>
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}

function RoomStatus() {
  const room = useRoomContext();
  const [state, setState] = React.useState(room.state);

  React.useEffect(() => {
    const onState = () => setState(room.state);
    room.on("connectionStateChanged", onState);
    return () => {
      room.off("connectionStateChanged", onState);
    };
  }, [room]);

  const label =
    state === ConnectionState.Connected
      ? "Connected"
      : state === ConnectionState.Connecting
        ? "Connecting…"
        : state === ConnectionState.Reconnecting
          ? "Reconnecting…"
          : "Disconnected";

  return (
    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{room.numParticipants} in room</span>
    </div>
  );
}

function RoomJoinGate({
  roomName,
  shouldConnect,
  setShouldConnect,
  joinError,
  setJoinError,
}: {
  roomName: string;
  shouldConnect: boolean;
  setShouldConnect: (v: boolean) => void;
  joinError: string | null;
  setJoinError: (v: string | null) => void;
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
        <p className="text-xs text-muted-foreground truncate">Room: {roomName}</p>
        {joinError ? <p className="text-xs text-destructive">{joinError}</p> : null}
      </div>

      {canJoin ? (
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-600/90"
          onClick={async () => {
            try {
              setJoinError(null);
              // Required by Chrome autoplay policies (user gesture).
              await room.startAudio();
              setShouldConnect(true);
            } catch (e) {
              setJoinError(e instanceof Error ? e.message : "Failed to start audio");
            }
          }}
        >
          Join voice
        </button>
      ) : null}
    </div>
  );
}