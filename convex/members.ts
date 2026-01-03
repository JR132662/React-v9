import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";

const populateUser = async (
  ctx: QueryCtx,
  member: Doc<"members">
): Promise<Doc<"users"> | null> => {
  return await ctx.db.get(member.userId);
};

const getMyMemberOrNull = async (
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">
): Promise<Doc<"members"> | null> => {
  const userId = await auth.getUserId(ctx);
  if (!userId) return null;

  return await ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .unique();
};

export const get = query({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
  handler: async (ctx, args) => {
    // Avoid crashing the UI: if caller isn't a member yet, just return null
    const myMember = await getMyMemberOrNull(ctx, args.workspaceId);
    if (!myMember) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (!member) return null;

    const user = await populateUser(ctx, member);
    if (!user) return null;

    // Old shape: { member, user }
    return { member, user };
  },
});

export const current = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    if (!userId) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) {
      return null;
    }

    return member;
  },
});

const requireMember = async (ctx: any, workspaceId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .unique();

  if (!member) {
    throw new Error("Not authorized");
  }

  return { userId, member };
};

const requireAdmin = async (ctx: any, workspaceId: any) => {
  const { userId, member } = await requireMember(ctx, workspaceId);
  if (member.role !== "admin") {
    throw new Error("Not authorized");
  }
  return { userId, member };
};

export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // Avoid "Not authorized" runtime overlay for new accounts / not-yet-joined users
    const myMember = await getMyMemberOrNull(ctx, args.workspaceId);
    if (!myMember) return [];

    const data = await ctx.db
      .query("members")
      .withIndex("by_Workspace_Id", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members: Array<{ member: Doc<"members">; user: Doc<"users"> }> = [];

    for (const member of data) {
      const user = await populateUser(ctx, member);
      if (user) {
        members.push({ member, user });
      }
    }

    return members;
  },
});

export const updateRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.workspaceId);

    const target = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (!target) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(target._id, { role: args.role });
    return { success: true };
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.workspaceId);

    const target = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (!target) {
      throw new Error("Member not found");
    }

    await ctx.db.delete(target._id);
    return { success: true };
  },
});

export const updateMyNotificationSettings = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    muted: v.boolean(),
    notificationLevel: v.union(
      v.literal("all"),
      v.literal("mentions"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.workspaceId);

    const me = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!me) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(me._id, {
      muted: args.muted,
      notificationLevel: args.notificationLevel,
    });

    return { success: true };
  },
});