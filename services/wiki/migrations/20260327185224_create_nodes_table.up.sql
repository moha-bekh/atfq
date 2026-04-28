CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    parent_id INT,
    type VARCHAR(50) NOT NULL,
    current_version_id INT,
    order_index INT DEFAULT 0, 

    CONSTRAINT fk_nodes_parent
        FOREIGN KEY (parent_id)
        REFERENCES nodes(id),

    CONSTRAINT chk_nodes_type
        CHECK (type IN ('article', 'notion', 'question'))
);
