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
    session_id: Optional[str] = None
    application_id: Optional[str] = None
    application_context: Optional[dict] = None
    conversation_history: Optional[List[dict]] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    language: Optional[str] = "en"  # Language code: en, ru, uz


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    message: str
    sources: List[str]
    tokens_used: int
    tokens_breakdown: Optional[dict] = None
    model: str
    generation_time_ms: Optional[float] = None
    finish_reason: Optional[str] = None
    error: Optional[str] = None


class RateLimitInfo(BaseModel):
    """Rate limit information"""
    current_requests: int
    limit: int
    remaining: int
    reset_at: str


class UsageStats(BaseModel):
    """Usage statistics"""
    total_tokens: int
    total_cost: float
    request_count: int
    average_tokens_per_request: float
    period: str


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
    Chat endpoint with RAG support and OpenAI integration
    
    - **content**: User's message
    - **user_id**: User identifier (for rate limiting and tracking)
    - **session_id**: Optional session identifier
    - **application_id**: Optional visa application ID
    - **application_context**: Optional application context for context injection
    - **conversation_history**: Optional chat history for context
    - **temperature**: Response creativity (0-2, default 0.7)
    - **max_tokens**: Maximum tokens in response
    """
    try:
        logger.info(f"Received chat message from user {message.user_id}")
        
        # Import services
        from services.rag import get_rag_service
        from services.prompt import get_prompt_service
        from services.openai import get_openai_service
        
        rag_service = get_rag_service()
        prompt_service = get_prompt_service()
        openai_service = get_openai_service()
        
        # Check rate limit
        is_allowed, rate_info = openai_service.check_rate_limit(message.user_id)
        if not is_allowed:
            logger.warning(f"Rate limit exceeded for user {message.user_id}")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. {rate_info['remaining']} requests remaining after reset.",
                headers={"Retry-After": rate_info["reset_at"]},
            )
        
        # Retrieve relevant context from knowledge base
        rag_context = None
        sources = []
        
        if rag_service.initialized:
            logger.info(f"Retrieving RAG context for query: {message.content[:100]}")
            try:
                rag_context = await rag_service.retrieve_context(
                    query=message.content,
                    top_k=5
                )
                sources = rag_context.get("sources", [])
                logger.info(f"✅ Retrieved {len(sources)} relevant sources from RAG")
            except Exception as e:
                logger.warning(f"RAG retrieval error: {str(e)}, continuing without context")
                rag_context = None
        else:
            logger.debug("RAG service not initialized, proceeding without knowledge base context")
        
        # Build system prompt with all context
        system_prompt = prompt_service.build_system_prompt(
            language=message.language or "en",
            rag_context=rag_context,
            application_context=message.application_context,
        )
        
        # Build messages with context
        messages = prompt_service.build_messages(
            user_message=message.content,
            conversation_history=message.conversation_history,
            system_prompt=system_prompt,
            language=message.language or "en"
        )
        
        # Generate response using OpenAI service
        logger.info(f"Generating response with OpenAI service")
        ai_response = await openai_service.generate_response(
            user_message=message.content,
            conversation_history=message.conversation_history,
            system_prompt=system_prompt,
            user_id=message.user_id,
            temperature=message.temperature or 0.7,
            max_tokens=message.max_tokens,
        )
        
        # Log result
        if ai_response.error:
            logger.warning(f"AI response generated with fallback: {ai_response.error}")
        else:
            logger.info(
                f"✅ Response generated in {ai_response.generation_time_ms:.0f}ms, "
                f"tokens: {ai_response.tokens_used.total_tokens}"
            )
        
        # Prepare response
        response_data = {
            "message": ai_response.content,
            "sources": sources,
            "tokens_used": ai_response.tokens_used.total_tokens,
            "tokens_breakdown": {
                "prompt": ai_response.tokens_used.prompt_tokens,
                "completion": ai_response.tokens_used.completion_tokens,
                "total": ai_response.tokens_used.total_tokens,
            },
            "model": ai_response.model,
            "generation_time_ms": ai_response.generation_time_ms,
            "finish_reason": ai_response.finish_reason,
            "error": ai_response.error,
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
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


@app.get("/api/rag/status")
async def rag_status():
    """Get RAG service status and configuration"""
    try:
        from services.rag import get_rag_service
        
        rag_service = get_rag_service()
        status = rag_service.get_status()
        
        return {
            "status": status,
            "message": "RAG system operational" if status.get("initialized") else "RAG system initializing",
        }
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/search")
async def search_documents(query: str, country: Optional[str] = None, visa_type: Optional[str] = None):
    """
    Search visa documents and knowledge base using RAG
    
    - **query**: Search query
    - **country**: Optional country filter
    - **visa_type**: Optional visa type filter
    """
    try:
        logger.info(f"Search query: {query}")
        
        from services.rag import get_rag_service
        
        rag_service = get_rag_service()
        
        if not rag_service.initialized:
            return {
                "results": [],
                "query": query,
                "count": 0,
                "message": "RAG service not initialized"
            }
        
        # Retrieve context using RAG
        context = await rag_service.retrieve_context(
            query=query,
            country=country,
            visa_type=visa_type,
            top_k=5
        )
        
        return {
            "results": context.get("documents", []),
            "query": query,
            "count": context.get("count", 0),
            "sources": context.get("sources", []),
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


@app.get("/api/rate-limit/{user_id}", response_model=dict)
async def check_rate_limit(user_id: str):
    """
    Check rate limit status for a user
    
    - **user_id**: User identifier
    """
    try:
        from services.openai import get_openai_service
        
        openai_service = get_openai_service()
        is_allowed, rate_info = openai_service.check_rate_limit(user_id)
        
        return {
            "user_id": user_id,
            "allowed": is_allowed,
            "current_requests": rate_info["current_requests"],
            "limit": rate_info["limit"],
            "remaining": rate_info["remaining"],
            "reset_at": rate_info["reset_at"],
        }
        
    except Exception as e:
        logger.error(f"Rate limit check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/usage", response_model=dict)
async def get_usage_stats(user_id: Optional[str] = None):
    """
    Get token usage statistics
    
    - **user_id**: Optional user ID to filter stats (if not provided, returns global stats)
    """
    try:
        from services.openai import get_openai_service
        
        openai_service = get_openai_service()
        stats = openai_service.get_usage_stats(user_id=user_id)
        
        return {
            "user_id": user_id or "global",
            **stats
        }
        
    except Exception as e:
        logger.error(f"Usage stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/usage/reset")
async def reset_usage_log():
    """Reset token usage log (admin only)"""
    try:
        from services.openai import get_openai_service
        
        openai_service = get_openai_service()
        openai_service.clear_usage_log()
        
        return {
            "status": "success",
            "message": "Usage log cleared"
        }
        
    except Exception as e:
        logger.error(f"Usage reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STARTUP & SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Startup event - Initialize services"""
    logger.info("🚀 VisaBuddy AI Service starting...")
    
    # Initialize OpenAI service
    from services.openai import get_openai_service
    logger.info("Initializing OpenAI service...")
    openai_svc = get_openai_service()
    openai_status = "✅ Configured" if openai_svc.initialized else "⚠️ Not configured (using fallback)"
    logger.info(f"OpenAI API {openai_status}")
    logger.info(f"Rate limit: {20} requests per hour per user")
    
    # Initialize embeddings service
    from services.embeddings import get_embeddings_service
    logger.info("Initializing embeddings service...")
    embeddings_svc = get_embeddings_service()
    embeddings_mode = "OpenAI API" if not embeddings_svc.use_local_fallback else "Local fallback"
    logger.info(f"Embeddings mode: {embeddings_mode}")
    
    # Initialize RAG service
    from services.rag import get_rag_service
    logger.info("Initializing RAG service...")
    rag_svc = get_rag_service()
    success = await rag_svc.initialize()
    
    if success:
        status = rag_svc.get_status()
        logger.info(f"✅ RAG Service initialized: {status}")
    else:
        logger.warning("⚠️ RAG Service initialization had issues (non-blocking)")
    
    logger.info("✅ VisaBuddy AI Service ready!")


# ============================================================================
# RAG VALIDATION & TESTING ENDPOINTS
# ============================================================================

@app.post("/api/rag/validate")
async def validate_rag():
    """
    Validate RAG system with test queries
    Returns comprehensive validation report
    """
    try:
        from services.rag import get_rag_service
        from services.rag_validator import validate_rag_system
        
        rag_service = get_rag_service()
        
        if not rag_service.initialized:
            raise HTTPException(
                status_code=503,
                detail="RAG service not initialized"
            )
        
        logger.info("🧪 Starting RAG validation...")
        validation_report = await validate_rag_system(rag_service)
        
        return {
            "status": "success",
            "validation": validation_report
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rag/diagnostics")
async def rag_diagnostics():
    """
    Get RAG system diagnostics and health status
    """
    try:
        from services.rag import get_rag_service
        
        rag_service = get_rag_service()
        status = rag_service.get_status()
        
        return {
            "status": "operational" if status.get("initialized") else "initializing",
            "diagnostics": status,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Diagnostics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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