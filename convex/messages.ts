import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const requireChannelMember = async (ctx: any, channelId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const channel = await ctx.db.get(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q: any) =>
      q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
    )
    .unique();

  if (!member) {
    throw new Error("Not authorized");
  }

  return { userId, channel };
};

const requireMessageOwner = async (ctx: any, messageId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const message = await ctx.db.get(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  const channel = await ctx.db.get(message.channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q: any) =>
      q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
    )
    .unique();

  if (!member) {
    throw new Error("Not authorized");
  }

  if (message.userId !== userId) {
    throw new Error("Not authorized");
  }

  return { userId, message, channel };
};

const requireMessageOwnerOrAdmin = async (ctx: any, messageId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const message = await ctx.db.get(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  const channel = await ctx.db.get(message.channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_id_user_id", (q: any) =>
      q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
    )
    .unique();

  if (!member) {
    throw new Error("Not authorized");
  }

  const isOwner = message.userId === userId;
  const isAdmin = member.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized");
  }

  return { userId, message, channel, member };
};

export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const { channel } = await requireChannelMember(ctx, args.channelId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_id", (q: any) => q.eq("channelId", args.channelId))
      .order("asc")
      .collect();

    const results = [];
    for (const message of messages) {
      const user = await ctx.db.get(message.userId);
      const imageUrl = message.imageId ? await ctx.storage.getUrl(message.imageId) : null;

      results.push({
        ...message,
        imageUrl,
        user: user
          ? { _id: user._id, name: user.name ?? null, image: user.image ?? null }
          : { _id: message.userId, name: null, image: null },
        channelName: channel.name,
      });
    }

    return results;
  },
});

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, channel } = await requireChannelMember(ctx, args.channelId);

    const body = (args.body ?? "").trim();
    if (!body && !args.imageId) {
      throw new Error("Message cannot be empty");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      workspaceId: channel.workspaceId,
      userId,
      body: body || undefined,
      imageId: args.imageId,
      createdAt: Date.now(),
    });

    return { messageId };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const update = mutation({
  args: {
    messageId: v.id("messages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { message } = await requireMessageOwner(ctx, args.messageId);

    const body = args.body.trim();
    if (!body) {
      throw new Error("Message cannot be empty");
    }

    await ctx.db.patch(message._id, {
      body,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const { message } = await requireMessageOwnerOrAdmin(ctx, args.messageId);
    await ctx.db.delete(message._id);
    return { success: true };
  },
});
