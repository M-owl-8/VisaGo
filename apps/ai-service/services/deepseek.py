"""
DeepSeek Service (via Together.ai)
Handles AI response generation with DeepSeek-R1 for chat completions using Together.ai as the provider
"""

import os
import logging
import time
import httpx
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from services.openai import AIResponse, TokenUsage

logger = logging.getLogger(__name__)

TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"


async def generate_chat_response(
    user_message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> AIResponse:
    """
    Generate AI response using DeepSeek-R1 via Together.ai API
    
    Args:
        user_message: User's message
        conversation_history: Previous messages in conversation
        system_prompt: System prompt to use
        temperature: Temperature for response diversity (0-2)
        max_tokens: Maximum tokens in response
        
    Returns:
        AIResponse object compatible with OpenAI service response format
    """
    start_time = time.time()
    
    # Check if API key is configured
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        error_msg = "DEEPSEEK_API_KEY not configured in environment variables"
        logger.error(error_msg)
        return AIResponse(
            content="AI service is temporarily unavailable. Please try again later.",
            sources=[],
            tokens_used=TokenUsage(0, 0, 0),
            model="deepseek-ai/DeepSeek-R1",
            generation_time_ms=(time.time() - start_time) * 1000,
            finish_reason="error",
            error=error_msg,
        )
    
    try:
        # Build messages array (same format as OpenAI)
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": user_message})
        
        # Set max tokens (DeepSeek-R1 supports up to 8192 tokens)
        if max_tokens is None:
            max_tokens = 2048
        else:
            max_tokens = min(max_tokens, 8192)
        
        # Prepare request payload
        payload = {
            "model": "deepseek-ai/DeepSeek-R1",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        
        # Call Together.ai API (hosting DeepSeek-R1)
        logger.info("Generating response with DeepSeek (Together) service")
        logger.info("Calling Together API with model deepseek-ai/DeepSeek-R1")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                TOGETHER_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        
        # Extract response
        content = data["choices"][0]["message"]["content"]
        finish_reason = data["choices"][0].get("finish_reason", "stop")
        
        # Extract token usage if available
        usage = data.get("usage", {})
        token_usage = TokenUsage(
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        )
        
        generation_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"✅ Generated response in {generation_time:.0f}ms, "
            f"tokens: {token_usage.total_tokens}"
        )
        
        return AIResponse(
            content=content,
            sources=[],  # DeepSeek doesn't provide sources, RAG sources are handled separately
            tokens_used=token_usage,
            model="deepseek-ai/DeepSeek-R1",
            generation_time_ms=generation_time,
            finish_reason=finish_reason,
            error=None,
        )
        
    except httpx.HTTPStatusError as e:
        error_msg = f"Together.ai API error: {e.response.status_code} - {e.response.text}"
        logger.error(error_msg)
        return AIResponse(
            content="AI service encountered an error. Please try again later.",
            sources=[],
            tokens_used=TokenUsage(0, 0, 0),
            model="deepseek-ai/DeepSeek-R1",
            generation_time_ms=(time.time() - start_time) * 1000,
            finish_reason="error",
            error=error_msg,
        )
    except Exception as e:
        error_msg = f"DeepSeek/Together service error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return AIResponse(
            content="AI service is temporarily unavailable. Please try again later.",
            sources=[],
            tokens_used=TokenUsage(0, 0, 0),
            model="deepseek-ai/DeepSeek-R1",
            generation_time_ms=(time.time() - start_time) * 1000,
            finish_reason="error",
            error=error_msg,
        )

