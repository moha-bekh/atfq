import type { Article, NodeBreadcrumb } from "../types";

interface RightSidebarProps {
  article: Article;
  conceptLinks: NodeBreadcrumb[];
  onItemClick: (id: number) => void;
}

export default function RightSidebar({ article, conceptLinks, onItemClick }: RightSidebarProps) {
  // Mock resources if not available in metadata
  const resources = [
    { label: "Operating Systems: Three Easy Pieces" },
    { label: "wiki.osdev.org" },
  ];

  const contributors = (article.contributors || []).map((contributor) => ({
    id: contributor.id,
    username: contributor.username,
    src: contributor.profile_picture_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contributor.username || String(contributor.id))}`,
  }));

  return (
    <aside className="grid w-full min-w-0 grid-cols-1 gap-8 md:grid-cols-3 xl:flex xl:flex-col">
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
          {resources.map((res) => (
            <span
              key={res.label}
              className="cursor-pointer break-words font-jakarta text-base font-normal leading-7 text-text transition-colors hover:text-main hover:underline"
            >
              {res.label}
            </span>
          ))}
        </div>
      </div>

      {/* Contributors */}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-bricolage font-semibold text-base text-sub uppercase">
              Contributors
            </span>
            <span className="font-bricolage font-semibold text-xl text-sub leading-[120%]">
              {article.contributors.length}
            </span>
          </div>
          <div className="h-[1.5px] bg-sub w-full" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {contributors.map((c) => (
            <img
              key={`${c.id}-${c.username}`}
              src={c.src}
              alt={c.username}
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-sub/40 bg-sub/10 transition-transform hover:-translate-y-0.5"
              title={c.username}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
