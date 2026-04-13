-- =====================================================
-- create_version.sql (Auto-remplissage)
-- =====================================================
-- PARAMETERS:
-- $1 → node_id
-- $2 → title (Optionnel, NULL pour garder l'actuel)
-- $3 → content (Optionnel, NULL pour garder l'actuel)
-- $4 → created_by
-- $5 → metadata (Les nouveaux mots-clés)
-- =====================================================
-- - La version est créée en 'pending'
-- - activated_at est NULL jusqu'à approbation
-- =====================================================

WITH current_data AS (
    SELECT title, content 
    FROM node_versions 
    WHERE id = (SELECT current_version_id FROM nodes WHERE id = $1)
),

new_version AS (
    INSERT INTO node_versions (node_id, title, content, created_by, status)
    VALUES (
        $1, 
        COALESCE($2, (SELECT title FROM current_data)), -- Nouveau titre ou l'ancien
        COALESCE($3, (SELECT content FROM current_data)), -- Nouveau contenu ou l'ancien
        $4, 
        'pending'
    )
    RETURNING id
),

new_question_version AS (
    INSERT INTO questions (node_version_id, metadata)
    SELECT (SELECT id FROM new_version), $5
    WHERE (SELECT type FROM nodes WHERE id = $1) = 'question'
)

SELECT id FROM new_version;
