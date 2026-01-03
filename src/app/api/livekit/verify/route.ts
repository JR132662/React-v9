import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

function toHttpUrl(input: string) {
  if (input.startsWith("wss://")) return `https://${input.slice("wss://".length)}`;
  if (input.startsWith("ws://")) return `http://${input.slice("ws://".length)}`;
  return input;
}

export async function GET() {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET" },
      { status: 500 }
    );
  }

  if (!publicUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_LIVEKIT_URL" },
      { status: 500 }
    );
  }

  const httpUrl = toHttpUrl(publicUrl);

  try {
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const rooms = await svc.listRooms();
    return NextResponse.json({ ok: true, httpUrl, roomCount: rooms.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, httpUrl, error: message },
      { status: 500 }
    );
  }
}
