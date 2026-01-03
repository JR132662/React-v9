import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

function sanitizeIdentity(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function sanitizeRoomName(input: string) {
  const normalized = input.trim().replace(/\s+/g, "-");
  return normalized.replace(/[^a-zA-Z0-9_-]/g, "_");
}

type TokenRequestBody = {
  room: string;
  identity: string;
  name?: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET" },
        { status: 500 }
      );
    }

    const publicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
    if (!publicUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_LIVEKIT_URL is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as Partial<TokenRequestBody>;
    const safeRoom = sanitizeRoomName(String(body.room ?? ""));
    const safeIdentity = sanitizeIdentity(String(body.identity ?? ""));
    const safeName = body.name ? String(body.name).trim() : undefined;

    if (!safeRoom) {
      return NextResponse.json({ error: "Missing room" }, { status: 400 });
    }
    if (!safeIdentity) {
      return NextResponse.json({ error: "Missing identity" }, { status: 400 });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: safeIdentity,
      name: safeName || undefined,
      ttl: 60 * 60,
    });

    token.addGrant({
      room: safeRoom,
      roomJoin: true,
      roomCreate: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    return NextResponse.json({
      token: jwt,
      debug: {
        room: safeRoom,
        identity: safeIdentity,
        urlHost: (() => {
          try {
            return new URL(publicUrl).host;
          } catch {
            return "invalid_url";
          }
        })(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
