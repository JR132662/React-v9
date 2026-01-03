"use client";

import { CreateChannelModal } from "@/features/channels/components/create-channel-modal";
import { UseCurrentMember } from "@/features/members/api/use-current-member";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { AlertTriangleIcon, Atom, HashIcon, Loader, Mail, MessageSquare, MessageSquareText, PersonStanding, PhoneCall, SendHorizonal } from "lucide-react";
import { WorkspaceHeader } from "./workspace-header";
import SideBarItem from "./sidebar-item";
import { UseGetChannels } from "@/features/channels/api/use-get-channels";
import WorkSpaceSection from "./workspace-section";
import { useGetMembers } from "@/features/channels/api/use-get-members";
import UserItem from "./user-item";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useChannelId } from "@/hooks/use-channel-id";
import { useCreateDmModal } from "@/features/direct-messages/store/use-create-dm-modal";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";




export const WorkSpaceSidebar = () => {
  const workspaceId = useWorkspaceId();
  const channelId = useChannelId();

  const router = useRouter();

  const [open, setOpen] = useCreateChannelModal();

  const { data: member, isLoading: memberLoading } = UseCurrentMember({ workspaceId });

  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({ id: workspaceId });

  const { data: workspaces, isLoading: workspacesLoading } = useGetWorkspaces();

  const { data: channels, isLoading: channelsLoading } = UseGetChannels({ workspaceId });

    const removeChannel = useMutation(api.channels.remove);
    const renameChannel = useMutation(api.channels.updateName);
    const formatDisplayName = (rawName: string | null | undefined) => {
        const name = String(rawName ?? "").trim();
        if (!name) return "Unnamed";

        return name
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    };

  const { data: members, isLoading: membersLoading } = useGetMembers({ workspaceId });

    const { data: currentUser } = useCurrentUser();

    const otherMembers = (members ?? []).filter(
        (m) => !currentUser?._id || m.user._id !== currentUser._id
    );

    const [dmOpen, setDmOpen] = useCreateDmModal();



    useEffect(() => {
        if (workspacesLoading || workspaceLoading || memberLoading) return;

        // If the URL points at a workspace the user can't access (common right after sign-in
        // when redirecting back to a stale workspaceId), send them to their first workspace.
        if (!workspace || !member) {
            const fallback = workspaces?.[0]?._id;
            if (fallback) {
                router.replace(`/workspaces/${String(fallback)}`);
            }
        }
    }, [workspacesLoading, workspaceLoading, memberLoading, workspace, member, workspaces, router]);

    useEffect(() => {
        if (channelsLoading || memberLoading || workspaceLoading) return;
        if (!workspace || !member) return;

        if ((channels?.length ?? 0) === 0 && !open) {
            setOpen(true);
        }
    }, [channelsLoading, memberLoading, workspaceLoading, workspace, member, channels, open, setOpen]);

  if (memberLoading || workspaceLoading) {
      return (
          <div className="flex flex-col bg-sidebar h-full items-center justify-center">
              <Loader className="size-5 text-sidebar-foreground animate-spin" />
          </div>
      );
  }

  if (!workspace || !member) {
      return (
          <div className="flex flex-col gap-y-2 bg-sidebar h-full items-center justify-center">
              <AlertTriangleIcon className="size-5 text-sidebar-foreground" />
              <p className="text-sidebar-foreground text-sm">group not found</p>
          </div>
      );
  }

  

  return (
      <>
      <CreateChannelModal />

      <div className="relative flex flex-col bg-sidebar h-full border-r border-purple-500/50 before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-purple-500/50 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]">
          <WorkspaceHeader workspace={workspace} isAdmin={member.role === "admin"} />
          <div className="flex flex-col p-2 mt-3">
              <SideBarItem
                  label="Threads"
                  icon={MessageSquareText}
                  id="threads"
              />
              <SideBarItem
                  label="Drafts & Sent"
                  icon={SendHorizonal}
                  id="drafts-sent"
              />
              <SideBarItem
                  label="Ai Assistant"
                  icon={Atom}
                  id="ai-assistant"
              />
              <SideBarItem
                  label="Calls"
                  icon={PhoneCall}
                  id="calls"
              />
              </div>
              <WorkSpaceSection
                  label="Channels"
                  hint="Create a new channel"
                  onNew={() => setOpen(true)}
              >
                  {channels?.map((item) => (
                      <SideBarItem
                          key={item._id}
                          label={item.name.toLowerCase()}
                          icon={HashIcon}
                          id={item._id}
                          variant={channelId === item._id ? "active" : "default"}
                          actions={
                              member.role === "admin" ? (
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button
                                              type="button"
                                              size="icon-sm"
                                              variant="ghost"
                                              aria-label="Channel options"
                                              className="cursor-pointer hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
                                              onClick={(e) => e.stopPropagation()}
                                              onPointerDown={(e) => e.stopPropagation()}
                                          >
                                              <MoreHorizontal className="size-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="min-w-36">
                                          <DropdownMenuItem
                                              onSelect={() => {
                                                  const nextName = window.prompt(
                                                      "Rename channel",
                                                      item.name
                                                  );
                                                  const name = String(nextName ?? "").trim();
                                                  if (!name || name === item.name) return;

                                                  void (async () => {
                                                      try {
                                                          await renameChannel({
                                                              id: item._id,
                                                              name,
                                                          });
                                                      } catch (e) {
                                                          console.error(e);
                                                          window.alert(
                                                              e instanceof Error
                                                                  ? e.message
                                                                  : "Failed to rename channel"
                                                          );
                                                      }
                                                  })();
                                              }}
                                          >
                                              <Pencil className="mr-2 size-4" />
                                              Rename
                                          </DropdownMenuItem>

                                          <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onSelect={() => {
                                                  if (!window.confirm(`Delete #${item.name}?`)) return;
                                                  void (async () => {
                                                      try {
                                                          if (channelId === item._id) {
                                                              router.replace(`/workspaces/${workspaceId}`);
                                                          }
                                                          await removeChannel({ id: item._id });
                                                      } catch (e) {
                                                          console.error(e);
                                                          window.alert(
                                                              e instanceof Error
                                                                  ? e.message
                                                                  : "Failed to delete channel"
                                                          );
                                                      }
                                                  })();
                                              }}
                                          >
                                              <Trash2 className="mr-2 size-4" />
                                              Delete
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              ) : null
                          }
                      />
                  ))}
              </WorkSpaceSection>
              <WorkSpaceSection
                  label="Direct Messages"
                  hint="New direct message"
                  onNew={() => setDmOpen(true)}
              >
              {otherMembers.map((item) => (
                  <UserItem
                      key={item.user._id}
                      id={item.member._id}
                      label={formatDisplayName(item.user.name)}
                      image={item.user.image}
                  />
              ))}
              </WorkSpaceSection>
      </div>
      </>
  );
}

export default WorkSpaceSidebar;