export const NodeType = {
  Unspecified: 0,
  Article: 1,
  Notion: 2,
  Question: 3,
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

export interface NodeBreadcrumb {
  id: number;
  title: string;
}

export interface Node {
  id: number;
  parent_id?: number;
  node_type: NodeType;
  current_version_id: number;
  order_index: number;
  title: string;
  content: string;
  created_at?: string;
  author: number;
}

export interface Version {
  version_id: number;
  node_id: number;
  title: string;
  content: string;
  status: string;
  created_at?: string;
  author: number;
  activated_at?: string;
}

export interface Article {
  article_node: Node;
  sub_articles: NodeBreadcrumb[];
  notions: Node[];
  questions: Node[];
  lineage: NodeBreadcrumb[];
  contributors: string[];
}

export interface GetRootArticlesResponse {
  articles: NodeBreadcrumb[];
}

export interface SearchResponse {
  results: NodeBreadcrumb[];
}

export interface DeleteResponse {
  message: string;
}
