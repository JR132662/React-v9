import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";

const stripHtmlToText = (input: string) =>
  input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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

export const messagesAndDms = query({
  args: {
    workspaceId: v.id("workspaces"),
    q: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceMember(ctx, args.workspaceId);

    const q = args.q.trim().toLowerCase();
    if (!q) return { channelMessages: [], directMessages: [] };

    const limit = Math.max(1, Math.min(20, args.limit ?? 8));
    const scan = Math.max(50, Math.min(600, limit * 60));

    // Channel messages
    const recentChannelMessages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_createdAt", (qb: any) =>
        qb.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(scan);

    const channelHits = recentChannelMessages
      .filter((m: any) => {
        const bodyText = stripHtmlToText(String(m.body ?? ""));
        return bodyText.toLowerCase().includes(q);
      })
      .slice(0, limit);

    const channelIds = Array.from(new Set(channelHits.map((m: any) => m.channelId)));
    const channelMap = new Map<string, any>();
    for (const id of channelIds) {
      const ch = await ctx.db.get(id);
      if (ch) channelMap.set(String(ch._id), ch);
    }

    const channelMessages: any[] = [];
    for (const m of channelHits) {
      const ch = channelMap.get(String(m.channelId));
      const u = await ctx.db.get(m.userId);
      const text = stripHtmlToText(String(m.body ?? ""));
      channelMessages.push({
        _id: m._id,
        channelId: m.channelId,
        createdAt: m.createdAt,
        text,
        channel: ch ? { _id: ch._id, name: ch.name ?? null } : null,
        user: u ? { _id: u._id, name: u.name ?? null, image: u.image ?? null } : null,
      });
    }

    // Direct messages
    const recentDirectMessages = await ctx.db
      .query("directMessages")
      .withIndex("by_workspace_createdAt", (qb: any) =>
        qb.eq("workspaceId", args.workspaceId)
      )
      .order("desc")
      .take(scan);

    const dmHits = recentDirectMessages
      .filter((m: any) => {
        const bodyText = stripHtmlToText(String(m.body ?? ""));
        return bodyText.toLowerCase().includes(q);
      })
      .slice(0, limit);

    const directMessages: any[] = [];
    for (const dm of dmHits) {
      const conversation = await ctx.db.get(dm.conversationId);
      if (!conversation) continue;

      const otherUserId =
        String(conversation.userIdA) === String(userId)
          ? conversation.userIdB
          : conversation.userIdA;

      const otherMember = await ctx.db
        .query("members")
        .withIndex("by_workspace_id_user_id", (qb: any) =>
          qb.eq("workspaceId", args.workspaceId).eq("userId", otherUserId)
        )
        .unique();

      const otherUser = await ctx.db.get(otherUserId);

      directMessages.push({
        _id: dm._id,
        conversationId: dm.conversationId,
        createdAt: dm.createdAt,
        text: stripHtmlToText(String(dm.body ?? "")),
        otherMemberId: otherMember?._id ?? null,
        otherUser: otherUser
          ? { _id: otherUser._id, name: otherUser.name ?? null, image: otherUser.image ?? null }
          : null,
      });
    }

    return { channelMessages, directMessages };
  },
});
