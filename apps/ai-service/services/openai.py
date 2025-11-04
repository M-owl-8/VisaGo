"""
OpenAI Service
Handles AI response generation with GPT-4, error handling, and token tracking
"""

import os
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import asyncio
import json
from dataclasses import dataclass, asdict
from functools import lru_cache

logger = logging.getLogger(__name__)


@dataclass
class TokenUsage:
    """Token usage statistics"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    
    @property
    def cost_estimate(self) -> float:
        """Estimate API cost (approximate)"""
        # GPT-4 pricing (as of 2024): $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
        prompt_cost = (self.prompt_tokens / 1000) * 0.03
        completion_cost = (self.completion_tokens / 1000) * 0.06
        return prompt_cost + completion_cost


@dataclass
class AIResponse:
    """AI service response"""
    content: str
    sources: List[str]
    tokens_used: TokenUsage
    model: str
    generation_time_ms: float
    finish_reason: str = "stop"
    error: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "message": self.content,
            "sources": self.sources,
            "tokens_used": self.tokens_used.total_tokens,
            "model": self.model,
            "generation_time_ms": self.generation_time_ms,
            "finish_reason": self.finish_reason,
            "error": self.error,
        }


class RateLimiter:
    """Token bucket rate limiter"""
    
    def __init__(self, requests_per_hour: int = 20):
        """
        Initialize rate limiter
        
        Args:
            requests_per_hour: Maximum requests per hour per user
        """
        self.requests_per_hour = requests_per_hour
        self.request_history: Dict[str, List[datetime]] = {}
    
    def is_allowed(self, user_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if user is allowed to make a request
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        now = datetime.utcnow()
        cutoff_time = now - timedelta(hours=1)
        
        # Initialize or clean history
        if user_id not in self.request_history:
            self.request_history[user_id] = []
        
        # Remove old requests
        self.request_history[user_id] = [
            req_time for req_time in self.request_history[user_id]
            if req_time > cutoff_time
        ]
        
        # Check limit
        current_requests = len(self.request_history[user_id])
        is_allowed = current_requests < self.requests_per_hour
        
        rate_info = {
            "current_requests": current_requests,
            "limit": self.requests_per_hour,
            "remaining": max(0, self.requests_per_hour - current_requests),
            "reset_at": (now + timedelta(hours=1)).isoformat(),
        }
        
        if is_allowed:
            self.request_history[user_id].append(now)
        
        return is_allowed, rate_info


class OpenAIService:
    """Service for generating AI responses using OpenAI API"""
    
    # Model configurations
    MODELS = {
        "gpt-4": {
            "name": "gpt-4",
            "context_window": 8192,
            "max_tokens": 2048,
        },
        "gpt-4-turbo": {
            "name": "gpt-4-turbo-preview",
            "context_window": 128000,
            "max_tokens": 4096,
        },
        "gpt-3.5-turbo": {
            "name": "gpt-3.5-turbo",
            "context_window": 4096,
            "max_tokens": 2048,
        },
    }
    
    def __init__(self, model: str = "gpt-4", rate_limit_per_hour: int = 20):
        """
        Initialize OpenAI service
        
        Args:
            model: Model to use (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
            rate_limit_per_hour: Requests per hour per user
        """
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = self.MODELS.get(model, self.MODELS["gpt-4"])
        self.rate_limiter = RateLimiter(requests_per_hour=rate_limit_per_hour)
        self.initialized = bool(self.api_key)
        self.token_usage_log: List[Dict] = []
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured. AI service will use fallback responses.")
        else:
            logger.info(f"OpenAI service initialized with model: {model}")
    
    def check_rate_limit(self, user_id: str) -> Tuple[bool, Dict]:
        """
        Check if user has remaining requests
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        return self.rate_limiter.is_allowed(user_id)
    
    async def generate_response(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        user_id: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AIResponse:
        """
        Generate AI response using OpenAI API
        
        Args:
            user_message: User's message
            conversation_history: Previous messages in conversation
            system_prompt: System prompt to use
            user_id: User identifier for rate limiting
            temperature: Temperature for response diversity (0-2)
            max_tokens: Maximum tokens in response
            
        Returns:
            AIResponse object
        """
        import time
        start_time = time.time()
        
        try:
            # Check rate limit
            if user_id:
                is_allowed, rate_info = self.check_rate_limit(user_id)
                if not is_allowed:
                    return AIResponse(
                        content="Rate limit exceeded. Please try again later.",
                        sources=[],
                        tokens_used=TokenUsage(0, 0, 0),
                        model=self.model["name"],
                        generation_time_ms=(time.time() - start_time) * 1000,
                        error=f"Rate limit: {rate_info['current_requests']}/{rate_info['limit']} requests used",
                    )
            
            # Check if API is configured
            if not self.initialized:
                logger.warning("OpenAI API not configured. Using fallback response.")
                return self._generate_fallback_response(user_message, start_time)
            
            # Import OpenAI client
            from openai import OpenAI
            
            client = OpenAI(api_key=self.api_key)
            
            # Build messages
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            if conversation_history:
                messages.extend(conversation_history)
            
            messages.append({"role": "user", "content": user_message})
            
            # Set max tokens
            if max_tokens is None:
                max_tokens = self.model["max_tokens"]
            else:
                max_tokens = min(max_tokens, self.model["max_tokens"])
            
            # Call OpenAI API
            logger.info(f"Calling OpenAI API with model {self.model['name']}")
            
            response = client.chat.completions.create(
                model=self.model["name"],
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.95,
            )
            
            # Extract response
            content = response.choices[0].message.content
            finish_reason = response.choices[0].finish_reason
            
            # Track token usage
            token_usage = TokenUsage(
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens,
            )
            
            # Log token usage
            self._log_token_usage(
                user_id=user_id,
                model=self.model["name"],
                tokens=token_usage,
            )
            
            generation_time = (time.time() - start_time) * 1000
            
            logger.info(
                f"✅ Generated response in {generation_time:.0f}ms, "
                f"tokens: {token_usage.total_tokens} "
                f"(cost: ${token_usage.cost_estimate:.4f})"
            )
            
            return AIResponse(
                content=content,
                sources=[],
                tokens_used=token_usage,
                model=self.model["name"],
                generation_time_ms=generation_time,
                finish_reason=finish_reason,
            )
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return self._generate_fallback_response(user_message, start_time, error=str(e))
    
    def _generate_fallback_response(
        self,
        user_message: str,
        start_time: float,
        error: Optional[str] = None,
    ) -> AIResponse:
        """Generate fallback response when API is unavailable"""
        import time
        
        fallback_responses = {
            "visa": (
                "To apply for a visa, follow these general steps:\n\n"
                "1. **Determine Your Visa Type**: Choose the appropriate visa category (tourist, work, student, etc.)\n"
                "2. **Gather Documents**: Collect required documents (passport, financial proof, accommodation, etc.)\n"
                "3. **Complete Application**: Fill out official application forms\n"
                "4. **Schedule Appointment**: Book an appointment at the embassy or visa center\n"
                "5. **Attend Interview**: If required, attend a visa interview\n"
                "6. **Wait for Decision**: Processing times vary (2-12 weeks typically)\n\n"
                "Please specify which country you're interested in for more detailed guidance."
            ),
            "document": (
                "Common visa documents typically include:\n\n"
                "- Valid passport (6+ months validity)\n"
                "- Completed application form\n"
                "- Passport-sized photos\n"
                "- Proof of financial means\n"
                "- Proof of accommodation\n"
                "- Travel insurance (if required)\n"
                "- Employment letter (for work visas)\n"
                "- University acceptance (for student visas)\n\n"
                "Requirements vary significantly by country and visa type. Which country are you applying to?"
            ),
            "cost": (
                "Visa costs vary significantly by country and type:\n\n"
                "- **Tourist Visas**: $20-150 USD\n"
                "- **Work Visas**: $100-500+ USD\n"
                "- **Student Visas**: $50-300 USD\n"
                "- **Residence Permits**: $200-1000+ USD\n\n"
                "Costs may include application fees, visa fees, and processing fees. "
                "Which country interests you?"
            ),
            "time": (
                "Visa processing times vary by country and type:\n\n"
                "- **Tourist Visas**: 5-15 business days (fastest)\n"
                "- **Standard Processing**: 2-4 weeks\n"
                "- **Work/Student Visas**: 4-8 weeks\n"
                "- **Complex Cases**: 8-12 weeks+\n\n"
                "Some countries offer expedited processing for additional fees. "
                "Which country's visa are you applying for?"
            ),
            "requirement": (
                "Visa requirements vary by your nationality and destination country.\n\n"
                "**Generally Required**:\n"
                "- Valid passport\n"
                "- Proof of funds\n"
                "- Return ticket\n"
                "- Accommodation proof\n\n"
                "**May Be Required**:\n"
                "- Employment letter\n"
                "- Invitation letter\n"
                "- Health insurance\n"
                "- Criminal background check\n\n"
                "Please tell me which country you're interested in visiting."
            ),
            "application": (
                "The visa application process generally involves:\n\n"
                "1. Research visa types for your destination\n"
                "2. Prepare required documents\n"
                "3. Complete application form accurately\n"
                "4. Schedule appointment (online or in-person)\n"
                "5. Submit application and fees\n"
                "6. Attend interview if required\n"
                "7. Wait for processing\n"
                "8. Collect visa or receive decision\n\n"
                "Each country has unique procedures. What's your destination?"
            ),
            "default": (
                "I'm VisaBuddy's AI assistant, here to help with visa application questions!\n\n"
                "I can help you with:\n"
                "- Visa types and requirements\n"
                "- Application procedures\n"
                "- Required documents\n"
                "- Processing times and costs\n"
                "- General immigration guidance\n\n"
                "What would you like to know about visa applications?"
            )
        }
        
        # Find matching response
        message_lower = user_message.lower()
        for keyword, response in fallback_responses.items():
            if keyword in message_lower:
                logger.info(f"Using fallback response for keyword: {keyword}")
                return AIResponse(
                    content=response,
                    sources=[],
                    tokens_used=TokenUsage(0, 0, 0),
                    model=f"{self.model['name']} (fallback)",
                    generation_time_ms=(time.time() - start_time) * 1000,
                    finish_reason="fallback",
                    error=error,
                )
        
        return AIResponse(
            content=fallback_responses["default"],
            sources=[],
            tokens_used=TokenUsage(0, 0, 0),
            model=f"{self.model['name']} (fallback)",
            generation_time_ms=(time.time() - start_time) * 1000,
            finish_reason="fallback",
            error=error,
        )
    
    def _log_token_usage(
        self,
        user_id: Optional[str],
        model: str,
        tokens: TokenUsage,
    ):
        """Log token usage for monitoring and billing"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "model": model,
            "prompt_tokens": tokens.prompt_tokens,
            "completion_tokens": tokens.completion_tokens,
            "total_tokens": tokens.total_tokens,
            "estimated_cost": tokens.cost_estimate,
        }
        
        self.token_usage_log.append(log_entry)
        
        # Keep only last 1000 entries in memory
        if len(self.token_usage_log) > 1000:
            self.token_usage_log = self.token_usage_log[-1000:]
        
        logger.debug(f"Token usage logged: {log_entry}")
    
    def get_usage_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get token usage statistics
        
        Args:
            user_id: Optional user ID to filter stats
            
        Returns:
            Dictionary with usage statistics
        """
        logs = self.token_usage_log
        
        if user_id:
            logs = [log for log in logs if log.get("user_id") == user_id]
        
        if not logs:
            return {
                "total_tokens": 0,
                "total_cost": 0.0,
                "request_count": 0,
                "average_tokens_per_request": 0,
            }
        
        total_tokens = sum(log["total_tokens"] for log in logs)
        total_cost = sum(log["estimated_cost"] for log in logs)
        
        return {
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "request_count": len(logs),
            "average_tokens_per_request": round(total_tokens / len(logs), 0),
            "period": "since_startup",
        }
    
    def clear_usage_log(self):
        """Clear token usage log"""
        self.token_usage_log = []
        logger.info("Token usage log cleared")


# Global instance
_openai_service = None


def get_openai_service(model: str = "gpt-4") -> OpenAIService:
    """Get or create OpenAI service instance"""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService(model=model)
    return _openai_service