import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wikiApi } from "../api/wiki.api";

export function useRootArticles() {
  return useQuery({
    queryKey: ["wiki", "root"],
    queryFn: () => wikiApi.getRootArticles(),
  });
}

export function useArticle(id: number | null) {
  return useQuery({
    queryKey: ["wiki", "article", id],
    queryFn: () => (id ? wikiApi.getArticle(id) : null),
    enabled: !!id,
  });
}

export function useSearchArticles(query: string) {
  return useQuery({
    queryKey: ["wiki", "search", query],
    queryFn: () => wikiApi.search(query),
    enabled: query.length > 2,
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wikiApi.updateNode,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "nodes", variables.node_id, "pending"] });
    },
  });
}

export function useAssignParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wikiApi.assignParent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "root"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
    },
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wikiApi.createNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "root"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
    },
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wikiApi.createArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "root"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "pending"] });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: wikiApi.deleteNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "root"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "article"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "pending"] });
    },
  });
}
