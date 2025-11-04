"""
Embeddings Service
Handles text embeddings using OpenAI API with local fallback
"""

import os
import logging
from typing import List
import hashlib

logger = logging.getLogger(__name__)


class EmbeddingsService:
    """Service for generating text embeddings"""
    
    def __init__(self):
        """Initialize embeddings service"""
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = "text-embedding-3-small"
        self.embedding_dim = 1536
        self.use_local_fallback = not bool(self.api_key)
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured. Using local embedding fallback.")
    
    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding
        """
        try:
            if self.use_local_fallback:
                return self._local_embed(text)
            
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            
            response = client.embeddings.create(
                model=self.model,
                input=text.replace("\n", " ")
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return self._local_embed(text)
    
    async def embed_documents(self, documents: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple documents
        
        Args:
            documents: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            if self.use_local_fallback:
                return [self._local_embed(doc) for doc in documents]
            
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            
            # Process in batches to avoid token limits
            batch_size = 10
            embeddings = []
            
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                batch_cleaned = [doc.replace("\n", " ") for doc in batch]
                
                response = client.embeddings.create(
                    model=self.model,
                    input=batch_cleaned
                )
                
                embeddings.extend([item.embedding for item in response.data])
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            return [self._local_embed(doc) for doc in documents]
    
    def _local_embed(self, text: str) -> List[float]:
        """
        Generate a deterministic embedding using local hash-based method
        This provides consistent results for fallback scenarios
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding
        """
        # Create a deterministic hash-based embedding
        text_lower = text.lower().strip()
        
        # Generate hash
        hash_obj = hashlib.sha256(text_lower.encode())
        hash_bytes = hash_obj.digest()
        
        # Convert hash to embedding vector (1536 dimensions for compatibility)
        embedding = []
        for i in range(self.embedding_dim):
            # Use rolling hash bytes to generate values
            byte_idx = (i * 2) % len(hash_bytes)
            next_byte_idx = (i * 2 + 1) % len(hash_bytes)
            
            # Combine two bytes and normalize to [-1, 1] range
            combined = (hash_bytes[byte_idx] + hash_bytes[next_byte_idx]) / 255.0
            value = (combined - 0.5) * 2.0
            embedding.append(value)
        
        # Normalize the embedding vector
        magnitude = sum(x**2 for x in embedding) ** 0.5
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]
        
        return embedding
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings"""
        return self.embedding_dim
    
    def is_using_local_fallback(self) -> bool:
        """Check if using local fallback"""
        return self.use_local_fallback


# Global instance
_embeddings_service = None


def get_embeddings_service() -> EmbeddingsService:
    """Get or create embeddings service instance"""
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService()
    return _embeddings_service