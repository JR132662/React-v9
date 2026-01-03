"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type NotificationLevel = "all" | "mentions" | "none";

type PreferencesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Doc<"workspaces"> | null;
  isAdmin?: boolean;
};

export const PreferencesModal = ({
  open,
  onOpenChange,
  workspace,
  isAdmin,
}: PreferencesModalProps) => {
  const router = useRouter();
  const workspaceName = workspace?.name ?? "Workspace";
  const workspaceId = workspace?._id;

  const [name, setName] = React.useState(workspace?.name ?? "");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState("");

  React.useEffect(() => {
    setName(workspace?.name ?? "");
  }, [workspace?.name, open]);

  const members = useQuery(
    api.members.listByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  );
  const myMember = useQuery(
    api.members.current,
    workspaceId ? { workspaceId } : "skip"
  );

  const updateName = useMutation(api.workspaces.updateName);
  const regenerateJoinCode = useMutation(api.workspaces.regenerateJoinCode);
  const removeWorkspace = useMutation(api.workspaces.remove);
  const updateRole = useMutation(api.members.updateRole);
  const removeMember = useMutation(api.members.removeMember);
  const updateMyNotificationSettings = useMutation(
    api.members.updateMyNotificationSettings
  );

  const currentMuted = myMember?.muted ?? false;
  const currentLevel =
    (myMember?.notificationLevel as NotificationLevel | undefined) ?? "all";

  const nameChanged = (name ?? "").trim() !== (workspace?.name ?? "").trim();
  const canSaveName = Boolean(isAdmin && workspaceId && nameChanged);

  const handleCopyInvite = async () => {
    if (!workspace?.joinCode) return;
    try {
      await navigator.clipboard.writeText(workspace.joinCode);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy invite code");
    }
  };

  const handleRegenerateInvite = async () => {
    if (!workspaceId) return;
    try {
      await regenerateJoinCode({ id: workspaceId });
      toast.success("Invite code regenerated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSaveName = async () => {
    if (!workspaceId) return;
    try {
      await updateName({ id: workspaceId, name });
      toast.success("Workspace updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    try {
      await removeWorkspace({ id: workspaceId });
      toast.success("Workspace deleted");
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      router.push("/");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setDeleteConfirmOpen(false);
          setDeleteConfirmName("");
        }
      }}
    >
      <DialogContent className="p-0 sm:max-w-[780px]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Preferences</DialogTitle>
          <DialogDescription>
            Manage settings for{" "}
            <span className="font-medium">{workspaceName}</span>.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Tabs defaultValue="general" className="flex min-h-[520px]">
          {/* Left nav */}
          <div className="w-[220px] border-r px-2 py-3">
            <TabsList className="flex h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
              <TabsTrigger
                value="general"
                className="justify-start data-[state=active]:bg-muted"
              >
                General
              </TabsTrigger>

              <TabsTrigger
                value="members"
                className="justify-start data-[state=active]:bg-muted"
              >
                Members
              </TabsTrigger>

              <TabsTrigger
                value="notifications"
                className="justify-start data-[state=active]:bg-muted"
              >
                Notifications
              </TabsTrigger>

              {isAdmin ? (
                <TabsTrigger
                  value="danger"
                  className="justify-start data-[state=active]:bg-muted"
                >
                  Delete Group
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>

          {/* Right content */}
          <div className="flex-1 px-6 py-4">
            <TabsContent value="general" className="mt-0 space-y-6">
              <div>
                <h3 className="text-base font-semibold">General</h3>
                <p className="text-sm text-muted-foreground">
                  Basic workspace details.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace name</Label>
                <Input
                  id="workspaceName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a workspace name"
                  disabled={!isAdmin}
                />
                {!isAdmin ? (
                  <p className="text-xs text-muted-foreground">
                    Only admins can rename this workspace.
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  onClick={handleSaveName}
                  disabled={!canSaveName}
                  className="bg-purple-600 text-white hover:bg-purple-600/90"
                >
                  Save changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="members" className="mt-0 space-y-4">
              <div>
                <h3 className="text-base font-semibold">Members</h3>
                <p className="text-sm text-muted-foreground">
                  View members, invite, and manage roles.
                </p>
              </div>

              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Invite code</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Share this code to let someone join.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyInvite}
                      disabled={!workspace?.joinCode}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateInvite}
                      disabled={!isAdmin || !workspaceId}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>

                <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
                  {workspace?.joinCode ?? "—"}
                </div>
              </div>

              <div className="rounded-md border">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium">Members</p>
                  <p className="text-xs text-muted-foreground">
                    {members === undefined
                      ? "Loading…"
                      : `${members?.length ?? 0} total`}
                  </p>
                </div>

                <div className="divide-y">
                  {(members ?? []).map(({ member, user }) => {
                    const displayName =
                      (user as any)?.name ?? (user as any)?.email ?? member.userId;
                    const isSelf = myMember ? member.userId === myMember.userId : false;

                    return (
                      <div
                        key={member._id}
                        className="px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.role}
                            {isSelf ? " • you" : ""}
                          </p>
                        </div>

                        {isAdmin && !isSelf ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                if (!workspaceId) return;
                                try {
                                  await updateRole({
                                    workspaceId,
                                    userId: member.userId,
                                    role:
                                      member.role === "admin" ? "member" : "admin",
                                  });
                                  toast.success("Role updated");
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                            >
                              {member.role === "admin" ? "Make member" : "Make admin"}
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                if (!workspaceId) return;
                                try {
                                  await removeMember({
                                    workspaceId,
                                    userId: member.userId,
                                  });
                                  toast.success("Member removed");
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {members !== undefined && (members?.length ?? 0) === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No members found.
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 space-y-4">
              <div>
                <h3 className="text-base font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Group-specific notification preferences.
                </p>
              </div>

              <div className="rounded-md border p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Mute group</p>
                    <p className="text-xs text-muted-foreground">
                      Stop notifications from this group.
                    </p>
                  </div>
                  <Button
                    variant={currentMuted ? "secondary" : "outline"}
                    size="sm"
                    onClick={async () => {
                      if (!workspaceId) return;
                      try {
                        await updateMyNotificationSettings({
                          workspaceId,
                          muted: !currentMuted,
                          notificationLevel: currentLevel,
                        });
                        toast.success(currentMuted ? "Unmuted" : "Muted");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    disabled={!workspaceId}
                  >
                    {currentMuted ? "Muted" : "Mute"}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Notification level</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["all", "mentions", "none"] as const).map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={currentLevel === level ? "secondary" : "outline"}
                        onClick={async () => {
                          if (!workspaceId) return;
                          try {
                            await updateMyNotificationSettings({
                              workspaceId,
                              muted: currentMuted,
                              notificationLevel: level,
                            });
                            toast.success("Notification level updated");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        disabled={!workspaceId}
                      >
                        {level === "all"
                          ? "All"
                          : level === "mentions"
                          ? "Mentions"
                          : "None"}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stored per member (your settings only).
                  </p>
                </div>
              </div>
            </TabsContent>

            {isAdmin ? (
              <TabsContent value="danger" className="mt-0 space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Delete Group</h3>
                  <p className="text-sm text-muted-foreground">
                    This action is irreversible. Please proceed with caution.
                  </p>
                </div>

                <div className="rounded-md border border-destructive/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">Delete Group</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently deletes{" "}
                        <span className="font-medium">{workspaceName}</span>.
                        This cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={!workspaceId}
                    >
                      Delete
                    </Button>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    You’ll be asked to confirm the workspace name.
                  </p>
                </div>

                <Dialog
                  open={deleteConfirmOpen}
                  onOpenChange={(v) => {
                    setDeleteConfirmOpen(v);
                    if (!v) setDeleteConfirmName("");
                  }}
                >
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle>Delete Group</DialogTitle>
                      <DialogDescription>
                        Type <span className="font-medium">{workspaceName}</span> to
                        confirm.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirm">Group name</Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={workspaceName}
                      />
                      <p className="text-xs text-muted-foreground">
                        This action cannot be undone.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setDeleteConfirmOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteWorkspace}
                        disabled={deleteConfirmName.trim() !== workspaceName.trim()}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            ) : null}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PreferencesModal;