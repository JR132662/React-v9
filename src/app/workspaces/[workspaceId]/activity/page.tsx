"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Bell, Check, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(timestampMs: number) {
  try {
    return new Date(timestampMs).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const ActivityPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const notifications = useQuery(api.notifications.listByWorkspace, {
    workspaceId,
    limit: 75,
  });
  const isLoading = notifications === undefined;

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unreadCount = React.useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    return list.filter((n: any) => !n.readAt).length;
  }, [notifications]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-muted-foreground" />
              <h1 className="text-2xl font-semibold">Alerts</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Notifications for messages, DMs, and mentions.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={unreadCount === 0}
            onClick={async () => {
              await markAllRead({ workspaceId });
            }}
          >
            <Check className="size-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="size-5 text-muted-foreground animate-spin" />
          </div>
        ) : (notifications ?? []).length === 0 ? (
          <div className="h-full flex items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(notifications ?? []).map((n: any) => {
              const fromName = String(n.fromUser?.name ?? "Someone").trim() || "Someone";
              const initials = fromName.charAt(0).toUpperCase();
              const time = formatTime(n.createdAt);

              const title =
                n.type === "dm"
                  ? "New direct message"
                  : n.type === "mention"
                    ? "You were mentioned"
                    : "Notification";

              const preview = String(n.preview ?? "").trim();

              return (
                <button
                  key={String(n._id)}
                  type="button"
                  className={cn(
                    "w-full rounded-md border border-border bg-card/60 px-3 py-2 text-left",
                    "hover:bg-muted/40 transition-colors",
                    !n.readAt ? "ring-1 ring-ring/25" : null
                  )}
                  onClick={async () => {
                    try {
                      await markRead({ notificationId: n._id });
                    } finally {
                      if (n.type === "dm" && n.targetMemberId) {
                        router.push(
                          `/workspaces/${workspaceId}/members/${String(n.targetMemberId)}`
                        );
                        return;
                      }
                      if (n.type === "mention" && n.channelId) {
                        router.push(
                          `/workspaces/${workspaceId}/channel/${String(n.channelId)}`
                        );
                        return;
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9 mt-0.5">
                      <AvatarImage alt={fromName} src={n.fromUser?.image ?? undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-sm font-semibold truncate">{title}</div>
                        <div className="text-[11px] text-muted-foreground shrink-0">{time}</div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        <span className="font-medium text-foreground/80">{fromName}</span>
                        {preview ? ` — ${preview}` : ""}
                      </div>
                      {!n.readAt ? (
                        <div className="mt-1 text-[11px] text-primary">Unread</div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
