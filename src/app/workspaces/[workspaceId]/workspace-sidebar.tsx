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




export const WorkSpaceSidebar = () => {
  const workspaceId = useWorkspaceId();
  const channelId = useChannelId();

  const router = useRouter();

  const [open, setOpen] = useCreateChannelModal();

  const { data: member, isLoading: memberLoading } = UseCurrentMember({ workspaceId });

  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({ id: workspaceId });

  const { data: workspaces, isLoading: workspacesLoading } = useGetWorkspaces();

  const { data: channels, isLoading: channelsLoading } = UseGetChannels({ workspaceId });

  const { data: members, isLoading: membersLoading } = useGetMembers({ workspaceId });



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

	  <div className="relative flex flex-col bg-sidebar h-full border-r border-purple-500/50 before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-purple-500/50 before:opacity-100 before:animate-pulse before:[animation-duration:1.6s]">
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
                      />
                  ))}
              </WorkSpaceSection>
              <WorkSpaceSection
                  label="Direct Messages"
                  hint="New direct message"
                  onNew={() => {
                      console.log("Add member")
                  }}
              >
              {members?.map((item) => (
                  <UserItem
                      key={item.user._id}
                      id={item.member._id}
                      label={item.user.name?.toLowerCase() || "Unnamed"}
                      image={item.user.image}
                  />
              ))}
              </WorkSpaceSection>
      </div>
      </>
  );
}

export default WorkSpaceSidebar;