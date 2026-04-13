CREATE TABLE node_versions (
    id SERIAL PRIMARY KEY,
    node_id INT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    status VARCHAR(20) NOT NULL,
    activated_at TIMESTAMP,

    CONSTRAINT fk_node_versions_to_nodes
        FOREIGN KEY (node_id)
        REFERENCES nodes(id),

    CONSTRAINT chk_node_versions_status
        CHECK (status IN ('pending', 'approved', 'rejected', 'archived'))
);
