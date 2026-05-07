import type { Article } from "../types";

interface RightSidebarProps {
  article: Article;
  onItemClick: (id: number) => void;
}

export default function RightSidebar({ article, onItemClick }: RightSidebarProps) {
  const conceptLinks = (article.sub_articles || []).map(a => ({
    id: a.id,
    label: a.title,
    active: false,
  }));

  // Mock resources if not available in metadata
  const resources = [
    { label: "Operating Systems: Three Easy Pieces" },
    { label: "wiki.osdev.org" },
  ];

  // Map contributors to placeholder images if needed, or use actual ones if available
  // For now, let's use the contributors strings (which might be user IDs or names)
  // and map them to placeholders for the visual effect requested.
  const contributors = (article.contributors || []).map((c) => ({
    id: c,
    src: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c}`,
  }));

  return (
    <aside className="flex flex-col gap-8 w-full">
      {/* On this concept */}
      {conceptLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <span className="font-bricolage font-semibold text-base text-brand-indigo uppercase">
              Sub-articles
            </span>
            <div className="h-[1.5px] bg-brand-indigo w-full" />
          </div>
          <div className="flex flex-col gap-0.5">
            {conceptLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onItemClick(link.id)}
                className={`flex items-center w-full text-left px-2 py-[2.5px] rounded-lg font-jakarta text-base font-normal leading-7 transition-colors ${
                  link.active
                    ? "bg-brand-indigo text-brand-lavender"
                    : "bg-transparent text-brand-lavender hover:bg-brand-indigo/20"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <span className="font-bricolage font-semibold text-base text-brand-indigo uppercase">
            Resources
          </span>
          <div className="h-[1.5px] bg-brand-indigo w-full" />
        </div>
        <div className="flex flex-col gap-0.5 px-2">
          {resources.map((res) => (
            <span
              key={res.label}
              className="font-jakarta text-base font-normal leading-7 text-brand-lavender cursor-pointer hover:underline"
            >
              {res.label}
            </span>
          ))}
        </div>
      </div>

      {/* Contributors */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-bricolage font-semibold text-base text-brand-indigo uppercase">
              Contributors
            </span>
            <span className="font-bricolage font-semibold text-xl text-brand-indigo leading-[120%]">
              {article.contributors.length}
            </span>
          </div>
          <div className="h-[1.5px] bg-brand-indigo w-full" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {contributors.map((c, i) => (
            <img
              key={i}
              src={c.src}
              alt={`Contributor ${c.id}`}
              className="w-8 h-8 rounded-full object-cover shrink-0 bg-brand-indigo/10"
              title={c.id}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
