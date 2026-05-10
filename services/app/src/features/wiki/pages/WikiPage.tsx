import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import LeftSidebar from "../components/LeftSidebar";
import DocContent from "../components/DocContent";
import type { WikiContentLine } from "../components/DocContent";
import type { DeleteNodeMode, ResourceEntry } from "../types";
import RightSidebar from "../components/RightSidebar";
import StaticWikiPage, { getStaticWikiPage, STATIC_WIKI_PAGES } from "../components/StaticWikiPage";
import { useRootArticles, useArticle, useCreateArticle, useCreateNode, useUpdateNode, useDeleteNode } from "../hooks/useWiki";
import { wikiApi } from "../api/wiki.api";
import { useAppStore } from "@/stores/app.store";
import type { NodeBreadcrumb } from "../types";

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "An unknown error occurred";

type MobileConceptOption = {
  id: number | string;
  title: string;
  depth: number;
};

type SearchTypeFilter = "all" | "root" | "child";
type SearchSort = "title-asc" | "title-desc";
type WikiSearchItem = {
  id: number;
  title: string;
  parentTitle?: string;
  depth: number;
};

const SEARCH_PAGE_SIZE = 6;

const normalizeTitle = (title: string) => title.trim().toLowerCase();
const normalizeText = (value?: string | null) => (value || "").trim();
const normalizeResources = (resources: ResourceEntry[]) => JSON.stringify(
  resources
    .map((resource) => ({
      label: normalizeText(resource.label),
      url: normalizeText(resource.url || ""),
    }))
    .filter((resource) => resource.label.length > 0),
);

