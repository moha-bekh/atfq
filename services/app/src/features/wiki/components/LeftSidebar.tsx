interface SidebarSection {
  title: string;
  items: { id: number; label: string; active?: boolean }[];
}

interface LeftSidebarProps {
  sections: SidebarSection[];
  onItemClick: (id: number) => void;
}

export default function LeftSidebar({ sections, onItemClick }: LeftSidebarProps) {
  return (
    <aside className="flex flex-col gap-6 w-full">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-2">
          {/* Section title */}
          <div className="flex flex-col gap-2">
            <span className="font-bricolage font-semibold text-base text-brand-indigo uppercase">
              {section.title}
            </span>
            <div className="h-[1.5px] bg-brand-indigo w-full" />
          </div>

          {/* Items */}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <button
                key={`${section.title}-${item.id}`}
                onClick={() => onItemClick(item.id)}
                className={`flex items-center w-full text-left px-2 py-[2.5px] rounded-lg font-jakarta text-base font-normal leading-7 transition-colors ${
                  item.active
                    ? "bg-brand-indigo text-brand-lavender"
                    : "bg-transparent text-brand-lavender hover:bg-brand-indigo/20"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
