import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseGetVoiceChannelsProps {
  workspaceId: Id<"workspaces">;
}

export const useGetVoiceChannels = ({ workspaceId }: UseGetVoiceChannelsProps) => {
  const data = useQuery(api.voiceChannels.current, { workspaceId });
  const isLoading = data === undefined;

  return {
    data,
    isLoading,
  };
};
