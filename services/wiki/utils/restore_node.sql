-- =========================================
-- Restore a node and its descendants
-- =========================================
--
-- PARAMETERS:
-- $1 → node_id (INT)
--
-- =========================================
-- ACTIONS:
-- 1. Récupère tout le sous-arbre
-- 2. Trouve la dernière version activée
-- 3. Réactive cette version
-- 4. Met à jour current_version_id
-- =========================================


WITH RECURSIVE subtree AS (
    -- 1. noeud de départ
    SELECT id
    FROM nodes
    WHERE id = $1

    UNION ALL

    -- 2. récupérer tous les enfants
    SELECT n.id
    FROM nodes n
    JOIN subtree s ON n.parent_id = s.id
),

latest_versions AS (
    -- 3. récupérer la dernière version activée
    SELECT DISTINCT ON (node_id)
        id AS version_id,
        node_id
    FROM node_versions
    WHERE node_id IN (SELECT id FROM subtree)
      AND activated_at IS NOT NULL
    ORDER BY node_id, activated_at DESC
),

reactivate_versions AS (
    -- 4. réactiver les versions
    UPDATE node_versions v
    SET status = 'approved',
        activated_at = NOW()
    WHERE v.id IN (SELECT version_id FROM latest_versions)
),

update_nodes AS (
    -- 5. remettre les nodes actifs
    UPDATE nodes n
    SET current_version_id = lv.version_id
    FROM latest_versions lv
    WHERE n.id = lv.node_id
)

SELECT id FROM subtree;
