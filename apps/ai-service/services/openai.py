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
        """Generate professional fallback response when API is unavailable"""
        import time
        
        # Professional fallback responses for VisaBuddy
        fallback_responses = {
            "visa": (
                "Thank you for your question about visa applications. As VisaBuddy, I specialize in helping Uzbek citizens and residents with Student and Tourist visas.\n\n"
                "**General Visa Application Steps:**\n\n"
                "1. **Determine Your Visa Type**: Choose between Student or Tourist visa based on your purpose\n"
                "2. **Select Your Destination**: Choose from supported countries (US, Canada, New Zealand, Australia, Japan, South Korea, UK, Spain, Germany, UAE)\n"
                "3. **Gather Required Documents**: Collect all necessary documents (passport, financial proof, accommodation, etc.)\n"
                "4. **Complete Application Form**: Fill out the official application accurately\n"
                "5. **Schedule Appointment**: Book an appointment at the embassy or visa center\n"
                "6. **Attend Interview**: If required, attend the visa interview\n"
                "7. **Wait for Decision**: Processing times vary by country (typically 2-12 weeks)\n\n"
                "⚠️ **Important**: For the most accurate and up-to-date information, please contact the embassy of your destination country or check their official website.\n\n"
                "Which country are you interested in? I can provide more specific guidance once I know your destination."
            ),
            "document": (
                "I can help you understand visa document requirements. As VisaBuddy, I specialize in Student and Tourist visas for Uzbek citizens.\n\n"
                "**Common Visa Documents Include:**\n\n"
                "- Valid passport (minimum 6 months validity beyond travel dates)\n"
                "- Completed visa application form\n"
                "- Passport-sized photographs (meeting country-specific requirements)\n"
                "- Proof of financial means (bank statements, sponsorship letters)\n"
                "- Proof of accommodation (hotel bookings, invitation letters)\n"
                "- Travel insurance (if required by destination country)\n"
                "- For Student Visas: University acceptance letter, academic transcripts\n"
                "- For Tourist Visas: Travel itinerary, return flight tickets\n\n"
                "⚠️ **Important**: Document requirements vary significantly by country and visa type. "
                "For accurate, up-to-date requirements, please check the official embassy website of your destination country.\n\n"
                "Which country and visa type (Student or Tourist) are you applying for? This will help me provide more specific guidance."
            ),
            "cost": (
                "Visa costs vary by destination country and visa type. As VisaBuddy, I can provide general guidance for Student and Tourist visas.\n\n"
                "**Typical Visa Fee Ranges:**\n\n"
                "- **Tourist Visas**: $20-200 USD (varies by country)\n"
                "- **Student Visas**: $50-400 USD (varies by country)\n"
                "- **Processing Fees**: Additional fees may apply (varies by country)\n\n"
                "**Supported Countries Fee Estimates:**\n"
                "- United States: Tourist $185, Student $510\n"
                "- Canada: Tourist $100 CAD, Student $150 CAD\n"
                "- Australia: Tourist $145 AUD, Student $630 AUD\n"
                "- UK: Tourist £100, Student £363\n"
                "- Germany: Tourist €75, Student €75\n"
                "- Japan: Tourist ¥3,000, Student varies\n"
                "- South Korea: Tourist $40, Student $50\n"
                "- New Zealand: Tourist $211 NZD, Student $330 NZD\n"
                "- Spain: Tourist €80, Student €60\n"
                "- UAE: Tourist varies, Student varies\n\n"
                "⚠️ **Important**: These are approximate fees and may change. Always verify current fees on the official embassy or consulate website of your destination country.\n\n"
                "Which country are you interested in? I can provide more specific cost information."
            ),
            "time": (
                "Visa processing times vary significantly by country and visa type. As VisaBuddy, I can provide general guidance.\n\n"
                "**Typical Processing Times:**\n\n"
                "- **Tourist Visas**: 5-20 business days (fastest)\n"
                "- **Student Visas**: 4-12 weeks (longer processing)\n"
                "- **Peak Seasons**: Processing may take longer during busy periods\n\n"
                "**Processing Times by Country (Approximate):**\n"
                "- United States: 2-4 weeks (Tourist), 4-8 weeks (Student)\n"
                "- Canada: 2-4 weeks (Tourist), 4-8 weeks (Student)\n"
                "- Australia: 1-3 weeks (Tourist), 4-8 weeks (Student)\n"
                "- UK: 3-6 weeks (Tourist), 3-8 weeks (Student)\n"
                "- Germany: 1-2 weeks (Tourist), 4-8 weeks (Student)\n"
                "- Japan: 5-7 business days (Tourist), 1-3 months (Student)\n"
                "- South Korea: 5-10 business days (Tourist), 2-4 weeks (Student)\n"
                "- New Zealand: 1-3 weeks (Tourist), 4-8 weeks (Student)\n"
                "- Spain: 1-2 weeks (Tourist), 1-2 months (Student)\n"
                "- UAE: 3-5 business days (Tourist), 2-4 weeks (Student)\n\n"
                "⚠️ **Important**: Processing times are estimates and can vary based on individual circumstances, application completeness, and embassy workload. "
                "Some countries offer expedited processing for additional fees.\n\n"
                "For the most accurate processing time, please check the official embassy website or contact them directly."
            ),
            "requirement": (
                "Visa requirements vary by your nationality (Uzbek citizen/resident) and destination country. As VisaBuddy, I specialize in Student and Tourist visas.\n\n"
                "**Generally Required for All Visas:**\n"
                "- Valid passport (minimum 6 months validity)\n"
                "- Completed visa application form\n"
                "- Passport photographs\n"
                "- Proof of financial means\n"
                "- Proof of accommodation\n"
                "- Return flight ticket or travel itinerary\n\n"
                "**Additional Requirements May Include:**\n"
                "- Travel health insurance\n"
                "- Employment letter or proof of employment\n"
                "- Invitation letter (if visiting family/friends)\n"
                "- Criminal background check (for some countries)\n"
                "- Medical examination (for some countries and visa types)\n\n"
                "**For Student Visas Specifically:**\n"
                "- University acceptance letter\n"
                "- Academic transcripts and certificates\n"
                "- Proof of tuition payment or scholarship\n"
                "- Language proficiency test results (if required)\n\n"
                "⚠️ **Important**: Requirements vary significantly by country and visa type. "
                "For accurate, up-to-date requirements, please check the official embassy website of your destination country or contact them directly.\n\n"
                "Which country are you interested in? I can provide more specific requirements once I know your destination."
            ),
            "application": (
                "I can guide you through the visa application process. As VisaBuddy, I help Uzbek citizens and residents with Student and Tourist visa applications.\n\n"
                "**General Visa Application Process:**\n\n"
                "1. **Research and Planning**: Determine your visa type (Student or Tourist) and destination country\n"
                "2. **Gather Documents**: Collect all required documents based on your destination country's requirements\n"
                "3. **Complete Application Form**: Fill out the official application form accurately and completely\n"
                "4. **Schedule Appointment**: Book an appointment at the embassy, consulate, or visa application center\n"
                "5. **Submit Application**: Submit your application along with all required documents and fees\n"
                "6. **Attend Interview**: If required, attend the visa interview (prepare thoroughly)\n"
                "7. **Biometric Data**: Provide fingerprints/photos if required by the destination country\n"
                "8. **Wait for Processing**: Wait for the visa decision (processing times vary)\n"
                "9. **Collect Visa**: Collect your passport with visa or receive decision notification\n\n"
                "⚠️ **Important**: Each country has unique procedures and requirements. "
                "For detailed, country-specific guidance, please visit the official embassy website or contact them directly.\n\n"
                "Which country are you applying to? I can provide more specific guidance for your destination."
            ),
            "probability": (
                "I understand you're asking about visa approval chances or probability.\n\n"
                "⚠️ **CRITICAL DISCLAIMER**: Any probability estimates or approval chances mentioned are rough estimates based on general factors and are **NOT a guarantee**. "
                "Visa decisions are made by immigration authorities based on individual circumstances, and final approval is never guaranteed. "
                "Always consult with the embassy or an immigration lawyer for accurate assessment of your specific case.\n\n"
                "**Factors That May Influence Visa Decisions:**\n"
                "- Completeness and accuracy of application\n"
                "- Financial stability and proof of funds\n"
                "- Strong ties to home country (employment, family, property)\n"
                "- Travel history and previous visa compliance\n"
                "- Purpose of visit and supporting documentation\n"
                "- Country-specific requirements and policies\n\n"
                "For a professional assessment of your specific case, I recommend:\n"
                "1. Consulting with the embassy or consulate of your destination country\n"
                "2. Seeking advice from a qualified immigration lawyer\n"
                "3. Ensuring all documents are complete and accurate\n\n"
                "I can help you prepare your application to maximize your chances, but I cannot guarantee approval."
            ),
            "default": (
                "Hello! I'm VisaBuddy, your AI visa consultant specializing in helping Uzbek citizens and residents with visa applications.\n\n"
                "**I Can Help You With:**\n\n"
                "- Student and Tourist visa information\n"
                "- Visa requirements and document lists\n"
                "- Application procedures and processes\n"
                "- Processing times and costs\n"
                "- Guidance for supported countries (US, Canada, New Zealand, Australia, Japan, South Korea, UK, Spain, Germany, UAE)\n\n"
                "**Supported Visa Types:**\n"
                "- Student Visas (academic, educational)\n"
                "- Tourist Visas (travel, short-term visits)\n\n"
                "⚠️ **Important**: For the most accurate and up-to-date information, please verify details with the official embassy website of your destination country.\n\n"
                "What specific visa question can I help you with today? Please let me know:\n"
                "- Which country you're interested in\n"
                "- Whether you need a Student or Tourist visa\n"
                "- What specific information you need"
            )
        }
        
        # Find matching response (check for multiple keywords, prioritize more specific ones)
        message_lower = user_message.lower()
        
        # Priority order: more specific keywords first
        keyword_priority = ["probability", "chance", "approval", "visa", "document", "cost", "time", "requirement", "application"]
        
        matched_keyword = None
        for keyword in keyword_priority:
            if keyword in message_lower:
                matched_keyword = keyword
                break
        
        # If no specific match, try all keywords
        if not matched_keyword:
            for keyword, response in fallback_responses.items():
                if keyword != "default" and keyword in message_lower:
                    matched_keyword = keyword
                    break
        
        # Use matched keyword or default
        response_content = fallback_responses.get(matched_keyword, fallback_responses["default"])
        
        logger.info(f"Using fallback response for keyword: {matched_keyword or 'default'}")
        return AIResponse(
            content=response_content,
            sources=[],
            tokens_used=TokenUsage(0, 0, 0),
            model=f"{self.model['name']} (fallback)",
            generation_time_ms=(time.time() - start_time) * 1000,
            finish_reason="fallback",
            error=error or "AI service temporarily unavailable",
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