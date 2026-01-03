"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreateDmModal } from "../store/use-create-dm-modal";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useGetMembers } from "@/features/channels/api/use-get-members";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/api/use-current-user";

export const CreateDmModal = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [open, setOpen] = useCreateDmModal();

  const { data: currentUser } = useCurrentUser();

  const { data: members, isLoading } = useGetMembers({ workspaceId });

  const formatDisplayName = React.useCallback((rawName: string | null | undefined) => {
    const name = String(rawName ?? "").trim();
    if (!name) return "Unnamed";

    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }, []);

  const getInitials = React.useCallback((displayName: string) => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, []);

  const otherMembers = React.useMemo(() => {
    if (!members) return [];
    if (!currentUser?._id) return members;
    return members.filter((m) => m.user._id !== currentUser._id);
  }, [members, currentUser?._id]);

  const handleClose = () => setOpen(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/60 data-[state=open]:animate-fade-in" />
        <DialogContent className="fixed top-1/2 left-1/2 max-h-[85vh] w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-0 shadow-lg focus:outline-none data-[state=open]:animate-slide-in-from-bottom-96 text-foreground">
          <DialogHeader>
            <div className="border-b border-border px-5 py-4">
              <DialogTitle className="text-base font-semibold">New direct message</DialogTitle>
              <DialogDescription className="mt-1 text-muted-foreground">
                Choose someone in this workspace to message.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-5 pb-4 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader className="size-5 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-border bg-card/60 p-2">
                <div className="space-y-1">
                  {otherMembers.map((item) => {
                    const displayName = formatDisplayName(item.user.name);
                    const initials = getInitials(displayName);

                    return (
                      <Button
                        key={String(item.member._id)}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-accent"
                        onClick={() => {
                          handleClose();
                          router.push(
                            `/workspaces/${workspaceId}/members/${String(item.member._id)}`
                          );
                        }}
                      >
                        <Avatar className="size-9">
                          <AvatarImage alt={displayName} src={item.user.image ?? undefined} />
                          <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate text-foreground">
                            {displayName}
                          </div>
                        </div>
                      </Button>
                    );
                  })}

                  {otherMembers.length === 0 ? (
                    <div className="px-3 py-8 text-sm text-muted-foreground">
                      No one else is in this workspace yet.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default CreateDmModal;
