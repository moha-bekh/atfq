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

export interface ResourceEntry {
  label: string;
  url?: string | null;
}

export interface UpdateNodeRequest {
  node_id: number;
  title: string;
  content: string;
  resources?: ResourceEntry[];
}

export interface CreateArticleRequest {
  article_node: CreateNodeRequest;
  children: CreateNodeRequest[];
  resources: ResourceEntry[];
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
  resources: ResourceEntry[];
}

export interface Contributor {
  id: number;
  user_id?: string | null;
  username: string;
  profile_picture_url?: string | null;
  is_friend?: boolean;
  is_online?: boolean;
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
