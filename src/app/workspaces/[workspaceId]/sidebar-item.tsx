"use client";

import type * as React from "react";
import Link from "next/link";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

type SideBarItemProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  href?: string;
  onClick?: () => void;
  variant?: "active" | "default";
  actions?: React.ReactNode;
};

export default function SideBarItem({
  label,
  icon: Icon,
  id,
  href,
  onClick,
  variant = "default",
  actions,
}: SideBarItemProps) {
  const workspaceId = useWorkspaceId();

  // Back-compat: when rendering channel items, the sidebar historically omitted `href`
  // and relied on a default `/workspaces/:id/channel/:channelId` link.
  // Avoid applying this to short static ids like "threads" or "calls".
  const resolvedHref =
    href ?? (!onClick && id.length > 10 ? `/workspaces/${workspaceId}/channel/${id}` : undefined);

  const className =
    variant === "active"
      ? "cursor-pointer rounded-md bg-sidebar-accent px-2 py-1.5 text-sidebar-accent-foreground"
      : "cursor-pointer rounded-md px-2 py-1.5 text-sidebar-foreground hover:bg-sidebar-accent/60";

  const content = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );

  if (resolvedHref) {
    return (
      <Link className={className} href={resolvedHref}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${className} w-full text-left`}
      onClick={onClick}
      disabled={!onClick}
    >
      {content}
    </button>
  );
}