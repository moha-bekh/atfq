import type { Article, NodeBreadcrumb } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/features/user/api";
import { useAppStore } from "@/stores/app.store";

interface RightSidebarProps {
  article: Article;
  conceptLinks: NodeBreadcrumb[];
  onItemClick: (id: number) => void;
  mode: "read" | "edit" | "create";
  canContribute: boolean;
  onModeChange: (mode: "read" | "edit" | "create") => void;
}

export default function RightSidebar({ article, conceptLinks, onItemClick, mode, canContribute, onModeChange }: RightSidebarProps) {
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
    src: contributor.profile_picture_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contributor.username || String(contributor.id))}`,
    friendshipStatus: contributor.friendship_status,
    isFriend: Boolean(contributor.is_friend),
    isOnline: Boolean(contributor.is_online),
  }));

  return (
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
  );
}
