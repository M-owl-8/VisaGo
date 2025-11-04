"""
RAG (Retrieval-Augmented Generation) Service
Handles knowledge base indexing and document retrieval using Pinecone
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class RAGService:
    """Service for managing RAG with Pinecone vector database"""
    
    def __init__(self):
        """Initialize RAG service"""
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "visabuddy-visa-kb")
        self.pinecone_environment = os.getenv("PINECONE_ENVIRONMENT", "gcp-starter")
        
        self.index = None
        self.embeddings_service = None
        self.kb_data = None
        self.initialized = False
        
        # Vector dimension (must match embeddings)
        self.vector_dimension = 1536
        
        logger.info(f"RAG Service initialized with index: {self.pinecone_index_name}")
    
    async def initialize(self) -> bool:
        """
        Initialize RAG service with Pinecone and load knowledge base
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Import embeddings service
            from services.embeddings import get_embeddings_service
            self.embeddings_service = get_embeddings_service()
            
            # Initialize Pinecone
            if self.pinecone_api_key:
                try:
                    from pinecone import Pinecone
                    
                    pc = Pinecone(api_key=self.pinecone_api_key)
                    
                    # Check if index exists, if not create it
                    try:
                        self.index = pc.Index(self.pinecone_index_name)
                        # Test the index
                        self.index.describe_index_stats()
                        logger.info(f"Connected to Pinecone index: {self.pinecone_index_name}")
                    except Exception as e:
                        logger.warning(f"Index {self.pinecone_index_name} not found or error: {str(e)}")
                        logger.info("Note: You may need to create the index in Pinecone dashboard or via API")
                        self.index = None
                
                except ImportError:
                    logger.warning("Pinecone not installed. Install with: pip install pinecone-client")
                    self.index = None
            else:
                logger.warning("Pinecone API key not configured")
                self.index = None
            
            # Load knowledge base
            await self._load_knowledge_base()
            
            # Index knowledge base if Pinecone is available
            if self.index and self.kb_data:
                await self._index_knowledge_base()
            
            self.initialized = True
            logger.info("✅ RAG Service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing RAG service: {str(e)}")
            self.initialized = False
            return False
    
    async def _load_knowledge_base(self) -> bool:
        """Load knowledge base from JSON file"""
        try:
            kb_path = os.path.join(os.path.dirname(__file__), "..", "data", "visa_kb.json")
            
            with open(kb_path, "r", encoding="utf-8") as f:
                self.kb_data = json.load(f)
            
            logger.info(f"✅ Loaded knowledge base with {len(self.kb_data.get('countries', {}))} countries")
            return True
            
        except FileNotFoundError:
            logger.error(f"Knowledge base file not found at {kb_path}")
            self.kb_data = {}
            return False
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing knowledge base JSON: {str(e)}")
            self.kb_data = {}
            return False
    
    async def _index_knowledge_base(self) -> bool:
        """Index knowledge base documents in Pinecone"""
        try:
            if not self.kb_data or not self.index:
                logger.warning("Cannot index: missing KB data or Pinecone index")
                return False
            
            documents = []
            vectors = []
            
            # Extract documents from knowledge base
            # 1. Country visa information
            for country_name, country_data in self.kb_data.get("countries", {}).items():
                for visa_type, visa_info in country_data.get("visa_types", {}).items():
                    doc_id = f"{country_name.lower()}_{visa_type.lower().replace(' ', '_')}"
                    
                    # Combine all visa information into a searchable text
                    text = f"""
Country: {country_name}
Visa Type: {visa_type}
Requirements: {visa_info.get('requirements', '')}
Processing Time: {visa_info.get('processing_time', '')}
Validity: {visa_info.get('validity', '')}
Fee: {visa_info.get('fee', '')}
Documents: {', '.join(visa_info.get('documents', []))}
Tips: {visa_info.get('tips', '')}
                    """.strip()
                    
                    documents.append({
                        "id": doc_id,
                        "text": text,
                        "metadata": {
                            "country": country_name,
                            "visa_type": visa_type,
                            "type": "visa_info",
                            "indexed_at": datetime.utcnow().isoformat()
                        }
                    })
            
            # 2. General topics
            for topic_name, topic_data in self.kb_data.get("general_topics", {}).items():
                doc_id = f"topic_{topic_name.lower().replace(' ', '_')}"
                
                text = f"""
Topic: {topic_name}
{topic_data.get('content', '')}
                """.strip()
                
                documents.append({
                    "id": doc_id,
                    "text": text,
                    "metadata": {
                        "topic": topic_name,
                        "type": "general_info",
                        "indexed_at": datetime.utcnow().isoformat()
                    }
                })
            
            # Generate embeddings for all documents
            logger.info(f"Generating embeddings for {len(documents)} documents...")
            
            texts = [doc["text"] for doc in documents]
            embeddings = await self.embeddings_service.embed_documents(texts)
            
            # Prepare vectors for Pinecone
            vectors_to_upsert = []
            for doc, embedding in zip(documents, embeddings):
                vectors_to_upsert.append((
                    doc["id"],
                    embedding,
                    doc["metadata"]
                ))
            
            # Upsert to Pinecone in batches
            batch_size = 100
            for i in range(0, len(vectors_to_upsert), batch_size):
                batch = vectors_to_upsert[i:i + batch_size]
                self.index.upsert(vectors=batch)
                logger.info(f"Indexed batch {i//batch_size + 1}/{(len(vectors_to_upsert) + batch_size - 1)//batch_size}")
            
            logger.info(f"✅ Successfully indexed {len(documents)} documents in Pinecone")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing knowledge base: {str(e)}")
            return False
    
    async def retrieve_context(
        self,
        query: str,
        country: Optional[str] = None,
        visa_type: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Retrieve relevant documents from knowledge base
        
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
                return {"documents": [], "query": query, "sources": []}
            
            # Generate embedding for query
            query_embedding = await self.embeddings_service.embed_text(query)
            
            # Search Pinecone if index is available
            results = []
            if self.index:
                try:
                    search_results = self.index.query(
                        vector=query_embedding,
                        top_k=top_k,
                        include_metadata=True
                    )
                    
                    for match in search_results.get("matches", []):
                        results.append({
                            "id": match["id"],
                            "score": match.get("score", 0),
                            "metadata": match.get("metadata", {}),
                            "text": match.get("values", None)  # Pinecone doesn't return text by default
                        })
                    
                except Exception as e:
                    logger.error(f"Error querying Pinecone: {str(e)}")
                    results = []
            
            # Apply filters if provided
            if country or visa_type:
                results = [r for r in results if (
                    (not country or r.get("metadata", {}).get("country") == country) and
                    (not visa_type or r.get("metadata", {}).get("visa_type") == visa_type)
                )]
            
            # Format response
            context_items = []
            for result in results[:top_k]:
                metadata = result.get("metadata", {})
                
                # Extract relevant text from knowledge base
                doc_text = self._get_document_text(metadata)
                
                context_items.append({
                    "source": metadata.get("country", metadata.get("topic", "Unknown")),
                    "type": metadata.get("type", "unknown"),
                    "score": result.get("score", 0),
                    "content": doc_text
                })
            
            return {
                "documents": context_items,
                "query": query,
                "sources": [doc["source"] for doc in context_items],
                "count": len(context_items)
            }
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return {"documents": [], "query": query, "sources": [], "error": str(e)}
    
    def _get_document_text(self, metadata: Dict[str, Any]) -> str:
        """Extract full document text from knowledge base using metadata"""
        try:
            if metadata.get("type") == "visa_info":
                country = metadata.get("country")
                visa_type = metadata.get("visa_type")
                
                if country and visa_type:
                    visa_data = self.kb_data.get("countries", {}).get(country, {}).get("visa_types", {}).get(visa_type, {})
                    
                    return f"""
**{country} - {visa_type} Visa**
- Requirements: {visa_data.get('requirements', 'N/A')}
- Processing Time: {visa_data.get('processing_time', 'N/A')}
- Validity: {visa_data.get('validity', 'N/A')}
- Fee: {visa_data.get('fee', 'N/A')}
- Documents Needed: {', '.join(visa_data.get('documents', []))}
- Tips: {visa_data.get('tips', 'N/A')}
                    """.strip()
            
            elif metadata.get("type") == "general_info":
                topic = metadata.get("topic")
                topic_data = self.kb_data.get("general_topics", {}).get(topic, {})
                return f"**{topic}**\n{topic_data.get('content', 'N/A')}"
            
            return "No document text available"
            
        except Exception as e:
            logger.error(f"Error extracting document text: {str(e)}")
            return "Error retrieving document content"
    
    def get_status(self) -> Dict[str, Any]:
        """Get RAG service status"""
        return {
            "initialized": self.initialized,
            "pinecone_connected": bool(self.index),
            "knowledge_base_loaded": bool(self.kb_data),
            "countries_count": len(self.kb_data.get("countries", {})) if self.kb_data else 0,
            "using_openai_embeddings": not self.embeddings_service.is_using_local_fallback() if self.embeddings_service else False,
        }


# Global instance
_rag_service = None


def get_rag_service() -> RAGService:
    """Get or create RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service