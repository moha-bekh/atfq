import { api } from "@/api/client";
import type { Article, GetRootArticlesResponse, SearchResponse, NodeType, Node, Version, DeleteResponse } from "../types";

export const wikiApi = {
  getRootArticles: async (): Promise<GetRootArticlesResponse> => {
    return api.get("wiki/root-articles").json();
  },

  getArticle: async (id: number): Promise<Article> => {
    return api.get(`wiki/articles/${id}`).json();
  },

  createArticle: async (data: { article_node: any, children: any[] }): Promise<Article> => {
    return api.post("wiki/articles", { json: data }).json();
  },

  createNode: async (data: { parent_id?: number, node_type: NodeType, title: string, content: string, order_index: number }): Promise<Node> => {
    return api.post("wiki/nodes", { json: data }).json();
  },

  updateNode: async (data: { node_id: number, title: string, content: string }): Promise<Version> => {
    return api.put("wiki/nodes", { json: data }).json();
  },

  deleteNode: async (id: number): Promise<DeleteResponse> => {
    return api.delete(`wiki/nodes/${id}`).json();
  },

  assignParent: async (data: { new_parent: number, child: number }): Promise<Node> => {
    return api.post("wiki/nodes/assign-parent", { json: data }).json();
  },

  getHistory: async (id: number): Promise<{ versions: Version[] }> => {
    return api.get(`wiki/nodes/${id}/history`).json();
  },

  getPending: async (id: number): Promise<{ versions: Version[] }> => {
    return api.get(`wiki/nodes/${id}/pending`).json();
  },

  getAllPending: async (): Promise<{ versions: Version[] }> => {
    return api.get("wiki/pending").json();
  },

  approveVersion: async (version_id: number): Promise<Node> => {
    return api.post("wiki/moderation/approve", { json: { version_id } }).json();
  },

  rejectVersion: async (version_id: number): Promise<Node> => {
    return api.post("wiki/moderation/reject", { json: { version_id } }).json();
  },

  search: async (query: string): Promise<SearchResponse> => {
    return api.get("wiki/search", { searchParams: { q: query } }).json();
  },
};
