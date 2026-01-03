"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { MessageSquareText, Loader } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { api } from "../../../../../convex/_generated/api";

const formatDisplayName = (rawName: string | null | undefined) => {
  const name = String(rawName ?? "").trim();
  if (!name) return "Unnamed";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getInitials = (displayName: string) => {
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const ThreadsPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const threads = useQuery(api.messages.listMyThreadsByWorkspace, { workspaceId });
  const isLoading = threads === undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Threads</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Threads you have participated in.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="size-5 text-muted-foreground animate-spin" />
          </div>
        ) : (threads ?? []).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No threads yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(threads ?? []).map((item) => {
              const displayName = formatDisplayName(item.parent?.user?.name);
              const initials = getInitials(displayName);
              const preview = String(item.lastReply?.preview ?? item.parent?.preview ?? "");
              const title = `#${String(item.channelName ?? "").trim()}`;

              return (
                <Button
                  key={String(item.parentMessageId)}
                  type="button"
                  variant="ghost"
                  className="w-full h-auto justify-start gap-4 rounded-md border border-border bg-card/60 px-6 py-6 text-left hover:bg-muted/40"
                  onClick={() => {
                    router.push(
                      `/workspaces/${workspaceId}/channel/${String(item.channelId)}?thread=${String(item.parentMessageId)}`
                    );
                  }}
                >
                  <Avatar className="size-11">
                    <AvatarImage alt={displayName} src={item.parent?.user?.image ?? undefined} />
                    <AvatarFallback className="bg-muted text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 p-2">
                    <div className="text-base font-semibold truncate">{title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {preview || "Thread"}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadsPage;
