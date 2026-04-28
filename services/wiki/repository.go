package main

import (
	"context"
	"encoding/json"

	"database/sql"

	"github.com/jmoiron/sqlx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "wiki/proto/wiki/v1"
)

// // Internal logic for the DB
// func (s *wikiServer) fetchFullNode(ctx context.Context, id int32) (*NodeRow, error) {
// 	var row NodeRow
// 	query := `SELECT n.id, n.parent_id, n.type, n.order_index, v.title, v.content, v.created_at
// 	          FROM nodes n JOIN node_versions v ON n.current_version_id = v.id WHERE n.id = $1`
// 	err := s.db.GetContext(ctx, &row, query, id)
// 	return &row, err
// }

// func (s *wikiServer) archiveNodeTx(ctx context.Context, tx *sqlx.Tx, nodeID int32) error {
// 	// Recursive soft delete logic here
// 	return nil
// }

// combines the standard sqlx methods with the high-level Select/Get helpers.
type Ext interface {
	sqlx.ExtContext
	SelectContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
}

func (s *wikiServer) fetchContributorsInternal(ctx context.Context, id int32) ([]int32, error) {
	return nil, nil
}

func (s *wikiServer) fetchNodeInternal(ctx context.Context, id int32) (*NodeRow, error) {
	var row NodeRow
	query := `SELECT
    n.id,
    n.type,
    n.parent_id,
    n.order_index,
    v.id AS version_id,
    v.title,
    v.content,
    v.status,
    v.created_at,
    v.created_by,
    v.activated_at,
    q.metadata

	FROM nodes n
	LEFT JOIN node_versions v
	    ON n.current_version_id = v.id
	LEFT JOIN questions q
	    ON v.id = q.node_version_id
	WHERE n.id = $1
		AND n.current_version_id IS NOT NULL;
`
	err := s.db.GetContext(ctx, &row, query, id)

	return &row, err
}

func (s *wikiServer) createNodeInternal(ctx context.Context, ext Ext, req *pb.CreateNodeRequest) (*NodeRow, error) {
	// 1. Prepare Metadata & User ID
	var metadataJSON []byte
	if req.Type == pb.NodeType_TYPE_QUESTION && req.Metadata != nil {
		metadataJSON, _ = json.Marshal(req.Metadata.AsMap())
	}
	uid, _ := s.GetUserID(ctx)

	// 2. Setup DB types
	typeMap := map[pb.NodeType]string{
		pb.NodeType_TYPE_ARTICLE:  "article",
		pb.NodeType_TYPE_NOTION:   "notion",
		pb.NodeType_TYPE_QUESTION: "question",
	}
	dbType := typeMap[req.Type]

	var parentID sql.NullInt32
	if *req.ParentId != 0 {
		parentID = sql.NullInt32{Int32: *req.ParentId, Valid: true}
	}

	// 3. Run the Triple-Insert CTE
	query := `
        WITH new_node AS (
            INSERT INTO nodes (parent_id, type, order_index)
            VALUES ($1, $2, $6)
            RETURNING id
        ),
        new_version AS (
            INSERT INTO node_versions (node_id, title, content, created_by, status)
            VALUES ((SELECT id FROM new_node), $3, $4, $5, 'approved')
            RETURNING id, node_id
        ),
        _ AS (
            INSERT INTO questions (node_version_id, metadata)
            SELECT id, $7 FROM new_version
            WHERE $2 = 'question'
        )
        SELECT node_id, id AS version_id FROM new_version;`

	var nodeID, versionID int32
	err := ext.QueryRowxContext(ctx, query, parentID, dbType, req.Title, req.Content, uid, req.OrderIndex, metadataJSON).Scan(&nodeID, &versionID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create node: %v", err)
	}

	// 4. Activate the node
	_, err = ext.ExecContext(ctx, `UPDATE nodes SET current_version_id = $1 WHERE id = $2`, versionID, nodeID)
	if err != nil {
		return nil, err
	}

	// 5. Build and return the NodeRow
	// We populate it with the data we already have to avoid a re-fetch
	return &NodeRow{
		ID:         nodeID,
		Type:       dbType,
		ParentID:   parentID,
		OrderIndex: req.OrderIndex,
		VersionID:  versionID,
		Title:      req.Title,
		Content:    sql.NullString{String: req.Content, Valid: true},
		Author:     uid,
		Metadata:   metadataJSON,
		// (Timestamps will be slightly off since we aren't fetching the DB's
		//  actual 'now()', but for a 'Create' response, that's usually fine)
	}, nil
}

