-- =========================================
-- Get a node with its current version (FULL)
-- =========================================
--
-- PARAMETERS:
-- $1 → node_id
--
-- =========================================

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
WHERE n.id = $1 
  AND n.current_version_id IS NOT NULL;
