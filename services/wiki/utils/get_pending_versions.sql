-- =======================================================
-- Get all versions waiting for moderation
-- =======================================================
-- RETURNS:
-- Liste des versions 'pending' avec les infos du node
-- =======================================================

SELECT 
    v.id AS version_id,
    v.node_id,
    n.type AS node_type,
    v.title,
    v.content,
    v.created_at,
    v.created_by,
    q.metadata AS question_metadata
    
FROM node_versions v
JOIN nodes n ON v.node_id = n.id
LEFT JOIN questions q ON v.id = q.node_version_id

WHERE v.status = 'pending'

ORDER BY v.created_at ASC; 
