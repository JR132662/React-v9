"use client";
import { toast } from "sonner";

import type { FormEvent } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCreateWorkspaceModal } from "../store/use-create-workspace-modal";
import { useCreateWorkspace } from "../api/use-create-workspace";
import { useRouter } from "next/navigation";

export const CreateWorkspaceModal = () => {
    const router = useRouter();
    const [open, setOpen] = useCreateWorkspaceModal();

    const { mutate, error, isPending, isSuccess, isError } = useCreateWorkspace();

    const handleClose = () => setOpen(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);
        const name = String(formData.get("name") ?? "").trim();

        await mutate(
            { name },
            {
                onSuccess: (data) => {
                    toast.success("Your group created successfully!");
                    form.reset();
                    handleClose();

                    // Replace so Back won't return to the "create" step/page.
                    router.push(`/workspaces/${data.workSpaceId}`);
                },
            }
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isPending) return;
                setOpen(nextOpen);
            }}
        >
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-fade-in" />
                <DialogContent className="fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-6 shadow-lg focus:outline-none data-[state=open]:animate-slide-in-from-bottom-96 text-black">
                    <DialogHeader>
                        <DialogTitle>Create Group</DialogTitle>
                        <DialogDescription className="text-purple-500">
                            Please enter the details for your new group.
                            {isPending ? " Creating..." : null}
                            {isSuccess ? " Created." : null}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative mt-4 mb-2">
                            <Input
                                type="text"
                                disabled={isPending}
                                name="name"
                                placeholder="Group Name, Church Name, Personal"
                                className="w-full text-black placeholder:text-black/60 ring-1 ring-purple-500/40 border-purple-500/60 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-500"
                                required
                                autoFocus
                                minLength={3}
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-md border border-purple-500/80 opacity-100 animate-pulse [animation-duration:1.6s]" />
                        </div>

                        {isError ? (
                            <p className="text-sm text-red-600" role="alert">
                                {error?.message ?? "Failed to create workspace. Please try again."}
                            </p>
                        ) : null}
    
                        <div className="flex justify-end gap-2">
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary" disabled={isPending}>
                                        Cancel
                                    </Button>
                                </DialogClose>

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="bg-purple-600 text-white hover:bg-purple-600/90"
                                >
                                    {isPending ? "Creating..." : "Create Group"}
                                </Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
};