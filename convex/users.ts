import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { auth } from "./auth"

export const current = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) {
            return null
        }

        return await ctx.db.get(userId)
    }
})

export const updateMyName = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) {
            throw new Error("Not authenticated")
        }

        const name = args.name.trim()
        if (!name) {
            throw new Error("Name cannot be empty")
        }

        await ctx.db.patch(userId, { name })
        return { success: true }
    },
})