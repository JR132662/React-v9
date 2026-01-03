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

const requireWorkspaceAdmin = async (ctx: any, workspaceId: any) => {
  const { userId, member } = await requireWorkspaceMember(ctx, workspaceId);
  if (member.role !== "admin") throw new Error("Not authorized");
  return { userId, member };
};

export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);

    const posts = await ctx.db
      .query("curriculumPosts")
      .withIndex("by_workspace_createdAt", (q: any) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();

    const results: any[] = [];
    for (const post of posts) {
      const author = await ctx.db.get(post.authorUserId);
      results.push({
        ...post,
        author: author
          ? { _id: author._id, name: author.name ?? null, image: author.image ?? null }
          : { _id: post.authorUserId, name: null, image: null },
      });
    }

    return results;
  },
});

export const getById = query({
  args: { id: v.id("curriculumPosts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.id);
    if (!post) return null;

    await requireWorkspaceMember(ctx, post.workspaceId);

    const author = await ctx.db.get(post.authorUserId);

    return {
      ...post,
      author: author
        ? { _id: author._id, name: author.name ?? null, image: author.image ?? null }
        : { _id: post.authorUserId, name: null, image: null },
    };
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    weekLabel: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceAdmin(ctx, args.workspaceId);

    const weekLabel = args.weekLabel.trim();
    const title = args.title.trim();
    const body = args.body.trim();

    if (!weekLabel) throw new Error("Week label is required");
    if (!title) throw new Error("Title is required");
    if (!body) throw new Error("Body is required");

    const id = await ctx.db.insert("curriculumPosts", {
      workspaceId: args.workspaceId,
      authorUserId: userId,
      weekLabel,
      title,
      body,
      createdAt: Date.now(),
    });

    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("curriculumPosts"),
    weekLabel: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Not found");

    await requireWorkspaceAdmin(ctx, post.workspaceId);

    const weekLabel = args.weekLabel.trim();
    const title = args.title.trim();
    const body = args.body.trim();

    if (!weekLabel) throw new Error("Week label is required");
    if (!title) throw new Error("Title is required");
    if (!body) throw new Error("Body is required");

    await ctx.db.patch(args.id, {
      weekLabel,
      title,
      body,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("curriculumPosts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Not found");

    await requireWorkspaceAdmin(ctx, post.workspaceId);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
