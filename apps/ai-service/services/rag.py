"""
RAG (Retrieval-Augmented Generation) Service
Complete implementation with Pinecone, chunking, and fallback caching
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class RAGService:
    """Complete RAG service with Pinecone and fallback caching"""
    
    def __init__(self):
        """Initialize RAG service"""
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "visabuddy-visa-kb")
        self.pinecone_environment = os.getenv("PINECONE_ENVIRONMENT", "gcp-starter")
        
        self.index = None
        self.embeddings_service = None
        self.cache_fallback_service = None
        self.kb_ingestor = None
        self.document_chunker = None
        
        self.initialized = False
        self.pinecone_available = False
        self.cache_populated = False
        
        # Vector dimension (must match embeddings)
        self.vector_dimension = 1536
        
        logger.info(f"RAG Service initialized for index: {self.pinecone_index_name}")
    
    async def initialize(self) -> bool:
        """
        Initialize RAG service with Pinecone and fallback cache
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            logger.info("🚀 Initializing RAG Service...")
            
            # Import required services
            from services.embeddings import get_embeddings_service
            from services.cache_fallback import get_cache_fallback_service
            from services.kb_ingestor import get_kb_ingestor
            from services.chunker import get_document_chunker
            
            self.embeddings_service = get_embeddings_service()
            self.cache_fallback_service = get_cache_fallback_service(self.embeddings_service)
            self.kb_ingestor = get_kb_ingestor()
            self.document_chunker = get_document_chunker(chunk_size=500, overlap=100)
            
            logger.info("✅ Services loaded")
            
            # Load knowledge base
            if not await self._load_and_prepare_documents():
                logger.error("Failed to load knowledge base")
                return False
            
            # Try to initialize Pinecone
            await self._initialize_pinecone()
            
            # Index documents (either in Pinecone or fallback cache)
            await self._index_documents()
            
            self.initialized = True
            logger.info("✅ RAG Service fully initialized")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing RAG service: {str(e)}", exc_info=True)
            self.initialized = False
            return False
    
    async def _load_and_prepare_documents(self) -> bool:
        """Load and prepare documents for indexing"""
        try:
            logger.info("📚 Loading knowledge base...")
            
            # Load KB
            if not self.kb_ingestor.load_knowledge_base():
                logger.error("Failed to load knowledge base")
                return False
            
            # Get all documents
            all_documents = self.kb_ingestor.get_all_documents()
            logger.info(f"✅ Loaded {len(all_documents)} raw documents")
            
            # Chunk documents
            logger.info("🔪 Chunking documents...")
            self.documents = []
            for doc in all_documents:
                chunks = self.document_chunker.chunk_document(
                    text=doc['text'],
                    metadata=doc['metadata'],
                    strategy='paragraphs'
                )
                self.documents.extend(chunks)
            
            logger.info(f"✅ Created {len(self.documents)} chunks")
            return True
            
        except Exception as e:
            logger.error(f"Error preparing documents: {str(e)}")
            return False
    
    async def _initialize_pinecone(self):
        """Initialize Pinecone connection"""
        try:
            if not self.pinecone_api_key:
                logger.warning("⚠️ Pinecone API key not configured, will use cache fallback only")
                return
            
            logger.info("🔗 Connecting to Pinecone...")
            
            try:
                from pinecone import Pinecone
                
                pc = Pinecone(api_key=self.pinecone_api_key)
                
                # List available indexes
                indexes = pc.list_indexes()
                index_names = [idx.name for idx in indexes.indexes] if indexes.indexes else []
                logger.info(f"Available Pinecone indexes: {index_names}")
                
                # Check if index exists
                if self.pinecone_index_name in index_names:
                    self.index = pc.Index(self.pinecone_index_name)
                    stats = self.index.describe_index_stats()
                    logger.info(f"✅ Connected to Pinecone index '{self.pinecone_index_name}' with {stats.total_vector_count} vectors")
                    self.pinecone_available = True
                else:
                    logger.warning(f"⚠️ Pinecone index '{self.pinecone_index_name}' not found")
                    logger.info(f"To create the index, visit https://app.pinecone.io and create:")
                    logger.info(f"  - Name: {self.pinecone_index_name}")
                    logger.info(f"  - Dimension: 1536")
                    logger.info(f"  - Metric: cosine")
                    logger.info(f"  - Pod type: starter")
                    self.index = None
                    self.pinecone_available = False
                
            except ImportError:
                logger.warning("⚠️ pinecone-client not installed, will use cache fallback")
                self.index = None
                self.pinecone_available = False
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize Pinecone: {str(e)}, will use cache fallback")
            self.index = None
            self.pinecone_available = False
    
    async def _index_documents(self):
        """Index documents in Pinecone or fallback cache"""
        try:
            if not self.documents:
                logger.warning("No documents to index")
                return
            
            logger.info(f"📝 Indexing {len(self.documents)} documents...")
            
            # Generate embeddings for all documents
            logger.info("🧠 Generating embeddings...")
            texts = [doc['text'] for doc in self.documents]
            embeddings = await self.embeddings_service.embed_documents(texts)
            logger.info(f"✅ Generated {len(embeddings)} embeddings")
            
            # If Pinecone available, upsert to Pinecone
            if self.index:
                await self._upsert_to_pinecone(embeddings)
            
            # Always populate cache fallback
            await self._populate_cache_fallback(embeddings)
            
        except Exception as e:
            logger.error(f"Error indexing documents: {str(e)}", exc_info=True)
    
    async def _upsert_to_pinecone(self, embeddings: List[List[float]]):
        """Upsert documents to Pinecone"""
        try:
            logger.info("📤 Uploading to Pinecone...")
            
            vectors_to_upsert = []
            for doc, embedding in zip(self.documents, embeddings):
                vectors_to_upsert.append({
                    "id": doc["id"],
                    "values": embedding,
                    "metadata": doc["metadata"]
                })
            
            # Upsert in batches
            batch_size = 100
            for i in range(0, len(vectors_to_upsert), batch_size):
                batch = vectors_to_upsert[i:i + batch_size]
                self.index.upsert(vectors=batch)
                logger.info(f"  Batch {i//batch_size + 1}/{(len(vectors_to_upsert) + batch_size - 1)//batch_size} upserted")
            
            logger.info(f"✅ Successfully indexed {len(vectors_to_upsert)} vectors in Pinecone")
            
        except Exception as e:
            logger.error(f"Error upserting to Pinecone: {str(e)}")
            self.pinecone_available = False
    
    async def _populate_cache_fallback(self, embeddings: List[List[float]]):
        """Populate cache fallback with documents and embeddings"""
        try:
            logger.info("💾 Populating cache fallback...")
            
            cache_docs = []
            for doc, embedding in zip(self.documents, embeddings):
                cache_docs.append({
                    'id': doc['id'],
                    'text': doc['text'],
                    'embedding': embedding,
                    'metadata': doc['metadata']
                })
            
            self.cache_fallback_service.cache.add_batch(cache_docs)
            self.cache_populated = True
            logger.info(f"✅ Cache fallback populated with {len(cache_docs)} documents")
            
        except Exception as e:
            logger.error(f"Error populating cache: {str(e)}")
    
    async def retrieve_context(
        self,
        query: str,
        country: Optional[str] = None,
        visa_type: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Retrieve relevant documents from RAG system
        
        Args:
            query: User query/question
            country: Optional country filter
            visa_type: Optional visa type filter
            top_k: Number of top results to return
            
        Returns:
            Dictionary with retrieved documents and metadata
        """
        try:
            if not self.initialized:
                logger.warning("RAG Service not initialized")
                return {"documents": [], "query": query, "sources": [], "source": "none"}
            
            logger.info(f"🔍 Retrieving context for: {query[:100]}")
            
            # Try Pinecone first if available
            if self.pinecone_available and self.index:
                results = await self._retrieve_from_pinecone(
                    query=query,
                    country=country,
                    visa_type=visa_type,
                    top_k=top_k
                )
                if results:
                    return {
                        **results,
                        "source": "pinecone"
                    }
            
            # Fallback to cache
            if self.cache_populated:
                logger.info("⚠️ Using cache fallback")
                results = await self._retrieve_from_cache(
                    query=query,
                    country=country,
                    visa_type=visa_type,
                    top_k=top_k
                )
                return {
                    **results,
                    "source": "cache"
                }
            
            logger.warning("No retrieval system available")
            return {"documents": [], "query": query, "sources": [], "source": "none"}
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}", exc_info=True)
            return {"documents": [], "query": query, "sources": [], "error": str(e), "source": "none"}
    
    async def _retrieve_from_pinecone(
        self,
        query: str,
        country: Optional[str] = None,
        visa_type: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Retrieve from Pinecone"""
        try:
            logger.info("📚 Querying Pinecone...")
            
            # Generate query embedding
            query_embedding = await self.embeddings_service.embed_text(query)
            
            # Build metadata filter
            metadata_filter = {}
            if country:
                metadata_filter["country"] = country
            if visa_type:
                metadata_filter["visa_type"] = visa_type
            
            # Query Pinecone
            search_results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=metadata_filter if metadata_filter else None
            )
            
            # Format results
            context_items = []
            for match in search_results.get("matches", []):
                metadata = match.get("metadata", {})
                text = self._get_document_text_from_cache(match["id"])
                
                context_items.append({
                    "source": metadata.get("country", metadata.get("topic", "Unknown")),
                    "type": metadata.get("type", "unknown"),
                    "score": match.get("score", 0),
                    "content": text or f"Document: {match['id']}"
                })
            
            logger.info(f"✅ Retrieved {len(context_items)} results from Pinecone")
            
            return {
                "documents": context_items,
                "query": query,
                "sources": [doc["source"] for doc in context_items],
                "count": len(context_items)
            }
            
        except Exception as e:
            logger.error(f"Error querying Pinecone: {str(e)}")
            return None
    
    async def _retrieve_from_cache(
        self,
        query: str,
        country: Optional[str] = None,
        visa_type: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Retrieve from cache fallback"""
        try:
            logger.info("💾 Querying cache...")
            
            # Build metadata filter
            metadata_filter = {}
            if country:
                metadata_filter["country"] = country
            if visa_type:
                metadata_filter["visa_type"] = visa_type
            
            # Search cache
            results = await self.cache_fallback_service.search_cache(
                query=query,
                top_k=top_k,
                metadata_filter=metadata_filter if metadata_filter else None
            )
            
            # Format results
            context_items = []
            for result in results:
                metadata = result.get("metadata", {})
                context_items.append({
                    "source": metadata.get("country", metadata.get("topic", "Unknown")),
                    "type": metadata.get("type", "unknown"),
                    "score": result.get("score", 0),
                    "content": result.get("text", "")
                })
            
            logger.info(f"✅ Retrieved {len(context_items)} results from cache")
            
            return {
                "documents": context_items,
                "query": query,
                "sources": [doc["source"] for doc in context_items],
                "count": len(context_items)
            }
            
        except Exception as e:
            logger.error(f"Error querying cache: {str(e)}")
            return {"documents": [], "query": query, "sources": [], "count": 0}
    
    def _get_document_text_from_cache(self, doc_id: str) -> Optional[str]:
        """Get document text from cache"""
        try:
            doc = next((d for d in self.documents if d["id"] == doc_id), None)
            return doc["text"] if doc else None
        except:
            return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get RAG service status"""
        cache_stats = self.cache_fallback_service.get_cache_stats() if self.cache_fallback_service else {}
        
        return {
            "initialized": self.initialized,
            "pinecone_available": self.pinecone_available,
            "cache_populated": self.cache_populated,
            "documents_indexed": len(self.documents) if hasattr(self, 'documents') else 0,
            "using_openai_embeddings": not self.embeddings_service.is_using_local_fallback() if self.embeddings_service else False,
            "cache_stats": cache_stats
        }


# Global instance
_rag_service = None


def get_rag_service() -> RAGService:
    """Get or create RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service