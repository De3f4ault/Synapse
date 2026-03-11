-- ============================================================================
-- SYNAPSE: Storage Breakdown by File Type
-- File: app/sql/functions/get_storage_breakdown.sql
--
-- Returns per-category storage usage for a user.
-- Categories: Images, Videos, Documents, Archives, Audio, Code, Other
-- ============================================================================
CREATE OR REPLACE FUNCTION developer_schema.get_storage_breakdown(p_user_id INT) RETURNS TABLE(
        type_category TEXT,
        total_bytes BIGINT,
        file_count BIGINT,
        color TEXT
    ) LANGUAGE sql STABLE AS $$ WITH categorized AS (
        SELECT CASE
                WHEN file_type IN (
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'webp',
                    'tiff',
                    'tif',
                    'bmp'
                ) THEN 'Images'
                WHEN file_type IN ('mp4', 'avi', 'mkv', 'mov', 'webm', 'flv') THEN 'Videos'
                WHEN file_type IN (
                    'pdf',
                    'docx',
                    'doc',
                    'txt',
                    'md',
                    'epub',
                    'xlsx',
                    'csv',
                    'pptx',
                    'odt'
                ) THEN 'Documents'
                WHEN file_type IN ('zip', 'tar', 'gz', '7z', 'rar', 'bz2', 'xz') THEN 'Archives'
                WHEN file_type IN ('mp3', 'wav', 'flac', 'aac', 'ogg', 'wma') THEN 'Audio'
                WHEN file_type IN (
                    'py',
                    'js',
                    'ts',
                    'tsx',
                    'jsx',
                    'html',
                    'css',
                    'sql',
                    'json',
                    'yaml',
                    'yml',
                    'sh',
                    'c',
                    'cpp',
                    'java',
                    'go',
                    'rs'
                ) THEN 'Code'
                ELSE 'Other'
            END AS category,
            file_size
        FROM developer_schema.documents
        WHERE user_id = p_user_id
            AND deleted_at IS NULL
    )
SELECT c.category AS type_category,
    COALESCE(SUM(c.file_size), 0)::BIGINT AS total_bytes,
    COUNT(*)::BIGINT AS file_count,
    CASE
        c.category
        WHEN 'Images' THEN '#8B5CF6'
        WHEN 'Videos' THEN '#EC4899'
        WHEN 'Documents' THEN '#F59E0B'
        WHEN 'Archives' THEN '#10B981'
        WHEN 'Audio' THEN '#06B6D4'
        WHEN 'Code' THEN '#6366F1'
        ELSE '#6B7280'
    END AS color
FROM categorized c
GROUP BY c.category
ORDER BY total_bytes DESC;
$$;
COMMENT ON FUNCTION developer_schema.get_storage_breakdown(INT) IS 'Returns per-category storage breakdown for the file manager UI.
Each row contains: type_category, total_bytes, file_count, hex color code.';
GRANT EXECUTE ON FUNCTION developer_schema.get_storage_breakdown(INT) TO synapse_user;