"use client";

import * as React from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import {
  Check,
  Image as ImageIcon,
  Loader,
  Pencil,
  PhoneCall,
  Send,
  Smile,
  Trash2,
  X,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  RemoveFormatting,
  ChevronDown,
  Type,
} from "lucide-react";
import DOMPurify from "dompurify";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

function formatTime(timestampMs: number) {
  try {
    return new Date(timestampMs).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const DirectMessagePage = () => {
  const workspaceId = useWorkspaceId();
  const params = useParams<{ memberId: string }>();
  const memberId = params.memberId as Id<"members">;

  const { data: currentUser } = useCurrentUser();

  const member = useQuery(api.members.getByMemberId, {
    workspaceId,
    memberId,
  });

  const getOrCreateConversation = useMutation(
    api.directMessages.getOrCreateConversation
  );

  const sendMessage = useMutation(api.directMessages.send);
  const updateMessage = useMutation(api.directMessages.update);
  const removeMessage = useMutation(api.directMessages.remove);
  const toggleReaction = useMutation(api.directMessages.toggleReaction);
  const markConversationRead = useMutation(api.directMessages.markConversationRead);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const [conversationId, setConversationId] = React.useState<
    Id<"directConversations"> | null
  >(null);

  const {
    results: messagesDesc,
    status: messagesStatus,
    loadMore,
  } = usePaginatedQuery(
    api.directMessages.listByConversationPaginated,
    conversationId ? { conversationId } : "skip",
    { initialNumItems: 30 }
  );

  const messages = React.useMemo(() => {
    const list = Array.isArray(messagesDesc) ? messagesDesc : [];
    return [...list].reverse();
  }, [messagesDesc]);

  const readState = useQuery(
    api.directMessages.getReadState,
    conversationId ? { conversationId } : "skip"
  );

  const lastMineMessageId = React.useMemo(() => {
    const myId = currentUser?._id;
    if (!myId) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i] as any;
      if (msg?.user?._id === myId) return msg._id as Id<"directMessages">;
    }
    return null;
  }, [currentUser?._id, messages]);

  const [isSending, setIsSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [composerText, setComposerText] = React.useState("");

  const [showComposerToolbar, setShowComposerToolbar] = React.useState(true);

  const [editingId, setEditingId] = React.useState<Id<"directMessages"> | null>(
    null
  );
  const [editingText, setEditingText] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const topSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const scrollAdjustRef = React.useRef<
    { prevScrollHeight: number; prevScrollTop: number } | null
  >(null);
  const didInitialScrollRef = React.useRef(false);

  const emojis = React.useMemo(
    () => [
      "👍",
      "👎",
      "❤️",
      "😂",
      "😅",
      "😁",
      "😆",
      "🙂",
      "😮",
      "😱",
      "😢",
      "😭",
      "😡",
      "🤔",
      "🙌",
      "👏",
      "🙏",
      "🎉",
      "🥳",
      "🔥",
      "💯",
      "⭐️",
      "🚀",
      "👀",
      "✅",
      "❌",
      "😎",
      "😇",
      "😴",
      "🤝",
    ],
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: `Message ${member?.user?.name ?? ""}`,
      }),
    ],
    onUpdate: ({ editor }) => {
      setComposerText(editor.getText());
    },
    content: "",
    editorProps: {
      attributes: {
        class: cn(
          "min-h-20 w-full px-3 py-2 text-sm outline-none",
          "text-foreground",
          "[&_*]:break-words [&_a]:text-primary [&_a]:underline",
          "[&_.ProseMirror]:min-h-20"
        ),
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void onSend();
          return true;
        }
        return false;
      },
    },
  });

  React.useEffect(() => {
    if (!member?.user?._id) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await getOrCreateConversation({
          workspaceId,
          otherUserId: member.user._id,
        });
        if (!cancelled) {
          setConversationId(result.conversationId);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to open conversation");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getOrCreateConversation, member?.user?._id, workspaceId]);

  React.useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (messagesStatus === "LoadingFirstPage") return;
    if (!conversationId) return;

    bottomRef.current?.scrollIntoView({ behavior: "auto" });
    didInitialScrollRef.current = true;
  }, [conversationId, messagesStatus]);

  React.useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (scrollAdjustRef.current) return;

    const distanceFromBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesDesc.length]);

  React.useEffect(() => {
    if (!conversationId) return;
    if (messagesStatus === "LoadingFirstPage") return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    const distanceFromBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceFromBottom < 150) {
      void markConversationRead({ conversationId });
    }
  }, [conversationId, markConversationRead, messagesDesc.length, messagesStatus]);

  React.useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const snap = scrollAdjustRef.current;
    if (!scroller || !snap) return;

    const nextScrollHeight = scroller.scrollHeight;
    scroller.scrollTop = snap.prevScrollTop + (nextScrollHeight - snap.prevScrollHeight);
    scrollAdjustRef.current = null;
  }, [messagesDesc.length]);

  React.useEffect(() => {
    const root = scrollRef.current;
    const target = topSentinelRef.current;
    if (!root || !target) return;
    if (!conversationId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (messagesStatus !== "CanLoadMore") return;

        scrollAdjustRef.current = {
          prevScrollHeight: root.scrollHeight,
          prevScrollTop: root.scrollTop,
        };
        loadMore(20);
      },
      { root, threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [conversationId, loadMore, messagesStatus]);

  const onSend = React.useCallback(async () => {
    const bodyText = (editor?.getText() ?? "").trim();
    if (!bodyText || !conversationId) return;

    setIsSending(true);
    setError(null);
    try {
      await sendMessage({ conversationId, body: editor?.getHTML() ?? bodyText });
      editor?.commands.clearContent();
      setComposerText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [conversationId, editor, sendMessage]);

  const insertEmoji = React.useCallback(
    (emoji: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(emoji).run();
    },
    [editor]
  );

  const toggleLink = React.useCallback(() => {
    if (!editor) return;

    const isActive = editor.isActive("link");
    if (isActive) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("Enter URL");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const onPickImage = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onUploadImage: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !conversationId) return;

      setUploading(true);
      setError(null);
      try {
        const postUrl = await generateUploadUrl({});
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Failed to upload image");
        }

        const { storageId } = (await result.json()) as { storageId: string };
        const bodyText = (editor?.getText() ?? "").trim();
        await sendMessage({
          conversationId,
          imageId: storageId as Id<"_storage">,
          body: bodyText ? (editor?.getHTML() ?? bodyText) : undefined,
        });
        editor?.commands.clearContent();
        setComposerText("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    [conversationId, editor, generateUploadUrl, sendMessage]
  );

  const loading = member === undefined || (conversationId !== null && messages === undefined);

  if (loading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center">
        <Loader className="size-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="h-full flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Member not found or you don’t have access.</p>
        </div>
      </div>
    );
  }

  const name = member.user?.name ?? "Direct Message";
  const initials = name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="h-full flex flex-col">
      <div className="relative border-b border-purple-500/50 bg-background px-4 py-3 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-purple-500/50 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="size-9">
              <AvatarImage alt={name} src={member.user?.image ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="font-semibold text-2xl truncate">{name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Direct messages</p>
            </div>
          </div>

          <Button type="button" size="icon" variant="ghost" aria-label="Call">
            <PhoneCall className="size-5" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <div ref={topSentinelRef} />
          {messagesStatus === "LoadingMore" ? (
            <div className="flex items-center justify-center py-2">
              <Loader className="size-4 text-muted-foreground animate-spin" />
            </div>
          ) : null}

          {messages.map((m) => {
            const senderName = m.user?.name ?? "Unknown";
            const senderInitials = senderName?.[0]?.toUpperCase() ?? "?";
            const time = formatTime(m.createdAt);
            const isOwner = Boolean(currentUser?._id && m.user?._id === currentUser._id);
            const isEditing = editingId === m._id;
            const showReceipt = Boolean(
              isOwner && !isEditing && lastMineMessageId && m._id === lastMineMessageId
            );
            const receiptText =
              (readState?.otherLastReadAt ?? 0) >= m.createdAt ? "Read" : "Delivered";
            const reactionSummary = ((m as any).reactionSummary ?? []) as Array<{
              emoji: string;
              count: number;
              reacted: boolean;
            }>;

            return (
              <div
                key={m._id}
                className={cn(
                  "group flex gap-3 rounded-md px-2 py-1 -mx-2 transition-colors",
                  "hover:bg-muted/40"
                )}
              >
                <Avatar className="size-9">
                  <AvatarImage alt={senderName} src={m.user?.image ?? undefined} />
                  <AvatarFallback>{senderInitials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="relative flex items-baseline gap-2 pr-16">
                    <span className="text-sm font-semibold truncate">{senderName}</span>
                    <span className="text-[11px] text-muted-foreground">{time}</span>
                    {m.updatedAt ? (
                      <span className="text-[11px] text-muted-foreground">(edited)</span>
                    ) : null}

                    <div
                      className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1",
                        "opacity-0 pointer-events-none transition-opacity",
                        "group-hover:opacity-100 group-hover:pointer-events-auto",
                        isEditing ? "opacity-0 pointer-events-none" : null
                      )}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Add reaction"
                          >
                            <Smile className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-0">
                          <div className="grid grid-cols-8 gap-1 p-1">
                            {emojis.map((emoji) => (
                              <DropdownMenuItem
                                key={emoji}
                                onSelect={() => void toggleReaction({ messageId: m._id, emoji })}
                                className="justify-center text-lg"
                              >
                                {emoji}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {isOwner ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(m._id);
                            setEditingText(m.body ?? "");
                          }}
                          aria-label="Edit message"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!window.confirm("Delete this message?") ) return;
                          setError(null);
                          try {
                            await removeMessage({ messageId: m._id });
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Failed to delete message"
                            );
                          }
                        }}
                        aria-label="Delete message"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingId(null);
                            setEditingText("");
                            return;
                          }
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            (async () => {
                              setError(null);
                              try {
                                await updateMessage({ messageId: m._id, body: editingText });
                                setEditingId(null);
                                setEditingText("");
                              } catch (err) {
                                setError(
                                  err instanceof Error ? err.message : "Failed to edit message"
                                );
                              }
                            })();
                          }
                        }}
                        rows={3}
                        className={cn(
                          "w-full rounded-md border bg-transparent px-3 py-2 text-sm",
                          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                          "outline-none"
                        )}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                        >
                          <X className="size-4 mr-2" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            setError(null);
                            try {
                              await updateMessage({ messageId: m._id, body: editingText });
                              setEditingId(null);
                              setEditingText("");
                            } catch (err) {
                              setError(
                                err instanceof Error ? err.message : "Failed to edit message"
                              );
                            }
                          }}
                          disabled={!editingText.trim()}
                        >
                          <Check className="size-4 mr-2" />
                          Save
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Press Enter to save • Shift+Enter for newline • Esc to cancel
                      </p>
                    </div>
                  ) : m.body ? (
                    (() => {
                      const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(m.body);
                      if (!looksLikeHtml) {
                        return (
                          <div className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                            {m.body}
                          </div>
                        );
                      }

                      const safe = DOMPurify.sanitize(m.body, {
                        USE_PROFILES: { html: true },
                      });

                      return (
                        <div
                          className={cn(
                            "text-sm text-foreground wrap-break-word",
                            "**:wrap-break-word [&_a]:text-primary [&_a]:underline",
                            "[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0"
                          )}
                          dangerouslySetInnerHTML={{ __html: safe }}
                        />
                      );
                    })()
                  ) : null}

                  {m.imageUrl ? (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.imageUrl}
                        alt="uploaded"
                        className="max-w-105 w-full rounded-md border"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  {reactionSummary.length ? (
                    <div
                      className={cn(
                        "mt-2 flex flex-wrap gap-1",
                        isOwner ? "justify-end" : null
                      )}
                    >
                      {reactionSummary.map((r) => (
                        <Button
                          key={r.emoji}
                          type="button"
                          size="sm"
                          variant="secondary"
                          className={cn(
                            "h-6 rounded-full px-2 text-xs",
                            r.reacted ? "bg-accent" : null
                          )}
                          onClick={() => void toggleReaction({ messageId: m._id, emoji: r.emoji })}
                        >
                          <span className="mr-1">{r.emoji}</span>
                          {r.count}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {showReceipt ? (
                    <div
                      className={cn(
                        "mt-1 text-[11px] text-muted-foreground",
                        isOwner ? "text-right" : null
                      )}
                    >
                      {receiptText}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t bg-background px-4 py-3">
        {error ? <p className="text-sm text-destructive mb-2">{error}</p> : null}

        <div className="rounded-md border border-input bg-card">
          {showComposerToolbar ? (
            <div className="flex items-center gap-1 border-b border-border px-2 py-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={!editor}
                  >
                    <span>
                      {editor?.isActive("heading", { level: 1 })
                        ? "Heading 1"
                        : editor?.isActive("heading", { level: 2 })
                          ? "Heading 2"
                          : editor?.isActive("heading", { level: 3 })
                            ? "Heading 3"
                            : "Normal"}
                    </span>
                    <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-40">
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().setParagraph().run()}>
                    Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
                    Heading 1
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                    Heading 2
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
                    Heading 3
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="mx-1 h-5 w-px bg-border" />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={!editor}
                aria-label="Bold"
                className={cn(editor?.isActive("bold") ? "bg-accent" : undefined)}
              >
                <Bold className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                disabled={!editor}
                aria-label="Italic"
                className={cn(editor?.isActive("italic") ? "bg-accent" : undefined)}
              >
                <Italic className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                disabled={!editor}
                aria-label="Underline"
                className={cn(editor?.isActive("underline") ? "bg-accent" : undefined)}
              >
                <UnderlineIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggleLink}
                disabled={!editor}
                aria-label="Link"
                className={cn(editor?.isActive("link") ? "bg-accent" : undefined)}
              >
                <LinkIcon className="size-4" />
              </Button>

              <div className="mx-1 h-5 w-px bg-border" />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                disabled={!editor}
                aria-label="Bulleted list"
                className={cn(editor?.isActive("bulletList") ? "bg-accent" : undefined)}
              >
                <List className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                disabled={!editor}
                aria-label="Numbered list"
                className={cn(editor?.isActive("orderedList") ? "bg-accent" : undefined)}
              >
                <ListOrdered className="size-4" />
              </Button>

              <div className="mx-1 h-5 w-px bg-border" />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                disabled={!editor}
                aria-label="Clear formatting"
              >
                <RemoveFormatting className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="bg-background">
            <EditorContent editor={editor} />
          </div>

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onUploadImage}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowComposerToolbar((v) => !v)}
                aria-label="Toggle formatting"
              >
                <Type className="size-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={uploading || isSending} aria-label="Emoji">
                    <Smile className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-0">
                  <div className="grid grid-cols-8 gap-1 p-1">
                    {emojis.map((emoji) => (
                      <DropdownMenuItem
                        key={emoji}
                        onSelect={() => insertEmoji(emoji)}
                        className="justify-center text-lg"
                      >
                        {emoji}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onPickImage}
                disabled={uploading || isSending}
                aria-label="Upload image"
              >
                <ImageIcon className="size-4" />
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => void onSend()}
              disabled={isSending || uploading || !composerText.trim()}
              className="shrink-0 bg-primary text-white! hover:bg-primary/90 disabled:opacity-100 cursor-pointer"
              size="icon"
              aria-label="Send"
            >
              <Send className="size-4 text-white!" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectMessagePage;
