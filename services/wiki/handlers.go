package main

import (
	"context"
	"database/sql"
	"strconv"

	pb "wiki/proto/wiki/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// retrieves user id from request metadata
func (s *wikiServer) GetUserID(ctx context.Context) (int32, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, status.Error(codes.Unauthenticated, "no metadata found")
	}

	values := md["x-user-id"]
	if len(values) == 0 {
		return 0, status.Error(codes.Unauthenticated, "x-user-id missing from metadata")
	}

	uid, err := strconv.ParseInt(values[0], 10, 32)
	if err != nil {
		return 0, status.Error(codes.InvalidArgument, "invalid x-user-id format")
	}

	return int32(uid), nil
}

func (s *wikiServer) CreateArticle(ctx context.Context, req *pb.CreateArticleRequest) (*pb.Article, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}

	defer tx.Rollback()

	article_row, err := s.createNodeInternal(ctx, tx, req.ArticleNode)
	if err != nil {
		return nil, err
	}

	res := &pb.Article{
		ArticleNode: article_row.ToProto(),
	}

	for _, child_req := range req.Children {
		child_req.ParentId = &res.ArticleNode.Id

		// 1. Create the node
		child_row, err := s.createNodeInternal(ctx, tx, child_req)
		if err != nil {
			return nil, err
		}

		switch child_row.Type {
		case "article":
			res.SubArticles = append(res.SubArticles, child_row.ToProtoBreadcrumb())
		case "notion":
			res.Notions = append(res.Notions, child_row.ToProto())
		case "question":
			res.Questions = append(res.Questions, child_row.ToProto())
		}
	}
	return res, nil
}

func (s *wikiServer) CreateNode(ctx context.Context, req *pb.CreateNodeRequest) (*pb.Node, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "db error: %v", err)
	}
	defer tx.Rollback()

	row, err := s.createNodeInternal(ctx, tx, req)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to save node: %v", err)
	}

	return row.ToProto(), nil
}

func (s *wikiServer) GetRootArticles(ctx context.Context, req *pb.GetRootArticlesRequest) (*pb.GetRootArticlesResponse, error) {
	// We pass 'nil' as the ID to find nodes where parent_id IS NULL
	rows, err := s.fetchChildrenInternal(ctx, s.db, nil, pb.NodeType_TYPE_ARTICLE)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch root articles: %v", err)
	}

	res := &pb.GetRootArticlesResponse{}
	for _, r := range rows {
		res.Articles = append(res.Articles, r.ToProtoBreadcrumb())
	}

	return res, nil
}

func (s *wikiServer) GetArticle(ctx context.Context, req *pb.GetArticleRequest) (*pb.Article, error) {
	article_node, err := s.fetchNodeInternal(ctx, s.db, req.Id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, status.Error(codes.NotFound, "node not found")
		}
		return nil, status.Errorf(codes.Internal, "database error: %v", err)
	}

	sub_articles_rows, err := s.fetchChildrenInternal(ctx, s.db, req.Id, pb.NodeType_TYPE_ARTICLE)
	if err != nil {
		return nil, err
	}

	notions_rows, err := s.fetchChildrenInternal(ctx, s.db, req.Id, pb.NodeType_TYPE_NOTION)
	if err != nil {
		return nil, err
	}

	questions_rows, err := s.fetchChildrenInternal(ctx, s.db, req.Id, pb.NodeType_TYPE_QUESTION)
	if err != nil {
		return nil, err
	}

	res := &pb.Article{
		ArticleNode: article_node.ToProto(),
		// Lineage: , // NO SQL METHOD FOR THAT YET will do later
		// Contributors: , // NO SQL METHOD FOR THAT YET will do later
	}

	for _, r := range sub_articles_rows {
		res.SubArticles = append(res.SubArticles, r.ToProtoBreadcrumb())
	}

	for _, r := range notions_rows {
		res.Notions = append(res.Notions, r.ToProto())
	}

	for _, r := range questions_rows {
		res.Questions = append(res.Questions, r.ToProto())
	}

	/*
		message Article {
			Node article_node = 1;
			repeated NodeBreadcrumb sub_articles = 2;
			repeated Node notions = 3;
			repeated Question questions = 4;
			repeated NodeBreadcrumb lineage = 5; // Parent hierarchy (Breadcrumbs)
			repeated string contributors = 6;    // List of authors from versions
		}
	*/

	return res, nil
}

