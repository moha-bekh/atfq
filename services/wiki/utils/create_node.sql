-- =========================================
-- Create a new node with its first version
-- =========================================
-- PARAMETERS:
-- $1 → parent_id    (INT, nullable)
-- $2 → type         (VARCHAR: 'article', 'notion', 'question')
-- $3 → title        (TEXT)
-- $4 → content      (TEXT, nullable)
-- $5 → created_by   (INT, user ID)
-- $6 → order_index  (INT)
-- $7 → metadata     (JSONB, nullable, ex: '{"keywords": ["tag1"]}')
-- =========================================

WITH new_node AS (
    INSERT INTO nodes (parent_id, type, order_index)
    VALUES ($1, $2,$6)
    RETURNING id
),

new_version AS (
    INSERT INTO node_versions (node_id, title, content, created_by, status)
    VALUES ((SELECT id FROM new_node), $3, $4, $5, 'pending')
    RETURNING id
),

-- On insère dans la table questions UNIQUEMENT si le type est 'question'
new_question_data AS (
    INSERT INTO questions (node_version_id, metadata)
    SELECT (SELECT id FROM new_version), $7
    WHERE $2 = 'question' 
    RETURNING id
)

SELECT 
    (SELECT id FROM new_node) AS node_id,
    (SELECT id FROM new_version) AS version_id;
