-- ============================================================================
-- SYNAPSE: Get Note Hierarchy
-- File: app/sql/functions/notes/get_note_hierarchy.sql
--
-- Retrieves hierarchical note structure using recursive CTE.
-- Supports fetching entire tree or subtree from a specific root.
-- Includes cycle detection to prevent infinite loops.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS developer_schema.get_note_hierarchy(INT, INT);

-- Create the get note hierarchy function
CREATE OR REPLACE FUNCTION developer_schema.get_note_hierarchy(
    p_user_id INT,                   -- ID of the user
    p_root_id INT DEFAULT NULL       -- Optional: start from specific note (NULL = all roots)
)
RETURNS TABLE (
    id INT,
    parent_id INT,
    title VARCHAR(500),
    content_preview TEXT,
    format VARCHAR(20),
    depth INT,
    path INT[],
    path_titles TEXT[],
    children_count INT,
    has_children BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE note_tree AS (
        -- Base case: root notes (parent_id IS NULL) or specific root
        SELECT
            n.id,
            n.parent_id,
            n.title,
            LEFT(n.content, 200) AS content_preview,
            COALESCE(n.format, 'markdown')::VARCHAR(20) AS format,
            0 AS depth,
            ARRAY[n.id] AS path,
            ARRAY[n.title::TEXT] AS path_titles,
            n.created_at,
            n.updated_at
        FROM developer_schema.notes n
        WHERE n.user_id = p_user_id
          AND n.deleted_at IS NULL
          AND (
              -- If p_root_id is NULL, get all root notes
              (p_root_id IS NULL AND n.parent_id IS NULL)
              OR
              -- If p_root_id is provided, start from that specific note
              (p_root_id IS NOT NULL AND n.id = p_root_id)
          )

        UNION ALL

        -- Recursive case: children of current level
        SELECT
            n.id,
            n.parent_id,
            n.title,
            LEFT(n.content, 200) AS content_preview,
            COALESCE(n.format, 'markdown')::VARCHAR(20) AS format,
            nt.depth + 1,
            nt.path || n.id,
            nt.path_titles || n.title::TEXT,
            n.created_at,
            n.updated_at
        FROM developer_schema.notes n
        INNER JOIN note_tree nt ON n.parent_id = nt.id
        WHERE n.user_id = p_user_id
          AND n.deleted_at IS NULL
          -- Cycle detection: ensure we haven't visited this node before
          AND NOT n.id = ANY(nt.path)
          -- Limit depth to prevent runaway recursion
          AND nt.depth < 20
    ),

    -- Calculate children count for each note
    children_counts AS (
        SELECT
            n.parent_id,
            COUNT(*) AS child_count
        FROM developer_schema.notes n
        WHERE n.user_id = p_user_id
          AND n.deleted_at IS NULL
          AND n.parent_id IS NOT NULL
        GROUP BY n.parent_id
    )

    SELECT
        nt.id,
        nt.parent_id,
        nt.title,
        nt.content_preview,
        nt.format,
        nt.depth,
        nt.path,
        nt.path_titles,
        COALESCE(cc.child_count, 0)::INT AS children_count,
        COALESCE(cc.child_count, 0) > 0 AS has_children,
        nt.created_at,
        nt.updated_at
    FROM note_tree nt
    LEFT JOIN children_counts cc ON nt.id = cc.parent_id
    -- Order by path for proper tree display (depth-first)
    ORDER BY nt.path;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION developer_schema.get_note_hierarchy(INT, INT) IS
'Retrieves hierarchical note structure using recursive CTE.

Features:
- Full tree or subtree from specific root
- Cycle detection to prevent infinite loops
- Depth limiting (max 20 levels)
- Path tracking for breadcrumb navigation
- Children count for UI indicators

Parameters:
  - p_user_id: ID of the user
  - p_root_id: Start from specific note (NULL = all root notes)

Returns table with:
  - id, parent_id, title, content_preview, format
  - depth: Level in tree (0 = root)
  - path: Array of note IDs from root to current
  - path_titles: Array of titles for breadcrumb
  - children_count, has_children
  - created_at, updated_at

Example:
  -- Get entire note tree for user
  SELECT * FROM developer_schema.get_note_hierarchy(1);

  -- Get subtree starting from specific note
  SELECT * FROM developer_schema.get_note_hierarchy(1, 42);

  -- Get only root level notes
  SELECT * FROM developer_schema.get_note_hierarchy(1) WHERE depth = 0;
';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION developer_schema.get_note_hierarchy(INT, INT)
    TO synapse_user;
