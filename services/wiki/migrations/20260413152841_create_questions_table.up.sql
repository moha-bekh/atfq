CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    node_version_id INT NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}',

  CONSTRAINT fk_questions_to_nodes
        FOREIGN KEY (node_version_id)
        REFERENCES node_versions(id)

);
