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

export const listByPost = query({
  args: { postId: v.id("curriculumPosts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Not found");

    await requireWorkspaceMember(ctx, post.workspaceId);

    const comments = await ctx.db
      .query("curriculumComments")
      .withIndex("by_post_createdAt", (q: any) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    const results: any[] = [];
    for (const c of comments) {
      const u = await ctx.db.get(c.userId);
      results.push({
        ...c,
        user: u
          ? { _id: u._id, name: u.name ?? null, image: u.image ?? null }
          : { _id: c.userId, name: null, image: null },
      });
    }

    return results;
  },
});

export const add = mutation({
  args: {
    postId: v.id("curriculumPosts"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Not found");

    await requireWorkspaceMember(ctx, post.workspaceId);

    const body = args.body.trim();
    if (!body) throw new Error("Comment cannot be empty");

    const id = await ctx.db.insert("curriculumComments", {
      workspaceId: post.workspaceId,
      postId: args.postId,
      userId,
      body,
      createdAt: Date.now(),
    });

    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id("curriculumComments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Not found");

    const { member } = await requireWorkspaceMember(ctx, comment.workspaceId);

    const canDelete = comment.userId === userId || member.role === "admin";
    if (!canDelete) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
