"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import createDOMPurify from "dompurify";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";

import { UseCurrentMember } from "@/features/members/api/use-current-member";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  RemoveFormatting,
  Loader,
  Plus,
  Trash2,
  Save,
  Book,
  Maximize2,
  X,
} from "lucide-react";

const TEMPLATE_HTML = `
<h2>Weekly Assignment</h2>
<p><strong>Spirit of the Week:</strong> </p>
<p><strong>Assigned Reading:</strong> </p>
<hr/>
<p><strong>Overarching Focus</strong></p>
<p>Before diving into reflection, center your heart around this:</p>
<p><em>Write the main focus question here.</em></p>
<hr/>
<p><strong>Discussion Questions</strong></p>
<ol>
  <li><strong>Personal Application</strong><br/>What truth or lesson speaks most directly to your life right now?</li>
  <li><strong>Move of God</strong><br/>Where do you see God moving through people, circumstances, or divine intervention?</li>
  <li><strong>Open Commentary</strong><br/>Share any insights, questions, or encouragements from the reading.</li>
</ol>
`;

const formatDisplayName = (rawName: string | null | undefined) => {
  const name = String(rawName ?? "").trim();
  if (!name) return "Unnamed";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getInitials = (displayName: string) => {
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const LearnNowPage = () => {
  const workspaceId = useWorkspaceId();
  const searchParams = useSearchParams();
  const { data: member } = UseCurrentMember({ workspaceId });
  const isAdmin = member?.role === "admin";

  const posts = useQuery(api.curriculum.listByWorkspace, { workspaceId });
  const isLoading = posts === undefined;

  const createPost = useMutation(api.curriculum.create);
  const updatePost = useMutation(api.curriculum.update);
  const removePost = useMutation(api.curriculum.remove);

  const [selectedId, setSelectedId] = React.useState<Id<"curriculumPosts"> | null>(null);

  React.useEffect(() => {
    const postParam = searchParams.get("post");
    if (!postParam) return;
    if (selectedId && String(selectedId) === String(postParam)) return;
    // Only set if it exists in the loaded posts (avoids selecting invalid ids)
    const exists = (posts ?? []).some((p: any) => String(p._id) === String(postParam));
    if (!exists) return;
    setSelectedId(postParam as Id<"curriculumPosts">);
  }, [posts, searchParams, selectedId]);

  const comments = useQuery(
    api.curriculumComments.listByPost,
    selectedId ? { postId: selectedId } : "skip"
  );
  const addComment = useMutation(api.curriculumComments.add);
  const removeComment = useMutation(api.curriculumComments.remove);
  const selected = React.useMemo(
    () => (posts ?? []).find((p: any) => String(p._id) === String(selectedId)) ?? null,
    [posts, selectedId]
  );

  const [weekLabel, setWeekLabel] = React.useState("CURRENT WEEK");
  const [title, setTitle] = React.useState("Weekly Assignment");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [commentBody, setCommentBody] = React.useState("");
  const [commentError, setCommentError] = React.useState<string | null>(null);
  const [commentPosting, setCommentPosting] = React.useState(false);

  const [readerOpen, setReaderOpen] = React.useState(false);

  const dompurify = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    return createDOMPurify(window);
  }, []);

  const readerHtml = React.useMemo(() => {
    const raw = String(selected?.body ?? "");
    return dompurify
      ? dompurify.sanitize(raw, { USE_PROFILES: { html: true } })
      : raw;
  }, [dompurify, selected?.body]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: "Write the weekly curriculum..." }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[260px] w-full px-3 py-3 text-sm outline-none",
          "text-foreground",
          "[&_*]:break-words [&_a]:text-primary [&_a]:underline",
          "[&_h2]:text-lg [&_h2]:font-semibold",
          "[&_hr]:my-3 [&_ol]:pl-5 [&_ul]:pl-5"
        ),
      },
    },
    content: TEMPLATE_HTML,
  });

  React.useEffect(() => {
    if (!editor) return;
    if (!selectedId) {
      // New post
      editor.commands.setContent(TEMPLATE_HTML);
      setWeekLabel("CURRENT WEEK");
      setTitle("Weekly Assignment");
      setCommentBody("");
      setCommentError(null);
      return;
    }

    if (!selected) return;
    setWeekLabel(String(selected.weekLabel ?? ""));
    setTitle(String(selected.title ?? ""));
    editor.commands.setContent(String(selected.body ?? ""));
    setCommentBody("");
    setCommentError(null);
  }, [editor, selected, selectedId]);

  const onAddComment = React.useCallback(async () => {
    if (!selectedId) return;
    setCommentPosting(true);
    setCommentError(null);

    try {
      const body = commentBody.trim();
      if (!body) throw new Error("Write a response first");
      await addComment({ postId: selectedId, body });
      setCommentBody("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to post response");
    } finally {
      setCommentPosting(false);
    }
  }, [addComment, commentBody, selectedId]);

  const onRemoveComment = React.useCallback(
    async (id: Id<"curriculumComments">) => {
      setCommentError(null);
      try {
        await removeComment({ id });
      } catch (e) {
        setCommentError(e instanceof Error ? e.message : "Failed to delete response");
      }
    },
    [removeComment]
  );

  const renderResponses = React.useCallback(
    ({ inModal }: { inModal: boolean }) => {
      return (
        <div className={cn(inModal ? "h-full min-h-0 flex flex-col" : undefined)}>
          <div
            className={cn(
              inModal ? "px-5 py-4 border-b border-border" : "border-t border-border px-4 py-4"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Responses</div>
              <div className="text-xs text-muted-foreground">{(comments ?? []).length} total</div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Add a response</label>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write your response…"
                className={cn(
                  "mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "outline-none"
                )}
                rows={3}
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void onAddComment()}
                  disabled={commentPosting || !selectedId}
                >
                  {commentPosting ? "Posting…" : "Post"}
                </Button>
              </div>

              {commentError ? (
                <div className="mt-2 text-sm text-destructive">{commentError}</div>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              inModal ? "flex-1 min-h-0 overflow-y-auto px-5 py-4" : "mt-4 space-y-3"
            )}
          >
            {comments === undefined ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="size-4 animate-spin" />
                Loading responses…
              </div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No responses yet.</div>
            ) : (
              <div className="space-y-3">
                {comments.map((c: any) => {
                  const displayName = formatDisplayName(c.user?.name);
                  const initials = getInitials(displayName);
                  const canDelete =
                    isAdmin || (member?.userId && String(c.userId) === String(member.userId));

                  return (
                    <div
                      key={String(c._id)}
                      className="rounded-md border border-border bg-background px-3 py-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar className="size-9 shrink-0">
                            <AvatarImage alt={displayName} src={c.user?.image ?? undefined} />
                            <AvatarFallback className="bg-muted text-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="text-sm font-semibold truncate">{displayName}</div>
                              <div className="text-xs text-muted-foreground shrink-0">
                                {c.createdAt ? new Date(Number(c.createdAt)).toLocaleString() : ""}
                              </div>
                            </div>
                            <div className="mt-1 text-sm whitespace-pre-wrap wrap-break-word">
                              {String(c.body ?? "")}
                            </div>
                          </div>
                        </div>

                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void onRemoveComment(c._id)}
                            aria-label="Delete response"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      commentBody,
      commentError,
      commentPosting,
      comments,
      isAdmin,
      member?.userId,
      onAddComment,
      onRemoveComment,
      selectedId,
    ]
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

  const onNew = React.useCallback(() => {
    setSelectedId(null);
    setError(null);
  }, []);

  const onSave = React.useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    setError(null);

    const cleanWeek = weekLabel.trim();
    const cleanTitle = title.trim();
    const body = editor.getHTML().trim();

    try {
      if (!cleanWeek) throw new Error("Week label is required");
      if (!cleanTitle) throw new Error("Title is required");
      if (!body) throw new Error("Body is required");

      if (!selectedId) {
        const res = await createPost({
          workspaceId,
          weekLabel: cleanWeek,
          title: cleanTitle,
          body,
        });
        setSelectedId(res.id as Id<"curriculumPosts">);
      } else {
        await updatePost({
          id: selectedId,
          weekLabel: cleanWeek,
          title: cleanTitle,
          body,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [createPost, editor, selectedId, title, updatePost, weekLabel, workspaceId]);

  const onDelete = React.useCallback(async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this weekly curriculum post?") ) return;
    setError(null);
    try {
      await removePost({ id: selectedId });
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }, [removePost, selectedId]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Book className="size-5 text-muted-foreground" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold truncate">Learn Now</h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Weekly curriculum and assignments for this workspace.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <Button type="button" onClick={onNew} className="shrink-0" size="sm">
              <Plus className="size-4 mr-2" />
              New Post
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader className="size-5 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize={40} minSize={28}>
              <div className="h-full min-h-0 overflow-y-auto px-4 py-4">
                {(posts ?? []).length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No curriculum posts yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(posts ?? []).map((p: any) => {
                      const active = selectedId && String(p._id) === String(selectedId);
                      const displayName = formatDisplayName(p.author?.name);
                      const initials = getInitials(displayName);
                      const previewText = String(p.title ?? "");

                      return (
                        <Button
                          key={String(p._id)}
                          type="button"
                          variant="ghost"
                          className={cn(
                            "w-full h-auto justify-start gap-4 rounded-md border border-border bg-card/60 px-6 py-5 text-left hover:bg-muted/40",
                            active ? "bg-muted/40" : null
                          )}
                          onClick={() => setSelectedId(p._id as Id<"curriculumPosts">)}
                        >
                          <Avatar className="size-11">
                            <AvatarImage alt={displayName} src={p.author?.image ?? undefined} />
                            <AvatarFallback className="bg-muted text-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold truncate">
                              {String(p.weekLabel ?? "").toUpperCase()}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {previewText}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={60} minSize={38}>
              <div className="h-full min-h-0 overflow-y-auto px-4 py-4">
                {!selected && !isAdmin ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Select a post to view.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-card/60">
                    <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground truncate">Week</div>
                      {isAdmin ? (
                        <input
                          value={weekLabel}
                          onChange={(e) => setWeekLabel(e.target.value)}
                          className={cn(
                            "mt-1 w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm",
                            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                            "outline-none"
                          )}
                        />
                      ) : (
                        <div className="mt-1 text-lg font-semibold truncate">
                          {String(selected?.weekLabel ?? "")}
                        </div>
                      )}

                      <div className="mt-3 text-xs text-muted-foreground truncate">Title</div>
                      {isAdmin ? (
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className={cn(
                            "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
                            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                            "outline-none"
                          )}
                        />
                      ) : (
                        <div className="mt-1 text-base font-semibold truncate">
                          {String(selected?.title ?? "")}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selected ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setReaderOpen(true)}
                          aria-label="Expand lesson"
                        >
                          <Maximize2 className="size-4" />
                        </Button>
                      ) : null}

                      {isAdmin ? (
                        <>
                          {selectedId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void onDelete()}
                              aria-label="Delete"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void onSave()}
                            disabled={saving}
                          >
                            <Save className="size-4 mr-2" />
                            Save
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {error ? (
                    <div className="px-4 pt-3 text-sm text-destructive">{error}</div>
                  ) : null}

                  <div className="px-4 py-4">
                    {isAdmin ? (
                      <>
                        <div className="flex items-center gap-1 mb-2">
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

                        <div className="rounded-md border border-border bg-background overflow-hidden">
                          <EditorContent editor={editor} />
                        </div>
                      </>
                    ) : (
                      <div
                        className={cn(
                          "prose prose-invert max-w-none",
                          "text-sm",
                          "[&_h2]:text-lg [&_h2]:font-semibold",
                          "[&_hr]:my-3 [&_ol]:pl-5 [&_ul]:pl-5",
                          "prose-p:my-2"
                        )}
                        dangerouslySetInnerHTML={{
                          __html: dompurify
                            ? dompurify.sanitize(String(selected?.body ?? ""), {
                                USE_PROFILES: { html: true },
                              })
                            : String(selected?.body ?? ""),
                        }}
                      />
                    )}
                  </div>

                  {selectedId ? renderResponses({ inModal: false }) : null}
                </div>
              )}
            </div>
          </ResizablePanel>
          </ResizablePanelGroup>

          {readerOpen && selected ? (
            <div className="absolute inset-0 z-20 rounded-md border border-border bg-background overflow-hidden">
              <div className="border-b border-border px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {String(selected?.weekLabel ?? "").toUpperCase()} — {String(selected?.title ?? "")}
                  </div>
                  <div className="text-xs text-muted-foreground">Curriculum</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setReaderOpen(false)}
                  aria-label="Close expanded lesson"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="h-full min-h-0 overflow-y-auto">
                <div className="px-5 py-5">
                  <div
                    className={cn(
                      "prose prose-invert max-w-none",
                      "text-base",
                      "[&_h2]:text-xl [&_h2]:font-semibold",
                      "[&_hr]:my-4 [&_ol]:pl-6 [&_ul]:pl-6",
                      "prose-p:my-3"
                    )}
                    dangerouslySetInnerHTML={{ __html: readerHtml }}
                  />
                </div>

                <div className="bg-background">
                  {selectedId ? renderResponses({ inModal: false }) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LearnNowPage;
