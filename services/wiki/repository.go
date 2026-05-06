package main

import (
	"context"
	"database/sql"
	"encoding/json"

	// "fmt"

	"github.com/jmoiron/sqlx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "wiki/proto/wiki/v1"
)

// combines the standard sqlx methods with the high-level Select/Get helpers.
type Ext interface {
	sqlx.ExtContext
	SelectContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	QueryRowxContext(ctx context.Context, query string, args ...interface{}) *sqlx.Row
}

func (s *wikiServer) nodeExists(ctx context.Context, ext Ext, id int32) (bool, error) {
	var exists bool
	// Postgres returns a boolean directly from EXISTS
	query := `SELECT EXISTS(SELECT 1 FROM nodes WHERE id = $1)`

	err := ext.GetContext(ctx, &exists, query, id)
	if err != nil {
		// We only get an error here if the DB is down or the query is broken
		return false, status.Errorf(codes.Internal, "database error: %v", err)
	}

	return exists, nil
}

func (s *wikiServer) fetchNodeInternal(ctx context.Context, ext Ext, id int32) (*NodeRow, error) {
	var row NodeRow
	query := `
	SELECT
    	n.id,
    	n.type,
		n.parent_id,
    	n.order_index,

    	v.id AS version_id,
    	v.title,
		v.content,
		v.created_at,
		v.created_by,
		v.activated_at,

    	q.metadata

	FROM nodes n
	JOIN node_versions v
	    ON n.current_version_id = v.id
	LEFT JOIN questions q
	    ON v.id = q.node_version_id
	WHERE n.id = $1
		AND n.current_version_id IS NOT NULL;
`
	err := ext.GetContext(ctx, &row, query, id)

	return &row, err
}

func (s *wikiServer) fetchPendingNodeInternal(ctx context.Context, ext Ext, id int32) (*NodeRow, error) {
	var row NodeRow
	query := `
	SELECT
    	n.id,
    	n.type,
		n.parent_id,
    	n.order_index,

    	v.id AS version_id,
    	v.title,
		v.content,
		v.created_at,
		v.created_by,
		v.activated_at,

    	q.metadata

	FROM nodes n
	JOIN node_versions v
	    ON n.current_version_id = v.id
	LEFT JOIN questions q
	    ON v.id = q.node_version_id
	WHERE n.id = $1
`
	err := ext.GetContext(ctx, &row, query, id)

	return &row, err
}

