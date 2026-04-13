-- =========================================
-- Get all versions of a node (history)
-- =========================================
--
-- PARAMETERS:
-- $1 → node_id (INT)
--
-- =========================================
-- RETURNS:
-- Liste des versions du node, triées de la plus récente à la plus ancienne

SELECT 
    v.id,
    v.title,
    v.content,
    v.status,
    v.created_at,
    v.created_by,
    v.activated_at,
    q.metadata
FROM node_versions v
LEFT JOIN questions q 
    ON v.id = q.node_version_id
WHERE v.node_id = $1
ORDER BY v.created_at DESC;
