-- =========================================
-- Soft delete a node and all its descendants
-- =========================================
--
-- PARAMETERS:
-- $1 → node_id (INT)
--
-- =========================================
-- ACTIONS:
-- 1. Récupère tout le sous-arbre
-- 2. Archive toutes les versions associées
-- 3. Supprime les versions actives des nodes
-- =========================================

WITH RECURSIVE subtree AS (
    -- 1. noeud de départ
    SELECT id
    FROM nodes
    WHERE id = $1

    UNION ALL

    -- 2. récupérer les enfants récursivement
    SELECT n.id
    FROM nodes n
    INNER JOIN subtree s ON n.parent_id = s.id
),

archive_versions AS (
    -- 3. archiver toutes les versions
    UPDATE node_versions
    SET status = 'archived'
    WHERE node_id IN (SELECT id FROM subtree)
),

update_nodes AS (
    -- 4. retirer les versions actives dans nodes
    UPDATE nodes
    SET current_version_id = NULL
    WHERE id IN (SELECT id FROM subtree)
)

SELECT id FROM subtree;
