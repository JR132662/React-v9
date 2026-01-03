import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as { messages?: Msg[] } | null;
    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // sanitize + cap
    const messages: Msg[] = body.messages
      .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
      .map((m) => ({
        role: m.role as Msg["role"],
        content: String(m.content).slice(0, 4000),
      }))
      .slice(-20);

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are an in-app chat assistant. Be concise, helpful, and practical. Ask clarifying questions when needed.",
        },
        ...messages,
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}