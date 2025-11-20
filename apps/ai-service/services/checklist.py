"""
Document Checklist Generation Service
Generates personalized visa document checklists using AIUserContext, RAG, and AI
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


async def generate_document_checklist(
    user_input: str,
    application_id: str,
    auth_token: Optional[str] = None,
    mock_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Uses AIUserContext + RAG + prompts to generate a full document checklist
    in structured JSON format.
    
    Args:
        user_input: User's question or request
        application_id: Application ID
        auth_token: Optional JWT token for authentication
        mock_context: Optional mock AIUserContext for testing (bypasses backend fetch)
        
    Returns:
        Dictionary with checklist data in the format:
        {
            "type": "checklist",
            "visaType": "...",
            "country": "...",
            "checklist": [...],
            "notes": [...]
        }
    """
    try:
        logger.info(f"Generating document checklist for application {application_id}")
        
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
        
        country = application.get("country", "US")
        visa_type = application.get("visaType", "tourist")
        app_language = user_profile.get("appLanguage", "en")
        
        logger.info(f"Extracted context: country={country}, visaType={visa_type}, language={app_language}")
        
        # Step 3: Run RAG search for country + visaType
        rag_service = get_rag_service()
        rag_context = None
        
        if rag_service.initialized:
            # Build query for RAG search
            rag_query = f"{country} {visa_type} visa document requirements checklist"
            logger.info(f"Running RAG search: {rag_query}")
            
            try:
                rag_context = await rag_service.retrieve_context(
                    query=rag_query,
                    country=country,
                    visa_type=visa_type,
                    top_k=10  # Get more documents for comprehensive checklist
                )
                logger.info(f"✅ Retrieved {len(rag_context.get('documents', []))} RAG documents")
            except Exception as e:
                logger.warning(f"RAG retrieval error: {str(e)}, continuing without RAG context")
                rag_context = None
        else:
            logger.warning("RAG service not initialized, proceeding without RAG context")
        
        # Step 4: Build user message with context and RAG
        user_message = build_checklist_prompt(
            user_input=user_input,
            ai_user_context=context,
            rag_context=rag_context,
            app_language=app_language
        )
        
        # Step 5: Build system prompt
        prompt_service = get_prompt_service()
        system_prompt = prompt_service.build_system_prompt(
            language=app_language,
            rag_context=rag_context,
            application_context={
                "country": country,
                "countryCode": country,
                "visaType": visa_type,
                "status": application.get("status", "draft"),
                "userLanguage": app_language,
            },
            user_profile={
                "nationality": questionnaire_summary.get("citizenship") if questionnaire_summary else None,
                "target_country": country,
                "visa_type": visa_type,
            }
        )
        
        # Add checklist-specific instructions to system prompt
        checklist_instructions = get_checklist_instructions(app_language)
        system_prompt += "\n\n" + checklist_instructions
        
        # Step 6: Generate response using OpenAI
        openai_service = get_openai_service()
        
        # Build messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        logger.info("Generating checklist with OpenAI...")
        ai_response = await openai_service.generate_response(
            user_message=user_message,
            conversation_history=None,
            system_prompt=system_prompt,
            user_id=user_profile.get("userId", "unknown"),
            temperature=0.3,  # Lower temperature for more structured output
            max_tokens=2000,  # Allow for comprehensive checklist
        )
        
        if ai_response.error:
            raise ValueError(f"OpenAI error: {ai_response.error}")
        
        # Step 7: Parse JSON from response
        checklist_data = parse_checklist_response(ai_response.content, country, visa_type)
        
        logger.info(f"✅ Generated checklist with {len(checklist_data.get('checklist', []))} items")
        return checklist_data
        
    except Exception as e:
        logger.error(f"Error generating document checklist: {str(e)}", exc_info=True)
        # Return fallback checklist
        return get_fallback_checklist(
            country=context.get("application", {}).get("country", "US") if context else "US",
            visa_type=context.get("application", {}).get("visaType", "tourist") if context else "tourist",
            error=str(e)
        )


