"""
Document Chunking Service
Splits documents into semantic chunks for RAG indexing
"""

import logging
from typing import List, Dict, Any
import re

logger = logging.getLogger(__name__)


class ChunkingStrategy:
    """Different strategies for chunking documents"""
    
    # Approximate tokens per word ratio (OpenAI encoding)
    TOKENS_PER_WORD = 1.3
    
    def __init__(self, chunk_size: int = 500, overlap: int = 100):
        """
        Initialize chunker
        
        Args:
            chunk_size: Target size of each chunk in tokens
            overlap: Number of tokens to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text (rough approximation)"""
        words = text.split()
        return int(len(words) * self.TOKENS_PER_WORD)
    
    def chunk_by_paragraphs(self, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split text by paragraphs and group into chunks
        
        Args:
            text: Document text
            metadata: Document metadata
            
        Returns:
            List of chunks with metadata
        """
        # Split by paragraphs (double newlines or numbered sections)
        paragraphs = re.split(r'\n\n+|\n[0-9]+\.\s+', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        chunks = []
        current_chunk = ""
        current_tokens = 0
        chunk_id = 0
        
        for para in paragraphs:
            para_tokens = self.estimate_tokens(para)
            
            # If adding this paragraph exceeds chunk size, save current chunk
            if current_tokens + para_tokens > self.chunk_size and current_chunk:
                chunk_id += 1
                chunks.append({
                    "id": f"{metadata.get('id', 'doc')}_chunk_{chunk_id}",
                    "text": current_chunk.strip(),
                    "metadata": {
                        **metadata,
                        "chunk_index": chunk_id,
                        "tokens": current_tokens
                    }
                })
                
                # Keep overlap
                current_chunk = current_chunk[-int(self.chunk_size * 0.2):]
                current_tokens = self.estimate_tokens(current_chunk)
            
            current_chunk += "\n" + para if current_chunk else para
            current_tokens = self.estimate_tokens(current_chunk)
        
        # Add final chunk
        if current_chunk.strip():
            chunk_id += 1
            chunks.append({
                "id": f"{metadata.get('id', 'doc')}_chunk_{chunk_id}",
                "text": current_chunk.strip(),
                "metadata": {
                    **metadata,
                    "chunk_index": chunk_id,
                    "tokens": current_tokens
                }
            })
        
        return chunks
    
    def chunk_by_sentences(self, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split text by sentences and group into chunks
        
        Args:
            text: Document text
            metadata: Document metadata
            
        Returns:
            List of chunks with metadata
        """
        # Split by sentences (simple regex)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        chunks = []
        current_chunk = ""
        current_tokens = 0
        chunk_id = 0
        overlap_text = ""
        
        for sentence in sentences:
            sentence_tokens = self.estimate_tokens(sentence)
            
            # If adding this sentence exceeds chunk size, save current chunk
            if current_tokens + sentence_tokens > self.chunk_size and current_chunk:
                chunk_id += 1
                chunks.append({
                    "id": f"{metadata.get('id', 'doc')}_chunk_{chunk_id}",
                    "text": current_chunk.strip(),
                    "metadata": {
                        **metadata,
                        "chunk_index": chunk_id,
                        "tokens": current_tokens
                    }
                })
                
                # Keep last sentence or two for overlap
                sentences_in_overlap = []
                temp_tokens = 0
                for overlap_sent in reversed(sentences[:sentences.index(sentence)]):
                    overlap_tokens = self.estimate_tokens(overlap_sent)
                    if temp_tokens + overlap_tokens <= self.overlap:
                        sentences_in_overlap.insert(0, overlap_sent)
                        temp_tokens += overlap_tokens
                    else:
                        break
                
                overlap_text = " ".join(sentences_in_overlap)
                current_chunk = overlap_text
                current_tokens = temp_tokens
            
            current_chunk += (" " + sentence) if current_chunk else sentence
            current_tokens = self.estimate_tokens(current_chunk)
        
        # Add final chunk
        if current_chunk.strip():
            chunk_id += 1
            chunks.append({
                "id": f"{metadata.get('id', 'doc')}_chunk_{chunk_id}",
                "text": current_chunk.strip(),
                "metadata": {
                    **metadata,
                    "chunk_index": chunk_id,
                    "tokens": current_tokens
                }
            })
        
        return chunks
    
    def chunk_fixed_size(self, text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split text into fixed-size word chunks with overlap
        
        Args:
            text: Document text
            metadata: Document metadata
            
        Returns:
            List of chunks with metadata
        """
        words = text.split()
        
        # Convert token size to word size
        chunk_words = int(self.chunk_size / self.TOKENS_PER_WORD)
        overlap_words = int(self.overlap / self.TOKENS_PER_WORD)
        
        chunks = []
        chunk_id = 0
        
        for i in range(0, len(words), chunk_words - overlap_words):
            chunk_words_slice = words[i:i + chunk_words]
            if chunk_words_slice:
                chunk_text = " ".join(chunk_words_slice)
                chunk_id += 1
                
                chunks.append({
                    "id": f"{metadata.get('id', 'doc')}_chunk_{chunk_id}",
                    "text": chunk_text,
                    "metadata": {
                        **metadata,
                        "chunk_index": chunk_id,
                        "tokens": self.estimate_tokens(chunk_text)
                    }
                })
        
        return chunks


class DocumentChunker:
    """Main document chunking service"""
    
    def __init__(self, chunk_size: int = 500, overlap: int = 100):
        """
        Initialize document chunker
        
        Args:
            chunk_size: Target chunk size in tokens
            overlap: Overlap size in tokens
        """
        self.chunker = ChunkingStrategy(chunk_size=chunk_size, overlap=overlap)
        logger.info(f"DocumentChunker initialized with chunk_size={chunk_size}, overlap={overlap}")
    
    def chunk_document(
        self, 
        text: str, 
        metadata: Dict[str, Any],
        strategy: str = "paragraphs"
    ) -> List[Dict[str, Any]]:
        """
        Chunk a document using specified strategy
        
        Args:
            text: Document text
            metadata: Document metadata
            strategy: Chunking strategy ("paragraphs", "sentences", or "fixed")
            
        Returns:
            List of chunks with metadata
        """
        if strategy == "paragraphs":
            return self.chunker.chunk_by_paragraphs(text, metadata)
        elif strategy == "sentences":
            return self.chunker.chunk_by_sentences(text, metadata)
        elif strategy == "fixed":
            return self.chunker.chunk_fixed_size(text, metadata)
        else:
            logger.warning(f"Unknown strategy: {strategy}, defaulting to paragraphs")
            return self.chunker.chunk_by_paragraphs(text, metadata)
    
    def chunk_multiple_documents(
        self,
        documents: List[Dict[str, Any]],
        strategy: str = "paragraphs"
    ) -> List[Dict[str, Any]]:
        """
        Chunk multiple documents
        
        Args:
            documents: List of documents with 'text' and 'metadata' keys
            strategy: Chunking strategy
            
        Returns:
            List of all chunks
        """
        all_chunks = []
        
        for doc in documents:
            text = doc.get("text", "")
            metadata = doc.get("metadata", {})
            
            if text:
                chunks = self.chunk_document(text, metadata, strategy)
                all_chunks.extend(chunks)
                logger.debug(f"Chunked document {metadata.get('id')} into {len(chunks)} chunks")
        
        logger.info(f"Total chunks created: {len(all_chunks)}")
        return all_chunks


# Global instance
_document_chunker = None


def get_document_chunker(chunk_size: int = 500, overlap: int = 100) -> DocumentChunker:
    """Get or create document chunker instance"""
    global _document_chunker
    if _document_chunker is None:
        _document_chunker = DocumentChunker(chunk_size=chunk_size, overlap=overlap)
    return _document_chunker