import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseGetMembersProps {
  workspaceId?: Id<"workspaces">;
}

export const useGetMembers = ({ workspaceId }: UseGetMembersProps) => {
  const data = useQuery(
    api.members.listByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  );
  const isLoading = data === undefined;

  return { data, isLoading };
};

export default useGetMembers;