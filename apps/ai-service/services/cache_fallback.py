"""
Cache Fallback Service
Local caching for RAG retrieval when Pinecone is unavailable
Implements similarity search using cached embeddings
"""

import logging
import json
import os
from typing import List, Dict, Any, Tuple
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)


class LocalCache:
    """Local in-memory cache with fallback retrieval"""
    
    def __init__(self, cache_file: str = None):
        """
        Initialize local cache
        
        Args:
            cache_file: Optional file to persist cache
        """
        self.cache_file = cache_file or os.path.join(
            os.path.dirname(__file__), 
            "..", 
            ".cache", 
            "rag_cache.json"
        )
        
        self.documents: List[Dict[str, Any]] = []
        self.embeddings: Dict[str, List[float]] = {}
        self.metadata_index: Dict[str, Dict[str, Any]] = {}
        
        # Create cache directory if needed
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        
        # Load from disk if available
        self._load_cache()
    
    def _load_cache(self):
        """Load cache from disk"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    self.documents = cache_data.get('documents', [])
                    self.embeddings = cache_data.get('embeddings', {})
                    self.metadata_index = cache_data.get('metadata_index', {})
                    logger.info(f"✅ Loaded cache with {len(self.documents)} documents")
        except Exception as e:
            logger.warning(f"Failed to load cache: {str(e)}")
            self.documents = []
            self.embeddings = {}
            self.metadata_index = {}
    
    def _save_cache(self):
        """Save cache to disk"""
        try:
            cache_data = {
                'documents': self.documents,
                'embeddings': self.embeddings,
                'metadata_index': self.metadata_index,
                'cached_at': datetime.utcnow().isoformat()
            }
            
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
                logger.debug(f"Saved cache with {len(self.documents)} documents")
        except Exception as e:
            logger.error(f"Failed to save cache: {str(e)}")
    
    def add_document(
        self, 
        doc_id: str, 
        text: str, 
        embedding: List[float], 
        metadata: Dict[str, Any]
    ):
        """
        Add document to cache
        
        Args:
            doc_id: Document ID
            text: Document text
            embedding: Document embedding
            metadata: Document metadata
        """
        self.documents.append({
            "id": doc_id,
            "text": text,
            "metadata": metadata
        })
        
        self.embeddings[doc_id] = embedding
        self.metadata_index[doc_id] = metadata
    
    def add_batch(self, documents: List[Dict[str, Any]]):
        """
        Add batch of documents to cache
        
        Args:
            documents: List of documents with id, text, embedding, metadata
        """
        for doc in documents:
            self.add_document(
                doc_id=doc['id'],
                text=doc['text'],
                embedding=doc['embedding'],
                metadata=doc['metadata']
            )
        
        self._save_cache()
        logger.info(f"Added {len(documents)} documents to cache")
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2:
            return 0.0
        
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        magnitude1 = np.linalg.norm(vec1)
        magnitude2 = np.linalg.norm(vec2)
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def search(
        self, 
        query_embedding: List[float], 
        top_k: int = 5,
        metadata_filter: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Search cache using embedding similarity
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of top results
            metadata_filter: Optional metadata filter
            
        Returns:
            List of matching documents with scores
        """
        if not self.embeddings:
            logger.warning("Cache is empty")
            return []
        
        scores = []
        
        for doc_id, embedding in self.embeddings.items():
            # Apply metadata filter if provided
            if metadata_filter:
                doc_metadata = self.metadata_index.get(doc_id, {})
                if not all(doc_metadata.get(k) == v for k, v in metadata_filter.items()):
                    continue
            
            # Calculate similarity
            score = self.cosine_similarity(query_embedding, embedding)
            scores.append((doc_id, score))
        
        # Sort by score and get top_k
        scores.sort(key=lambda x: x[1], reverse=True)
        results = []
        
        for doc_id, score in scores[:top_k]:
            doc = next((d for d in self.documents if d['id'] == doc_id), None)
            if doc:
                results.append({
                    "id": doc_id,
                    "text": doc['text'],
                    "score": float(score),
                    "metadata": doc['metadata']
                })
        
        logger.info(f"Cache search returned {len(results)} results")
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "total_documents": len(self.documents),
            "total_embeddings": len(self.embeddings),
            "cache_file": self.cache_file,
            "cache_exists": os.path.exists(self.cache_file)
        }
    
    def clear(self):
        """Clear cache"""
        self.documents = []
        self.embeddings = {}
        self.metadata_index = {}
        if os.path.exists(self.cache_file):
            os.remove(self.cache_file)
        logger.info("Cache cleared")


class CacheFallbackService:
    """Service that handles fallback to cache when Pinecone is unavailable"""
    
    def __init__(self, embeddings_service):
        """
        Initialize cache fallback service
        
        Args:
            embeddings_service: Service for generating embeddings
        """
        self.cache = LocalCache()
        self.embeddings_service = embeddings_service
        logger.info("CacheFallbackService initialized")
    
    async def populate_cache_from_documents(self, documents: List[Dict[str, Any]]):
        """
        Populate cache with documents and embeddings
        
        Args:
            documents: List of documents with 'id', 'text', and 'metadata'
        """
        try:
            logger.info(f"Populating cache with {len(documents)} documents...")
            
            texts = [doc['text'] for doc in documents]
            embeddings = await self.embeddings_service.embed_documents(texts)
            
            cache_docs = []
            for doc, embedding in zip(documents, embeddings):
                cache_docs.append({
                    'id': doc['id'],
                    'text': doc['text'],
                    'embedding': embedding,
                    'metadata': doc['metadata']
                })
            
            self.cache.add_batch(cache_docs)
            logger.info(f"✅ Cache populated with {len(cache_docs)} documents")
            
        except Exception as e:
            logger.error(f"Error populating cache: {str(e)}")
    
    async def search_cache(
        self,
        query: str,
        top_k: int = 5,
        metadata_filter: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Search using cache fallback
        
        Args:
            query: Search query
            top_k: Number of results
            metadata_filter: Optional metadata filter
            
        Returns:
            List of matching documents
        """
        try:
            # Generate query embedding
            query_embedding = await self.embeddings_service.embed_text(query)
            
            # Search cache
            results = self.cache.search(
                query_embedding=query_embedding,
                top_k=top_k,
                metadata_filter=metadata_filter
            )
            
            logger.info(f"Cache search for '{query}' returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Error searching cache: {str(e)}")
            return []
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.cache.get_stats()


# Global instance
_cache_fallback_service = None


def get_cache_fallback_service(embeddings_service=None) -> CacheFallbackService:
    """Get or create cache fallback service instance"""
    global _cache_fallback_service
    if _cache_fallback_service is None:
        if embeddings_service is None:
            from services.embeddings import get_embeddings_service
            embeddings_service = get_embeddings_service()
        _cache_fallback_service = CacheFallbackService(embeddings_service)
    return _cache_fallback_service