func (s *wikiServer) UpdateNode(ctx context.Context, req *pb.UpdateNodeRequest) (*pb.Version, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "db error: %v", err)
	}
	defer tx.Rollback()

	row, err := s.UpdateNodeInternal(ctx, tx, req)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to save node: %v", err)
	}

	return row.ToProto(), nil
}

func (s *wikiServer) ApproveVersion(ctx context.Context, req *pb.ModerateVersionRequest) (*pb.Node, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "db error: %v", err)
	}
	defer tx.Rollback()

	node_id, err := s.ApproveVersionInternal(ctx, tx, req.VersionId)
	if err != nil {
		return nil, err
	}

	row, err := s.fetchNodeInternal(ctx, tx, node_id)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to approve version: %v", err)
	}

	return row.ToProto(), nil
}

// func (s *wikiServer) DenyVersion(ctx context.Context, req *pb.ModerateVersionRequest) (*pb.Version, error) {
// 	tx, err := s.db.BeginTxx(ctx, nil)
// 	if err != nil {
// 		return nil, status.Errorf(codes.Internal, "db error: %v", err)
// 	}
// 	node_id, err := s.ApproveVersionInternal(ctx, tx, req.VersionId)
// 	if err != nil {
// 		return nil, err
// 	}
// 	row, err := s.fetchNodeInternal(ctx, node_id)
// 	if err != nil {
// 		return nil, err
// 	}
// 	return row.ToProto(), nil
// }

// func (s *wikiServer) GetHistory(ctx context.Context, req *pb.GetHistoryRequest) (*pb.GetHistoryResponse, error) {
//
// }

func (s *wikiServer) GetPending(ctx context.Context, req *pb.GetPendingRequest) (*pb.PendingVersionsResponse, error) {
	rows, err := s.fetchPendingVersionsInternal(ctx, s.db, &req.NodeId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch pending versions: %v", err)
	}

	res := &pb.PendingVersionsResponse{}
	for _, r := range rows {
		res.Versions = append(res.Versions, r.ToProto())
	}
	return res, nil
}

func (s *wikiServer) GetAllPending(ctx context.Context, req *pb.GetAllPendingRequest) (*pb.PendingVersionsResponse, error) {
	rows, err := s.fetchPendingVersionsInternal(ctx, s.db, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch all pending versions: %v", err)
	}

	res := &pb.PendingVersionsResponse{}
	for _, r := range rows {
		res.Versions = append(res.Versions, r.ToProto())
	}
	return res, nil
}

// func (s *wikiServer) DeleteNode(ctx context.Context, req *pb.DeleteNodeRequest) (*pb.Node, error) {
// 	tx, err := s.db.BeginTxx(ctx, nil)
// 	if err != nil {
// 		return nil, status.Errorf(codes.Internal, "db error: %v", err)
// 	}
// 	defer tx.Rollback()

// 	row, err := s.DeleteNodeInternal(ctx, tx, req.NodeId)
// 	if err != nil {
// 		return nil, err
// 	}

// 	if err := tx.Commit(); err != nil {
// 		return nil, status.Errorf(codes.Internal, "failed to delete node: %v", err)
// 	}

// 	return row.ToProto(), nil
// }

func (s *wikiServer) DeleteNode(ctx context.Context, req *pb.DeleteNodeRequest) (*pb.Node, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "db error: %v", err)
	}
	defer tx.Rollback()

	if err := s.DeleteNodeInternal(ctx, tx, req.NodeId); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete node: %v", err)
	}

	return nil, nil
}
