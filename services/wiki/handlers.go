package main

import (
	"context"
	"database/sql"
	"fmt"
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

	if req.ArticleNode.ParentId != nil {
		parent_is_valid, err := s.nodeExists(ctx, tx, *req.ArticleNode.ParentId)
		if err != nil {
			return nil, err
		}
		if !parent_is_valid {
			return nil, status.Error(codes.NotFound, "parent node not found")
		}
	}

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

	if req.Type != pb.NodeType_TYPE_ARTICLE && req.ParentId == nil {
		return nil, status.Error(codes.NotFound, req.Type.String()+" type node can not be at the root. please specify a parent")
	}

	//reject request if specified parent does not exist
	if req.ParentId != nil {
		parent_is_valid, err := s.nodeExists(ctx, tx, *req.ParentId)
		if err != nil {
			return nil, err
		}
		if !parent_is_valid {
			return nil, status.Error(codes.NotFound, "specified parent does not exist")
		}
		parent, err := s.fetchNodeInternal(ctx, tx, *req.ParentId)
		if err != nil {
			return nil, err
		}
		if parent.Type != "article" {
			return nil, status.Error(codes.InvalidArgument, "specified parent has to be an article")
		}
	}

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

	row, err := s.updateNodeInternal(ctx, tx, req)
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

	// We verify if the node's parent has an active version (current_version_id is not null)
	var hierarchy struct {
		ParentID         *int32 `db:"parent_id"`
		ParentApprovedID *int32 `db:"parent_approved_id"`
	}

	checkQuery := `
        SELECT n.parent_id, p.current_version_id as parent_approved_id
        FROM nodes n
        JOIN node_versions v ON n.id = v.node_id
        LEFT JOIN nodes p ON n.parent_id = p.id
        WHERE v.id = $1`

	err = tx.GetContext(ctx, &hierarchy, checkQuery, req.VersionId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to check hierarchy: %v", err)
	}

	// If the node has a parent, but that parent has no approved version, we block the request.
	if hierarchy.ParentID != nil && (hierarchy.ParentApprovedID == nil || *hierarchy.ParentApprovedID == 0) {
		return nil, status.Errorf(codes.FailedPrecondition,
			"cannot approve: parent article (ID %d) must be approved first", *hierarchy.ParentID)
	}

	node_id, err := s.approveVersionInternal(ctx, tx, req.VersionId)
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

func (s *wikiServer) RejectVersion(ctx context.Context, req *pb.ModerateVersionRequest) (*pb.Node, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "db error: %v", err)
	}
	defer tx.Rollback()

	node_id, err := s.rejectVersionInternal(ctx, tx, req.VersionId)
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

func (s *wikiServer) GetHistory(ctx context.Context, req *pb.GetHistoryRequest) (*pb.GetHistoryResponse, error) {
	rows, err := s.fetchVersionHistoryInternal(ctx, s.db, req.NodeId)
	if err != nil {
		return nil, err
	}

	res := &pb.GetHistoryResponse{}

	for _, r := range rows {
		res.Versions = append(res.Versions, r.ToProto())
	}

	return res, nil
}

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

func (s *wikiServer) DeleteNode(ctx context.Context, req *pb.DeleteNodeRequest) (*pb.DeleteResponse, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "db error: %v", err)
	}
	defer tx.Rollback()

	if err := s.deleteNodeInternal(ctx, tx, req.NodeId); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete node: %v", err)
	}

	successMessage := fmt.Sprintf("Node %d and all its versions have been successfully deleted.", req.NodeId)

	return &pb.DeleteResponse{
		Message: successMessage,
	}, nil
}

// AssignParent handles the gRPC request to change a node's parent
func (s *wikiServer) AssignParent(ctx context.Context, req *pb.AssignParentRequest) (*pb.Node, error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "database error: %v", err)
	}
	defer tx.Rollback()

	if err := s.assignParentInternal(ctx, tx, req.Child, &req.NewParent); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to commit transaction: %v", err)
	}

	row, err := s.fetchNodeInternal(ctx, s.db, req.Child)
	if err != nil {
		return nil, err
	}

	return row.ToProto(), nil
}

func (s *wikiServer) SearchArticles(ctx context.Context, req *pb.SearchRequest) (*pb.SearchResponse, error) {
	rows, err := s.searchArticlesInternal(ctx, s.db, req.Query)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "search failed: %v", err)
	}

	res := &pb.SearchResponse{}
	for _, r := range rows {
		res.Results = append(res.Results, r.ToProtoBreadcrumb())
	}

	return res, nil
}
