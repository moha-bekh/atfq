import { useState } from "react";
import type { Article, NodeBreadcrumb } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/features/user/api";
import { getProfilePictureUrl } from "@/features/user/utils/profilePicture";
import { useAppStore } from "@/stores/app.store";

interface RightSidebarProps {
  article: Article;
  parentOptions: NodeBreadcrumb[];
  conceptLinks: NodeBreadcrumb[];
  onItemClick: (id: number) => void;
  mode: "read" | "edit" | "create";
  canContribute: boolean;
  canDeleteArticle: boolean;
  isDeletingArticle: boolean;
  onModeChange: (mode: "read" | "edit" | "create") => void;
  onDeleteArticle: (mode: "delete_branch" | "reassign_children", newParent?: number) => void;
}

export default function RightSidebar({
  article,
  parentOptions,
  conceptLinks,
  onItemClick,
  mode,
  canContribute,
  canDeleteArticle,
  isDeletingArticle,
  onModeChange,
  onDeleteArticle,
}: RightSidebarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reassignParentId, setReassignParentId] = useState("");
  const queryClient = useQueryClient();
  const currentUser = useAppStore((state) => state.user);
  const addFriendMutation = useMutation({
    mutationFn: (targetId: string) => userApi.sendFriendRequest(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const resources = article.resources || [];
  const modeItems: Array<"read" | "edit" | "create"> = canContribute
    ? ["read", "edit", "create"]
    : ["read"];
  const contributors = (article.contributors || []).map((contributor) => ({
    id: contributor.id,
    userId: contributor.user_id,
    username: contributor.username,
    src: getProfilePictureUrl(contributor.profile_picture_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contributor.username || String(contributor.id))}`,
    friendshipStatus: contributor.friendship_status,
    isFriend: Boolean(contributor.is_friend),
    isOnline: Boolean(contributor.is_online),
  }));

  const invalidParentIds = new Set([
    article.article_node.id,
    ...(article.sub_articles || []).map((subArticle) => subArticle.id),
  ]);
  const reassignParentOptions = parentOptions.filter((parent) => !invalidParentIds.has(parent.id));
  const selectedReassignParent = reassignParentId ? Number(reassignParentId) : 0;
  const selectedReassignParentLabel = reassignParentOptions.find((parent) => parent.id === selectedReassignParent)?.title || "Root article";

  const handleDeleteChoice = (deleteMode: "delete_branch" | "reassign_children") => {
    setIsDeleteDialogOpen(false);
    onDeleteArticle(deleteMode, deleteMode === "reassign_children" ? selectedReassignParent : undefined);
  };

  return (
    <>
    <aside className="grid w-full min-w-0 grid-cols-1 gap-8 md:grid-cols-3 xl:flex xl:flex-col">
      <section className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {modeItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onModeChange(item)}
              className={`rounded-lg px-2 py-1 font-bricolage text-sm font-semibold uppercase transition-colors ${
                mode === item
                  ? "bg-main text-bg"
                  : "text-sub/70 hover:bg-main/5 hover:text-sub"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="h-[1.5px] bg-sub w-full" />
      </section>

      {canDeleteArticle && (
        <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-error/25 bg-error/5 p-3">
          <span className="font-bricolage font-semibold text-base text-error uppercase">
            Admin delete
          </span>
          <div className="h-[1.5px] bg-error/50 w-full" />
          <button
            type="button"
            disabled={isDeletingArticle}
            onClick={() => {
              setReassignParentId(article.article_node.parent_id ? String(article.article_node.parent_id) : "");
              setIsDeleteDialogOpen(true);
            }}
            className="rounded-lg border border-error/40 px-3 py-2 text-left font-bricolage text-[10px] font-bold uppercase tracking-widest text-error transition-colors hover:bg-error/10 disabled:opacity-50"
          >
            Delete article
          </button>
        </section>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-2">
          <span className="font-bricolage font-semibold text-base text-sub uppercase">
            On this concept
          </span>
          <div className="h-[1.5px] bg-sub w-full" />
        </div>
        {conceptLinks.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {conceptLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onItemClick(link.id)}
                className="flex min-w-0 items-center w-full rounded-lg px-2 py-[2.5px] text-left font-jakarta text-base font-normal leading-7 text-text transition-colors hover:bg-main/5 hover:text-main"
              >
                <span className="break-words">{link.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-2 font-jakarta text-sm leading-6 text-text/60">
            No related articles yet.
          </p>
        )}
      </div>

      {/* Resources */}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-2">
          <span className="font-bricolage font-semibold text-base text-sub uppercase">
            Resources
          </span>
          <div className="h-[1.5px] bg-sub w-full" />
        </div>
        <div className="flex flex-col gap-0.5 px-2">
          {resources.length > 0 ? (
            resources.map((res) => (
              res.url ? (
                <a
                  key={`${res.label}-${res.url}`}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer break-words font-jakarta text-base font-normal leading-7 text-text transition-colors hover:text-main hover:underline"
                >
                  {res.label}
                </a>
              ) : (
                <span
                  key={res.label}
                  className="break-words font-jakarta text-base font-normal leading-7 text-text"
                >
                  {res.label}
                </span>
              )
            ))
          ) : (
            <span className="break-words font-jakarta text-sm leading-6 text-text/60">
              No resources attached.
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-bricolage font-semibold text-base text-sub uppercase">
              Contributors
            </span>
            <span className="font-bricolage text-xl font-semibold leading-[120%] text-sub">
              {contributors.length}
            </span>
          </div>
          <div className="h-[1.5px] bg-sub w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contributors.map((contributor) => (
            <div key={`${contributor.id}-${contributor.username}`} className="group relative">
              <img
                src={contributor.src}
                alt={contributor.username}
                className={`h-8 w-8 shrink-0 rounded-full border bg-sub/10 object-cover ${
                  contributor.isFriend ? "border-main" : "border-sub/40"
                }`}
                title={contributor.username}
              />
              {contributor.isFriend && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-bg ${
                    contributor.isOnline ? "bg-main" : "bg-sub"
                  }`}
                  title={contributor.isOnline ? "Friend online" : "Friend offline"}
                />
              )}
              {currentUser && contributor.userId && contributor.userId !== currentUser.id && !contributor.friendshipStatus && (
                <button
                  type="button"
                  disabled={addFriendMutation.isPending}
                  onClick={() => addFriendMutation.mutate(contributor.userId!)}
                  className="absolute -bottom-2 left-1/2 hidden -translate-x-1/2 rounded border border-main/30 bg-bg px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-main shadow-lg group-hover:block disabled:opacity-50"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

    </aside>
    {isDeleteDialogOpen && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/80 px-4 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wiki-delete-dialog-title"
          className="w-full max-w-md rounded-lg border border-error/25 bg-bg p-5 shadow-2xl shadow-sub-alt/30"
        >
          <div className="flex flex-col gap-2">
            <p id="wiki-delete-dialog-title" className="font-bricolage text-lg font-semibold uppercase text-error">
              Delete article
            </p>
            <p className="break-words font-jakarta text-sm leading-6 text-text">
              Choose what happens to the children of "{article.article_node.title}".
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              disabled={isDeletingArticle}
              onClick={() => handleDeleteChoice("delete_branch")}
              className="rounded-lg border border-error/40 px-4 py-3 text-left transition-colors hover:bg-error/10 disabled:opacity-50"
            >
              <span className="block font-bricolage text-xs font-bold uppercase tracking-widest text-error">
                Delete full branch
              </span>
              <span className="mt-1 block font-jakarta text-sm leading-5 text-text/75">
                Delete this article and every child article below it.
              </span>
            </button>
            <label className="flex flex-col gap-2">
              <span className="font-bricolage text-xs font-bold uppercase tracking-widest text-sub">
                New parent
              </span>
              <select
                value={reassignParentId}
                onChange={(event) => setReassignParentId(event.target.value)}
                className="min-h-10 rounded-lg border-2 border-sub/30 bg-bg px-3 font-jakarta text-sm text-text outline-none transition-colors focus:border-main"
              >
                <option value="">Root article</option>
                {reassignParentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={isDeletingArticle}
              onClick={() => handleDeleteChoice("reassign_children")}
              className="rounded-lg border border-main/30 px-4 py-3 text-left transition-colors hover:bg-main/10 disabled:opacity-50"
            >
              <span className="block font-bricolage text-xs font-bold uppercase tracking-widest text-main">
                Reassign children
              </span>
              <span className="mt-1 block font-jakarta text-sm leading-5 text-text/75">
                Delete only this article and move its child articles to {selectedReassignParentLabel}.
              </span>
            </button>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={isDeletingArticle}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-lg border border-sub/30 px-4 py-2 font-bricolage text-xs font-bold uppercase tracking-widest text-sub transition-colors hover:bg-sub/10 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
