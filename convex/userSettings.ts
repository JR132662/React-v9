import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const requireUser = async (ctx: any) => {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return { userId };
};

export const getMy = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .unique();

    if (!existing) {
      return { userId, phone: null };
    }

    return { userId, phone: existing.phone ?? null };
  },
});

export const updateMy = mutation({
  args: {
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const phone = (args.phone ?? "").trim();
    const normalized = phone ? phone : undefined;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .unique();

    if (!existing) {
      await ctx.db.insert("userSettings", {
        userId,
        phone: normalized,
        createdAt: Date.now(),
      });
      return { success: true };
    }

    await ctx.db.patch(existing._id, {
      phone: normalized,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