def build_checklist_prompt(
    user_input: str,
    ai_user_context: Dict[str, Any],
    rag_context: Optional[Dict[str, Any]],
    app_language: str
) -> str:
    """
    Build the user message prompt for checklist generation
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
    
    # Build prompt based on language
    if app_language == "uz":
        prompt = f"""Siz VisaBuddy'siz. Quyidagi JSON konteksti va siyosat ma'lumotlaridan foydalanib, bu foydalanuvchi uchun TO'LIQ, aniq hujjatlar ro'yxatini yarating.

FOYDALANUVCHI KONTEKSTI (JSON):
```json
{json.dumps(ai_user_context, indent=2, ensure_ascii=False)}
```

RELEVANT VIZA QOIDALARI:
{rag_text}

VAZIFA:

Yosh, fuqarolik, viza turi, maqsad mamlakat, taklifnoma, moliyaviy holat, O'zbekistonga bog'liqlik, sayohat tarixi va hozirgi hujjatlar asosida shaxsiylashtirilgan ro'yxat yarating.

Quyidagilarni kiriting:
- Talab qilinadigan hujjatlar
- Tavsiya etiladigan hujjatlar
- Mamlakatga xos hujjatlar

Javob foydalanuvchining ilova tilida bo'lishi kerak: O'zbek tili (Lotin yozuvi).

Chiqish JSON formatida bo'lishi kerak va quyidagi shablonga mos kelishi kerak:
```json
{{
  "type": "checklist",
  "visaType": "...",
  "country": "...",
  "checklist": [...],
  "notes": [...]
}}
```

FOYDALANUVCHI SAVOLI:
{user_input}"""
    
    elif app_language == "ru":
        prompt = f"""Вы - VisaBuddy. Используйте JSON-контекст и извлечения политики ниже, чтобы создать ПОЛНЫЙ, точный список документов для этого пользователя.

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ (JSON):
```json
{json.dumps(ai_user_context, indent=2, ensure_ascii=False)}
```

РЕЛЕВАНТНЫЕ ВИЗОВЫЕ ПРАВИЛА:
{rag_text}

ЗАДАЧА:

Используйте возраст, гражданство, тип визы, страну назначения, приглашение, финансы, связи с Узбекистаном, историю путешествий и текущие документы для создания персонализированного списка.

Включите:
- Обязательные документы
- Рекомендуемые документы
- Документы, специфичные для страны

Ответ должен быть на языке приложения пользователя: Русский.

Вывод ДОЛЖЕН быть в формате JSON и соответствовать шаблону "checklist":
```json
{{
  "type": "checklist",
  "visaType": "...",
  "country": "...",
  "checklist": [...],
  "notes": [...]
}}
```

ВОПРОС ПОЛЬЗОВАТЕЛЯ:
{user_input}"""
    
    else:  # English
        prompt = f"""You are VisaBuddy. Use the JSON context and the policy extracts below to create a FULL, precise document checklist for this user.

USER CONTEXT (JSON):
```json
{json.dumps(ai_user_context, indent=2, ensure_ascii=False)}
```

RELEVANT VISA RULES:
{rag_text}

TASK:

Use age, citizenship, visaType, targetCountry, invitation, finances, ties to Uzbekistan, travel history, and current documents to generate a personalized checklist.

Include:
- Required documents
- Recommended documents
- Country-specific documents

The output MUST follow the "checklist" JSON template.

Respond in the user's app language: English.

The output MUST be in JSON format and match the checklist template:
```json
{{
  "type": "checklist",
  "visaType": "...",
  "country": "...",
  "checklist": [...],
  "notes": [...]
}}
```

USER QUESTION:
{user_input}"""
    
    return prompt


def get_checklist_instructions(language: str) -> str:
    """Get checklist-specific instructions for system prompt"""
    if language == "uz":
        return """**Hujjatlar ro'yxatini yaratish bo'yicha ko'rsatmalar:**

1. Har bir hujjat uchun quyidagi maydonlarni kiriting:
   - "id": noyob identifikator
   - "type": "required" yoki "recommended"
   - "name": hujjat nomi (foydalanuvchi tilida)
   - "description": batafsil tavsif
   - "countrySpecific": agar mamlakatga xos bo'lsa true

