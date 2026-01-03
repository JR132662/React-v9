import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

type Reaction = { emoji: string; userId: any };

const stripHtmlToText = (input: string) => {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

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

const requireWorkspaceMember = async (ctx: any, workspaceId: any) => {
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

const sortPair = (a: any, b: any) => {
  const as = String(a);
  const bs = String(b);
  return as < bs ? [a, b] : [b, a];
};

export const getOrCreateConversation = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceMember(ctx, args.workspaceId);

    if (userId === args.otherUserId) {
      throw new Error("Cannot message yourself");
    }

    const [userIdA, userIdB] = sortPair(userId, args.otherUserId);

    const existing = await ctx.db
      .query("directConversations")
      .withIndex("by_workspace_user_pair", (q: any) =>
        q
          .eq("workspaceId", args.workspaceId)
          .eq("userIdA", userIdA)
          .eq("userIdB", userIdB)
      )
      .unique();

    if (existing) {
      return { conversationId: existing._id };
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("directConversations", {
      workspaceId: args.workspaceId,
      userIdA,
      userIdB,
      createdAt: now,
      lastReadAtA: userId === userIdA ? now : undefined,
      lastReadAtB: userId === userIdB ? now : undefined,
    });

    return { conversationId };
  },
});

const requireConversationParticipant = async (ctx: any, conversationId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const conversation = await ctx.db.get(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  await requireWorkspaceMember(ctx, conversation.workspaceId);

  const isParticipant =
    conversation.userIdA === userId || conversation.userIdB === userId;
  if (!isParticipant) {
    throw new Error("Not authorized");
  }

  return { userId, conversation };
};

export const listByConversation = query({
  args: { conversationId: v.id("directConversations") },
  handler: async (ctx, args) => {
    const { userId, conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId
    );

    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation_id", (q: any) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    const results = [];
    for (const message of messages) {
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
        workspaceId: conversation.workspaceId,
      });
    }

    return results;
  },
});

export const listByConversationPaginated = query({
  args: {
    conversationId: v.id("directConversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId, conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId
    );

    const page = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation_id", (q: any) =>
        q.eq("conversationId", args.conversationId)
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
        workspaceId: conversation.workspaceId,
      });
    }

    return {
      ...page,
      page: results,
    };
  },
});

