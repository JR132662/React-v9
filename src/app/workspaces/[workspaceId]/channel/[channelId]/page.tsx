"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import {
    Image as ImageIcon,
    Loader,
    Pencil,
    Reply,
    Send,
    Smile,
    Trash2,
    X,
    Check,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Link as LinkIcon,
    List,
    ListOrdered,
    RemoveFormatting,
    ChevronDown,
    Type,
    HashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import DOMPurify from "dompurify";
import { UseCurrentMember } from "@/features/members/api/use-current-member";

const Mention = Node.create({
    name: "mention",
    group: "inline",
    inline: true,
    atom: true,
    selectable: false,

    addAttributes() {
        return {
            userId: { default: null },
            memberId: { default: null },
            label: { default: "" },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-mention-user-id]",
                getAttrs: (el) => {
                    if (!(el instanceof HTMLElement)) return false;
                    return {
                        userId: el.getAttribute("data-mention-user-id"),
                        memberId: el.getAttribute("data-mention-member-id"),
                        label: (el.textContent ?? "").replace(/^@/, "").trim(),
                    };
                },
            },
        ];
    },

    renderText({ node }) {
        const label = String(node.attrs.label ?? "").trim();
        return `@${label}`;
    },

    renderHTML({ node, HTMLAttributes }) {
        const label = String(node.attrs.label ?? "").trim();
        return [
            "span",
            {
                ...HTMLAttributes,
                "data-mention-user-id": String(node.attrs.userId ?? ""),
                "data-mention-member-id": String(node.attrs.memberId ?? ""),
                class: "text-primary font-medium",
            },
            `@${label}`,
        ];
    },
});

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

