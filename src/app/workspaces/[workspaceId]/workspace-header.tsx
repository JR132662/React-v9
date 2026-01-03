"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Doc } from "../../../../convex/_generated/dataModel";
import { ChevronDown, ListFilter, MailPlus, Settings, SquarePen } from "lucide-react";
import { Hint } from "@/components/hint";
import PreferencesModal from "./preferences-modal";
import { InviteModal } from "./invite-modal";

interface WorkspaceHeaderProps {
  workspace: Doc<"workspaces"> | null;
  isAdmin?: boolean;
}

export const WorkspaceHeader = ({ workspace, isAdmin }: WorkspaceHeaderProps) => {
  const [prefsOpen, setPrefsOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  return (
    <>
      <InviteModal
        open={inviteOpen}
        setOpen={setInviteOpen}
        name={workspace?.name || ""}
        joinCode={workspace?.joinCode || ""}
      />
      <PreferencesModal
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        workspace={workspace}
        isAdmin={isAdmin}
      />

      <div className="flex items-center justify-between px-4 h-[49px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="transparent"
              size="sm"
              className="font-semibold text-lg w-auto p-1.5 overflow-hidden"
            >
              <span className="truncate text-sidebar-foreground">{workspace ? workspace.name : "Workspace"}</span>
              <ChevronDown className="size-4 ml-1 shrink-0 text-sidebar-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="start" className="w-64 p-2">
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer capitalize rounded-md p-2">
              <div className="size-9 overflow-hidden bg-[#616061] text-white font-semibold text-xl rounded-md flex items-center justify-center">
                {workspace?.name?.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex flex-col items-start">
                <p className="font-bold truncate w-full">{workspace?.name}</p>
                <p className="text-xs text-muted-foreground truncate w-full">Active workspace</p>
              </div>
            </DropdownMenuItem>

            {isAdmin && (
              <>
                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem className="cursor-pointer rounded-md p-2 flex items-center gap-2" onSelect={() => setInviteOpen(true)}>
                  <MailPlus className="size-4 shrink-0"  />
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap font-semibold">
                    Invite Member to {workspace?.name}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => setPrefsOpen(true)}
                  className="cursor-pointer rounded-md p-2 flex items-center gap-2"
                >
                  <Settings className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap font-semibold">
                    Preferences
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5">
          <Hint label="Filter views" side="bottom">
            <Button variant="transparent" size="lg" className="p-1.5">
              <ListFilter className="size-4 text-sidebar-foreground" />
            </Button>
          </Hint>
          <Hint label="New Message" side="bottom">
            <Button variant="transparent" size="lg" className="p-1.5">
              <SquarePen className="size-4 text-sidebar-foreground" />
            </Button>
          </Hint>
        </div>
      </div>
    </>
  );
};

export default WorkspaceHeader;