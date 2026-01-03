import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

const requireAdmin = async (ctx: any, workspaceId: any) => {
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

export const newJoinCode = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    if (!userId) {
      return [];
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();


    if (!member || member.role !== "admin") {
      throw new Error("Not authorized");
    }

    const joinCode = GenerateCode();
    await ctx.db.patch(args.workspaceId,
       { joinCode });

    return args.workspaceId;
  }
});

const GenerateCode = () => {
  const code = Array.from({ length: 6 },
     () => Math.floor(Math.random() * 10).toString()
  ).join("");
  return code;
};

export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) =>{
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const joinCode = GenerateCode();
        

        const workSpaceId = await ctx.db.insert("workspaces", {
            name: args.name,
            userId,
            joinCode
        })

        await ctx.db.insert("members", {
            userId,
            workspaceId: workSpaceId,
          role: "admin",
          muted: false,
          notificationLevel: "all",
        });

        await ctx.db.insert("channels", {
            name: "general",
            workspaceId: workSpaceId,
            createdBy: userId,
        });


        return { workSpaceId, joinCode };
    }
});

export const updateName = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.id);

    const name = args.name.trim();
    if (!name) {
      throw new Error("Name is required");
    }

    await ctx.db.patch(args.id, { name });
    return await ctx.db.get(args.id);
  },
});

export const regenerateJoinCode = mutation({
  args: {
    id: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.id);

    const joinCode = GenerateCode();
    await ctx.db.patch(args.id, { joinCode });
    return { joinCode };
  },
});

export const remove = mutation({
  args: {
    id: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.id);

    const members = await ctx.db
      .query("members")
      .withIndex("by_Workspace_Id", (q) => q.eq("workspaceId", args.id))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get Query to fetch workspaces for the logged-in user

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);

    // If not logged in, don't return global workspaces
    if (!userId) return [];

    const members = await ctx.db
      .query("members")
      .withIndex("by_User_Id", (q) => q.eq("userId", userId))
      .collect();

    const workspaceIds = members.map((member) => member.workspaceId);

    const workspaces = [];

    for (const workspaceId of workspaceIds) {
      const workspace = await ctx.db.get(workspaceId);

      if (workspace) {
        workspaces.push(workspace);
      }
    }

    return workspaces;
  },
});

export const getById = query({
  args: {id: v.id("workspaces")},
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", args.id).eq("userId", userId)
      )
      .unique();

    if (!member) {
      return null;
    }

    return await ctx.db.get(args.id);
  }
})

export const join = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("joinCode"), args.joinCode))
      .unique();
    if (!workspace) {
      throw new Error("Invalid join code");
    }
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_workspace_id_user_id", (q) =>
        q.eq("workspaceId", workspace._id).eq("userId", userId)
      )
      .unique();
    if (existingMember) {
      return workspace;
    }
    await ctx.db.insert("members", {
      userId,
      workspaceId: workspace._id,
      role: "member",
      muted: false,
      notificationLevel: "all",
    });
    return workspace;
  },
});