func (s *wikiServer) createNodeInternal(ctx context.Context, ext Ext, req *pb.CreateNodeRequest) (*NodeRow, error) {
	// 1. Prepare Metadata & User ID
	var metadataJSON []byte
	if req.Type == pb.NodeType_TYPE_QUESTION && req.Metadata != nil {
		metadataJSON, _ = json.Marshal(req.Metadata.AsMap())
	}
	uid, err := s.GetUserID(ctx)
	if err != nil {
		// Fallback for development/testing if no user is provided
		uid = 1
	}

	// 2. Setup DB types
	typeMap := map[pb.NodeType]string{
		pb.NodeType_TYPE_ARTICLE:  "article",
		pb.NodeType_TYPE_NOTION:   "notion",
		pb.NodeType_TYPE_QUESTION: "question",
	}
	dbType := typeMap[req.Type]

	var parentID sql.NullInt32
	if req.ParentId != nil && *req.ParentId != 0 {
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
            VALUES ((SELECT id FROM new_node), $3, $4, $5, 'pending')
            RETURNING id, node_id
        ),
        _ AS (
            INSERT INTO questions (node_version_id, metadata)
            SELECT id, $7 FROM new_version
            WHERE $2 = 'question'
        )
        SELECT node_id, id AS version_id FROM new_version;`

	var nodeID, versionID int32
	err = ext.QueryRowxContext(ctx, query, parentID, dbType, req.Title, req.Content, uid, req.OrderIndex, metadataJSON).Scan(&nodeID, &versionID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create node: %v", err)
	}

	// 4. Activate the node
	// _, err = ext.ExecContext(ctx, `UPDATE nodes SET current_version_id = $1 WHERE id = $2`, versionID, nodeID)
	// if err != nil {
	// 	return nil, err
	// }

	// 5. Build and return the NodeRow
	// We populate it with the data we already have to avoid a re-fetch
	return &NodeRow{
		ID:         nodeID,
		Type:       dbType,
		ParentID:   parentID,
		OrderIndex: req.OrderIndex,
		VersionID:  0,
		// VersionID:  versionID,
		Title:   req.Title,
		Content: sql.NullString{String: req.Content, Valid: true},
		Author:  uid,
		// Status:     "approved",
		Metadata: metadataJSON,
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

func (s *wikiServer) updateNodeInternal(ctx context.Context, ext Ext, req *pb.UpdateNodeRequest) (*VersionRow, error) {
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
            'pending'
        )
        RETURNING id, node_id, title, content, created_at, created_by, status
    ),
    node_type AS (
        SELECT type FROM nodes WHERE id = $1
    ),
    _ AS (
        INSERT INTO questions (node_version_id, metadata)
        SELECT id, $5 FROM new_version
        WHERE (SELECT type FROM node_type) = 'question'
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

func (s *wikiServer) approveVersionInternal(ctx context.Context, ext Ext, versionID int32) (int32, error) {
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
	WHERE id = (SELECT node_id FROM approved_v)
	RETURNING id;
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

// denyVersionInternal
func (s *wikiServer) rejectVersionInternal(ctx context.Context, ext Ext, versionID int32) (int32, error) {
	query := `
	UPDATE node_versions
	SET status = 'rejected',
		activated_at = NOW()
	WHERE id = $1
	RETURNING node_id
	`
	var nodeID int32
	err := ext.QueryRowxContext(ctx, query, versionID).Scan(&nodeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, status.Error(codes.NotFound, "version not found")
		}
		return 0, status.Errorf(codes.Internal, "update failed: %v", err)
	}
	return nodeID, nil
}

// func (s *wikiServer) DeleteNodeInternal(ctx context.Context, ext Ext, nodeID int32) (*NodeRow, error) {
// 	// 1. Fetch node before deletion to return it
// 	row, err := s.fetchNodeInternal(ctx, ext, nodeID)
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	// 2. Break circular dependency
// 	_, err = ext.ExecContext(ctx, "UPDATE nodes SET current_version_id = NULL WHERE id = $1", nodeID)
// 	if err != nil {
// 		return nil, status.Errorf(codes.Internal, "failed to break dependency: %v", err)
// 	}
//
// 	// 3. Delete linked data manually since ON DELETE CASCADE is missing
// 	_, err = ext.ExecContext(ctx, "DELETE FROM questions WHERE node_version_id IN (SELECT id FROM node_versions WHERE node_id = $1)", nodeID)
// 	if err != nil {
// 		return nil, status.Errorf(codes.Internal, "failed to delete questions: %v", err)
// 	}
//
// 	_, err = ext.ExecContext(ctx, "DELETE FROM node_versions WHERE node_id = $1", nodeID)
// 	if err != nil {
// 		return nil, status.Errorf(codes.Internal, "failed to delete versions: %v", err)
// 	}
//
// 	// 4. Delete the node itself
// 	_, err = ext.ExecContext(ctx, "DELETE FROM nodes WHERE id = $1", nodeID)
// 	if err != nil {
// 		return nil, status.Errorf(codes.Internal, "delete failed: %v", err)
// 	}
//
// 	return row, nil
// }

func (s *wikiServer) fetchPendingVersionsInternal(ctx context.Context, ext Ext, nodeID *int32) ([]VersionRow, error) {
	query := `
	SELECT
		v.id, v.node_id, v.title, v.content, v.created_at, v.created_by, v.status, v.activated_at,
		q.metadata
	FROM node_versions v
	LEFT JOIN questions q ON v.id = q.node_version_id
	WHERE v.status = 'pending'
	`
	var args []interface{}
	if nodeID != nil {
		query += " AND v.node_id = $1"
		args = append(args, *nodeID)
	}
	query += " ORDER BY v.created_at DESC"

	var versions []VersionRow
	err := ext.SelectContext(ctx, &versions, query, args...)
	return versions, err
}

// func (s *wikiServer) deleteNodeInternal(ctx context.Context, ext Ext, nodeID int32) (*NodeRow, error) {
func (s *wikiServer) deleteNodeInternal(ctx context.Context, ext Ext, nodeID int32) error {
	// 1. Fetch node before deletion to return it

	// row, err := s.fetchPendingNodeInternal(ctx, ext, nodeID)
	// if err != nil {
	// 	return nil, err
	// }

	// 2. Break circular dependency
	_, err := ext.ExecContext(ctx, "UPDATE nodes SET current_version_id = NULL WHERE id = $1", nodeID)
	if err != nil {
		return status.Errorf(codes.Internal, "failed to break dependency: %v", err)
		// return nil, status.Errorf(codes.Internal, "failed to break dependency: %v", err)
	}

	// 3. Delete linked data manually since ON DELETE CASCADE is missing
	_, err = ext.ExecContext(ctx, "DELETE FROM questions WHERE node_version_id IN (SELECT id FROM node_versions WHERE node_id = $1)", nodeID)
	if err != nil {
		return status.Errorf(codes.Internal, "failed to delete questions: %v", err)
		// return nil, status.Errorf(codes.Internal, "failed to delete questions: %v", err)
	}

	_, err = ext.ExecContext(ctx, "DELETE FROM node_versions WHERE node_id = $1", nodeID)
	if err != nil {
		return status.Errorf(codes.Internal, "failed to delete versions: %v", err)
		// return nil, status.Errorf(codes.Internal, "failed to delete versions: %v", err)
	}

	// 4. Delete the node itself
	_, err = ext.ExecContext(ctx, "DELETE FROM nodes WHERE id = $1", nodeID)
	if err != nil {
		return status.Errorf(codes.Internal, "delete failed: %v", err)
		// return nil, status.Errorf(codes.Internal, "delete failed: %v", err)
	}

	// return row, nil
	return nil
}

func (s *wikiServer) assignParentInternal(ctx context.Context, ext Ext, nodeID int32, newParentID *int32) error {
	// 1. Basic check: a node cannot be its own parent
	if newParentID != nil && *newParentID == nodeID {
		return status.Error(codes.InvalidArgument, "a node cannot be its own parent")
	}

	var parentID sql.NullInt32
	if newParentID != nil && *newParentID > 0 {
		// 2. Anti-cycle check: verify that the new parent is not a descendant of the node
		// We use a RECURSIVE CTE to find all children, grandchildren, etc.
		var isDescendant bool
		cycleCheckQuery := `
			WITH RECURSIVE subordinates AS (
				SELECT id FROM nodes WHERE id = $1
				UNION ALL
				SELECT n.id FROM nodes n
				INNER JOIN subordinates s ON s.id = n.parent_id
			)
			SELECT EXISTS (SELECT 1 FROM subordinates WHERE id = $2);
		`
		err := ext.GetContext(ctx, &isDescendant, cycleCheckQuery, nodeID, *newParentID)
		if err != nil {
			return status.Errorf(codes.Internal, "cycle check failed: %v", err)
		}

		if isDescendant {
			return status.Error(codes.FailedPrecondition, "circular dependency detected: the new parent is a descendant of the node")
		}

		parentID = sql.NullInt32{Int32: *newParentID, Valid: true}
	}

	// 3. Perform the update if all checks passed
	query := `UPDATE nodes SET parent_id = $1 WHERE id = $2`
	res, err := ext.ExecContext(ctx, query, parentID, nodeID)
	if err != nil {
		return status.Errorf(codes.Internal, "SQL update failed: %v", err)
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return status.Error(codes.NotFound, "node to move not found")
	}

	return nil
}

func (s *wikiServer) searchArticlesInternal(ctx context.Context, ext Ext, query string) ([]NodeRow, error) {
	var rows []NodeRow

	sqlQuery := `
        SELECT n.id, v.title
        FROM nodes n
        JOIN node_versions v ON n.current_version_id = v.id
        WHERE v.title ILIKE $1
			AND n.type = 'article'
        ORDER BY v.title ASC
        LIMIT 15;`

	err := ext.SelectContext(ctx, &rows, sqlQuery, "%"+query+"%")
	return rows, err
}

func (s *wikiServer) fetchVersionHistoryInternal(ctx context.Context, ext Ext, nodeID int32) ([]VersionRow, error) {
	query := `
	SELECT
		v.id, v.node_id, v.title, v.content, v.created_at, v.created_by, v.status, v.activated_at,
		q.metadata
	FROM node_versions v
	LEFT JOIN questions q ON v.id = q.node_version_id
	WHERE v.status = 'approved'
	AND v.node_id = $1
	ORDER BY v.created_at DESC
	`

	var rows []VersionRow

	ext.SelectContext(ctx, &rows, query, nodeID)
	return rows, nil
}
