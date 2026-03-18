"""
Graph analytics service for SYNAPSE knowledge graph.

Provides aggregate metrics and insights about a user's knowledge graph:
graph density, hub detection, orphan identification, cluster analysis,
link type distribution, and growth trends.

All queries run against PostgreSQL via SQLAlchemy async sessions.
"""

import logging
from typing import Any, Dict, List, Optional
from collections import defaultdict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class GraphAnalytics:
    """
    Aggregate analytics for a user's knowledge graph.

    All methods query the 'links' table plus entity tables
    (notes, decks, documents, quizzes) in PostgreSQL.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_graph_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Get overall graph statistics.

        Returns:
            Dict with total_nodes, total_edges, avg_connections,
            density, and per-type node counts.
        """
        try:
            # Count edges (non-suggested links)
            edge_result = await self.session.execute(
                text("""
                    SELECT
                        COUNT(*) AS total_edges,
                        AVG(strength) AS avg_strength
                    FROM links
                    WHERE user_id = :uid
                      AND link_type != 'suggested'
                """),
                {"uid": user_id},
            )
            edge_row = edge_result.first()
            total_edges = int(edge_row.total_edges or 0)
            avg_strength = float(edge_row.avg_strength or 0)

            # Count nodes per entity type
            node_result = await self.session.execute(
                text("""
                    SELECT
                        (SELECT COUNT(*) FROM notes
                         WHERE user_id = :uid AND deleted_at IS NULL) AS notes,
                        (SELECT COUNT(*) FROM decks
                         WHERE user_id = :uid AND deleted_at IS NULL) AS decks,
                        (SELECT COUNT(*) FROM documents
                         WHERE user_id = :uid AND deleted_at IS NULL) AS documents,
                        (SELECT COUNT(*) FROM quizzes
                         WHERE user_id = :uid AND deleted_at IS NULL) AS quizzes
                """),
                {"uid": user_id},
            )
            node_row = node_result.first()
            notes = int(node_row.notes or 0)
            decks = int(node_row.decks or 0)
            documents = int(node_row.documents or 0)
            quizzes = int(node_row.quizzes or 0)
            total_nodes = notes + decks + documents + quizzes

            # Graph density: ratio of actual edges to possible edges
            # For a directed graph: density = edges / (nodes * (nodes - 1))
            max_edges = total_nodes * (total_nodes - 1) if total_nodes > 1 else 1
            density = total_edges / max_edges if max_edges > 0 else 0.0

            avg_connections = (
                (total_edges * 2) / total_nodes if total_nodes > 0 else 0.0
            )

            return {
                "total_nodes": total_nodes,
                "total_edges": total_edges,
                "avg_connections_per_node": round(avg_connections, 2),
                "density": round(density, 4),
                "avg_link_strength": round(avg_strength, 3),
                "nodes_by_type": {
                    "note": notes,
                    "deck": decks,
                    "document": documents,
                    "quiz": quizzes,
                },
            }

        except Exception as e:
            logger.error(f"Error getting graph stats: {e}")
            return {
                "total_nodes": 0,
                "total_edges": 0,
                "avg_connections_per_node": 0.0,
                "density": 0.0,
                "avg_link_strength": 0.0,
                "nodes_by_type": {},
            }

    async def get_most_connected(
        self, user_id: int, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find the most connected entities (hubs) in the graph.

        Counts both outgoing and incoming links for each entity.

        Returns:
            List of entities ranked by total connections.
        """
        try:
            result = await self.session.execute(
                text("""
                    WITH entity_connections AS (
                        SELECT entity_type, entity_id, SUM(conn) AS connections
                        FROM (
                            SELECT source_type AS entity_type,
                                   source_id AS entity_id,
                                   COUNT(*) AS conn
                            FROM links
                            WHERE user_id = :uid AND link_type != 'suggested'
                            GROUP BY source_type, source_id
                            UNION ALL
                            SELECT target_type AS entity_type,
                                   target_id AS entity_id,
                                   COUNT(*) AS conn
                            FROM links
                            WHERE user_id = :uid AND link_type != 'suggested'
                            GROUP BY target_type, target_id
                        ) AS all_connections
                        GROUP BY entity_type, entity_id
                    )
                    SELECT entity_type, entity_id, connections
                    FROM entity_connections
                    ORDER BY connections DESC
                    LIMIT :lim
                """),
                {"uid": user_id, "lim": limit},
            )

            hubs = []
            for row in result.all():
                label = await self._get_entity_label(
                    row.entity_type, row.entity_id
                )
                hubs.append({
                    "entity_type": row.entity_type,
                    "entity_id": int(row.entity_id),
                    "label": label,
                    "connections": int(row.connections),
                })

            return hubs

        except Exception as e:
            logger.error(f"Error getting most connected: {e}")
            return []

    async def get_orphan_nodes(
        self, user_id: int
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Find entities with zero connections (not part of the graph).

        Returns:
            Dict keyed by entity type, each containing a list of orphan entities.
        """
        try:
            # Get all entity IDs that appear in links
            linked_result = await self.session.execute(
                text("""
                    SELECT DISTINCT entity_type, entity_id
                    FROM (
                        SELECT source_type AS entity_type, source_id AS entity_id
                        FROM links WHERE user_id = :uid AND link_type != 'suggested'
                        UNION
                        SELECT target_type AS entity_type, target_id AS entity_id
                        FROM links WHERE user_id = :uid AND link_type != 'suggested'
                    ) AS linked
                """),
                {"uid": user_id},
            )
            linked_set = {
                (row.entity_type, row.entity_id)
                for row in linked_result.all()
            }

            orphans: Dict[str, List[Dict[str, Any]]] = {}

            # Check each entity type
            entity_checks = [
                ("note", "notes", "title"),
                ("deck", "decks", "name"),
                ("document", "documents", "filename"),
                ("quiz", "quizzes", "title"),
            ]

            for entity_type, table, label_col in entity_checks:
                result = await self.session.execute(
                    text(f"""
                        SELECT id, {label_col} AS label
                        FROM {table}
                        WHERE user_id = :uid AND deleted_at IS NULL
                        ORDER BY id
                    """),
                    {"uid": user_id},
                )
                type_orphans = []
                for row in result.all():
                    if (entity_type, row.id) not in linked_set:
                        type_orphans.append({
                            "entity_id": row.id,
                            "label": str(row.label),
                        })

                if type_orphans:
                    orphans[entity_type] = type_orphans

            return orphans

        except Exception as e:
            logger.error(f"Error getting orphan nodes: {e}")
            return {}

    async def get_cluster_summary(
        self, user_id: int
    ) -> Dict[str, Any]:
        """
        Identify connected components (clusters) in the graph.

        Uses Union-Find in Python over the edge list.

        Returns:
            Dict with cluster_count, largest_cluster_size,
            avg_cluster_size, and clusters list.
        """
        try:
            result = await self.session.execute(
                text("""
                    SELECT source_type, source_id, target_type, target_id
                    FROM links
                    WHERE user_id = :uid AND link_type != 'suggested'
                """),
                {"uid": user_id},
            )
            edges = result.all()

            if not edges:
                return {
                    "cluster_count": 0,
                    "largest_cluster_size": 0,
                    "avg_cluster_size": 0.0,
                    "clusters": [],
                }

            # Union-Find
            parent: Dict[str, str] = {}

            def find(x: str) -> str:
                while parent.get(x, x) != x:
                    parent[x] = parent.get(parent[x], parent[x])
                    x = parent[x]
                return x

            def union(a: str, b: str):
                ra, rb = find(a), find(b)
                if ra != rb:
                    parent[ra] = rb

            for edge in edges:
                src = f"{edge.source_type}:{edge.source_id}"
                tgt = f"{edge.target_type}:{edge.target_id}"
                parent.setdefault(src, src)
                parent.setdefault(tgt, tgt)
                union(src, tgt)

            # Group by root
            clusters_map: Dict[str, List[str]] = defaultdict(list)
            for node in parent:
                root = find(node)
                clusters_map[root].append(node)

            clusters = sorted(
                [{"size": len(members), "members": members}
                 for members in clusters_map.values()],
                key=lambda c: c["size"],
                reverse=True,
            )

            # Limit member lists to top 5 per cluster for response size
            for cluster in clusters:
                if len(cluster["members"]) > 5:
                    cluster["members"] = cluster["members"][:5]
                    cluster["truncated"] = True

            return {
                "cluster_count": len(clusters),
                "largest_cluster_size": clusters[0]["size"] if clusters else 0,
                "avg_cluster_size": round(
                    sum(c["size"] for c in clusters) / len(clusters), 1
                ) if clusters else 0.0,
                "clusters": clusters[:20],  # Limit to top 20
            }

        except Exception as e:
            logger.error(f"Error getting cluster summary: {e}")
            return {
                "cluster_count": 0,
                "largest_cluster_size": 0,
                "avg_cluster_size": 0.0,
                "clusters": [],
            }

    async def get_link_type_distribution(
        self, user_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get distribution of links by type.

        Returns:
            List of dicts with link_type, count, percentage, avg_strength.
        """
        try:
            result = await self.session.execute(
                text("""
                    SELECT
                        link_type,
                        COUNT(*) AS count,
                        AVG(strength) AS avg_strength
                    FROM links
                    WHERE user_id = :uid
                    GROUP BY link_type
                    ORDER BY count DESC
                """),
                {"uid": user_id},
            )
            rows = result.all()
            total = sum(row.count for row in rows)

            return [
                {
                    "link_type": row.link_type,
                    "count": int(row.count),
                    "percentage": round(
                        (row.count / total) * 100, 1
                    ) if total > 0 else 0.0,
                    "avg_strength": round(float(row.avg_strength or 0), 3),
                }
                for row in rows
            ]

        except Exception as e:
            logger.error(f"Error getting link type distribution: {e}")
            return []

    async def get_growth_trend(
        self, user_id: int, days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get graph growth trend over time.

        Returns:
            List of daily counts (links created per day).
        """
        try:
            result = await self.session.execute(
                text("""
                    SELECT
                        DATE(created_at) AS day,
                        COUNT(*) AS links_created,
                        COUNT(DISTINCT source_type || ':' || source_id::text) +
                        COUNT(DISTINCT target_type || ':' || target_id::text)
                            AS unique_entities_touched
                    FROM links
                    WHERE user_id = :uid
                      AND created_at >= CURRENT_DATE - :days * INTERVAL '1 day'
                      AND link_type != 'suggested'
                    GROUP BY DATE(created_at)
                    ORDER BY day
                """),
                {"uid": user_id, "days": days},
            )

            return [
                {
                    "date": str(row.day),
                    "links_created": int(row.links_created),
                    "entities_touched": int(row.unique_entities_touched),
                }
                for row in result.all()
            ]

        except Exception as e:
            logger.error(f"Error getting growth trend: {e}")
            return []

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_entity_label(
        self, entity_type: str, entity_id: int
    ) -> str:
        """Look up the human-readable label for an entity."""
        label_map = {
            "note": ("notes", "title"),
            "deck": ("decks", "name"),
            "document": ("documents", "filename"),
            "quiz": ("quizzes", "title"),
        }

        if entity_type not in label_map:
            return f"{entity_type}:{entity_id}"

        table, col = label_map[entity_type]
        try:
            result = await self.session.execute(
                text(f"SELECT {col} AS label FROM {table} WHERE id = :id"),
                {"id": entity_id},
            )
            row = result.first()
            return str(row.label) if row else f"{entity_type}:{entity_id}"
        except Exception:
            return f"{entity_type}:{entity_id}"
