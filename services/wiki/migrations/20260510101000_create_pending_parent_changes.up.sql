CREATE TABLE IF NOT EXISTS pending_parent_changes (
    version_id INT PRIMARY KEY REFERENCES node_versions(id) ON DELETE CASCADE,
    requested_parent_id INT NULL REFERENCES nodes(id) ON DELETE SET NULL
);
