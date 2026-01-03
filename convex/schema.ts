import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
 
const schema = defineSchema({
  ...authTables,
  workspaces: defineTable({
    name: v.string(),
    userId: v.id("users"),
    joinCode: v.string(),
  }),

  userSettings: defineTable({
    userId: v.id("users"),
    phone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_user_id", ["userId"]),

  members: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    role: v.union(v.literal("admin"), v.literal("member")),
    muted: v.optional(v.boolean()),
    notificationLevel: v.optional(
      v.union(v.literal("all"), v.literal("mentions"), v.literal("none"))
    ),
  })
  .index("by_User_Id", ["userId"])
  .index("by_Workspace_Id", ["workspaceId"])
  .index("by_workspace_id_user_id", ["workspaceId", "userId"]),
  channels: defineTable({
    name: v.string(),
    workspaceId: v.id("workspaces"),
  createdBy: v.id("users"),
  }).index("by_workspace_id", ["workspaceId"]),

  messages: defineTable({
    channelId: v.id("channels"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    body: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id("users"),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_channel_id", ["channelId"]),

  directConversations: defineTable({
    workspaceId: v.id("workspaces"),
    userIdA: v.id("users"),
    userIdB: v.id("users"),
    createdAt: v.number(),
    lastReadAtA: v.optional(v.number()),
    lastReadAtB: v.optional(v.number()),
  })
    .index("by_workspace_user_pair", ["workspaceId", "userIdA", "userIdB"])
    .index("by_workspace_user_a", ["workspaceId", "userIdA"])
    .index("by_workspace_user_b", ["workspaceId", "userIdB"]),

  directMessages: defineTable({
    conversationId: v.id("directConversations"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    body: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id("users"),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_conversation_id", ["conversationId"]),

  notifications: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    type: v.union(v.literal("dm"), v.literal("mention")),
    fromUserId: v.optional(v.id("users")),
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("directConversations")),
    messageId: v.optional(v.id("messages")),
    directMessageId: v.optional(v.id("directMessages")),
    preview: v.optional(v.string()),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_user_workspace_createdAt", ["userId", "workspaceId", "createdAt"])
    .index("by_user_workspace_readAt", ["userId", "workspaceId", "readAt"]),

  

});
 
export default schema;