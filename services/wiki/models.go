package main

import (
	"database/sql"
	"encoding/json"
	"time"
	pb "wiki/proto/wiki/v1"

	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type NodeRow struct {
	ID         int32         `db:"id"`
	ParentID   sql.NullInt32 `db:"parent_id"`
	Type       string        `db:"type"`
	OrderIndex int32         `db:"order_index"`

	// Version Specifics
	VersionID   int32          `db:"version_id"`
	Title       string         `db:"title"`
	Content     sql.NullString `db:"content"`
	CreatedAt   time.Time      `db:"created_at"`
	Author      int32          `db:"created_by"`
	ActivatedAt sql.NullTime   `db:"activated_at"` // Nullable if not yet approved

	// JSONB Metadata
	Metadata []byte `db:"metadata"`
}

type VersionRow struct {
	VersionID   int32        `db:"id"`
	NodeID      int32        `db:"node_id"`
	Title       string       `db:"title"`
	Content     string       `db:"content"`
	CreatedAt   time.Time    `db:"created_at"`
	Author      int32        `db:"created_by"`
	Status      string       `db:"status"`
	ActivatedAt sql.NullTime `db:"activated_at"`
	Metadata    []byte       `db:"metadata"`
}

// ToProto converts a DB row into a gRPC Node message
func (r *NodeRow) ToProto() *pb.Node {
	node := &pb.Node{
		Id:               r.ID,
		ParentId:         nil,
		Type:             pb.NodeType(pb.NodeType_value["TYPE_"+r.Type]),
		CurrentVersionId: r.VersionID,
		OrderIndex:       r.OrderIndex,

		Title:     r.Title,
		Content:   r.Content.String,
		CreatedAt: timestamppb.New(r.CreatedAt),
		Author:    r.Author,
	}

	if r.ParentID.Valid {
		//parent id is an int32 pointer to make it nullable
		val := r.ParentID.Int32
		node.ParentId = &val
	}

	if len(r.Metadata) > 0 {
		var metaMap map[string]interface{}
		if err := json.Unmarshal(r.Metadata, &metaMap); err == nil {
			// convert to grpc struct
			if s, err := structpb.NewStruct(metaMap); err == nil {
				node.Metadata = s
			}
		}
	}

	return node
}

func (r *NodeRow) ToProtoBreadcrumb() *pb.NodeBreadcrumb {
	return &pb.NodeBreadcrumb{
		Id:    r.ID,
		Title: r.Title,
	}
}

func (r *VersionRow) ToProto() *pb.Version {
	res := &pb.Version{
		VersionId: r.VersionID,
		NodeId:    r.NodeID,
		Title:     r.Title,
		Content:   r.Content,
		Status:    r.Status,
		CreatedAt: timestamppb.New(r.CreatedAt),
		Author:    r.Author,
	}

	if r.ActivatedAt.Valid {
		res.ActivatedAt = timestamppb.New(r.ActivatedAt.Time)
	}

	if len(r.Metadata) > 0 {
		var metaMap map[string]interface{}
		if err := json.Unmarshal(r.Metadata, &metaMap); err == nil {
			// convert to grpc struct
			if s, err := structpb.NewStruct(metaMap); err == nil {
				res.Metadata = s
			}
		}
	}

	return res
}