const ChannelIdPage = () => {
    const channelId = useChannelId();
    const workspaceId = useWorkspaceId();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { data: currentUser } = useCurrentUser();

    const { data: currentMember } = UseCurrentMember({ workspaceId });
    const isAdmin = currentMember?.role === "admin";

    const channel = useQuery(api.channels.getById, { id: channelId });
    const {
        results: messagesDesc,
        status: messagesStatus,
        loadMore,
    } = usePaginatedQuery(
        api.messages.listByChannelPaginated,
        channel ? { channelId } : "skip",
        { initialNumItems: 30 }
    );

    const messages = React.useMemo(() => {
        const list = Array.isArray(messagesDesc) ? messagesDesc : [];
        return [...list].reverse();
    }, [messagesDesc]);

    const sendMessage = useMutation(api.messages.send);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
    const updateMessage = useMutation(api.messages.update);
    const removeMessage = useMutation(api.messages.remove);
    const toggleReaction = useMutation(api.messages.toggleReaction);

    const [threadParentId, setThreadParentId] = React.useState<Id<"messages"> | null>(null);
    const threadParent = useQuery(
        api.messages.getById,
        threadParentId ? { messageId: threadParentId } : "skip"
    );
    const threadReplies = useQuery(
        api.messages.listReplies,
        threadParentId ? { parentMessageId: threadParentId } : "skip"
    );
    const [isThreadSending, setIsThreadSending] = React.useState(false);
    const [threadUploading, setThreadUploading] = React.useState(false);
    const [showThreadComposerToolbar, setShowThreadComposerToolbar] = React.useState(true);
    const [threadComposerText, setThreadComposerText] = React.useState("");

    const [isSending, setIsSending] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [editingId, setEditingId] = React.useState<Id<"messages"> | null>(null);
    const [editingText, setEditingText] = React.useState("");

    const [showComposerToolbar, setShowComposerToolbar] = React.useState(true);

    const [composerText, setComposerText] = React.useState("");

    const setThreadInUrl = React.useCallback(
        (messageId: Id<"messages"> | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (messageId) {
                params.set("thread", String(messageId));
            } else {
                params.delete("thread");
            }
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [router, pathname, searchParams]
    );

    const openThread = React.useCallback(
        (messageId: Id<"messages">) => {
            setThreadParentId(messageId);
            setThreadInUrl(messageId);
        },
        [setThreadInUrl]
    );

    React.useEffect(() => {
        const threadParam = searchParams.get("thread");
        if (!threadParam) return;
        setThreadParentId(threadParam as Id<"messages">);
    }, [searchParams]);

    const members = useQuery(api.members.listByWorkspace, { workspaceId });

    const [mentionOpen, setMentionOpen] = React.useState(false);
    const [mentionQuery, setMentionQuery] = React.useState("");
    const [mentionIndex, setMentionIndex] = React.useState(0);
    const [mentionPos, setMentionPos] = React.useState<{ left: number; top: number } | null>(null);
    const mentionRangeRef = React.useRef<{ from: number; to: number } | null>(null);
    const editorRef = React.useRef<any>(null);

    const [threadMentionOpen, setThreadMentionOpen] = React.useState(false);
    const [threadMentionQuery, setThreadMentionQuery] = React.useState("");
    const [threadMentionIndex, setThreadMentionIndex] = React.useState(0);
    const [threadMentionPos, setThreadMentionPos] = React.useState<
        { left: number; top: number } | null
    >(null);
    const threadMentionRangeRef = React.useRef<{ from: number; to: number } | null>(null);
    const threadEditorRef = React.useRef<any>(null);

    const memberOptions = React.useMemo(() => {
        const list = Array.isArray(members) ? members : [];
        const q = mentionQuery.trim().toLowerCase();

        const mapped = list
            .map((m: any) => {
                const name = String(m.user?.name ?? m.user?.email ?? "").trim() || "Unnamed";
                return {
                    memberId: m.member?._id,
                    userId: m.user?._id,
                    name,
                    image: m.user?.image ?? null,
                };
            })
            .filter((m: any) => Boolean(m.memberId && m.userId));

        const filtered = q
            ? mapped.filter((m: any) => m.name.toLowerCase().includes(q))
            : mapped;

        return filtered.slice(0, 8);
    }, [members, mentionQuery]);

    const threadMemberOptions = React.useMemo(() => {
        const list = Array.isArray(members) ? members : [];
        const q = threadMentionQuery.trim().toLowerCase();

        const mapped = list
            .map((m: any) => {
                const name = String(m.user?.name ?? m.user?.email ?? "").trim() || "Unnamed";
                return {
                    memberId: m.member?._id,
                    userId: m.user?._id,
                    name,
                    image: m.user?.image ?? null,
                };
            })
            .filter((m: any) => Boolean(m.memberId && m.userId));

        const filtered = q
            ? mapped.filter((m: any) => m.name.toLowerCase().includes(q))
            : mapped;

        return filtered.slice(0, 8);
    }, [members, threadMentionQuery]);

    const closeMentions = React.useCallback(() => {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionIndex(0);
        setMentionPos(null);
        mentionRangeRef.current = null;
    }, []);

    const closeThreadMentions = React.useCallback(() => {
        setThreadMentionOpen(false);
        setThreadMentionQuery("");
        setThreadMentionIndex(0);
        setThreadMentionPos(null);
        threadMentionRangeRef.current = null;
    }, []);

    const insertMention = React.useCallback(
        (opt: { memberId: string; userId: string; name: string }) => {
            const editor = editorRef.current;
            if (!editor) return;
            const range = mentionRangeRef.current;
            if (!range) return;

            const label = String(opt.name ?? "").trim() || "Unnamed";

            editor
                .chain()
                .focus()
                .insertContentAt(
                    { from: range.from, to: range.to },
                    [
                        {
                            type: "mention",
                            attrs: {
                                userId: String(opt.userId),
                                memberId: String(opt.memberId),
                                label,
                            },
                        },
                        { type: "text", text: " " },
                    ]
                )
                .run();

            closeMentions();
        },
        [closeMentions]
    );

    const insertThreadMention = React.useCallback(
        (opt: { memberId: string; userId: string; name: string }) => {
            const editor = threadEditorRef.current;
            if (!editor) return;
            const range = threadMentionRangeRef.current;
            if (!range) return;

            const label = String(opt.name ?? "").trim() || "Unnamed";

            editor
                .chain()
                .focus()
                .insertContentAt(
                    { from: range.from, to: range.to },
                    [
                        {
                            type: "mention",
                            attrs: {
                                userId: String(opt.userId),
                                memberId: String(opt.memberId),
                                label,
                            },
                        },
                        { type: "text", text: " " },
                    ]
                )
                .run();

            closeThreadMentions();
        },
        [closeThreadMentions]
    );

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const threadFileInputRef = React.useRef<HTMLInputElement | null>(null);
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
        onCreate: ({ editor }) => {
            editorRef.current = editor;
        },
        onDestroy: () => {
            editorRef.current = null;
        },
        extensions: [
            StarterKit,
            Mention,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
            }),
            Placeholder.configure({
                placeholder: `Message #${channel?.name ?? ""}`,
            }),
        ],
        onUpdate: ({ editor }) => {
            setComposerText(editor.getText());

            const { from } = editor.state.selection;
            const $from = editor.state.doc.resolve(from);
            const start = $from.start($from.depth);
            const text = editor.state.doc.textBetween(start, from, "\n", "\n");

            const atIndex = text.lastIndexOf("@");
            if (atIndex === -1) {
                closeMentions();
                return;
            }

            const prevChar = atIndex > 0 ? text[atIndex - 1] : " ";
            if (prevChar && /[^\s]/.test(prevChar)) {
                closeMentions();
                return;
            }

            const after = text.slice(atIndex + 1);
            if (/\s/.test(after)) {
                closeMentions();
                return;
            }

            // Mention trigger is active
            const mentionFrom = start + atIndex;
            mentionRangeRef.current = { from: mentionFrom, to: from };
            setMentionOpen(true);
            setMentionQuery(after);
            setMentionIndex(0);

            try {
                const coords = editor.view.coordsAtPos(from);
                setMentionPos({ left: coords.left, top: coords.bottom + 6 });
            } catch {
                setMentionPos(null);
            }
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
                if (mentionOpen) {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        closeMentions();
                        return true;
                    }

                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setMentionIndex((i) => {
                            const next = i + 1;
                            return next >= memberOptions.length ? 0 : next;
                        });
                        return true;
                    }

                    if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setMentionIndex((i) => {
                            const next = i - 1;
                            return next < 0 ? Math.max(memberOptions.length - 1, 0) : next;
                        });
                        return true;
                    }

                    if (event.key === "Enter" || event.key === "Tab") {
                        if (memberOptions.length > 0) {
                            event.preventDefault();
                            const opt = memberOptions[Math.min(mentionIndex, memberOptions.length - 1)];
                            if (opt) insertMention(opt);
                            return true;
                        }
                    }
                }

                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSend();
                    return true;
                }
                return false;
            },
        },
    });

    const sendThreadMessage = React.useCallback(async () => {
        if (!threadParentId) return;
        const editor = threadEditorRef.current;
        if (!editor) return;

        const bodyText = (editor.getText() ?? "").trim();
        if (!bodyText) return;

        setIsThreadSending(true);
        setError(null);
        try {
            await sendMessage({
                channelId,
                parentMessageId: threadParentId,
                body: editor.getHTML() ?? bodyText,
            });
            editor.commands.clearContent();
            setThreadComposerText("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to reply");
        } finally {
            setIsThreadSending(false);
        }
    }, [channelId, sendMessage, threadParentId]);

    const insertThreadEmoji = React.useCallback((emoji: string) => {
        const editor = threadEditorRef.current;
        if (!editor) return;
        editor.chain().focus().insertContent(emoji).run();
    }, []);

    const toggleThreadLink = React.useCallback(() => {
        const editor = threadEditorRef.current;
        if (!editor) return;

        const isActive = editor.isActive("link");
        if (isActive) {
            editor.chain().focus().unsetLink().run();
            return;
        }

        const url = window.prompt("Enter URL");
        if (!url) return;
        editor.chain().focus().setLink({ href: url }).run();
    }, []);

    const onPickThreadImage = React.useCallback(() => {
        threadFileInputRef.current?.click();
    }, []);

    const onUploadThreadImage: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
        async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!threadParentId) return;

            setThreadUploading(true);
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
                const editor = threadEditorRef.current;
                const bodyText = (editor?.getText?.() ?? "").trim();
                await sendMessage({
                    channelId,
                    parentMessageId: threadParentId,
                    imageId: storageId as Id<"_storage">,
                    body: bodyText ? (editor?.getHTML?.() ?? bodyText) : undefined,
                });
                editor?.commands?.clearContent?.();
                setThreadComposerText("");
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to upload image");
            } finally {
                setThreadUploading(false);
            }
        },
        [channelId, generateUploadUrl, sendMessage, threadParentId]
    );

    const threadEditor = useEditor({
        immediatelyRender: false,
        onCreate: ({ editor }) => {
            threadEditorRef.current = editor;
        },
        onDestroy: () => {
            threadEditorRef.current = null;
        },
        extensions: [
            StarterKit,
            Mention,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
            }),
            Placeholder.configure({
                placeholder: "Reply in thread...",
            }),
        ],
        onUpdate: ({ editor }) => {
            setThreadComposerText(editor.getText());

            const { from } = editor.state.selection;
            const $from = editor.state.doc.resolve(from);
            const start = $from.start($from.depth);
            const text = editor.state.doc.textBetween(start, from, "\n", "\n");

            const atIndex = text.lastIndexOf("@");
            if (atIndex === -1) {
                closeThreadMentions();
                return;
            }

            const prevChar = atIndex > 0 ? text[atIndex - 1] : " ";
            if (prevChar && /[^\s]/.test(prevChar)) {
                closeThreadMentions();
                return;
            }

            const after = text.slice(atIndex + 1);
            if (/\s/.test(after)) {
                closeThreadMentions();
                return;
            }

            const mentionFrom = start + atIndex;
            threadMentionRangeRef.current = { from: mentionFrom, to: from };
            setThreadMentionOpen(true);
            setThreadMentionQuery(after);
            setThreadMentionIndex(0);

            try {
                const coords = editor.view.coordsAtPos(from);
                setThreadMentionPos({ left: coords.left, top: coords.bottom + 6 });
            } catch {
                setThreadMentionPos(null);
            }
        },
        content: "",
        editorProps: {
            attributes: {
                class: cn(
                    "min-h-16 w-full px-3 py-2 text-sm outline-none",
                    "text-foreground",
                    "[&_*]:break-words [&_a]:text-primary [&_a]:underline",
                    "[&_.ProseMirror]:min-h-16"
                ),
            },
            handleKeyDown: (_view, event) => {
                if (threadMentionOpen) {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        closeThreadMentions();
                        return true;
                    }

                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setThreadMentionIndex((i) => {
                            const next = i + 1;
                            return next >= threadMemberOptions.length ? 0 : next;
                        });
                        return true;
                    }

                    if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setThreadMentionIndex((i) => {
                            const next = i - 1;
                            return next < 0
                                ? Math.max(threadMemberOptions.length - 1, 0)
                                : next;
                        });
                        return true;
                    }

                    if (event.key === "Enter" || event.key === "Tab") {
                        if (threadMemberOptions.length > 0) {
                            event.preventDefault();
                            const opt = threadMemberOptions[
                                Math.min(threadMentionIndex, threadMemberOptions.length - 1)
                            ];
                            if (opt) insertThreadMention(opt);
                            return true;
                        }
                    }
                }

                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendThreadMessage();
                    return true;
                }

                return false;
            },
        },
    });

    React.useEffect(() => {
        if (didInitialScrollRef.current) return;
        if (messagesStatus === "LoadingFirstPage") return;
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        didInitialScrollRef.current = true;
    }, [messagesStatus]);

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

    React.useLayoutEffect(() => {
        const scroller = scrollRef.current;
        const snap = scrollAdjustRef.current;
        if (!scroller || !snap) return;

        const nextScrollHeight = scroller.scrollHeight;
        scroller.scrollTop =
            snap.prevScrollTop + (nextScrollHeight - snap.prevScrollHeight);
        scrollAdjustRef.current = null;
    }, [messagesDesc.length]);

    React.useEffect(() => {
        const root = scrollRef.current;
        const target = topSentinelRef.current;
        if (!root || !target) return;

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
    }, [loadMore, messagesStatus]);

    const onSend = React.useCallback(async () => {
        const bodyText = (editor?.getText() ?? "").trim();
        if (!bodyText) return;

        setIsSending(true);
        setError(null);
        try {
            await sendMessage({ channelId, body: editor?.getHTML() ?? bodyText });
            editor?.commands.clearContent();
            setComposerText("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to send message");
        } finally {
            setIsSending(false);
        }
    }, [channelId, editor, sendMessage]);

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
            if (!file) return;

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
                    channelId,
                    imageId: storageId as Id<"_storage">,
                    body: bodyText ? (editor?.getHTML() ?? bodyText) : undefined,
                });
                editor?.commands.clearContent();
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to upload image");
            } finally {
                setUploading(false);
            }
        },
        [channelId, editor, generateUploadUrl, sendMessage]
    );

    const closeThread = React.useCallback(() => {
        setThreadParentId(null);
        setThreadInUrl(null);
        closeThreadMentions();
        setThreadComposerText("");
        threadEditorRef.current?.commands?.clearContent?.();
    }, [closeThreadMentions, setThreadInUrl]);

    const loading = channel === undefined || messagesStatus === "LoadingFirstPage";

    if (loading) {
        return (
            <div className="h-full flex-1 flex items-center justify-center">
                <Loader className="size-5 text-muted-foreground animate-spin" />
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="h-full flex-1 flex items-center justify-center px-6">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Channel not found or you don’t have access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="relative border-b border-purple-500/50 bg-background px-4 py-3 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-purple-500/50 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                        <HashIcon className="size-5 align-middle" />
                    </span>
                    <h1 className="font-semibold text-3xl capitalize">{channel.name}</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Chat with people in this channel.</p>
            </div>

            {threadParentId ? (
                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    <ResizablePanel defaultSize={68} minSize={45}>
                        <div className="flex h-full min-h-0 flex-col">
                            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                                <div className="space-y-4">
                                    <div ref={topSentinelRef} />
                                    {messagesStatus === "LoadingMore" ? (
                                        <div className="flex items-center justify-center py-2">
                                            <Loader className="size-4 text-muted-foreground animate-spin" />
                                        </div>
                                    ) : null}

                                    {messages.map((m) => {
                                        const name = m.user?.name ?? "Unknown";
                                        const initials = name?.[0]?.toUpperCase() ?? "?";
                                        const time = formatTime(m.createdAt);
                                        const isOwner = Boolean(
                                            currentUser?._id && m.user?._id === currentUser._id
                                        );
                                        const canDelete = isOwner || isAdmin;
                                        const isEditing = editingId === m._id;
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
                                                    <AvatarImage alt={name} src={m.user?.image ?? undefined} />
                                                    <AvatarFallback>{initials}</AvatarFallback>
                                                </Avatar>

                                                <div className="min-w-0 flex-1">
                                                    <div className="relative flex items-baseline gap-2 pr-16">
                                                        <span className="text-sm font-semibold truncate">{name}</span>
                                                        <span className="text-[11px] text-muted-foreground">{time}</span>
                                                        {m.updatedAt ? (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                (edited)
                                                            </span>
                                                        ) : null}

                                                        <div
                                                            className={cn(
                                                                "absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1",
                                                                "opacity-0 pointer-events-none transition-opacity",
                                                                "group-hover:opacity-100 group-hover:pointer-events-auto",
                                                                isEditing ? "opacity-0 pointer-events-none" : null
                                                            )}
                                                        >
                                                            <Button
                                                                type="button"
                                                                size="icon-sm"
                                                                variant="ghost"
                                                                aria-label="Reply"
                                                                onClick={() => openThread(m._id)}
                                                            >
                                                                <Reply className="size-4" />
                                                            </Button>

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
                                                                <DropdownMenuContent
                                                                    align="end"
                                                                    className="min-w-0"
                                                                >
                                                                    <div className="grid grid-cols-8 gap-1 p-1">
                                                                        {emojis.map((emoji) => (
                                                                            <DropdownMenuItem
                                                                                key={emoji}
                                                                                onSelect={() =>
                                                                                    void toggleReaction({
                                                                                        messageId: m._id,
                                                                                        emoji,
                                                                                    })
                                                                                }
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

                                                            {canDelete ? (
                                                                <Button
                                                                    type="button"
                                                                    size="icon-sm"
                                                                    variant="ghost"
                                                                    onClick={async () => {
                                                                        if (!window.confirm("Delete this message?")) return;
                                                                        setError(null);
                                                                        try {
                                                                            await removeMessage({ messageId: m._id });
                                                                        } catch (e) {
                                                                            setError(
                                                                                e instanceof Error
                                                                                    ? e.message
                                                                                    : "Failed to delete message"
                                                                            );
                                                                        }
                                                                    }}
                                                                    aria-label="Delete message"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            ) : null}
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
                                                                                await updateMessage({
                                                                                    messageId: m._id,
                                                                                    body: editingText,
                                                                                });
                                                                                setEditingId(null);
                                                                                setEditingText("");
                                                                            } catch (err) {
                                                                                setError(
                                                                                    err instanceof Error
                                                                                        ? err.message
                                                                                        : "Failed to edit message"
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
                                                                            await updateMessage({
                                                                                messageId: m._id,
                                                                                body: editingText,
                                                                            });
                                                                            setEditingId(null);
                                                                            setEditingText("");
                                                                        } catch (err) {
                                                                            setError(
                                                                                err instanceof Error
                                                                                    ? err.message
                                                                                    : "Failed to edit message"
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
                                                                ADD_ATTR: [
                                                                    "data-mention-user-id",
                                                                    "data-mention-member-id",
                                                                    "class",
                                                                ],
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
                                                        <div className="mt-2 flex flex-wrap gap-1">
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
                                                                    onClick={() =>
                                                                        void toggleReaction({
                                                                            messageId: m._id,
                                                                            emoji: r.emoji,
                                                                        })
                                                                    }
                                                                >
                                                                    <span className="mr-1">{r.emoji}</span>
                                                                    {r.count}
                                                                </Button>
                                                            ))}
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
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            editor?.chain().focus().setParagraph().run()
                                                        }
                                                    >
                                                        Normal
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            editor?.chain().focus().toggleHeading({ level: 1 }).run()
                                                        }
                                                    >
                                                        Heading 1
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            editor?.chain().focus().toggleHeading({ level: 2 }).run()
                                                        }
                                                    >
                                                        Heading 2
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            editor?.chain().focus().toggleHeading({ level: 3 }).run()
                                                        }
                                                    >
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
                                                className={cn(
                                                    editor?.isActive("bold") ? "bg-accent" : undefined
                                                )}
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
                                                className={cn(
                                                    editor?.isActive("italic") ? "bg-accent" : undefined
                                                )}
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
                                                className={cn(
                                                    editor?.isActive("underline") ? "bg-accent" : undefined
                                                )}
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
                                                className={cn(
                                                    editor?.isActive("link") ? "bg-accent" : undefined
                                                )}
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
                                                className={cn(
                                                    editor?.isActive("bulletList") ? "bg-accent" : undefined
                                                )}
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
                                                className={cn(
                                                    editor?.isActive("orderedList") ? "bg-accent" : undefined
                                                )}
                                            >
                                                <ListOrdered className="size-4" />
                                            </Button>

                                            <div className="mx-1 h-5 w-px bg-border" />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    editor?.chain().focus().unsetAllMarks().clearNodes().run()
                                                }
                                                disabled={!editor}
                                                aria-label="Clear formatting"
                                            >
                                                <RemoveFormatting className="size-4" />
                                            </Button>
                                        </div>
                                    ) : null}

                                    <div className="bg-background relative">
                                        <EditorContent editor={editor} />

                                        {mentionOpen ? (
                                            <div
                                                className="fixed z-50 w-72 rounded-md border border-border bg-popover p-1 shadow-md"
                                                style={
                                                    mentionPos
                                                        ? { left: mentionPos.left, top: mentionPos.top }
                                                        : { left: 16, bottom: 96 }
                                                }
                                            >
                                                {memberOptions.length === 0 ? (
                                                    <div className="px-2 py-2 text-xs text-muted-foreground">
                                                        No matches
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {memberOptions.map((opt, idx) => {
                                                            const initials = String(opt.name ?? "?")
                                                                .trim()
                                                                .charAt(0)
                                                                .toUpperCase();
                                                            const active = idx === mentionIndex;

                                                            return (
                                                                <button
                                                                    key={`${String(opt.userId)}-${String(opt.memberId)}`}
                                                                    type="button"
                                                                    className={cn(
                                                                        "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                                                                        "hover:bg-muted/40",
                                                                        active ? "bg-muted/40" : null
                                                                    )}
                                                                    onMouseEnter={() => setMentionIndex(idx)}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        insertMention(opt);
                                                                    }}
                                                                >
                                                                    <Avatar className="size-6">
                                                                        <AvatarImage
                                                                            alt={opt.name}
                                                                            src={opt.image ?? undefined}
                                                                        />
                                                                        <AvatarFallback className="text-[10px]">
                                                                            {initials}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs font-medium truncate">
                                                                            {opt.name}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
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
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        disabled={uploading || isSending}
                                                        aria-label="Emoji"
                                                    >
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
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={32} minSize={25} maxSize={55}>
                        <aside
                            className={cn(
                                "relative h-full bg-background flex flex-col min-h-0",
                                "border-l border-purple-500/50",
                                "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px",
                                "before:bg-purple-500/50 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]"
                            )}
                        >
                            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-purple-500/50">
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-lg">Thread</h2>
                                    <p className="text-xs text-muted-foreground truncate">#{channel.name}</p>
                                </div>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Close thread"
                                    onClick={closeThread}
                                >
                                    <X className="size-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                                {threadParent === undefined ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader className="size-4 text-muted-foreground animate-spin" />
                                    </div>
                                ) : threadParent ? (
                                    <div className="flex gap-3 rounded-md border bg-card p-3">
                                        <Avatar className="size-9">
                                            <AvatarImage
                                                alt={threadParent.user?.name ?? ""}
                                                src={threadParent.user?.image ?? undefined}
                                            />
                                            <AvatarFallback>
                                                {(threadParent.user?.name ?? "?")
                                                    .trim()
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-semibold truncate">
                                                    {threadParent.user?.name ?? "Unknown"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {formatTime(threadParent.createdAt)}
                                                </span>
                                            </div>

                                            {threadParent.body ? (
                                                (() => {
                                                    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(
                                                        threadParent.body
                                                    );
                                                    if (!looksLikeHtml) {
                                                        return (
                                                            <div className="mt-1 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                                                                {threadParent.body}
                                                            </div>
                                                        );
                                                    }

                                                    const safe = DOMPurify.sanitize(threadParent.body, {
                                                        USE_PROFILES: { html: true },
                                                        ADD_ATTR: [
                                                            "data-mention-user-id",
                                                            "data-mention-member-id",
                                                            "class",
                                                        ],
                                                    });

                                                    return (
                                                        <div
                                                            className={cn(
                                                                "mt-1 text-sm text-foreground wrap-break-word",
                                                                "**:wrap-break-word [&_a]:text-primary [&_a]:underline",
                                                                "[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0"
                                                            )}
                                                            dangerouslySetInnerHTML={{ __html: safe }}
                                                        />
                                                    );
                                                })()
                                            ) : null}

                                            {threadParent.imageUrl ? (
                                                <div className="mt-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={threadParent.imageUrl}
                                                        alt="uploaded"
                                                        className="w-full rounded-md border"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Thread not found.</p>
                                )}

                                {threadReplies === undefined ? null : (threadReplies ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No replies yet.</p>
                                ) : (
                                    (threadReplies ?? []).map((r: any) => {
                                        const name = r.user?.name ?? "Unknown";
                                        const initials = name?.[0]?.toUpperCase() ?? "?";
                                        return (
                                            <div key={r._id} className="flex gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarImage
                                                        alt={name}
                                                        src={r.user?.image ?? undefined}
                                                    />
                                                    <AvatarFallback>{initials}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-semibold truncate">{name}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {formatTime(r.createdAt)}
                                                        </span>
                                                    </div>

                                                    {r.body ? (
                                                        (() => {
                                                            const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(
                                                                r.body
                                                            );
                                                            if (!looksLikeHtml) {
                                                                return (
                                                                    <div className="mt-1 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                                                                        {r.body}
                                                                    </div>
                                                                );
                                                            }

                                                            const safe = DOMPurify.sanitize(r.body, {
                                                                USE_PROFILES: { html: true },
                                                                ADD_ATTR: [
                                                                    "data-mention-user-id",
                                                                    "data-mention-member-id",
                                                                    "class",
                                                                ],
                                                            });

                                                            return (
                                                                <div
                                                                    className={cn(
                                                                        "mt-1 text-sm text-foreground wrap-break-word",
                                                                        "**:wrap-break-word [&_a]:text-primary [&_a]:underline",
                                                                        "[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0"
                                                                    )}
                                                                    dangerouslySetInnerHTML={{ __html: safe }}
                                                                />
                                                            );
                                                        })()
                                                    ) : null}

                                                    {r.imageUrl ? (
                                                        <div className="mt-2">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={r.imageUrl}
                                                                alt="uploaded"
                                                                className="w-full rounded-md border"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="border-t border-border p-3">
                                <div className="rounded-md border border-border bg-background overflow-hidden">
                                    {showThreadComposerToolbar ? (
                                        <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => threadEditor?.chain().focus().toggleBold().run()}
                                                disabled={!threadEditor}
                                                aria-label="Bold"
                                                className={cn(
                                                    threadEditor?.isActive("bold") ? "bg-accent" : undefined
                                                )}
                                            >
                                                <Bold className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => threadEditor?.chain().focus().toggleItalic().run()}
                                                disabled={!threadEditor}
                                                aria-label="Italic"
                                                className={cn(
                                                    threadEditor?.isActive("italic") ? "bg-accent" : undefined
                                                )}
                                            >
                                                <Italic className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => threadEditor?.chain().focus().toggleUnderline().run()}
                                                disabled={!threadEditor}
                                                aria-label="Underline"
                                                className={cn(
                                                    threadEditor?.isActive("underline") ? "bg-accent" : undefined
                                                )}
                                            >
                                                <UnderlineIcon className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={toggleThreadLink}
                                                disabled={!threadEditor}
                                                aria-label="Link"
                                                className={cn(
                                                    threadEditor?.isActive("link") ? "bg-accent" : undefined
                                                )}
                                            >
                                                <LinkIcon className="size-4" />
                                            </Button>

                                            <div className="mx-1 h-5 w-px bg-border" />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    threadEditor?.chain().focus().toggleBulletList().run()
                                                }
                                                disabled={!threadEditor}
                                                aria-label="Bulleted list"
                                                className={cn(
                                                    threadEditor?.isActive("bulletList")
                                                        ? "bg-accent"
                                                        : undefined
                                                )}
                                            >
                                                <List className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    threadEditor?.chain().focus().toggleOrderedList().run()
                                                }
                                                disabled={!threadEditor}
                                                aria-label="Numbered list"
                                                className={cn(
                                                    threadEditor?.isActive("orderedList")
                                                        ? "bg-accent"
                                                        : undefined
                                                )}
                                            >
                                                <ListOrdered className="size-4" />
                                            </Button>

                                            <div className="mx-1 h-5 w-px bg-border" />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    threadEditor
                                                        ?.chain()
                                                        .focus()
                                                        .unsetAllMarks()
                                                        .clearNodes()
                                                        .run()
                                                }
                                                disabled={!threadEditor}
                                                aria-label="Clear formatting"
                                            >
                                                <RemoveFormatting className="size-4" />
                                            </Button>
                                        </div>
                                    ) : null}

                                    <div className="bg-background relative">
                                        <EditorContent editor={threadEditor} />

                                        {threadMentionOpen ? (
                                            <div
                                                className="fixed z-50 w-72 rounded-md border border-border bg-popover p-1 shadow-md"
                                                style={
                                                    threadMentionPos
                                                        ? {
                                                              left: threadMentionPos.left,
                                                              top: threadMentionPos.top,
                                                          }
                                                        : { left: 16, bottom: 96 }
                                                }
                                            >
                                                {threadMemberOptions.length === 0 ? (
                                                    <div className="px-2 py-2 text-xs text-muted-foreground">
                                                        No matches
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {threadMemberOptions.map((opt, idx) => {
                                                            const initials = String(opt.name ?? "?")
                                                                .trim()
                                                                .charAt(0)
                                                                .toUpperCase();
                                                            const active = idx === threadMentionIndex;

                                                            return (
                                                                <button
                                                                    key={`${String(opt.userId)}-${String(
                                                                        opt.memberId
                                                                    )}`}
                                                                    type="button"
                                                                    className={cn(
                                                                        "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                                                                        "hover:bg-muted/40",
                                                                        active ? "bg-muted/40" : null
                                                                    )}
                                                                    onMouseEnter={() =>
                                                                        setThreadMentionIndex(idx)
                                                                    }
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        insertThreadMention(opt);
                                                                    }}
                                                                >
                                                                    <Avatar className="size-6">
                                                                        <AvatarImage
                                                                            alt={opt.name}
                                                                            src={opt.image ?? undefined}
                                                                        />
                                                                        <AvatarFallback className="text-[10px]">
                                                                            {initials}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs font-medium truncate">
                                                                            {opt.name}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center justify-between px-2 py-1.5">
                                        <div className="flex items-center gap-1">
                                            <input
                                                ref={threadFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={onUploadThreadImage}
                                            />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setShowThreadComposerToolbar((v) => !v)}
                                                aria-label="Toggle formatting"
                                            >
                                                <Type className="size-4" />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        disabled={threadUploading || isThreadSending}
                                                        aria-label="Emoji"
                                                    >
                                                        <Smile className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="min-w-0">
                                                    <div className="grid grid-cols-8 gap-1 p-1">
                                                        {emojis.map((emoji) => (
                                                            <DropdownMenuItem
                                                                key={emoji}
                                                                onSelect={() => insertThreadEmoji(emoji)}
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
                                                onClick={onPickThreadImage}
                                                disabled={threadUploading || isThreadSending}
                                                aria-label="Upload image"
                                            >
                                                <ImageIcon className="size-4" />
                                            </Button>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() => void sendThreadMessage()}
                                            disabled={
                                                isThreadSending ||
                                                threadUploading ||
                                                !threadComposerText.trim()
                                            }
                                            className="shrink-0 bg-primary text-white! hover:bg-primary/90 disabled:opacity-100 cursor-pointer"
                                            size="icon"
                                            aria-label="Reply"
                                        >
                                            <Send className="size-4 text-white!" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                <div className="flex flex-1 min-h-0 flex-col">
                    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                        <div className="space-y-4">
                            <div ref={topSentinelRef} />
                            {messagesStatus === "LoadingMore" ? (
                                <div className="flex items-center justify-center py-2">
                                    <Loader className="size-4 text-muted-foreground animate-spin" />
                                </div>
                            ) : null}
                            {messages.map((m) => {
                                const name = m.user?.name ?? "Unknown";
                                const initials = name?.[0]?.toUpperCase() ?? "?";
                                const time = formatTime(m.createdAt);
                                const isOwner = Boolean(currentUser?._id && m.user?._id === currentUser._id);
                                const canDelete = isOwner || isAdmin;
                                const isEditing = editingId === m._id;
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
                                            <AvatarImage alt={name} src={m.user?.image ?? undefined} />
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0 flex-1">
                                            <div className="relative flex items-baseline gap-2 pr-16">
                                                <span className="text-sm font-semibold truncate">{name}</span>
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
                                                    <Button
                                                        type="button"
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        aria-label="Reply"
                                                        onClick={() => openThread(m._id)}
                                                    >
                                                        <Reply className="size-4" />
                                                    </Button>
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
                                                                        onSelect={() =>
                                                                            void toggleReaction({ messageId: m._id, emoji })
                                                                        }
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
                                                    {canDelete ? (
                                                        <Button
                                                            type="button"
                                                            size="icon-sm"
                                                            variant="ghost"
                                                            onClick={async () => {
                                                                if (!window.confirm("Delete this message?")) return;
                                                                setError(null);
                                                                try {
                                                                    await removeMessage({ messageId: m._id });
                                                                } catch (e) {
                                                                    setError(
                                                                        e instanceof Error
                                                                            ? e.message
                                                                            : "Failed to delete message"
                                                                    );
                                                                }
                                                            }}
                                                            aria-label="Delete message"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    ) : null}
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
                                                                            err instanceof Error
                                                                                ? err.message
                                                                                : "Failed to edit message"
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
                                                                        err instanceof Error
                                                                            ? err.message
                                                                            : "Failed to edit message"
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
                                                        ADD_ATTR: [
                                                            "data-mention-user-id",
                                                            "data-mention-member-id",
                                                            "class",
                                                        ],
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
                                                <div className="mt-2 flex flex-wrap gap-1">
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
                                                            onClick={() =>
                                                                void toggleReaction({ messageId: m._id, emoji: r.emoji })
                                                            }
                                                        >
                                                            <span className="mr-1">{r.emoji}</span>
                                                            {r.count}
                                                        </Button>
                                                    ))}
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
                                            <DropdownMenuItem
                                                onSelect={() => editor?.chain().focus().setParagraph().run()}
                                            >
                                                Normal
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onSelect={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                                            >
                                                Heading 1
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onSelect={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                            >
                                                Heading 2
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onSelect={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                                            >
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

                            <div className="bg-background relative">
                                <EditorContent editor={editor} />
                                {mentionOpen ? (
                                    <div
                                        className="fixed z-50 w-72 rounded-md border border-border bg-popover p-1 shadow-md"
                                        style={
                                            mentionPos
                                                ? { left: mentionPos.left, top: mentionPos.top }
                                                : { left: 16, bottom: 96 }
                                        }
                                    >
                                        {memberOptions.length === 0 ? (
                                            <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {memberOptions.map((opt, idx) => {
                                                    const initials = String(opt.name ?? "?")
                                                        .trim()
                                                        .charAt(0)
                                                        .toUpperCase();
                                                    const active = idx === mentionIndex;
                                                    return (
                                                        <button
                                                            key={`${String(opt.userId)}-${String(opt.memberId)}`}
                                                            type="button"
                                                            className={cn(
                                                                "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                                                                "hover:bg-muted/40",
                                                                active ? "bg-muted/40" : null
                                                            )}
                                                            onMouseEnter={() => setMentionIndex(idx)}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                insertMention(opt);
                                                            }}
                                                        >
                                                            <Avatar className="size-6">
                                                                <AvatarImage alt={opt.name} src={opt.image ?? undefined} />
                                                                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-medium truncate">{opt.name}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
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
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                disabled={uploading || isSending}
                                                aria-label="Emoji"
                                            >
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
            )}
        </div>
    );
};

export default ChannelIdPage;