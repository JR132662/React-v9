"use client";


import { UseGetChannels } from "@/features/channels/api/use-get-channels";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader, MessageCircleWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [open, setOpen] = useCreateChannelModal();

  const {data: workspace, isLoading: workspaceLoading} = useGetWorkspace({ id: workspaceId });
  const { data: channels, isLoading: channelsLoading } = UseGetChannels({ workspaceId });

  const channelId= useMemo(() => channels?.[0]?._id ?? null, [channels]);

  useEffect(() => {
    if (workspaceLoading || channelsLoading || !workspaceId) return;

    if (channelId) {
      router.push(`/workspaces/${workspaceId}/channel/${channelId}`);
    } else if (!open) {
      setOpen(true);
    }
  }, [workspaceLoading, channelsLoading, workspace, channelId, router, workspaceId, open, setOpen]);

  if (workspaceLoading || channelsLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <MessageCircleWarning className="size-6 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Group not found</span>
      </div>
    );
  }

  return null;
}

export default WorkspaceIdPage;