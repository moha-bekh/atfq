-- =========================================
-- Get children of a node filtered by type
-- =========================================
--
-- PARAMETERS:
-- $1 → parent_id (INT, nullable)
--      ID du node parent dont on veut récupérer les enfants
--      Peut être NULL pour récupérer les nodes racines
--
-- $2 → type (VARCHAR)
--      Type des enfants à récupérer
--      Valeurs autorisées :
--          - 'article'
--          - 'notion'
--          - 'question'
--
-- =========================================

SELECT 
    n.id,
    n.type,
    n.order_index,     

    v.id AS version_id,
    v.title,
    v.content,
    
    q.metadata     

FROM nodes n
LEFT JOIN node_versions v
    ON n.current_version_id = v.id
LEFT JOIN questions q  
    ON v.id = q.node_version_id

WHERE n.parent_id IS NOT DISTINCT FROM $1
  AND n.type = $2
  AND n.current_version_id IS NOT NULL
ORDER BY n.order_index ASC; 
