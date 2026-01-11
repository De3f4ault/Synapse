from app.schemas.intelligence import QualifiedSignal
from app.services.intelligence.promotion import SignalPromotionService
from app.services.intelligence.ranking_adapter import RankingAdapter, get_ranking_adapter

_promotion_service = None


def get_promotion_service() -> SignalPromotionService:
    global _promotion_service
    if _promotion_service is None:
        _promotion_service = SignalPromotionService()
    return _promotion_service


__all__ = [
    "QualifiedSignal",
    "SignalPromotionService",
    "get_promotion_service",
    "RankingAdapter",
    "get_ranking_adapter",
]