func (s *wikiServer) fetchChildrenInternal(ctx context.Context, ext Ext, id any, desiredType pb.NodeType) ([]NodeRow, error) {
	typeMap := map[pb.NodeType]string{
		pb.NodeType_TYPE_ARTICLE:  "article",
		pb.NodeType_TYPE_NOTION:   "notion",
		pb.NodeType_TYPE_QUESTION: "question",
	}
	dbType := typeMap[desiredType]
	query := `
	SELECT
    	n.id,
    	n.type,
		n.parent_id,
    	n.order_index,

    	v.id AS version_id,
    	v.title,
		v.content,
		v.status,
		v.created_at,
		v.created_by,
		v.activated_at,

    	q.metadata

	FROM nodes n
	LEFT JOIN node_versions v
		ON n.current_version_id = v.id
	LEFT JOIN questions q
		ON v.id = q.node_version_id

	WHERE n.parent_id IS NOT DISTINCT FROM $1
	AND n.type = $2
	AND n.current_version_id IS NOT NULL
	ORDER BY n.order_index ASC;
	`

	var children []NodeRow

	err := ext.SelectContext(ctx, &children, query, id, dbType)
	if err != nil {
		return nil, err
	}

	return children, nil
}

func (s *wikiServer) UpdateNodeInternal(ctx context.Context, ext Ext, req *pb.UpdateNodeRequest) (*VersionRow, error) {
	var title, content *string
	if req.Title != "" {
		title = &req.Title
	}
	if req.Content != "" {
		content = &req.Content
	}

	var metadataJSON []byte
	if req.Metadata != nil {
		metadataJSON, _ = json.Marshal(req.Metadata.AsMap())
	}
	uid, _ := s.GetUserID(ctx)

	query := `
    WITH current_data AS (
        SELECT title, content FROM node_versions
        WHERE id = (SELECT current_version_id FROM nodes WHERE id = $1)
    ),
    new_version AS (
        INSERT INTO node_versions (node_id, title, content, created_by, status)
        VALUES (
            $1,
            COALESCE($2, (SELECT title FROM current_data)),
            COALESCE($3, (SELECT content FROM current_data)),
            $4,
            'approved'
        )
        RETURNING id, node_id, title, content, created_at, created_by, status
    ),
    update_node AS (
        UPDATE nodes SET current_version_id = (SELECT id FROM new_version)
        WHERE id = $1
        RETURNING type
    ),
    _ AS (
        INSERT INTO questions (node_version_id, metadata)
        SELECT id, $5 FROM new_version
        WHERE (SELECT type FROM update_node) = 'question'
    )
    SELECT id, node_id, title, content, created_at, created_by, status, $5 as metadata
    FROM new_version;`

	var res VersionRow

	err := ext.GetContext(ctx, &res, query, req.NodeId, title, content, uid, metadataJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, status.Error(codes.NotFound, "node not found")
		}
		return nil, status.Errorf(codes.Internal, "update failed: %v", err)
	}

	return &res, nil
}

func (s *wikiServer) ApproveVersionInternal(ctx context.Context, ext Ext, versionID int32) (int32, error) {
	query := `
	WITH approved_v AS (
		UPDATE node_versions
		SET status = 'approved',
			activated_at = NOW()
		WHERE id = $1
		RETURNING node_id
	)
	UPDATE nodes
	SET current_version_id = $1
	WHERE id = (SELECT node_id FROM approved_v);
	`

	var nodeID int32

	err := ext.QueryRowxContext(ctx, query, versionID).Scan(&nodeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, status.Error(codes.NotFound, "node not found")
		}
		return 0, status.Errorf(codes.Internal, "update failed: %v", err)
	}

	return nodeID, nil
}

func DenyVersionInternal(ctx context.Context, ext Ext, versionID int32) (int32, error) {
	query := `
	WITH rejected_v AS (
		UPDATE node_versions
		SET status = 'rejected',
		WHERE id = $1
		RETURNING id
	)
	`

}
