"""
Visa Probability Generation Service
Generates personalized visa probability estimates using AIUserContext.riskScore, RAG, and AI
"""

import os
import logging
import json
from typing import Dict, Any, Optional
import httpx
from services.rag import get_rag_service
from services.prompt import get_prompt_service
from services.openai import get_openai_service

logger = logging.getLogger(__name__)

# Backend URL for fetching AIUserContext
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")


def get_backend_url() -> str:
    """Get backend URL from environment or default"""
    return os.getenv("BACKEND_URL", "http://localhost:3000")


async def fetch_ai_user_context(
    application_id: str,
    auth_token: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Fetch AIUserContext from backend internal endpoint
    
    Args:
        application_id: Application ID
        auth_token: Optional JWT token for authentication
        
    Returns:
        AIUserContext dict or None if fetch fails
    """
    try:
        backend_url = get_backend_url()
        url = f"{backend_url}/internal/ai-context/{application_id}"
        
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    logger.info(f"✅ Fetched AIUserContext for application {application_id}")
                    return data["data"]
                else:
                    logger.warning(f"Backend returned unsuccessful response: {data}")
                    return None
            else:
                logger.error(f"Failed to fetch AIUserContext: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching AIUserContext: {str(e)}", exc_info=True)
        return None


async def generate_visa_probability(
    application_id: str,
    auth_token: Optional[str] = None,
    mock_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate visa probability estimate using AIUserContext.riskScore + RAG + AI
    
    Args:
        application_id: Application ID
        auth_token: Optional JWT token for authentication
        mock_context: Optional mock AIUserContext for testing (bypasses backend fetch)
        
    Returns:
        Dictionary with probability data in the format:
        {
            "type": "probability",
            "visaType": "...",
            "country": "...",
            "probability": {
                "percent": 62,
                "level": "medium",
                "warning": "..."
            },
            "mainRisks": [...],
            "positiveFactors": [...],
            "improvementTips": [...]
        }
    """
    try:
        logger.info(f"Generating visa probability for application {application_id}")
        
        # Step 1: Fetch AIUserContext from backend (or use mock for testing)
        if mock_context:
            logger.info("Using mock AIUserContext for testing")
            context = mock_context
        else:
            context = await fetch_ai_user_context(application_id, auth_token)
            if not context:
                raise ValueError("Failed to fetch AIUserContext from backend")
        
        # Step 2: Extract key information from context
        questionnaire_summary = context.get("questionnaireSummary")
        application = context.get("application", {})
        user_profile = context.get("userProfile", {})
        risk_score = context.get("riskScore")
        
        country = application.get("country", "US")
        visa_type = application.get("visaType", "tourist")
        app_language = user_profile.get("appLanguage", "en")
        
        logger.info(f"Extracted context: country={country}, visaType={visa_type}, language={app_language}, hasRiskScore={!!risk_score}")
        
        # Step 3: Run RAG search for country + visaType
        rag_service = get_rag_service()
        rag_context = None
        
        if rag_service.initialized:
            # Build query for RAG search
            rag_query = f"{country} {visa_type} visa approval probability factors requirements"
            logger.info(f"Running RAG search: {rag_query}")
            
            try:
                rag_context = await rag_service.retrieve_context(
                    query=rag_query,
                    country=country,
                    visa_type=visa_type,
                    top_k=10  # Get relevant documents
                )
                logger.info(f"✅ Retrieved {len(rag_context.get('documents', []))} RAG documents")
            except Exception as e:
                logger.warning(f"RAG retrieval error: {str(e)}, continuing without RAG context")
                rag_context = None
        else:
            logger.warning("RAG service not initialized, proceeding without RAG context")
        
        # Step 4: Build user message with context and RAG
        user_message = build_probability_prompt(
            ai_user_context=context,
            rag_context=rag_context,
            app_language=app_language
        )
        
        # Step 5: Build system prompt
        prompt_service = get_prompt_service()
        system_prompt = prompt_service.build_system_prompt(
            language=app_language,
            rag_context=rag_context,
            user_profile=user_profile,
            application_context=application,
        )
        
        # Step 6: Generate response using OpenAI service
        openai_service = get_openai_service()
        ai_response = await openai_service.generate_response(
            user_message=user_message,
            system_prompt=system_prompt,
            user_id=user_profile.get("userId", "unknown"),
            temperature=0.5, # Lower temperature for factual probability generation
            max_tokens=1200, # Allow enough tokens for detailed response
        )
        
        if ai_response.error:
            logger.error(f"AI generation error: {ai_response.error}")
            # Fallback to a basic probability if AI fails
            return get_fallback_probability(country, visa_type, app_language, risk_score, ai_response.error)
        
        # Step 7: Parse model output as JSON
        probability_data = parse_probability_response(ai_response.content, country, visa_type, app_language, risk_score)
        
        logger.info(f"Generated probability for {country} {visa_type} in {app_language}")
        return probability_data
        
    except Exception as e:
        logger.error(f"Error in generate_visa_probability: {str(e)}", exc_info=True)
        # Return a generic fallback probability on unexpected errors
        return get_fallback_probability("US", "tourist", "en", None, str(e))


def build_probability_prompt(
    ai_user_context: Dict[str, Any],
    rag_context: Optional[Dict[str, Any]],
    app_language: str
) -> str:
    """
    Build the user message prompt for probability generation
    """
    # Format RAG context
    rag_text = ""
    if rag_context and rag_context.get("documents"):
        rag_text = "\n\n".join([
            f"**Source: {doc.get('source', 'Unknown')}**\n{doc.get('content', '')}"
            for doc in rag_context["documents"][:10]  # Limit to top 10
        ])
    else:
        rag_text = "No specific visa policy documents found in knowledge base."
    
    # Extract risk score info
    risk_score = ai_user_context.get("riskScore", {})
    base_percent = risk_score.get("probabilityPercent", 70)
    base_level = risk_score.get("level", "medium")
    risk_factors = risk_score.get("riskFactors", [])
    positive_factors = risk_score.get("positiveFactors", [])
    
    # Build prompt based on language
    if app_language == "uz":
        prompt = f"""Siz VisaBuddy'siz. Quyidagi JSON konteksti va siyosat ma'lumotlaridan foydalanib, bu foydalanuvchi uchun viza olish ehtimolini hisoblang va tahlil qiling.

FOYDALANUVCHI KONTEKSTI (JSON):
```json
{json.dumps(ai_user_context, indent=2, ensure_ascii=False)}
```

RELEVANT VIZA QOIDALARI:
{rag_text}

VAZIFA:

1. **Asosiy ball**: riskScore.probabilityPercent ({base_percent}%) va riskScore.level ({base_level}) dan foydalaning.
2. **Ehtimolni hisoblang**: RAG ma'lumotlari va kontekstni hisobga olgan holda, asosiy balldan boshlab, lekin 0% yoki 100% ga bormang.
3. **Asosiy xavflar**: riskScore.riskFactors va boshqa omillarni tahlil qiling.
4. **Ijobiy omillar**: riskScore.positiveFactors va boshqa kuchli tomonlarni ro'yxatga oling.
5. **Yaxshilash maslahatlari**: Ehtimolni oshirish uchun amaliy maslahatlar bering.

**MUHIM**: 
- Ogohlantirish matnini yoki shunga o'xshash narsani har doim qoldiring.
- Javob foydalanuvchining ilova tilida bo'lishi kerak: O'zbek tili (Lotin yozuvi).
- Chiqish JSON formatida bo'lishi kerak va quyidagi shablonga mos kelishi kerak:

```json
{{
  "type": "probability",
  "visaType": "...",
  "country": "...",
  "probability": {{
    "percent": 62,
    "level": "medium",
    "warning": "Bu faqat sizning javoblaringiz va odatiy naqshlarga asoslangan taxmin. Bu KAFOLAT EMAS. Faqat elchixona yakuniy qaror qabul qiladi."
  }},
  "mainRisks": ["..."],
  "positiveFactors": ["..."],
  "improvementTips": ["..."]
}}
```"""
    
    elif app_language == "ru":
        prompt = f"""Вы - VisaBuddy. Используйте JSON-контекст и извлечения политики ниже, чтобы рассчитать и проанализировать вероятность получения визы для этого пользователя.

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (JSON):
```json
{json.dumps(ai_user_context, indent=2, ensure_ascii=False)}
```

РЕЛЕВАНТНЫЕ ВИЗОВЫЕ ПРАВИЛА:
{rag_text}

ЗАДАЧА:

1. **Базовый балл**: Используйте riskScore.probabilityPercent ({base_percent}%) и riskScore.level ({base_level}) как основу.
2. **Рассчитайте вероятность**: Начните с базового балла, учитывая информацию RAG и контекст, но НЕ переходите к 0% или 100%.
3. **Основные риски**: Проанализируйте riskScore.riskFactors и другие факторы.
4. **Положительные факторы**: Перечислите riskScore.positiveFactors и другие сильные стороны.
5. **Советы по улучшению**: Предоставьте практические советы для повышения вероятности.

**ВАЖНО**: 
- ВСЕГДА сохраняйте текст предупреждения или что-то очень похожее.
- Ответ должен быть на языке приложения пользователя: Русский.
- Вывод ДОЛЖЕН быть в формате JSON и соответствовать шаблону:

```json
{{
  "type": "probability",
  "visaType": "...",
  "country": "...",
  "probability": {{
    "percent": 62,
    "level": "medium",
    "warning": "Это только оценка на основе ваших ответов и типичных паттернов. Это НЕ гарантия. Только посольство может принять окончательное решение."
  }},
  "mainRisks": ["..."],
  "positiveFactors": ["..."],
  "improvementTips": ["..."]
}}
```"""
    
    else:  # English
        prompt = f"""You are VisaBuddy. Use the JSON context and policy extracts below to calculate and analyze the visa approval probability for this user.

USER CONTEXT (JSON):
```json
{json.dumps(ai_user_context, indent=2, ensure_ascii=False)}
```

RELEVANT VISA RULES:
{rag_text}

TASK:

1. **Base Score**: Use riskScore.probabilityPercent ({base_percent}%) and riskScore.level ({base_level}) as the base.
2. **Calculate Probability**: Start from the base score, considering RAG information and context, but do NOT go to 0% or 100%.
3. **Main Risks**: Analyze riskScore.riskFactors and other factors.
4. **Positive Factors**: List riskScore.positiveFactors and other strengths.
5. **Improvement Tips**: Provide practical tips to increase probability.

**IMPORTANT**: 
- ALWAYS keep the warning text or something very similar.
- Response must be in the user's app language: English.
- Output MUST be in JSON format and match this template:

```json
{{
  "type": "probability",
  "visaType": "...",
  "country": "...",
  "probability": {{
    "percent": 62,
    "level": "medium",
    "warning": "This is only an estimate based on your answers and typical patterns. It is NOT a guarantee. Only the embassy can make the final decision."
  }},
  "mainRisks": ["..."],
  "positiveFactors": ["..."],
  "improvementTips": ["..."]
}}
```"""
    
    return prompt


def parse_probability_response(
    ai_response: str,
    country: str,
    visa_type: str,
    app_language: str,
    risk_score: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Parse AI response and extract JSON probability data
    
    Args:
        ai_response: Raw AI response text
        country: Country code
        visa_type: Visa type
        app_language: App language
        risk_score: Optional risk score from context
        
    Returns:
        Parsed probability dictionary
    """
    try:
        # Try to extract JSON from response
        # AI might wrap JSON in markdown code blocks or add extra text
        response_text = ai_response.strip()
        
        # Try to find JSON in code blocks
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end > start:
                response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end > start:
                response_text = response_text[start:end].strip()
        
        # Try to find JSON object
        if "{" in response_text and "}" in response_text:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            response_text = response_text[start:end]
        
        # Parse JSON
        parsed = json.loads(response_text)
        
        # Validate structure
        if parsed.get("type") != "probability":
            raise ValueError("Response type is not 'probability'")
        
        # Ensure required fields
        if "probability" not in parsed:
            parsed["probability"] = {}
        
        # Clamp percent to valid range (10-90)
        if "percent" in parsed["probability"]:
            percent = parsed["probability"]["percent"]
            if percent < 10:
                percent = 10
            elif percent > 90:
                percent = 90
            parsed["probability"]["percent"] = percent
        
        # Ensure warning exists
        if "warning" not in parsed["probability"]:
            if app_language == "uz":
                parsed["probability"]["warning"] = "Bu faqat sizning javoblaringiz va odatiy naqshlarga asoslangan taxmin. Bu KAFOLAT EMAS. Faqat elchixona yakuniy qaror qabul qiladi."
            elif app_language == "ru":
                parsed["probability"]["warning"] = "Это только оценка на основе ваших ответов и типичных паттернов. Это НЕ гарантия. Только посольство может принять окончательное решение."
            else:
                parsed["probability"]["warning"] = "This is only an estimate based on your answers and typical patterns. It is NOT a guarantee. Only the embassy can make the final decision."
        
        # Ensure arrays exist
        if "mainRisks" not in parsed:
            parsed["mainRisks"] = []
        if "positiveFactors" not in parsed:
            parsed["positiveFactors"] = []
        if "improvementTips" not in parsed:
            parsed["improvementTips"] = []
        
        # Ensure country and visaType match
        parsed["country"] = country
        parsed["visaType"] = visa_type
        
        return parsed
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse probability JSON: {str(e)}")
        logger.debug(f"Response text: {ai_response[:500]}")
        # Return fallback
        return get_fallback_probability(country, visa_type, app_language, risk_score, f"JSON parse error: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing probability response: {str(e)}")
        return get_fallback_probability(country, visa_type, app_language, risk_score, str(e))


def get_fallback_probability(
    country: str,
    visa_type: str,
    app_language: str,
    risk_score: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get fallback probability response when AI generation fails
    
    Args:
        country: Country code
        visa_type: Visa type
        app_language: App language
        risk_score: Optional risk score from context
        error: Optional error message
        
    Returns:
        Fallback probability dictionary
    """
    # Use risk score if available, otherwise default
    base_percent = risk_score.get("probabilityPercent", 65) if risk_score else 65
    base_level = risk_score.get("level", "medium") if risk_score else "medium"
    risk_factors = risk_score.get("riskFactors", []) if risk_score else []
    positive_factors = risk_score.get("positiveFactors", []) if risk_score else []
    
    # Clamp percent
    if base_percent < 10:
        base_percent = 10
    elif base_percent > 90:
        base_percent = 90
    
    # Determine level
    if base_percent < 40:
        base_level = "low"
    elif base_percent < 70:
        base_level = "medium"
    else:
        base_level = "high"
    
    # Build warning message
    if app_language == "uz":
        warning = "Bu faqat sizning javoblaringiz va odatiy naqshlarga asoslangan taxmin. Bu KAFOLAT EMAS. Faqat elchixona yakuniy qaror qabul qiladi."
        improvement_tips = [
            "Moliyaviy holatingizni yaxshilang va bank hisobingizni ko'rsating.",
            "O'zbekistondagi aloqalaringizni (mulk, oila) hujjatlashtiring.",
            "Barcha kerakli hujjatlarni to'liq va aniq taqdim eting."
        ]
    elif app_language == "ru":
        warning = "Это только оценка на основе ваших ответов и типичных паттернов. Это НЕ гарантия. Только посольство может принять окончательное решение."
        improvement_tips = [
            "Улучшите свое финансовое положение и покажите банковский счет.",
            "Документируйте свои связи с Узбекистаном (собственность, семья).",
            "Предоставьте все необходимые документы полностью и точно."
        ]
    else:  # English
        warning = "This is only an estimate based on your answers and typical patterns. It is NOT a guarantee. Only the embassy can make the final decision."
        improvement_tips = [
            "Improve your financial situation and show bank statements.",
            "Document your ties to Uzbekistan (property, family).",
            "Provide all required documents completely and accurately."
        ]
    
    return {
        "type": "probability",
        "visaType": visa_type,
        "country": country,
        "probability": {
            "percent": base_percent,
            "level": base_level,
            "warning": warning
        },
        "mainRisks": risk_factors if risk_factors else ["Unable to analyze risks at this time."],
        "positiveFactors": positive_factors if positive_factors else ["Unable to analyze positive factors at this time."],
        "improvementTips": improvement_tips
    }

