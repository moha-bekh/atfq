ALTER TABLE nodes
    ADD CONSTRAINT fk_nodes_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES node_versions(id)
    ON DELETE SET NULL;
