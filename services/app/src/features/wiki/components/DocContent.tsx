import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Article, NodeBreadcrumb, ResourceEntry } from "../types";

export type WikiContentLine = {
  title: string;
  content: string;
};

interface DocContentProps {
  article: Article | null;
  mode: "read" | "edit" | "create";
  canContribute: boolean;
  parentOptions: NodeBreadcrumb[];
  createParentId: string;
  onModeChange: (mode: "read" | "edit" | "create") => void;
  onCreate: (data: {
    parentId?: number;
    title: string;
    tldr: string;
    notions: WikiContentLine[];
    keyQuestions: WikiContentLine[];
    resources: ResourceEntry[];
  }) => Promise<void>;
  onEdit: (data: {
    parentId?: number;
    title: string;
    tldr: string;
    notions: WikiContentLine[];
    keyQuestions: WikiContentLine[];
    resources: ResourceEntry[];
  }) => Promise<void>;
}

const parseContentLines = (value: string): WikiContentLine[] => value
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      return { title: line, content: line };
    }

    const parsedTitle = line.slice(0, separatorIndex).trim();
    const parsedContent = line.slice(separatorIndex + 1).trim();

    return {
      title: parsedTitle || parsedContent || line,
      content: parsedContent || parsedTitle || line,
    };
  });

const formatNodeLine = ({ title, content }: { title: string; content: string }) => {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedContent || trimmedTitle === trimmedContent) return trimmedTitle || trimmedContent;

  return `${trimmedTitle}: ${trimmedContent}`;
};

const parseResourceLines = (value: string): ResourceEntry[] => value
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separatorIndex = line.indexOf("|");

    if (separatorIndex === -1) {
      return { label: line, url: undefined };
    }

    const label = line.slice(0, separatorIndex).trim();
    const url = line.slice(separatorIndex + 1).trim();

    return {
      label: label || url || line,
      url: url || undefined,
    };
  })
  .filter((resource) => resource.label.trim().length > 0);

const formatResourceLine = (resource: ResourceEntry) => {
  const label = resource.label.trim();
  const url = resource.url?.trim();

  return url ? `${label} | ${url}` : label;
};