2. "notes" maydonida umumiy tavsiyalar va muhim eslatmalarni kiriting.

3. JSON formatida javob bering - faqat JSON, boshqa matn yo'q."""
    
    elif language == "ru":
        return """**Инструкции по созданию списка документов:**

1. Для каждого документа укажите следующие поля:
   - "id": уникальный идентификатор
   - "type": "required" или "recommended"
   - "name": название документа (на языке пользователя)
   - "description": подробное описание
   - "countrySpecific": true, если специфично для страны

2. В поле "notes" укажите общие рекомендации и важные примечания.

3. Ответьте в формате JSON - только JSON, без дополнительного текста."""
    
    else:  # English
        return """**Instructions for creating document checklist:**

1. For each document, include the following fields:
   - "id": unique identifier
   - "type": "required" or "recommended"
   - "name": document name (in user's language)
   - "description": detailed description
   - "countrySpecific": true if country-specific

2. In the "notes" field, include general recommendations and important notes.

3. Respond in JSON format - JSON only, no additional text."""


def parse_checklist_response(
    ai_response: str,
    country: str,
    visa_type: str
) -> Dict[str, Any]:
    """
    Parse AI response and extract JSON checklist
    
    Args:
        ai_response: Raw AI response text
        country: Country code
        visa_type: Visa type
        
    Returns:
        Parsed checklist dictionary
    """
    try:
        # Try to extract JSON from response
        # AI might wrap JSON in markdown code blocks or add extra text
        response_text = ai_response.strip()
        
        # Remove markdown code blocks if present
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        
        # Try to find JSON object
        if "{" in response_text:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if end > start:
                response_text = response_text[start:end]
        
        # Parse JSON
        checklist_data = json.loads(response_text)
        
        # Validate structure
        if not isinstance(checklist_data, dict):
            raise ValueError("Response is not a dictionary")
        
        # Ensure required fields
        if "type" not in checklist_data:
            checklist_data["type"] = "checklist"
        if "visaType" not in checklist_data:
            checklist_data["visaType"] = visa_type
        if "country" not in checklist_data:
            checklist_data["country"] = country
        if "checklist" not in checklist_data:
            checklist_data["checklist"] = []
        if "notes" not in checklist_data:
            checklist_data["notes"] = []
        
        return checklist_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from AI response: {str(e)}")
        logger.debug(f"Response text: {ai_response[:500]}")
        # Return fallback
        return get_fallback_checklist(country, visa_type, f"JSON parse error: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing checklist response: {str(e)}")
        return get_fallback_checklist(country, visa_type, str(e))


def get_fallback_checklist(
    country: str,
    visa_type: str,
    error: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a fallback checklist when AI generation fails
    
    Args:
        country: Country code
        visa_type: Visa type
        error: Optional error message
        
    Returns:
        Basic checklist structure
    """
    common_documents = [
        {
            "id": "passport",
            "type": "required",
            "name": "Valid Passport",
            "description": "Passport valid for at least 6 months beyond intended stay",
            "countrySpecific": False
        },
        {
            "id": "application_form",
            "type": "required",
            "name": "Visa Application Form",
            "description": "Completed and signed visa application form",
            "countrySpecific": False
        },
        {
            "id": "photo",
            "type": "required",
            "name": "Passport Photo",
            "description": "Recent passport-sized photograph",
            "countrySpecific": False
        },
        {
            "id": "financial_proof",
            "type": "required",
            "name": "Financial Proof",
            "description": "Bank statements or proof of sufficient funds",
            "countrySpecific": False
        }
    ]
    
    if visa_type == "student":
        common_documents.append({
            "id": "acceptance_letter",
            "type": "required",
            "name": "Acceptance Letter",
            "description": "Letter of acceptance from educational institution",
            "countrySpecific": False
        })
    
    return {
        "type": "checklist",
        "visaType": visa_type,
        "country": country,
        "checklist": common_documents,
        "notes": [
            "This is a basic checklist. Please verify specific requirements with the embassy.",
            error if error else "AI generation unavailable, showing common requirements."
        ]
    }

