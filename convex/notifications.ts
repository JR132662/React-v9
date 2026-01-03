import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const requireWorkspaceMember = async (ctx: any, workspaceId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .unique();

  if (!member) throw new Error("Not authorized");

  return { userId, member };
};

export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceMember(ctx, args.workspaceId);

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const raw = await ctx.db
      .query("notifications")
      .withIndex("by_user_workspace_createdAt", (q: any) =>
        q.eq("userId", userId).eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(limit);

    const results: any[] = [];

    for (const n of raw) {
      const fromUser = n.fromUserId ? await ctx.db.get(n.fromUserId) : null;

      let targetMemberId: any = null;
      if (n.type === "dm" && n.fromUserId) {
        const member = await ctx.db
          .query("members")
          .withIndex("by_workspace_id_user_id", (q: any) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", n.fromUserId)
          )
          .unique();
        targetMemberId = member?._id ?? null;
      }

      results.push({
        ...n,
        isRead: Boolean(n.readAt),
        fromUser: fromUser
          ? { _id: fromUser._id, name: fromUser.name ?? null, image: fromUser.image ?? null }
          : null,
        targetMemberId,
      });
    }

    return results;
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const n = await ctx.db.get(args.notificationId);
    if (!n) throw new Error("Notification not found");
    if (n.userId !== userId) throw new Error("Not authorized");

    if (!n.readAt) {
      await ctx.db.patch(n._id, { readAt: Date.now() });
    }

    return { success: true };
  },
});

export const markAllRead = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceMember(ctx, args.workspaceId);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_workspace_readAt", (q: any) =>
        q.eq("userId", userId).eq("workspaceId", args.workspaceId).eq("readAt", undefined)
      )
      .collect();

    const now = Date.now();
    for (const n of unread) {
      await ctx.db.patch(n._id, { readAt: now });
    }

    return { success: true, count: unread.length };
  },
});

export const countUnreadByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceMember(ctx, args.workspaceId);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_workspace_readAt", (q: any) =>
        q.eq("userId", userId).eq("workspaceId", args.workspaceId).eq("readAt", undefined)
      )
      .collect();

    return unread.length;
  },
});
