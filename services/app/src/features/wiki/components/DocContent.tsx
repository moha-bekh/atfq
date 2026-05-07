import { useState } from "react";
import type { Article } from "../types";
import { NodeType } from "../types";

interface DocContentProps {
  article: Article | null;
  mode: "read" | "edit" | "create";
  onModeChange: (mode: "read" | "edit" | "create") => void;
  onCreate: (title: string, content: string) => Promise<void>;
}

export default function DocContent({ article, mode, onModeChange, onCreate }: DocContentProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections = article ? [
    {
      title: "CONTENT",
      items: [article.article_node?.content || ""],
      indented: true,
    },
    {
      title: "NOTIONS",
      items: (article.notions || []).map(n => n.title),
      indented: true,
    },
    {
      title: "KEY QUESTIONS",
      items: (article.questions || []).map(q => q.title),
      indented: true,
    },
  ] : [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreate(title, content);
      setTitle("");
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Tabs */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          {(["read", "edit", "create"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`font-bricolage font-semibold text-base transition-colors ${
                mode === m ? "text-brand-indigo underline underline-offset-4" : "text-brand-indigo/60 hover:text-brand-indigo"
              } uppercase`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="h-[1.5px] bg-brand-indigo w-full" />
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-bricolage font-semibold text-sm text-brand-indigo uppercase">Title</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title..."
              className="bg-brand-indigo/5 border-2 border-brand-indigo/20 rounded-xl px-4 py-3 font-jakarta text-brand-lavender focus:border-brand-indigo outline-none transition-all"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-bricolage font-semibold text-sm text-brand-indigo uppercase">Content</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here..."
              rows={10}
              className="bg-brand-indigo/5 border-2 border-brand-indigo/20 rounded-xl px-4 py-3 font-jakarta text-brand-lavender focus:border-brand-indigo outline-none transition-all resize-none"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-indigo text-brand-lavender font-bricolage font-bold py-4 rounded-xl hover:bg-brand-indigo/90 transition-all disabled:opacity-50 uppercase tracking-widest"
          >
            {isSubmitting ? "Creating Article..." : "Submit for Moderation"}
          </button>
        </form>
      ) : mode === "read" && article ? (
        <>
          {/* Title */}
          <h1 className="font-bricolage font-bold text-4xl text-brand-indigo">
            {article.article_node.title}
          </h1>

          {/* Sections */}
          {sections.map((section) => (
            section.items.length > 0 && (
              <div key={section.title} className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  <span className="font-bricolage font-semibold text-base text-brand-indigo uppercase">
                    {section.title}
                  </span>
                  <div className="h-[1.5px] bg-brand-indigo w-full" />
                </div>
                <div className={section.indented ? "px-6" : "px-2"}>
                  {section.items.map((item, i) => (
                    <p
                      key={i}
                      className="font-jakarta text-base font-normal text-brand-lavender leading-7 mb-4 last:mb-0"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )
          ))}
        </>
      ) : mode === "edit" && article ? (
        <div className="p-12 border-2 border-dashed border-brand-indigo/20 rounded-2xl flex items-center justify-center text-center">
          <span className="font-jakarta text-brand-indigo/60">
            Editor for "{article.article_node.title}" mode is coming soon...
          </span>
        </div>
      ) : (
        <div className="p-12 border-2 border-dashed border-brand-indigo/20 rounded-2xl flex items-center justify-center text-center">
          <span className="font-jakarta text-brand-indigo/60">
            Select an article or click CREATE to start.
          </span>
        </div>
      )}
    </div>
  );
}
