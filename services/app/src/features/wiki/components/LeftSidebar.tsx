import { useState } from "react";

interface SidebarItem {
  id: number | string;
  label: string;
  active?: boolean;
  children?: SidebarItem[];
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

type SearchTypeFilter = "all" | "root" | "child";
type SearchSort = "title-asc" | "title-desc";
type SearchResult = {
  id: number;
  title: string;
  parentTitle?: string;
  depth: number;
};

interface LeftSidebarProps {
  sections: SidebarSection[];
  canCreateRootArticle: boolean;
  onItemClick: (id: number | string) => void;
  onCreateRootArticle: () => void;
  search: {
    query: string;
    type: SearchTypeFilter;
    sort: SearchSort;
    results: SearchResult[];
    page: number;
    totalPages: number;
    onQueryChange: (value: string) => void;
    onTypeChange: (value: SearchTypeFilter) => void;
    onSortChange: (value: SearchSort) => void;
    onPageChange: (value: number) => void;
  };
}

export default function LeftSidebar({
  sections,
  canCreateRootArticle,
  onItemClick,
  onCreateRootArticle,
  search,
}: LeftSidebarProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: number | string) => {
    setOpenItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <aside className="flex w-full min-w-0 flex-col gap-6">
      {sections.map((section, index) => (
        <div key={section.title} className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <span className="font-bricolage font-semibold text-base text-sub uppercase">
              {section.title}
            </span>
            <div className="h-[1.5px] bg-sub w-full" />
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:flex xl:flex-col">
            {section.items.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const hasActiveChild = item.children?.some((child) => child.active) ?? false;
              const isOpen = openItems[item.id] ?? Boolean(item.active || hasActiveChild);

              return (
                <div key={`${section.title}-${item.id}`} className="flex min-w-0 flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChildren) toggleItem(item.id);
                      onItemClick(item.id);
                    }}
                    className={`flex min-h-8 min-w-0 w-full items-center gap-2 rounded-lg px-2 text-left font-jakarta text-base font-semibold leading-7 transition-colors ${
                      item.active
                        ? "bg-main text-bg"
                        : "bg-transparent text-sub hover:bg-main/5 hover:text-main"
                    }`}
                  >
                    {hasChildren && (
                      <span
                        className={`shrink-0 text-sm leading-none transition-transform ${isOpen ? "rotate-90" : ""}`}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    )}
                    <span className="min-w-0 break-words">{item.label}</span>
                  </button>

                  {hasChildren && isOpen && (
                    <div className="ml-4 mt-1 flex min-w-0 flex-col gap-1 border-l border-sub/30 pl-2">
                      {item.children?.map((child) => (
                        <button
                          key={`${item.id}-${child.id}`}
                          type="button"
                          onClick={() => onItemClick(child.id)}
                          className={`min-h-7 min-w-0 rounded-lg px-2 text-left font-jakarta text-sm leading-6 transition-colors ${
                            child.active
                              ? "bg-main/10 text-main"
                              : "text-text hover:bg-main/5 hover:text-main"
                          }`}
                        >
                          <span className="break-words">{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {index === 0 && canCreateRootArticle && (
            <button
              type="button"
              onClick={onCreateRootArticle}
              className="mt-3 rounded-lg border border-main/30 px-3 py-2 text-left font-bricolage text-xs font-bold uppercase tracking-widest text-main transition-colors hover:bg-main/10"
            >
              Create article
            </button>
          )}
        </div>
      ))}

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span className="font-bricolage font-semibold text-base text-sub uppercase">
            Search
          </span>
          <div className="h-[1.5px] bg-sub w-full" />
        </div>
        <input
          value={search.query}
          onChange={(event) => search.onQueryChange(event.target.value)}
          placeholder="Search articles..."
          className="min-h-10 rounded-lg border-2 border-sub/30 bg-bg px-3 font-jakarta text-sm text-text outline-none transition-colors placeholder:text-text/35 focus:border-main"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={search.type}
            onChange={(event) => search.onTypeChange(event.target.value as SearchTypeFilter)}
            className="min-h-10 rounded-lg border-2 border-sub/30 bg-bg px-2 font-jakarta text-xs text-text outline-none focus:border-main"
          >
            <option value="all">All</option>
            <option value="root">Root</option>
            <option value="child">Children</option>
          </select>
          <select
            value={search.sort}
            onChange={(event) => search.onSortChange(event.target.value as SearchSort)}
            className="min-h-10 rounded-lg border-2 border-sub/30 bg-bg px-2 font-jakarta text-xs text-text outline-none focus:border-main"
          >
            <option value="title-asc">A-Z</option>
            <option value="title-desc">Z-A</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          {search.results.length > 0 ? (
            search.results.map((result) => (
              <button
                key={`search-${result.id}`}
                type="button"
                onClick={() => onItemClick(result.id)}
                className="min-w-0 rounded-lg px-2 py-2 text-left font-jakarta text-sm text-text transition-colors hover:bg-main/5 hover:text-main"
              >
                <span className="block break-words font-semibold">{result.title}</span>
                <span className="block truncate text-[10px] uppercase tracking-widest text-sub">
                  {result.depth === 0 ? "Root article" : result.parentTitle || "Child article"}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-3 font-jakarta text-sm text-text/60">
              No result.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={search.page <= 1}
            onClick={() => search.onPageChange(Math.max(1, search.page - 1))}
            className="rounded-lg border border-sub/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sub transition-colors hover:border-main hover:text-main disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="font-jakarta text-[10px] font-bold uppercase tracking-widest text-sub">
            {search.page}/{search.totalPages}
          </span>
          <button
            type="button"
            disabled={search.page >= search.totalPages}
            onClick={() => search.onPageChange(Math.min(search.totalPages, search.page + 1))}
            className="rounded-lg border border-sub/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sub transition-colors hover:border-main hover:text-main disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </aside>
  );
}
