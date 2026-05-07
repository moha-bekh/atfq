import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import LeftSidebar from "../components/LeftSidebar";
import DocContent from "../components/DocContent";
import RightSidebar from "../components/RightSidebar";
import { useRootArticles, useArticle, useCreateArticle } from "../hooks/useWiki";
import { NodeType } from "../types";

export default function WikiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const articleId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;
  const [mode, setMode] = useState<"read" | "edit" | "create">("read");

  const { data: rootArticles, isLoading: isLoadingRoots, error: rootError } = useRootArticles();
  const { data: article, isLoading: isLoadingArticle, error: articleError } = useArticle(articleId);
  const { mutateAsync: createArticle } = useCreateArticle();

  // Default to first root article if none selected
  useEffect(() => {
    if (!articleId && rootArticles?.articles?.length) {
      setSearchParams({ id: rootArticles.articles[0].id.toString() });
    }
  }, [articleId, rootArticles, setSearchParams]);

  const handleItemClick = (id: number) => {
    setSearchParams({ id: id.toString() });
    setMode("read");
  };

  const handleCreate = async (title: string, content: string) => {
    try {
      const res = await createArticle({
        article_node: {
          parent_id: null,
          node_type: NodeType.Article,
          title,
          content,
          order_index: (rootArticles?.articles?.length || 0) + 1,
        },
        children: [],
      });
      // Navigate to the new article
      setSearchParams({ id: res.article_node.id.toString() });
      setMode("read");
    } catch (err) {
      alert("Failed to create article. Make sure you are logged in.");
    }
  };

  if (isLoadingRoots) {
    return <div className="p-8 text-brand-indigo">Loading wiki...</div>;
  }

  if (rootError) {
    return (
      <div className="p-8 text-error">
        <h2 className="text-xl font-bold mb-2">Error loading wiki roots</h2>
        <p>{(rootError as any).message || "An unknown error occurred"}</p>
      </div>
    );
  }

  const sidebarSections = [
    {
      title: "Wiki",
      items: (rootArticles?.articles || []).map(a => ({
        id: a.id,
        label: a.title,
        active: a.id === articleId,
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {articleError && (
        <div className="mx-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          Failed to load article: {(articleError as any).message}
        </div>
      )}
      <div className="flex w-full min-h-screen bg-transparent p-8 gap-8">
        {/* Left Sidebar */}
        <div className="w-1/4 max-w-[280px] shrink-0">
          <LeftSidebar sections={sidebarSections} onItemClick={handleItemClick} />
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-3xl">
          {isLoadingArticle ? (
            <div className="text-brand-indigo">Loading article...</div>
          ) : (
            <DocContent 
              article={article || null} 
              mode={mode} 
              onModeChange={setMode}
              onCreate={handleCreate}
            />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-1/4 max-w-[280px] shrink-0">
          {article && <RightSidebar article={article} onItemClick={handleItemClick} />}
        </div>
      </div>
    </div>
  );
}
