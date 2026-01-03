import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

type Reaction = { emoji: string; userId: any };

const stripHtmlToText = (input: string) =>
  input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function summarizeReactions(reactions: Reaction[], currentUserId: any) {
  const byEmoji = new Map<
    string,
    {
      emoji: string;
      count: number;
      reacted: boolean;
    }
  >();

  for (const reaction of reactions) {
    const existing = byEmoji.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
      if (reaction.userId === currentUserId) existing.reacted = true;
      continue;
    }

    byEmoji.set(reaction.emoji, {
      emoji: reaction.emoji,
      count: 1,
      reacted: reaction.userId === currentUserId,
    });
  }

  return Array.from(byEmoji.values()).sort((a, b) => b.count - a.count);
}

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
    const { userId, channel } = await requireChannelMember(ctx, args.channelId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_parent_createdAt", (q: any) =>
        q.eq("channelId", args.channelId).eq("parentMessageId", undefined)
      )
      .order("asc")
      .collect();

    const results = [];
    for (const message of messages) {
      const user = await ctx.db.get(message.userId);
      const imageUrl = message.imageId ? await ctx.storage.getUrl(message.imageId) : null;
      const rawReactions = (message.reactions ?? []) as Reaction[];

      results.push({
        ...message,
        imageUrl,
        reactionSummary: summarizeReactions(rawReactions, userId),
        user: user
          ? { _id: user._id, name: user.name ?? null, image: user.image ?? null }
          : { _id: message.userId, name: null, image: null },
        channelName: channel.name,
      });
    }

    return results;
  },
});

export const listByChannelPaginated = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId, channel } = await requireChannelMember(ctx, args.channelId);

    const page = await ctx.db
      .query("messages")
      .withIndex("by_channel_parent_createdAt", (q: any) =>
        q.eq("channelId", args.channelId).eq("parentMessageId", undefined)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const results = [];
    for (const message of page.page) {
      const user = await ctx.db.get(message.userId);
      const imageUrl = message.imageId
        ? await ctx.storage.getUrl(message.imageId)
        : null;
      const rawReactions = (message.reactions ?? []) as Reaction[];

      results.push({
        ...message,
        imageUrl,
        reactionSummary: summarizeReactions(rawReactions, userId),
        user: user
          ? { _id: user._id, name: user.name ?? null, image: user.image ?? null }
          : { _id: message.userId, name: null, image: null },
        channelName: channel.name,
      });
    }

    return {
      ...page,
      page: results,
    };
  },
});

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const { userId, channel } = await requireChannelMember(ctx, args.channelId);

    let parentMessageId: any = undefined;
    if (args.parentMessageId) {
      const parent = await ctx.db.get(args.parentMessageId);
      if (!parent) {
        throw new Error("Parent message not found");
      }
      if (parent.channelId !== args.channelId) {
        throw new Error("Parent message does not belong to this channel");
      }
      // Prevent nesting threads; keep it single-level.
      if ((parent as any).parentMessageId) {
        throw new Error("Cannot reply to a reply");
      }
      parentMessageId = parent._id;
    }

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
      parentMessageId,
      createdAt: Date.now(),
    });

    // Mention notifications (only if message body contains mention metadata)
    if (body) {
      const mentionedUserIds = new Set<string>();
      const re = /data-mention-user-id=("|')([^"']+)("|')/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(body))) {
        const id = match[2];
        if (id) mentionedUserIds.add(id);
      }

      const stripHtmlToText = (input: string) =>
        input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      const preview = stripHtmlToText(body).slice(0, 140);

      for (const mentionedUserId of mentionedUserIds) {

        // Respect the mentioned user's workspace notification settings
        const mentionedMember = await ctx.db
          .query("members")
          .withIndex("by_workspace_id_user_id", (q: any) =>
            q.eq("workspaceId", channel.workspaceId).eq("userId", mentionedUserId as any)
          )
          .unique();

        if (!mentionedMember) continue;
        if (mentionedMember.muted) continue;
        const level = mentionedMember.notificationLevel ?? "all";
        if (level === "none") continue;
        if (level === "mentions" || level === "all") {
          await ctx.db.insert("notifications", {
            userId: mentionedMember.userId,
            workspaceId: channel.workspaceId,
            type: "mention",
            fromUserId: userId,
            channelId: args.channelId,
            messageId,
            preview: preview || undefined,
            createdAt: Date.now(),
          });
        }
      }
    }

    return { messageId };
  },
});

export const getById = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { channel } = await requireChannelMember(ctx, message.channelId);

    const user = await ctx.db.get(message.userId);
    const imageUrl = message.imageId ? await ctx.storage.getUrl(message.imageId) : null;
    const rawReactions = (message.reactions ?? []) as Reaction[];

    return {
      ...message,
      imageUrl,
      reactionSummary: summarizeReactions(rawReactions, userId),
      user: user
        ? { _id: user._id, name: user.name ?? null, image: user.image ?? null }
        : { _id: message.userId, name: null, image: null },
      channelName: channel.name,
    };
  },
});

