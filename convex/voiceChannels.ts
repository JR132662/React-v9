import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const requireWorkspaceAdmin = async (ctx: any, workspaceId: any) => {
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

	if (!member || member.role !== "admin") {
		throw new Error("Not authorized");
	}

	return { userId, member };
};

export const current = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, args) => {
		const userId = await auth.getUserId(ctx);
		if (!userId) return [];

		const member = await ctx.db
			.query("members")
			.withIndex("by_workspace_id_user_id", (q: any) =>
				q.eq("workspaceId", args.workspaceId).eq("userId", userId)
			)
			.unique();

		if (!member) return [];

		return await ctx.db
			.query("voiceChannels")
			.withIndex("by_workspace_id", (q: any) => q.eq("workspaceId", args.workspaceId))
			.collect();
	},
});

export const getById = query({
	args: { id: v.id("voiceChannels") },
	handler: async (ctx, args) => {
		const userId = await auth.getUserId(ctx);
		if (!userId) return null;

		const voiceChannel = await ctx.db.get(args.id);
		if (!voiceChannel) return null;

		const member = await ctx.db
			.query("members")
			.withIndex("by_workspace_id_user_id", (q: any) =>
				q.eq("workspaceId", voiceChannel.workspaceId).eq("userId", userId)
			)
			.unique();

		if (!member) return null;

		return voiceChannel;
	},
});

export const create = mutation({
	args: {
		workspaceId: v.id("workspaces"),
		name: v.string(),
	},
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

		const name = args.name.trim();
		if (name.length < 3) throw new Error("Voice channel name must be at least 3 characters");

		const voiceChannelId = await ctx.db.insert("voiceChannels", {
			workspaceId: args.workspaceId,
			name,
			createdBy: userId,
			createdAt: Date.now(),
		});

		return { voiceChannelId };
	},
});

export const updateName = mutation({
	args: {
		id: v.id("voiceChannels"),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await auth.getUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const voiceChannel = await ctx.db.get(args.id);
		if (!voiceChannel) throw new Error("Voice channel not found");

		await requireWorkspaceAdmin(ctx, voiceChannel.workspaceId);

		const name = args.name.trim();
		if (name.length < 3) {
			throw new Error("Voice channel name must be at least 3 characters");
		}

		await ctx.db.patch(args.id, { name });
		return { success: true };
	},
});

export const remove = mutation({
	args: { id: v.id("voiceChannels") },
	handler: async (ctx, args) => {
		const userId = await auth.getUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const voiceChannel = await ctx.db.get(args.id);
		if (!voiceChannel) throw new Error("Voice channel not found");

		await requireWorkspaceAdmin(ctx, voiceChannel.workspaceId);

		await ctx.db.delete(args.id);
		return { success: true };
	},
});


