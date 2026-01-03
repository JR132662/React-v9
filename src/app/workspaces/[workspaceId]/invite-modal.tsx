"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyIcon } from "lucide-react";

interface InviteModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  name: string;
  joinCode: string;
}

export const InviteModal = ({ open, setOpen, name, joinCode }: InviteModalProps) => {
  const [copied, setCopied] = useState<"code" | "link" | "message" | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Adjust this path to match your actual join page route.
  // Common patterns: `/join/${joinCode}` or `/invite/${joinCode}`
  const inviteLink = useMemo(() => {
    if (!origin) return "";
    return `${origin}/join/${joinCode}`;
  }, [origin, joinCode]);

  const inviteMessage = useMemo(() => {
    // If you prefer only the link, remove the text.
    return `Join "${name}" using this link: ${inviteLink || joinCode}`;
  }, [name, inviteLink, joinCode]);

  const copyToClipboard = useCallback(
    async (text: string, kind: "code" | "link" | "message") => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        window.setTimeout(() => setCopied(null), 1200);
      } catch {
        // ignore
      }
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Invite members</DialogTitle>
          <DialogDescription>
            Share a join link or code to invite people to{" "}
            <span className="font-medium">{name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Invite link</div>
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink || "Generating link..."}
                readOnly
                className="font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyToClipboard(inviteLink, "link")}
                disabled={!inviteLink}
                aria-label="Copy invite link"
              >
                <CopyIcon className="mr-2 size-4" />
                {copied === "link" ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can request to join using the code.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Join code</div>
            <div className="flex items-center gap-2">
              <Input value={joinCode} readOnly className="font-mono" />
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyToClipboard(joinCode, "code")}
                aria-label="Copy join code"
              >
                <CopyIcon className="mr-2 size-4" />
                {copied === "code" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Invite message</div>
            <div className="font-mono break-all">{inviteMessage}</div>
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => copyToClipboard(inviteMessage, "message")}
                aria-label="Copy invite message"
              >
                <CopyIcon className="mr-2 size-4" />
                {copied === "message" ? "Copied" : "Copy message"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};