export const listReplies = query({
  args: { parentMessageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const parent = await ctx.db.get(args.parentMessageId);
    if (!parent) throw new Error("Parent message not found");

    const { channel } = await requireChannelMember(ctx, parent.channelId);

    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent_message_id", (q: any) =>
        q.eq("parentMessageId", args.parentMessageId)
      )
      .order("asc")
      .collect();

    const results: any[] = [];
    for (const message of replies) {
      const user = await ctx.db.get(message.userId);
      const imageUrl = message.imageId ? await ctx.storage.getUrl(message.imageId) : null;
      const rawReactions = (message.reactions ?? []) as Reaction[];

      results.push({
        ...message,
        imageUrl,
        reactionSummary: summarizeReactions(rawReactions, userId),
        user: user
          ? { _id: user._id, name: user.name ?? null, image: user.image ?? null }
          : { _id: message.userId, name: null, image: null },
        channelName: channel.name,
      });
    }

    return results;
  },
});

export const listMyThreadsByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q: any) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!member) throw new Error("Not authorized");

    // Threads you participated in = any reply you wrote.
    const myMessages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_user_createdAt", (q: any) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .order("desc")
      .collect();

    const parentIds = new Set<Id<"messages">>();
    for (const m of myMessages) {
      if (m.parentMessageId) parentIds.add(m.parentMessageId);
    }

    // Also include threads where you authored the parent and someone replied.
    for (const m of myMessages) {
      if (m.parentMessageId) continue;

      const hasReply = await ctx.db
        .query("messages")
        .withIndex("by_parent_message_id", (q: any) => q.eq("parentMessageId", m._id))
        .take(1);
      if (hasReply.length > 0) parentIds.add(m._id);
    }

    const results: any[] = [];
    for (const parentId of parentIds) {
      const parent = await ctx.db.get(parentId);
      if (!parent) continue;
      if (parent.workspaceId !== args.workspaceId) continue;
      // Safety: parent should be top-level.
      if (parent.parentMessageId) continue;

      const channel = await ctx.db.get(parent.channelId);
      if (!channel) continue;

      const parentUser = await ctx.db.get(parent.userId);
      const parentImageUrl = parent.imageId ? await ctx.storage.getUrl(parent.imageId) : null;

      const replies = await ctx.db
        .query("messages")
        .withIndex("by_parent_message_id", (q: any) => q.eq("parentMessageId", parent._id))
        .order("asc")
        .collect();

      const lastReply = replies[replies.length - 1] ?? null;
      const lastReplyImageUrl = lastReply?.imageId ? await ctx.storage.getUrl(lastReply.imageId) : null;
      const lastReplyUser = lastReply ? await ctx.db.get(lastReply.userId) : null;

      const rawParentBody = (parent.body ?? "").trim();
      const parentText = rawParentBody ? stripHtmlToText(rawParentBody) : "";
      const parentPreview = parentText || (parentImageUrl ? "Sent an image" : "");

      const rawLastBody = (lastReply?.body ?? "").trim();
      const lastText = rawLastBody ? stripHtmlToText(rawLastBody) : "";
      const lastPreview = lastText || (lastReplyImageUrl ? "Sent an image" : "");

      results.push({
        parentMessageId: parent._id,
        channelId: parent.channelId,
        channelName: channel.name,
        parent: {
          _id: parent._id,
          createdAt: parent.createdAt,
          preview: parentPreview,
          imageUrl: parentImageUrl,
          user: parentUser
            ? { _id: parentUser._id, name: parentUser.name ?? null, image: parentUser.image ?? null }
            : { _id: parent.userId, name: null, image: null },
        },
        replyCount: replies.length,
        lastReplyAt: lastReply?.createdAt ?? parent.createdAt,
        lastReply: lastReply
          ? {
              _id: lastReply._id,
              createdAt: lastReply.createdAt,
              preview: lastPreview,
              imageUrl: lastReplyImageUrl,
              user: lastReplyUser
                ? { _id: lastReplyUser._id, name: lastReplyUser.name ?? null, image: lastReplyUser.image ?? null }
                : { _id: lastReply.userId, name: null, image: null },
            }
          : null,
      });
    }

    results.sort((a, b) => (b.lastReplyAt ?? 0) - (a.lastReplyAt ?? 0));
    return results;
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

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await requireChannelMember(ctx, message.channelId);

    const reactions = ((message.reactions ?? []) as Reaction[]).filter(
      (r) => r && r.emoji && r.userId
    );

    const existingIndex = reactions.findIndex(
      (r) => r.emoji === args.emoji && r.userId === userId
    );

    const nextReactions =
      existingIndex >= 0
        ? reactions.filter((_, idx) => idx !== existingIndex)
        : [...reactions, { emoji: args.emoji, userId }];

    await ctx.db.patch(message._id, {
      reactions: nextReactions,
    });

    return { success: true };
  },
});
