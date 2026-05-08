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

interface LeftSidebarProps {
  sections: SidebarSection[];
  onItemClick: (id: number | string) => void;
}

export default function LeftSidebar({ sections, onItemClick }: LeftSidebarProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: number | string) => {
    setOpenItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <aside className="flex w-full min-w-0 flex-col gap-6">
      {sections.map((section) => (
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
        </div>
      ))}
    </aside>
  );
}
