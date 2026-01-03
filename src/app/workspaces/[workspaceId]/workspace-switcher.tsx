"use client";



import { 
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
 } from "@/components/ui/dropdown-menu";

import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useCreateWorkspaceModal } from "@/features/workspaces/store/use-create-workspace-modal";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Loader, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export const WorkspaceSwitcher = () => {
    const workspaceId = useWorkspaceId();

    const router = useRouter();

    const [_open, setOpen] = useCreateWorkspaceModal();

    const { data: workspaces, isLoading: workspacesLoading } = useGetWorkspaces(); 

    const { data, isLoading: workspaceLoading } = useGetWorkspace({
         id: workspaceId 
        });

        const filteredWorkspaces = workspaces?.filter(
            (workspace) => workspace._id !== workspaceId
        )
            
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="w-10 h-10 bg-white rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center cursor-pointer">
                {workspaceLoading ? (
                    <Loader className="size-5 text-black animate-spin shrink-0" />
                ) : (
                    <span className="text-black text-sm font-medium">
                        {data?.name ? data.name.charAt(0).toUpperCase() : "W"}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="w-64">
                <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspaceId}`)} className="font-semibold flex-col justify-start items-start capitalize">
                    {data?.name}
                    <span className="-mt-0.5 text-xs leading-none text-muted-foreground">Active Group</span>
                </DropdownMenuItem>
                {filteredWorkspaces?.map((workspace) => (
                    <DropdownMenuItem 
                        key={workspace._id} 
                        onClick={() => router.push(`/workspaces/${workspace._id}`)}
                        className="capitalize cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap flex items-center"
                    >
                        <div className="shrink-0 size-9 relative overflow-hidden bg-[#616061] text-white font-semibold text-lg rounded-md flex items-center justify-center mr-2">
                            {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="truncate">{workspace.name}</p>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuItem className="cursor-pointer" onClick={() => setOpen(true)}>
                    <div className="size-9 relative overflow-hidden bg-[#F2F2F2] text-slate-800 font-semibold text-lg rounded-md flex items-center justify-center mr-2">
                       <Plus className="size-6" />
                    </div>
                    Create a new group
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default WorkspaceSwitcher;