-- =========================================
-- Set version status (approve or reject)
-- =========================================
--
-- PARAMETERS:
-- $1 → version_id (INT)
-- $2 → action ('approve' | 'reject')
--
-- =========================================

WITH target AS (
    SELECT node_id
    FROM node_versions
    WHERE id = $1
),

-- 1. archive previous approved version if approving new one
reset_approved AS (
    UPDATE node_versions
    SET status = 'archived'
    WHERE node_id = (SELECT node_id FROM target)
      AND status = 'approved'
      AND $2 = 'approve'
),

-- 2. update target version
update_version AS (
    UPDATE node_versions
    SET 
        status = CASE
            WHEN $2 = 'approve' THEN 'approved'
            WHEN $2 = 'reject' THEN 'rejected'
        END,
        activated_at = CASE
            WHEN $2 = 'approve' THEN NOW()
            ELSE activated_at
        END
    WHERE id = $1
    RETURNING node_id
),

-- 3. update node pointer only if approved
update_node AS (
    UPDATE nodes
    SET current_version_id = CASE
        WHEN $2 = 'approve' THEN $1
        ELSE current_version_id
    END
    WHERE id = (SELECT node_id FROM target)
)

SELECT
    (SELECT node_id FROM target) AS node_id,
    $2 AS action;
