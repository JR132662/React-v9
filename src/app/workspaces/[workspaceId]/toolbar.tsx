"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { UseGetChannels } from "@/features/channels/api/use-get-channels";
import { useGetMembers } from "@/features/channels/api/use-get-members";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    Check,
    Hash,
    MessageSquare,
    Monitor,
    Moon,
    Search,
    Sun,
    User,
    BookOpen,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as React from "react";
import { useRouter } from "next/navigation";

type Theme = "dark" | "light";

const getStoredTheme = (): Theme => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("theme") === "light" ? "light" : "dark";
};

const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("theme", theme);
};


const Toolbar = () => {
    const workspaceId = useWorkspaceId();
    const { data } = useGetWorkspace({ id: workspaceId });
    const router = useRouter();

    const { data: channels } = UseGetChannels({ workspaceId });
    const { data: members } = useGetMembers({ workspaceId });
    const curriculumPosts = useQuery(api.curriculum.listByWorkspace, { workspaceId });

    const [searchOpen, setSearchOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const [theme, setTheme] = React.useState<Theme>("dark");

    React.useEffect(() => {
        setTheme(getStoredTheme());
    }, []);

    const onSelectTheme = React.useCallback((nextTheme: Theme) => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
    }, []);

    React.useEffect(() => {
        if (!searchOpen) return;
        const t = window.setTimeout(() => inputRef.current?.focus(), 50);
        return () => window.clearTimeout(t);
    }, [searchOpen]);

    const normalizedQuery = query.trim().toLowerCase();
    const stripHtml = React.useCallback((html: string) => {
        return String(html)
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }, []);

    type SearchResult = {
        key: string;
        type: "channel" | "user" | "curriculum" | "channelMessage" | "dm";
        title: string;
        subtitle?: string;
        onSelect: () => void;
        icon: React.ReactNode;
    };

    const messageResults = useQuery(
        api.search.messagesAndDms,
        searchOpen && normalizedQuery
            ? { workspaceId, q: query.trim(), limit: 6 }
            : "skip"
    );

    const results = React.useMemo<SearchResult[]>(() => {
        if (!normalizedQuery) return [];

        const out: SearchResult[] = [];

        for (const ch of channels ?? []) {
            const name = String((ch as any)?.name ?? "");
            if (!name.toLowerCase().includes(normalizedQuery)) continue;
            const channelId = (ch as any)?._id;
            if (!channelId) continue;
            out.push({
                key: `channel:${String(channelId)}`,
                type: "channel",
                title: `# ${name}`,
                subtitle: "Channel",
                icon: <Hash className="size-4 text-muted-foreground" />,
                onSelect: () => {
                    setSearchOpen(false);
                    router.push(`/workspaces/${workspaceId}/channel/${channelId}`);
                },
            });
        }

        for (const m of members ?? []) {
            const userName = String((m as any)?.user?.name ?? "");
            if (!userName.toLowerCase().includes(normalizedQuery)) continue;
            const memberId = (m as any)?._id;
            if (!memberId) continue;
            out.push({
                key: `user:${String(memberId)}`,
                type: "user",
                title: userName,
                subtitle: "User",
                icon: <User className="size-4 text-muted-foreground" />,
                onSelect: () => {
                    setSearchOpen(false);
                    router.push(`/workspaces/${workspaceId}/members/${memberId}`);
                },
            });
        }

        for (const p of curriculumPosts ?? []) {
            const title = String((p as any)?.title ?? "");
            const week = String((p as any)?.weekLabel ?? "");
            const body = stripHtml(String((p as any)?.body ?? ""));
            const haystack = `${week} ${title} ${body}`.toLowerCase();
            if (!haystack.includes(normalizedQuery)) continue;
            const postId = (p as any)?._id;
            if (!postId) continue;
            out.push({
                key: `curriculum:${String(postId)}`,
                type: "curriculum",
                title: title || week || "Curriculum",
                subtitle: week ? `Curriculum • ${week}` : "Curriculum",
                icon: <BookOpen className="size-4 text-muted-foreground" />,
                onSelect: () => {
                    setSearchOpen(false);
                    router.push(`/workspaces/${workspaceId}/learn-now?post=${postId}`);
                },
            });
        }

        for (const m of messageResults?.channelMessages ?? []) {
            const channelName = String(m.channel?.name ?? "");
            const author = String(m.user?.name ?? "");
            const text = String(m.text ?? "");
            out.push({
                key: `channelMessage:${String(m._id)}`,
                type: "channelMessage",
                title: text || "Message",
                subtitle: channelName
                    ? `Channel • #${channelName}${author ? ` • ${author}` : ""}`
                    : `Channel message${author ? ` • ${author}` : ""}`,
                icon: <MessageSquare className="size-4 text-muted-foreground" />,
                onSelect: () => {
                    setSearchOpen(false);
                    router.push(`/workspaces/${workspaceId}/channel/${String(m.channelId)}`);
                },
            });
        }

        for (const dm of messageResults?.directMessages ?? []) {
            const otherName = String(dm.otherUser?.name ?? "Direct Message");
            const text = String(dm.text ?? "");
            const memberId = dm.otherMemberId;
            out.push({
                key: `dm:${String(dm._id)}`,
                type: "dm",
                title: text || "DM",
                subtitle: otherName ? `DM • ${otherName}` : "DM",
                icon: <MessageSquare className="size-4 text-muted-foreground" />,
                onSelect: () => {
                    setSearchOpen(false);
                    if (memberId) {
                        router.push(`/workspaces/${workspaceId}/members/${String(memberId)}`);
                        return;
                    }
                    router.push(`/workspaces/${workspaceId}/dms`);
                },
            });
        }

        return out.slice(0, 20);
    }, [channels, curriculumPosts, members, messageResults?.channelMessages, messageResults?.directMessages, normalizedQuery, query, router, stripHtml, workspaceId]);


    return (
        <nav className="bg-sidebar flex items-center justify-between h-12 p-1.5">
            <div className="flex-1" />
            <div className="min-w-70 max-160.5 grow-2 shrink">
                <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                    <Button
                        size="sm"
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="group relative bg-accent/25 hover:bg-white w-full justify-start h-7 px-2 border border-purple-500/50 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-purple-500/80 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]"
                    >
                        <Search className="size-4 text-sidebar-foreground mr-2 group-hover:text-black" />
                        <span className="text-sidebar-foreground text-xs group-hover:text-black">
                            Search {data?.name}
                        </span>
                    </Button>

                    <DialogContent className="max-w-xl p-0 overflow-hidden">
                        <div className="border-b border-border px-4 py-3">
                            <DialogHeader className="gap-1">
                                <DialogTitle className="text-base">Search</DialogTitle>
                                <div className="text-xs text-muted-foreground truncate">
                                    {data?.name ? `Workspace: ${data.name}` : "Workspace search"}
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="px-4 py-3">
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search channels, users, curriculum…"
                                className="h-10"
                            />
                        </div>

                        <div className="max-h-80 overflow-y-auto px-2 pb-2">
                            {!normalizedQuery ? (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    Start typing to search channels, users, and curriculum.
                                </div>
                            ) : results.length === 0 ? (
                                <div className="px-2 py-6 text-sm text-muted-foreground">
                                    No results.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {results.map((r) => (
                                        <button
                                            key={r.key}
                                            type="button"
                                            onClick={r.onSelect}
                                            className="w-full rounded-md px-3 py-2 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="shrink-0">{r.icon}</div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-medium truncate">{r.title}</div>
                                                    {r.subtitle ? (
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {r.subtitle}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="ml-auto flex-1 flex items-center justify-end">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="sm"
                            variant="transparent"
                            className="bg-accent/25 hover:bg-accent/40 h-7 px-3 text-sidebar-foreground text-xs items-center"
                        >
                            {theme === "dark" ? (
                                <Moon className="size-4 text-sidebar-foreground mr-2" />
                            ) : (
                                <Sun className="size-4 text-sidebar-foreground mr-2" />
                            )}
                            Theme
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => onSelectTheme("dark")}
                        >
                            <Moon className="size-4 mr-2" />
                            Dark
                            {theme === "dark" ? <Check className="size-4 ml-auto" /> : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => onSelectTheme("light")}
                        >
                            <Sun className="size-4 mr-2" />
                            Light
                            {theme === "light" ? <Check className="size-4 ml-auto" /> : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled
                            className="opacity-60"
                        >
                            <Monitor className="size-4 mr-2" />
                            System
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}
export default Toolbar;