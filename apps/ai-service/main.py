"""
VisaBuddy AI Service - FastAPI Backend
Handles AI chat with RAG (Retrieval-Augmented Generation)
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="VisaBuddy AI Service",
    description="AI chatbot with RAG for visa application guidance",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# MODELS
# ============================================================================

class ChatMessage(BaseModel):
    """Message model for chat requests"""
    content: str
    user_id: str
    application_id: Optional[str] = None
    conversation_history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    message: str
    sources: List[str]
    tokens_used: int
    model: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


# ============================================================================
# ROUTES
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "VisaBuddy AI Service",
        "version": "1.0.0",
    }


@app.get("/api/status")
async def api_status():
    """API status endpoint"""
    return {
        "message": "VisaBuddy AI Service is running",
        "service": "AI Chat & RAG",
        "available_models": ["gpt-4", "gpt-3.5-turbo"],
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """
    Chat endpoint with RAG support
    
    - **content**: User's message
    - **user_id**: User identifier
    - **application_id**: Optional visa application context
    - **conversation_history**: Optional chat history for context
    """
    try:
        logger.info(f"Received chat message from user {message.user_id}")
        
        # Prepare system prompt with context
        system_prompt = """You are a helpful visa application assistant for VisaBuddy. 
You provide accurate information about:
- Visa requirements and processes
- Document preparation and submission
- Application timelines and costs
- Immigration procedures and regulations
- Payment and processing details

Be professional, concise, and helpful. Always recommend consulting official government websites or immigration lawyers for complex legal matters."""
        
        # Build conversation history for context
        messages = []
        if message.conversation_history:
            messages.extend(message.conversation_history)
        messages.append({"role": "user", "content": message.content})
        
        # Call OpenAI API (using fallback if not configured)
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not configured, using fallback response")
            response_text = _get_fallback_response(message.content)
            tokens_used = len(message.content.split()) + len(response_text.split())
        else:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "system", "content": system_prompt}] + messages,
                    max_tokens=500,
                    temperature=0.7,
                )
                
                response_text = response.choices[0].message.content
                tokens_used = response.usage.total_tokens
            except Exception as e:
                logger.error(f"OpenAI API error: {str(e)}")
                response_text = _get_fallback_response(message.content)
                tokens_used = len(message.content.split()) + len(response_text.split())
        
        response_data = {
            "message": response_text,
            "sources": [],  # TODO: Implement RAG document retrieval
            "tokens_used": tokens_used,
            "model": "gpt-4",
        }
        
        return response_data
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _get_fallback_response(user_message: str) -> str:
    """Fallback responses when AI is not available"""
    fallback_responses = {
        "visa": "To apply for a visa, you typically need to: 1) Determine visa type, 2) Gather required documents, 3) Submit application, 4) Pay fees, 5) Wait for processing. Processing times vary by country and visa type.",
        "document": "Common visa documents include: passport, birth certificate, financial statements, employment letter, and proof of residence. Requirements vary by country and visa type.",
        "cost": "Visa costs vary widely by country and type, typically ranging from $50-500 USD. Check the specific country's official website for accurate fees.",
        "time": "Visa processing times typically range from 2-12 weeks depending on the country and visa type. Some expedited services may be available.",
        "default": "I'm here to help with visa application questions. Please ask about visa types, documents, costs, processing times, or other visa-related topics."
    }
    
    lower_msg = user_message.lower()
    for keyword, response in fallback_responses.items():
        if keyword in lower_msg:
            return response
    
    return fallback_responses["default"]


@app.post("/api/chat/search")
async def search_documents(query: str):
    """
    Search visa documents and knowledge base
    
    - **query**: Search query
    """
    try:
        logger.info(f"Search query: {query}")
        
        # Placeholder implementation
        # TODO: Implement actual document search with RAG
        
        return {
            "results": [],
            "query": query,
            "count": 0,
        }
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/upload")
async def upload_document(file_content: str, document_type: str):
    """
    Upload document for RAG indexing
    
    - **file_content**: Document content
    - **document_type**: Type of document (e.g., "visa_requirements")
    """
    try:
        logger.info(f"Uploading document: {document_type}")
        
        # Placeholder implementation
        # TODO: Implement document upload and RAG indexing
        
        return {
            "status": "success",
            "message": "Document uploaded successfully",
            "document_type": document_type,
        }
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    """
    Retrieve conversation history
    
    - **conversation_id**: Conversation identifier
    """
    try:
        # Placeholder implementation
        return {
            "id": conversation_id,
            "messages": [],
            "created_at": None,
        }
        
    except Exception as e:
        logger.error(f"Conversation retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STARTUP & SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Startup event"""
    logger.info("🚀 VisaBuddy AI Service started")
    logger.info(f"OpenAI API configured: {bool(os.getenv('OPENAI_API_KEY'))}")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    logger.info("🛑 VisaBuddy AI Service shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
        reload=os.getenv("NODE_ENV") == "development",
    )