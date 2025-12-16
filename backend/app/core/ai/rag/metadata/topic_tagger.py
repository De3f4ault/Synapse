"""Topic tagger - Tags content with topics for personalization."""

from typing import List, Set
import structlog

logger = structlog.get_logger(__name__)


class TopicTagger:
    """
    Tags content with topics using keyword matching.
    
    Phase 2: Rule-based keyword matching
    Phase 3+: ML-based topic classification
    
    Topics enable:
    - Filtering by user preferences
    - Matching with weak areas
    - Learning path tracking
    """
    
    def __init__(self):
        """Initialize topic tagger with keyword dictionary"""
        
        # Topic keyword mappings (expandable)
        self.topic_keywords = {
            "photosynthesis": {
                "photosynthesis", "chloroplast", "chlorophyll", "light reactions",
                "calvin cycle", "carbon fixation", "glucose production"
            },
            "cellular_respiration": {
                "cellular respiration", "glycolysis", "krebs cycle", "citric acid",
                "electron transport", "ATP synthesis", "mitochondria"
            },
            "mitosis": {
                "mitosis", "cell division", "prophase", "metaphase", "anaphase",
                "telophase", "chromosome", "spindle fibers"
            },
            "meiosis": {
                "meiosis", "gametes", "sexual reproduction", "crossing over",
                "homologous chromosomes", "haploid", "diploid"
            },
            "DNA_replication": {
                "DNA replication", "DNA polymerase", "helicase", "replication fork",
                "leading strand", "lagging strand", "okazaki fragments"
            },
            "protein_synthesis": {
                "protein synthesis", "transcription", "translation", "mRNA", "tRNA",
                "ribosome", "codon", "amino acid"
            },
            "cell_structure": {
                "cell structure", "organelle", "nucleus", "endoplasmic reticulum",
                "golgi apparatus", "lysosome", "cell membrane"
            },
            "enzymes": {
                "enzyme", "catalyst", "substrate", "active site", "activation energy",
                "enzyme kinetics", "inhibitor"
            }
        }
        
        logger.info("topic_tagger_initialized", topics=len(self.topic_keywords))
    
    def tag_content(self, text: str, min_confidence: float = 0.3) -> List[str]:
        """
        Tag content with topics.
        
        Args:
            text: Content text
            min_confidence: Minimum confidence threshold (0.0-1.0)
        
        Returns:
            List of topic tags
        """
        text_lower = text.lower()
        
        # Calculate topic scores
        topic_scores = {}
        for topic, keywords in self.topic_keywords.items():
            # Count keyword matches
            matches = sum(1 for kw in keywords if kw in text_lower)
            
            # Confidence = matches / total keywords
            confidence = matches / len(keywords) if keywords else 0
            
            if confidence >= min_confidence:
                topic_scores[topic] = confidence
        
        # Sort by confidence
        tagged_topics = sorted(
            topic_scores.keys(),
            key=lambda t: topic_scores[t],
            reverse=True
        )
        
        logger.debug(
            "content_tagged",
            text_length=len(text),
            topics_found=len(tagged_topics)
        )
        
        return tagged_topics
    
    def add_topic_keywords(self, topic: str, keywords: Set[str]):
        """
        Add or update topic keywords.
        
        Args:
            topic: Topic name
            keywords: Set of keywords
        """
        if topic in self.topic_keywords:
            self.topic_keywords[topic].update(keywords)
        else:
            self.topic_keywords[topic] = keywords
        
        logger.info("topic_keywords_updated", topic=topic, keyword_count=len(keywords))


# Global tagger instance
_tagger = None


def get_topic_tagger() -> TopicTagger:
    """Get global topic tagger instance"""
    global _tagger
    
    if _tagger is None:
        _tagger = TopicTagger()
    
    return _tagger