export default function WikiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const staticPageId = searchParams.get("page");
  const staticPage = getStaticWikiPage(staticPageId);
  const articleId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;
  const requestedTitle = searchParams.get("title");
  const [mode, setMode] = useState<"read" | "edit" | "create">("read");
  const [createParentIdOverride, setCreateParentIdOverride] = useState<string | null>(null);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const roles = useAppStore((state) => state.roles);
  const canContribute = isAuthenticated;
  const canDeleteArticle = roles.some((role) => role.toLowerCase() === "admin");
  const [popup, setPopup] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [wikiSearchQuery, setWikiSearchQuery] = useState("");
  const [wikiSearchType, setWikiSearchType] = useState<SearchTypeFilter>("all");
  const [wikiSearchSort, setWikiSearchSort] = useState<SearchSort>("title-asc");
  const [wikiSearchPage, setWikiSearchPage] = useState(1);

  const { data: rootArticles, isLoading: isLoadingRoots, error: rootError } = useRootArticles();
  const { data: article, isLoading: isLoadingArticle, error: articleError } = useArticle(articleId);
  const { mutateAsync: createArticle } = useCreateArticle();
  const { mutateAsync: createNode } = useCreateNode();
  const { mutateAsync: updateNode } = useUpdateNode();
  const { mutateAsync: deleteNode, isPending: isDeletingNode } = useDeleteNode();
  const rootArticleDetails = useQueries({
    queries: (rootArticles?.articles || []).map((root) => ({
      queryKey: ["wiki", "article", root.id, "sidebar"],
      queryFn: () => wikiApi.getArticle(root.id),
      enabled: Boolean(rootArticles?.articles?.length),
    })),
  });
  const parentArticleId = article?.article_node?.parent_id ?? null;
  const { data: parentArticle } = useQuery({
    queryKey: ["wiki", "article", parentArticleId, "parent"],
    queryFn: () => wikiApi.getArticle(parentArticleId!),
    enabled: Boolean(parentArticleId),
  });

  // Resolve stable links such as /wiki?title=Getting%20Started or /wiki?page=contribute.
  useEffect(() => {
    if (mode === "create" || articleId || staticPage || !rootArticles?.articles?.length) return;

    if (requestedTitle) {
      const targetTitle = normalizeTitle(requestedTitle);
      const requestedStaticPage = STATIC_WIKI_PAGES.find(
        (knownPage) => normalizeTitle(knownPage.title) === targetTitle,
      );

      if (requestedStaticPage) {
        setSearchParams({ page: requestedStaticPage.id });
        return;
      }

      const allKnownArticles = [
        ...rootArticles.articles,
        ...rootArticleDetails.flatMap((query) => query.data?.sub_articles || []),
      ];
      const requestedArticle = allKnownArticles.find(
        (knownArticle) => normalizeTitle(knownArticle.title) === targetTitle,
      );

      if (requestedArticle) {
        setSearchParams({ id: requestedArticle.id.toString() });
        return;
      }
    }

    if (!requestedTitle || rootArticleDetails.every((query) => !query.isLoading)) {
      setSearchParams({ page: "getting-started" });
    }
  }, [articleId, mode, requestedTitle, rootArticles, rootArticleDetails, setSearchParams, staticPage]);

  useEffect(() => {
    if (articleError && articleId) {
      setSearchParams({ page: "getting-started" });
      setMode("read");
    }
  }, [articleError, articleId, setSearchParams]);

  useEffect(() => {
    if (!popup) return;

    const timer = window.setTimeout(() => setPopup(null), 5000);
    return () => window.clearTimeout(timer);
  }, [popup]);

  useEffect(() => {
    if (!canContribute && mode !== "read") {
      setMode("read");
    }
  }, [canContribute, mode]);

  const handleItemClick = (id: number | string) => {
    if (typeof id === "string") {
      setSearchParams({ page: id });
    } else {
      setSearchParams({ id: id.toString() });
    }
    setMode("read");
    setCreateParentIdOverride(null);
  };

  const handleModeChange = (nextMode: "read" | "edit" | "create") => {
    setCreateParentIdOverride(null);
    setMode(nextMode);
  };

  const handleCreateRootArticle = () => {
    setSearchParams({});
    setCreateParentIdOverride("");
    setMode("create");
  };

  const handleCreate = async ({
    parentId,
    title,
    tldr,
    notions,
    keyQuestions,
    resources,
  }: {
    parentId?: number;
    title: string;
    tldr: string;
    notions: WikiContentLine[];
    keyQuestions: WikiContentLine[];
    resources: ResourceEntry[];
  }) => {
    try {
      await createArticle({
        article_node: {
          ...(parentId ? { parent_id: parentId } : {}),
          node_type: "Article",
          title,
          content: tldr,
          order_index: parentId ? (article?.sub_articles?.length || 0) + 1 : (rootArticles?.articles?.length || 0) + 1,
        },
        children: [
          ...notions.map((notion, index) => ({
            node_type: "Notion" as const,
            title: notion.title,
            content: notion.content,
            order_index: index + 1,
          })),
          ...keyQuestions.map((question, index) => ({
            node_type: "Question" as const,
            title: question.title,
            content: question.content,
            order_index: notions.length + index + 1,
          })),
        ],
        resources,
      });
      if (parentId) {
        setSearchParams({ id: parentId.toString() });
      }
      setMode("read");
      setPopup({
        type: "success",
        message: "Article submitted for moderation. It will be readable after approval.",
      });
    } catch {
      setPopup({
        type: "error",
        message: "Failed to create article. Make sure the parent is valid and you are logged in.",
      });
    }
  };

  const handleEdit = async ({
    parentId,
    title,
    tldr,
    notions,
    keyQuestions,
    resources,
  }: {
    parentId?: number;
    title: string;
    tldr: string;
    notions: WikiContentLine[];
    keyQuestions: WikiContentLine[];
    resources: ResourceEntry[];
  }) => {
    if (!article?.article_node?.id) return;

    try {
      const currentParentId = article.article_node.parent_id ?? 0;
      const nextParentId = parentId ?? 0;
      const updates: Promise<unknown>[] = [];
      const articleContentChanged =
        normalizeText(article.article_node.title) !== normalizeText(title) ||
        normalizeText(article.article_node.content) !== normalizeText(tldr) ||
        normalizeResources(article.resources || []) !== normalizeResources(resources);
      const parentChanged = currentParentId !== nextParentId;

      if (articleContentChanged || parentChanged) {
        updates.push(updateNode({
          node_id: article.article_node.id,
          title,
          content: tldr,
          resources,
          ...(parentChanged ? { requested_parent_id: nextParentId } : {}),
        }));
      }

      notions.forEach((notion, index) => {
        const existing = article.notions[index];
        if (existing) {
          if (
            normalizeText(existing.title) !== normalizeText(notion.title) ||
            normalizeText(existing.content) !== normalizeText(notion.content)
          ) {
            updates.push(updateNode({
              node_id: existing.id,
              title: notion.title,
              content: notion.content,
            }));
          }
          return;
        }

        updates.push(createNode({
          parent_id: article.article_node.id,
          node_type: "Notion",
          title: notion.title,
          content: notion.content,
          order_index: index + 1,
        }));
      });

      keyQuestions.forEach((question, index) => {
        const existing = article.questions[index];
        if (existing) {
          if (
            normalizeText(existing.title) !== normalizeText(question.title) ||
            normalizeText(existing.content) !== normalizeText(question.content)
          ) {
            updates.push(updateNode({
              node_id: existing.id,
              title: question.title,
              content: question.content,
            }));
          }
          return;
        }

        updates.push(createNode({
          parent_id: article.article_node.id,
          node_type: "Question",
          title: question.title,
          content: question.content,
          order_index: notions.length + index + 1,
        }));
      });

      if (updates.length === 0) {
        setPopup({
          type: "error",
          message: "No changes to submit.",
        });
        return;
      }

      await Promise.all(updates);
      setMode("read");
      setPopup({
        type: "success",
        message: "Article submitted for moderation. It will be readable after approval.",
      });
    } catch {
      setPopup({
        type: "error",
        message: "Failed to submit edit. Make sure you are logged in.",
      });
    }
  };

  const handleDeleteArticle = async (deleteMode: DeleteNodeMode, newParent?: number) => {
    if (!article?.article_node?.id) return;

    const articleNode = article.article_node;
    const parentId = articleNode.parent_id;

    try {
      await deleteNode({ id: articleNode.id, mode: deleteMode, newParent });
      setMode("read");
      setSearchParams(parentId ? { id: parentId.toString() } : { page: "getting-started" });
      setPopup({
        type: "success",
        message: deleteMode === "delete_branch"
          ? "Article branch deleted."
          : "Article deleted. Child articles were reassigned.",
      });
    } catch (error) {
      setPopup({
        type: "error",
        message: getErrorMessage(error),
      });
    }
  };

  if (isLoadingRoots) {
    return <div className="mx-auto w-full max-w-[1680px] px-4 py-8 text-sub sm:px-6 lg:px-8">Loading wiki...</div>;
  }

  if (rootError) {
    return (
      <div className="mx-auto w-full max-w-[1680px] px-4 py-8 text-error sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold mb-2">Error loading wiki roots</h2>
        <p>{getErrorMessage(rootError)}</p>
      </div>
    );
  }

  const sidebarSections = [
    {
      title: "Documentation",
      items: STATIC_WIKI_PAGES.map((page) => ({
        id: page.id,
        label: page.title,
        active: staticPage?.id === page.id,
      })),
    },
    {
      title: "Wiki",
      items: (rootArticles?.articles || []).map((root, index) => {
        const rootDetail = rootArticleDetails[index]?.data;
        const children = rootDetail?.sub_articles || [];
        const childIds = children.map((child) => child.id);
        const containsCurrentNestedArticle = Boolean(
          article?.article_node?.parent_id && childIds.includes(article.article_node.parent_id),
        );

        return {
          id: root.id,
          label: root.title,
          active: !staticPage && (root.id === articleId || containsCurrentNestedArticle),
          children: children.map((child) => ({
            id: child.id,
            label: child.title,
            active: !staticPage && (child.id === articleId || child.id === article?.article_node?.parent_id),
          })),
        };
      }),
    },
  ];

  const searchableArticles = (() => {
    const map = new Map<number, WikiSearchItem>();

    (rootArticles?.articles || []).forEach((root, index) => {
      const rootDetail = rootArticleDetails[index]?.data;
      map.set(root.id, {
        id: root.id,
        title: root.title,
        depth: 0,
      });

      (rootDetail?.sub_articles || []).forEach((child) => {
        map.set(child.id, {
          id: child.id,
          title: child.title,
          parentTitle: root.title,
          depth: 1,
        });
      });
    });

    if (parentArticle?.article_node) {
      map.set(parentArticle.article_node.id, {
        id: parentArticle.article_node.id,
        title: parentArticle.article_node.title,
        depth: parentArticle.article_node.parent_id ? 1 : 0,
      });
      (parentArticle.sub_articles || []).forEach((child) => {
        map.set(child.id, {
          id: child.id,
          title: child.title,
          parentTitle: parentArticle.article_node.title,
          depth: 2,
        });
      });
    }

    if (article?.article_node) {
      map.set(article.article_node.id, {
        id: article.article_node.id,
        title: article.article_node.title,
        parentTitle: article.article_node.parent_id ? parentArticle?.article_node?.title : undefined,
        depth: article.article_node.parent_id ? 1 : 0,
      });
      (article.sub_articles || []).forEach((child) => {
        map.set(child.id, {
          id: child.id,
          title: child.title,
          parentTitle: article.article_node.title,
          depth: 2,
        });
      });
    }

    return Array.from(map.values());
  })();

  const filteredSearchResults = searchableArticles
    .filter((item) => {
      const query = wikiSearchQuery.trim().toLowerCase();
      const matchesQuery = !query || `${item.title} ${item.parentTitle || ""}`.toLowerCase().includes(query);
      const matchesType =
        wikiSearchType === "all" ||
        (wikiSearchType === "root" && item.depth === 0) ||
        (wikiSearchType === "child" && item.depth > 0);

      return matchesQuery && matchesType;
    })
    .sort((a, b) => {
      if (wikiSearchSort === "title-desc") return b.title.localeCompare(a.title);

      return a.title.localeCompare(b.title);
    });

  const searchTotalPages = Math.max(1, Math.ceil(filteredSearchResults.length / SEARCH_PAGE_SIZE));
  const boundedSearchPage = Math.min(wikiSearchPage, searchTotalPages);
  const paginatedSearchResults = filteredSearchResults.slice(
    (boundedSearchPage - 1) * SEARCH_PAGE_SIZE,
    boundedSearchPage * SEARCH_PAGE_SIZE,
  );

  const parentOptions = (() => {
    const map = new Map<number, NodeBreadcrumb>();

    (rootArticles?.articles || []).forEach((root) => map.set(root.id, root));
    (article?.lineage || []).forEach((ancestor) => map.set(ancestor.id, ancestor));

    if (parentArticle?.article_node) {
      map.set(parentArticle.article_node.id, {
        id: parentArticle.article_node.id,
        title: parentArticle.article_node.title,
      });
    }

    if (article?.article_node) {
      map.set(article.article_node.id, {
        id: article.article_node.id,
        title: article.article_node.title,
      });
    }

    (article?.sub_articles || []).forEach((subArticle) => map.set(subArticle.id, subArticle));

    return Array.from(map.values());
  })();

  const rightConceptLinks = (() => {
    if (!article?.article_node) return [];
    if (article.sub_articles.length > 0) return article.sub_articles;

    const currentParentId = article.article_node.parent_id;
    if (currentParentId && parentArticle?.sub_articles?.length) {
      return parentArticle.sub_articles;
    }

    const parentRootIndex = (rootArticles?.articles || []).findIndex((root) => root.id === currentParentId);
    if (parentRootIndex >= 0) {
      return rootArticleDetails[parentRootIndex]?.data?.sub_articles || [];
    }

    return [];
  })();

  const createParentId = createParentIdOverride ?? (article?.article_node?.id ? String(article.article_node.id) : "");

  const mobileConceptOptions = (() => {
    const options: MobileConceptOption[] = [];
    const seen = new Set<string>();

    const addOption = (option: MobileConceptOption) => {
      const optionKey = String(option.id);
      if (seen.has(optionKey)) return;
      seen.add(optionKey);
      options.push(option);
    };

    STATIC_WIKI_PAGES.forEach((page) => {
      addOption({ id: page.id, title: page.title, depth: 0 });
    });

    (rootArticles?.articles || []).forEach((root, index) => {
      addOption({ id: root.id, title: root.title, depth: 0 });

      const rootDetail = rootArticleDetails[index]?.data;
      (rootDetail?.sub_articles || []).forEach((child) => {
        addOption({ id: child.id, title: child.title, depth: 1 });
      });
    });

    if (parentArticle?.article_node) {
      addOption({
        id: parentArticle.article_node.id,
        title: parentArticle.article_node.title,
        depth: 1,
      });
      (parentArticle.sub_articles || []).forEach((sibling) => {
        addOption({ id: sibling.id, title: sibling.title, depth: 2 });
      });
    }

    if (article?.article_node) {
      addOption({
        id: article.article_node.id,
        title: article.article_node.title,
        depth: article.article_node.parent_id ? 1 : 0,
      });
      (article.sub_articles || []).forEach((subArticle) => {
        addOption({ id: subArticle.id, title: subArticle.title, depth: 2 });
      });
    }

    return options;
  })();

  const selectedMobileConceptValue = (() => {
    if (staticPage?.id) return staticPage.id;

    if (articleId !== null) {
      const value = articleId.toString();
      if (mobileConceptOptions.some((option) => String(option.id) === value)) {
        return value;
      }
    }

    return "";
  })();

  return (
    <div className="mx-auto mt-6 flex w-full max-w-[1680px] flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 lg:px-8 xl:h-[calc(100vh-128px)] xl:overflow-hidden">
      {popup && (
        <div className="fixed left-4 right-4 top-4 z-50 rounded-lg border border-main/20 bg-bg/95 p-5 shadow-2xl shadow-sub-alt/30 backdrop-blur sm:left-auto sm:right-6 sm:top-6 sm:w-[min(360px,calc(100vw-32px))]">
          <div className="flex items-start gap-4">
            <div className={`mt-1 h-2.5 w-2.5 rounded-full ${popup.type === "success" ? "bg-main" : "bg-error"}`} />
            <div className="flex-1">
              <p className="font-bricolage text-sm font-semibold uppercase tracking-widest text-sub">
                {popup.type === "success" ? "Submitted" : "Wiki request failed"}
              </p>
              <p className="mt-2 font-jakarta text-sm leading-6 text-text">
                {popup.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPopup(null)}
              className="rounded-full border border-main/15 px-2 py-0.5 font-jakarta text-xs text-text/70 transition-colors hover:border-main/40 hover:text-main"
              aria-label="Close notification"
            >
              x
            </button>
          </div>
        </div>
      )}
      {articleError && articleId && !staticPage && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          Failed to load article: {getErrorMessage(articleError)}
        </div>
      )}
      <div className="xl:hidden">
        <div className="flex flex-col gap-3 rounded-lg border border-sub/25 bg-sub-alt/10 p-4">
          <label htmlFor="wiki-mobile-concepts" className="font-bricolage text-sm font-semibold uppercase tracking-widest text-sub">
            Concept
          </label>
          <select
            id="wiki-mobile-concepts"
            value={selectedMobileConceptValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              const nextStaticPage = getStaticWikiPage(nextValue);

              if (nextStaticPage) {
                handleItemClick(nextStaticPage.id);
                return;
              }

              const nextId = Number(nextValue);
              if (nextId) handleItemClick(nextId);
            }}
            className="min-h-12 w-full rounded-lg border-2 border-sub/30 bg-bg px-4 py-3 font-jakarta text-base text-text outline-none transition-colors focus:border-main"
          >
            <option value="" disabled>
              Choose a concept
            </option>
            {mobileConceptOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {`${"--".repeat(option.depth)}${option.depth ? " " : ""}${option.title}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={`grid w-full grid-cols-1 gap-8 bg-transparent xl:min-h-0 xl:flex-1 xl:items-start xl:justify-center xl:overflow-hidden ${
        staticPage
          ? "xl:grid-cols-[minmax(220px,280px)_minmax(0,860px)]"
          : "xl:grid-cols-[minmax(220px,280px)_minmax(0,860px)_minmax(220px,280px)]"
      }`}>
        {/* Left Sidebar */}
        <div className="relative hidden min-w-0 xl:flex xl:h-full xl:items-center xl:overflow-hidden xl:pr-12">
          <div className="absolute right-0 top-[10%] hidden h-4/5 w-px bg-sub/45 xl:block" />
          <div className="max-h-full w-full overflow-y-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <LeftSidebar
              sections={sidebarSections}
              canCreateRootArticle={canContribute}
              onItemClick={handleItemClick}
              onCreateRootArticle={handleCreateRootArticle}
              search={{
                query: wikiSearchQuery,
                type: wikiSearchType,
                sort: wikiSearchSort,
                results: paginatedSearchResults,
                page: boundedSearchPage,
                totalPages: searchTotalPages,
                onQueryChange: (value) => {
                  setWikiSearchQuery(value);
                  setWikiSearchPage(1);
                },
                onTypeChange: (value) => {
                  setWikiSearchType(value);
                  setWikiSearchPage(1);
                },
                onSortChange: (value) => {
                  setWikiSearchSort(value);
                  setWikiSearchPage(1);
                },
                onPageChange: setWikiSearchPage,
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="min-w-0 w-full xl:h-full xl:overflow-y-auto xl:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {staticPage ? (
            <StaticWikiPage page={staticPage} />
          ) : isLoadingArticle ? (
            <div className="text-sub">Loading article...</div>
          ) : (
            <DocContent 
              article={article || null} 
              mode={mode} 
              canContribute={canContribute}
              parentOptions={parentOptions}
              createParentId={createParentId}
              onModeChange={handleModeChange}
              onCreate={handleCreate}
              onEdit={handleEdit}
            />
          )}
        </div>

        {!staticPage && article && (
          <div className="relative min-w-0 border-t border-sub/30 pt-6 xl:flex xl:h-full xl:items-center xl:overflow-hidden xl:border-t-0 xl:pl-8 xl:pt-0">
            <div className="absolute left-0 top-[10%] hidden h-4/5 w-px bg-sub/45 xl:block" />
            <div className="max-h-full w-full overflow-y-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <RightSidebar
                article={article}
                parentOptions={parentOptions}
                conceptLinks={rightConceptLinks}
                onItemClick={handleItemClick}
                mode={mode}
                canContribute={canContribute}
                canDeleteArticle={canDeleteArticle}
                isDeletingArticle={isDeletingNode}
                onModeChange={handleModeChange}
                onDeleteArticle={handleDeleteArticle}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
