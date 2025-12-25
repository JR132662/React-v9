import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) =>{
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const joinCode = "Disciples";

        const workSpaceId = await ctx.db.insert("workspaces", {
            name: args.name,
            userId,
            joinCode
        })

        return { workSpaceId, joinCode };
    }
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);

    // If not logged in, don't return global workspaces
    if (!userId) return [];

    const workspaces = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return workspaces;
  },
});