export const listConversations = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceMember(ctx, args.workspaceId);

    const [asA, asB] = await Promise.all([
      ctx.db
        .query("directConversations")
        .withIndex("by_workspace_user_a", (q: any) =>
          q.eq("workspaceId", args.workspaceId).eq("userIdA", userId)
        )
        .collect(),
      ctx.db
        .query("directConversations")
        .withIndex("by_workspace_user_b", (q: any) =>
          q.eq("workspaceId", args.workspaceId).eq("userIdB", userId)
        )
        .collect(),
    ]);

    const conversations = [...asA, ...asB];

    const results = [] as Array<any>;

    for (const conversation of conversations) {
      const otherUserId =
        conversation.userIdA === userId
          ? conversation.userIdB
          : conversation.userIdA;

      const otherUser = await ctx.db.get(otherUserId);
      if (!otherUser) continue;

      const otherMember = await ctx.db
        .query("members")
        .withIndex("by_workspace_id_user_id", (q: any) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", otherUserId)
        )
        .unique();

      if (!otherMember) continue;

      const last = await ctx.db
        .query("directMessages")
        .withIndex("by_conversation_id", (q: any) =>
          q.eq("conversationId", conversation._id)
        )
        .order("desc")
        .take(1);

      const lastMessage = last[0] ?? null;
      const lastImageUrl = lastMessage?.imageId
        ? await ctx.storage.getUrl(lastMessage.imageId)
        : null;

      const rawBody = (lastMessage?.body ?? "").trim();
      const textBody = rawBody ? stripHtmlToText(rawBody) : "";

      const preview =
        textBody || (lastImageUrl ? "Sent an image" : "No messages yet");

      results.push({
        conversationId: conversation._id,
        otherMemberId: otherMember._id,
        otherUser: {
          _id: otherUser._id,
          name: otherUser.name ?? null,
          image: otherUser.image ?? null,
        },
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id,
              createdAt: lastMessage.createdAt,
              preview,
              imageUrl: lastImageUrl,
            }
          : null,
        lastActivityAt: lastMessage?.createdAt ?? conversation.createdAt,
      });
    }

    results.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));
    return results;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("directConversations"),
    body: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId
    );

    const body = (args.body ?? "").trim();
    if (!body && !args.imageId) {
      throw new Error("Message cannot be empty");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("directMessages", {
      conversationId: args.conversationId,
      workspaceId: conversation.workspaceId,
      userId,
      body: body || undefined,
      imageId: args.imageId,
      createdAt: now,
    });

    // Sender has necessarily seen their own message.
    await ctx.db.patch(conversation._id, {
      ...(conversation.userIdA === userId
        ? { lastReadAtA: Math.max((conversation as any).lastReadAtA ?? 0, now) }
        : { lastReadAtB: Math.max((conversation as any).lastReadAtB ?? 0, now) }),
    });

    // Notify the other participant
    const otherUserId =
      conversation.userIdA === userId ? conversation.userIdB : conversation.userIdA;

    const otherMember = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q: any) =>
        q.eq("workspaceId", conversation.workspaceId).eq("userId", otherUserId)
      )
      .unique();

    if (otherMember && !otherMember.muted && otherMember.notificationLevel !== "none") {
      const stripHtmlToText = (input: string) =>
        input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      const preview = body ? stripHtmlToText(body).slice(0, 140) : args.imageId ? "Sent an image" : "";

      await ctx.db.insert("notifications", {
        userId: otherMember.userId,
        workspaceId: conversation.workspaceId,
        type: "dm",
        fromUserId: userId,
        conversationId: args.conversationId,
        directMessageId: messageId,
        preview: preview || undefined,
        createdAt: now,
      });
    }

    return { messageId };
  },
});

export const getReadState = query({
  args: {
    conversationId: v.id("directConversations"),
  },
  handler: async (ctx, args) => {
    const { userId, conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId
    );

    const lastReadAtA = (conversation as any).lastReadAtA ?? 0;
    const lastReadAtB = (conversation as any).lastReadAtB ?? 0;

    const myLastReadAt = conversation.userIdA === userId ? lastReadAtA : lastReadAtB;
    const otherLastReadAt = conversation.userIdA === userId ? lastReadAtB : lastReadAtA;

    return { myLastReadAt, otherLastReadAt };
  },
});

export const markConversationRead = mutation({
  args: {
    conversationId: v.id("directConversations"),
  },
  handler: async (ctx, args) => {
    const { userId, conversation } = await requireConversationParticipant(
      ctx,
      args.conversationId
    );

    const now = Date.now();

    if (conversation.userIdA === userId) {
      const prev = (conversation as any).lastReadAtA ?? 0;
      if (now > prev) {
        await ctx.db.patch(conversation._id, { lastReadAtA: now });
      }
      return { success: true, at: Math.max(prev, now) };
    }

    const prev = (conversation as any).lastReadAtB ?? 0;
    if (now > prev) {
      await ctx.db.patch(conversation._id, { lastReadAtB: now });
    }
    return { success: true, at: Math.max(prev, now) };
  },
});

const requireMessageOwnerOrAdmin = async (ctx: any, messageId: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const message = await ctx.db.get(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  const { member } = await requireWorkspaceMember(ctx, message.workspaceId);

  const isOwner = message.userId === userId;
  const isAdmin = member.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized");
  }

  return { userId, message, member };
};

export const update = mutation({
  args: {
    messageId: v.id("directMessages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { message, userId } = await requireMessageOwnerOrAdmin(
      ctx,
      args.messageId
    );

    if (message.userId !== userId) {
      throw new Error("Not authorized");
    }

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
  args: { messageId: v.id("directMessages") },
  handler: async (ctx, args) => {
    const { message } = await requireMessageOwnerOrAdmin(ctx, args.messageId);
    await ctx.db.delete(message._id);
    return { success: true };
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("directMessages"),
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

    await requireWorkspaceMember(ctx, message.workspaceId);

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