export default function DocContent({ article, mode, canContribute, parentOptions, createParentId, onModeChange, onCreate, onEdit }: DocContentProps) {
  const previousMode = useRef(mode);
  const previousCreateParentId = useRef(createParentId);
  const [title, setTitle] = useState("");
  const [tldr, setTldr] = useState("");
  const [notions, setNotions] = useState("");
  const [keyQuestions, setKeyQuestions] = useState("");
  const [resources, setResources] = useState("");
  const [parentId, setParentId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editTldr, setEditTldr] = useState("");
  const [editNotions, setEditNotions] = useState("");
  const [editKeyQuestions, setEditKeyQuestions] = useState("");
  const [editResources, setEditResources] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && article?.article_node) {
      setEditTitle(article.article_node.title || "");
      setEditParentId(article.article_node.parent_id ? String(article.article_node.parent_id) : "");
      setEditTldr(article.article_node.content || "");
      setEditNotions((article.notions || []).map(formatNodeLine).join("\n"));
      setEditKeyQuestions((article.questions || []).map(formatNodeLine).join("\n"));
      setEditResources((article.resources || []).map(formatResourceLine).join("\n"));
    }
  }, [article, mode]);

  useEffect(() => {
    if (
      mode === "create" &&
      (previousMode.current !== "create" || previousCreateParentId.current !== createParentId)
    ) {
      setParentId(createParentId);
    }

    previousMode.current = mode;
    previousCreateParentId.current = createParentId;
  }, [createParentId, mode]);

  const sections = article ? [
    {
      title: "TLDR",
      items: [article.article_node?.content || ""],
      indented: true,
    },
    {
      title: "NOTIONS",
      items: (article.notions || []).map(formatNodeLine),
      indented: true,
    },
    {
      title: "KEY QUESTIONS",
      items: (article.questions || []).map(formatNodeLine),
      indented: true,
    },
  ] : [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedNotions = parseContentLines(notions);
    const parsedKeyQuestions = parseContentLines(keyQuestions);
    const parsedResources = parseResourceLines(resources);

    if (!title.trim() || !tldr.trim() || parsedNotions.length === 0 || parsedKeyQuestions.length === 0 || parsedResources.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        parentId: parentId ? Number(parentId) : undefined,
        title: title.trim(),
        tldr: tldr.trim(),
        notions: parsedNotions,
        keyQuestions: parsedKeyQuestions,
        resources: parsedResources,
      });
      setTitle("");
      setTldr("");
      setNotions("");
      setKeyQuestions("");
      setResources("");
      setParentId("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onEdit({
        parentId: editParentId ? Number(editParentId) : undefined,
        title: editTitle,
        tldr: editTldr,
        notions: parseContentLines(editNotions),
        keyQuestions: parseContentLines(editKeyQuestions),
        resources: parseResourceLines(editResources),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = "rounded-lg border-2 border-sub/30 bg-sub-alt/10 px-4 py-3 font-jakarta text-text outline-none transition-all placeholder:text-text/35 focus:border-main focus:bg-main/5";
  const labelClass = "font-bricolage font-semibold text-sm text-sub uppercase tracking-widest";
  const panelClass = "rounded-lg border border-main/10 bg-sub-alt/5 p-5 shadow-inner";
  const blockedParentIds = new Set([
    article?.article_node?.id,
    ...(article?.sub_articles || []).map((subArticle) => subArticle.id),
  ].filter((id): id is number => typeof id === "number"));
  const editParentOptions = parentOptions.filter((parent) => !blockedParentIds.has(parent.id));

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      {mode === "create" ? (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-6">
          <div className={panelClass}>
            <label className={labelClass}>Parent article</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={`${fieldClass} mt-3 w-full min-w-0`}
            >
              <option value="">Root article</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.title}
                </option>
              ))}
            </select>
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Title</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title..."
              className={`${fieldClass} mt-3 w-full min-w-0`}
              required
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>TLDR</label>
            <textarea 
              value={tldr}
              onChange={(e) => setTldr(e.target.value)}
              placeholder="Short summary for this article..."
              rows={5}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
              required
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Notions</label>
            <textarea
              value={notions}
              onChange={(e) => setNotions(e.target.value)}
              placeholder="One required notion per line..."
              rows={5}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
              required
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Key questions</label>
            <textarea
              value={keyQuestions}
              onChange={(e) => setKeyQuestions(e.target.value)}
              placeholder="One required question per line..."
              rows={5}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
              required
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Resources</label>
            <textarea
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              placeholder="One required resource per line. Optional URL format: Label | https://example.com"
              rows={4}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-sub px-4 py-4 font-bricolage font-bold uppercase tracking-widest text-text transition-all hover:bg-sub/90 disabled:opacity-50"
          >
            {isSubmitting ? "Creating Article..." : "Submit for Moderation"}
          </button>
        </form>
      ) : mode === "read" && article ? (
        <>
          {/* Title */}
          <h1 className="font-bricolage font-bold text-3xl text-sub break-words sm:text-4xl">
            {article.article_node.title}
          </h1>

          {/* Sections */}
          {sections.map((section) => (
            section.items.length > 0 && (
              <div key={section.title} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-bricolage font-semibold text-base text-sub uppercase">
                    {section.title}
                  </span>
                  <div className="h-[1.5px] bg-sub w-full" />
                </div>
                <div className={section.indented ? "px-3 sm:px-6" : "px-2"}>
                  {section.items.map((item, i) => (
                    <p
                      key={i}
                      className="mb-4 break-words font-jakarta text-base font-normal leading-7 text-text last:mb-0 whitespace-pre-line"
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
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-6">
          <div className={panelClass}>
            <label className={labelClass}>Parent article</label>
            <select
              value={editParentId}
              onChange={(e) => setEditParentId(e.target.value)}
              className={`${fieldClass} mt-3 w-full min-w-0`}
            >
              <option value="">Root article</option>
              {editParentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.title}
                </option>
              ))}
            </select>
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`${fieldClass} mt-3 w-full min-w-0`}
              required
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>TLDR</label>
            <textarea
              value={editTldr}
              onChange={(e) => setEditTldr(e.target.value)}
              rows={5}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
              required
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Notions</label>
            <textarea
              value={editNotions}
              onChange={(e) => setEditNotions(e.target.value)}
              rows={5}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Key questions</label>
            <textarea
              value={editKeyQuestions}
              onChange={(e) => setEditKeyQuestions(e.target.value)}
              rows={5}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
            />
          </div>
          <div className={panelClass}>
            <label className={labelClass}>Resources</label>
            <textarea
              value={editResources}
              onChange={(e) => setEditResources(e.target.value)}
              placeholder="One resource per line. Optional URL format: Label | https://example.com"
              rows={4}
              className={`${fieldClass} mt-3 w-full min-w-0 resize-none`}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-sub px-4 py-4 font-bricolage font-bold uppercase tracking-widest text-text transition-all hover:bg-sub/90 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting Edit..." : "Submit Edit for Moderation"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-sub/20 p-8 text-center sm:p-12">
          <span className="font-jakarta text-sub/60">
            {canContribute
              ? "Select an article or click CREATE to start."
              : "Select an article, or sign in to create one."}
          </span>
          {canContribute && (
            <button
              type="button"
              onClick={() => onModeChange("create")}
              className="rounded-lg border border-main/30 px-4 py-3 font-bricolage text-[10px] font-bold uppercase tracking-widest text-main transition-colors hover:bg-main/10"
            >
              Create
            </button>
          )}
          {!canContribute && (
            <Link
              to="/login"
              className="rounded-lg border border-main/30 px-4 py-3 font-bricolage text-[10px] font-bold uppercase tracking-widest text-main transition-colors hover:bg-main/10"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
