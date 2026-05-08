export const NodeType = {
  Unspecified: 0,
  Article: 1,
  Notion: 2,
  Question: 3,
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];
export type ApiNodeType = 'Article' | 'Notion' | 'Question';

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

export interface CreateNodeRequest {
  parent_id?: number;
  node_type: ApiNodeType;
  title: string;
  content: string;
  order_index: number;
}

export interface UpdateNodeRequest {
  node_id: number;
  title: string;
  content: string;
}

export interface CreateArticleRequest {
  article_node: CreateNodeRequest;
  children: CreateNodeRequest[];
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
  contributors: Contributor[];
}

export interface Contributor {
  id: number;
  username: string;
  profile_picture_url?: string | null;
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
