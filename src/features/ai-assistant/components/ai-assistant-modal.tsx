"use client";

import * as React from "react";
import { X, SendHorizonal, Minus } from "lucide-react";
import { useAiAssistantModal } from "../store/use-ai-assistant-modal";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export function AiAssistantModal() {
  const { open, setOpen } = useAiAssistantModal();
  const [minimized, setMinimized] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "assistant", content: "Hi! What can I help with?" },
  ]);

  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) setMinimized(false);
  }, [open]);

  React.useEffect(() => {
    if (!open || minimized) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [open, minimized, messages]);

  if (!open) return null;

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const data = (await res.json().catch(() => null)) as
        | { content: string }
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(data && "error" in data ? data.error : "Request failed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry—something went wrong. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="overflow-hidden rounded-xl border border-purple-500/40 bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-500/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">AI Assistant</p>
            <p className="truncate text-xs text-muted-foreground">Live chat</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setMinimized((v) => !v)}
              aria-label={minimized ? "Expand" : "Minimize"}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        {!minimized ? (
          <>
            <div ref={listRef} className="h-[360px] overflow-y-auto px-3 py-3">
              <div className="space-y-2">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={[
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      m.role === "user"
                        ? "ml-auto bg-purple-600 text-white"
                        : "mr-auto bg-muted text-foreground",
                    ].join(" ")}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            </div>

            {/* Composer */}
            <div className="flex items-center gap-2 border-t border-purple-500/30 p-2">
              <input
                className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
                disabled={sending}
              />
              <Button type="button" size="sm" onClick={() => void send()} disabled={sending}>
                <SendHorizonal className="mr-2 size-4" />
                Send
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}