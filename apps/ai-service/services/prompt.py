"""
Prompt Service
Manages prompt templates with context injection for RAG
"""

import logging
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


def load_system_prompt() -> str:
    """
    Load system prompt from file
    
    Returns:
        System prompt text, or default prompt if file not found
    """
    try:
        # Get the directory where this file is located
        current_dir = Path(__file__).parent.parent
        prompt_file = current_dir / "prompts" / "system_prompt.txt"
        
        if prompt_file.exists():
            with open(prompt_file, "r", encoding="utf-8") as f:
                prompt = f.read()
            logger.info("✅ Loaded system prompt from file")
            return prompt
        else:
            logger.warning(f"⚠️ System prompt file not found at {prompt_file}, using default")
            return get_default_system_prompt()
    except Exception as e:
        logger.error(f"Error loading system prompt file: {str(e)}, using default")
        return get_default_system_prompt()


def get_default_system_prompt() -> str:
    """Get default system prompt if file loading fails"""
    return """You are VisaBuddy, an expert visa application assistant. Your mission is to help users navigate the complex visa application process with accuracy, empathy, and actionable guidance.

## Your Core Responsibilities
1. **Provide Accurate Information**: Deliver current, country-specific visa requirements and procedures
2. **Guide Users Through Steps**: Clearly explain the visa application process from start to finish
3. **Answer Comprehensively**: Address questions about documents, timelines, costs, eligibility, and common pitfalls
4. **Offer Practical Advice**: Provide tips to increase approval odds and avoid common mistakes
5. **Direct to Official Sources**: Always reference official sources for legal matters
6. **Maintain Professional Tone**: Be helpful, empathetic, and non-judgmental

## Communication Guidelines
- **Format responses clearly**: Use bullet points, numbered lists, and headers for readability
- **Be concise but complete**: Answer fully without unnecessary verbosity (max 300 words unless detailed explanation needed)
- **Show empathy**: Understand visa applications can be stressful; be encouraging
- **Verify context**: Always confirm the country and visa type before providing advice
- **Use knowledge base first**: Prioritize RAG-retrieved documents over general knowledge
- **Cite sources**: Reference specific documents or official sources when providing information
- **Recommend experts**: Suggest immigration lawyers for complex legal situations
- **Handle uncertainty**: Be honest when unsure; never guess about requirements

## Critical Disclaimers
⚠️ **NOT LEGAL ADVICE**: This is informational guidance, not legal advice. Complex cases need immigration lawyer consultation.
⚠️ **VERIFY OFFICIAL**: Always verify current requirements with official government websites and embassies.
⚠️ **POLICIES CHANGE**: Immigration policies are frequently updated; always check official sources.

## Response Strategies by User Intent
- **Requirements**: List documents and conditions with country/visa type specifics
- **Timeline**: Provide typical timelines and factors affecting speed
- **Cost**: Break down fees and explain what's included
- **Process**: Step-by-step walkthrough with timelines
- **Mistakes**: Common pitfalls and how to avoid them
- **Eligibility**: Factors affecting approval odds

---

Use the knowledge base context below to give accurate, current, country-specific answers. Prioritize RAG information over general knowledge."""


class PromptService:
    """Service for managing AI prompts with RAG context"""
    
    def __init__(self):
        """Initialize prompt service"""
        # Load system prompt from file
        self.system_prompt = load_system_prompt()
        self.language_prompts = self._build_language_prompts()
    
    # System prompt template (fallback - will be loaded from file)
    SYSTEM_PROMPT = """You are VisaBuddy, an expert visa application assistant. Your mission is to help users navigate the complex visa application process with accuracy, empathy, and actionable guidance.

## Your Core Responsibilities
1. **Provide Accurate Information**: Deliver current, country-specific visa requirements and procedures
2. **Guide Users Through Steps**: Clearly explain the visa application process from start to finish
3. **Answer Comprehensively**: Address questions about documents, timelines, costs, eligibility, and common pitfalls
4. **Offer Practical Advice**: Provide tips to increase approval odds and avoid common mistakes
5. **Direct to Official Sources**: Always reference official sources for legal matters
6. **Maintain Professional Tone**: Be helpful, empathetic, and non-judgmental

## Communication Guidelines
- **Format responses clearly**: Use bullet points, numbered lists, and headers for readability
- **Be concise but complete**: Answer fully without unnecessary verbosity (max 300 words unless detailed explanation needed)
- **Show empathy**: Understand visa applications can be stressful; be encouraging
- **Verify context**: Always confirm the country and visa type before providing advice
- **Use knowledge base first**: Prioritize RAG-retrieved documents over general knowledge
- **Cite sources**: Reference specific documents or official sources when providing information
- **Recommend experts**: Suggest immigration lawyers for complex legal situations
- **Handle uncertainty**: Be honest when unsure; never guess about requirements

## Critical Disclaimers
⚠️ **NOT LEGAL ADVICE**: This is informational guidance, not legal advice. Complex cases need immigration lawyer consultation.
⚠️ **VERIFY OFFICIAL**: Always verify current requirements with official government websites and embassies.
⚠️ **POLICIES CHANGE**: Immigration policies are frequently updated; always check official sources.

## Response Strategies by User Intent
- **Requirements**: List documents and conditions with country/visa type specifics
- **Timeline**: Provide typical timelines and factors affecting speed
- **Cost**: Break down fees and explain what's included
- **Process**: Step-by-step walkthrough with timelines
- **Mistakes**: Common pitfalls and how to avoid them
- **Eligibility**: Factors affecting approval odds

---

Use the knowledge base context below to give accurate, current, country-specific answers. Prioritize RAG information over general knowledge."""

    # Context injection template
    CONTEXT_TEMPLATE = """
Based on your question about {query}, here's relevant information:

{context}

---
"""

    # User profile template
    USER_CONTEXT_TEMPLATE = """
**User's Application Context:**
- Target Country: {target_country}
- Visa Type: {visa_type}
- Application Status: {status}
- Documents Collected: {collected_docs}/{total_docs}
- Processing Time: {processing_time} days
- Visa Fee: {visa_fee}

"""

    # Application context template
    APPLICATION_CONTEXT_TEMPLATE = """
**Current Visa Application Context:**

**Destination**: {country} ({country_code})
**Visa Type**: {visa_type}
**Application Status**: {status}

**Timeline**:
- Normal Processing: {processing_days_normal} days
- Expedited: {processing_days_expedited} days (if available)

**Costs**:
- Visa Fee: ${visa_fee}
- Application Fee: ${application_fee}

**Documents Status**: {collected_docs}/{total_docs} collected
**Required Documents**: {required_docs}

"""

    def __init__(self):
        """Initialize prompt service"""
        # Load system prompt from file (with fallback to default)
        self.system_prompt = load_system_prompt()
        self.language_prompts = self._build_language_prompts()
    
    def _build_language_prompts(self) -> Dict[str, str]:
        """Build system prompts for different languages"""
        return {
            "en": self.SYSTEM_PROMPT,
            "ru": self._get_russian_system_prompt(),
            "uz": self._get_uzbek_system_prompt(),
        }
    
    def _get_russian_system_prompt(self) -> str:
        """Get Russian system prompt"""
        return """Вы VisaBuddy, опытный помощник по визовым заявкам. Ваша миссия - помочь пользователям ориентироваться в сложном процессе получения визы с точностью, сочувствием и практическими советами.

## Ваши основные обязанности
1. **Предоставлять точную информацию**: Предоставляйте актуальные, специфичные для каждой страны требования и процедуры визы
2. **Направлять пользователей через этапы**: Четко объясняйте процесс получения визы от начала до конца
3. **Давать полные ответы**: Ответьте на вопросы о документах, сроках, расходах, условиях и типичных ошибках
4. **Предлагать практические советы**: Предоставляйте советы по увеличению шансов одобрения и избеганию типичных ошибок
5. **Ссылаться на официальные источники**: Всегда ссылайтесь на официальные источники по юридическим вопросам
6. **Сохранять профессиональный тон**: Будьте полезны, сочувственны и беспристрастны

## Рекомендации по общению
- **Форматируйте ответы четко**: Используйте маркированные списки, нумерованные списки и заголовки для читаемости
- **Будьте кратким, но полным**: Дайте полный ответ без лишнего многословия (максимум 300 слов, если не требуется подробное объяснение)
- **Проявляйте сочувствие**: Поймите, что получение визы может быть стрессовым; будьте ободряющими
- **Проверяйте контекст**: Всегда подтверждайте страну и тип визы перед предоставлением совета
- **Используйте базу знаний в первую очередь**: Приоритизируйте извлеченные из RAG документы перед общими знаниями
- **Цитируйте источники**: Ссылайтесь на конкретные документы или официальные источники при предоставлении информации
- **Рекомендуйте экспертов**: Предлагайте консультацию с адвокатом по иммиграции для сложных случаев
- **Обращайтесь с неопределенностью**: Будьте честны, когда не уверены; никогда не гадайте о требованиях

## Важные оговорки
⚠️ **НЕ ЮРИДИЧЕСКИЙ СОВЕТ**: Это информационное руководство, а не юридический совет. Сложные случаи требуют консультации с адвокатом по иммиграции.
⚠️ **ПРОВЕРЬТЕ ОФИЦИАЛЬНО**: Всегда проверяйте текущие требования на официальных сайтах правительства и посольствах.
⚠️ **ПОЛИТИКА МЕНЯЕТСЯ**: Политика иммиграции часто обновляется; всегда проверяйте официальные источники.

## Стратегии ответов по намерениям пользователя
- **Требования**: Список документов и условий со специфичностью по стране/типу визы
- **Сроки**: Типичные сроки и факторы, влияющие на скорость
- **Стоимость**: Разбор сборов и объяснение, что включено
- **Процесс**: Пошаговое руководство с временем
- **Ошибки**: Типичные ошибки и как их избежать
- **Соответствие**: Факторы, влияющие на вероятность одобрения

---

Используйте контекст базы знаний ниже, чтобы дать точные, актуальные и специфичные для каждой страны ответы. Приоритизируйте информацию из RAG перед общими знаниями."""
    
    def _get_uzbek_system_prompt(self) -> str:
        """Get Uzbek system prompt"""
        return """Siz VisaBuddy, viza arizi bo'yicha tajribali yordamchi sifatida faoliyat yuritasiz. Sizning missiyangiz - foydalanuvchilarga murakkab viza olish jarayonida aniqlik, ko'ngil-ko'ngillik va amaliy maslahat bilan yordam berish.

## Sizning asosiy mas'uliyatlar
1. **Aniq ma'lumot berish**: Hozirgi vaqtda o'ziga xos mamlakatning viza talablari va tartiblari haqida ma'lumot berish
2. **Foydalanuvchilarni bosqichlar bo'ylab yo'naltirish**: Viza olish jarayonini boshidan oxirigacha aniq tushuntirish
3. **To'liq javob berish**: Hujjatlar, muddatlar, xarajatlar, shartlar va tipik xatolar haqida savollarni javob berish
4. **Amaliy maslahat berish**: Tasdiqlash ehtimoli yoqligini oshirish va tipik xatolardan qochish uchun maslahatlar berish
5. **Rasmiy manbalar bilan bog'liq**: Huquqiy masalalar bo'yicha har doim rasmiy manbalar bilan bog'lantiring
6. **Profesional dum saqlash**: Foydali, ko'ngil-ko'ngillik va notutarqib bo'ling

## Muloqot bo'yicha tavsiyalar
- **Javoblarni aniq formatlashtirish**: Oqilish uchun bullet pointlar, raqamlangan ro'yxatlar va sarlavhalar ishlatish
- **Qisqa, lekin to'liq bo'lish**: Keraksiz so'zlar bilan javob bering (maksimal 300 so'z, agar batafsil tushuntirish talab qilinmasa)
- **Baham-bartarfligi ko'rsating**: Viza olish stress bo'lishi mumkinligini tushunish; rag'batlantiruvchi bo'ling
- **Kontekstni tekshiring**: Maslahat berishdan oldin har doim mamlakatni va viza turini tasdiqlang
- **Bilim bazasini birinchi o'rinda ishlatish**: RAG-dan olingan hujjatlarni umumiy bilimdan ustun qo'ying
- **Manbalarni keltiring**: Ma'lumot berishda aniq hujjatlar yoki rasmiy manbalar bilan bog'lantiring
- **Mutaxassislarni tavsiya qiling**: Murakkab holatlarda immigratsiya advokatiga maslahat berish
- **Noaniqlik bilan ishlash**: Noaniq bo'lganingizda halol bo'ling; talablar haqida hech qachon tahmin qilmang

## Muhim e'tirozlar
⚠️ **HUQUQIY MASLAHAT EMAS**: Bu ma'lumotli yo'riqnoma, huquqiy maslahat emas. Murakkab holatlarda immigratsiya advokatiga murojaat qilish kerak.
⚠️ **RASMIY RAVISHDA TEKSHIRING**: Har doim hozirgi talablarni rasmiy hukumat saytlari va elchixonalarda tekshiring.
⚠️ **SIYOSAT TANAFFUS OLADI**: Immigratsiya siyosati tez-tez yangilanadi; har doim rasmiy manbalarni tekshiring.

## Foydalanuvchining niyatiga ko'ra javob strategiyalari
- **Talablar**: O'ziga xos mamlakatga/viza turiga oid hujjatlar va shartlar ro'yxati
- **Muddatlar**: Tipik muddatlar va tezlikga ta'sir qiluvchi omillar
- **Xarajat**: Toʻlov ajratish va nima kiritilganligini tushuntirish
- **Jarayon**: Vaqt bilan bosqichma-bosqichli yo'riqnoma
- **Xatolar**: Tipik xatolar va ulardan qochish usullari
- **Muvofiqlik**: Tasdiqlash ehtimoli ta'sir qiluvchi omillar

---

Quyida keltirilgan bilim bazasidagi kontekstdan foydalanib, aniq, hozirgi vaqtda mamlakatga o'ziga xos javoblar bering. RAG ma'lumotlarini umumiy bilimdan ustun qo'ying."""
    
    def build_system_prompt(
        self,
        language: str = "en",
        rag_context: Optional[Dict[str, Any]] = None,
        user_profile: Optional[Dict[str, str]] = None,
        application_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Build system prompt with optional context and user profile
        
        Args:
            language: Language code (en, ru, uz). Default: en
            rag_context: Retrieved context from RAG system
            user_profile: User profile information
            application_context: Current visa application context
            
        Returns:
            Complete system prompt
        """
        # Start with base system prompt (loaded from file)
        prompt = self.system_prompt
        
        # Determine language from context if available (prioritize context over parameter)
        # Check application_context first, then user_profile, then fall back to language parameter
        final_language = language
        if application_context:
            final_language = (
                application_context.get("userLanguage") or 
                application_context.get("appLanguage") or 
                final_language
            )
        if user_profile:
            final_language = (
                user_profile.get("appLanguage") or 
                user_profile.get("language") or 
                final_language
            )
        
        # Add language instruction with emphasis on context-based language
        language_instructions = {
            "en": "\n\n**LANGUAGE INSTRUCTION**: You must respond in English. All your responses should be in English. Check the userProfile.appLanguage field in the JSON context to confirm the user's language preference.",
            "ru": "\n\n**LANGUAGE INSTRUCTION**: Вы должны отвечать на русском языке. Все ваши ответы должны быть на русском языке. Проверьте поле userProfile.appLanguage в JSON-контексте, чтобы подтвердить языковые предпочтения пользователя.",
            "uz": "\n\n**LANGUAGE INSTRUCTION**: Siz o'zbek tilida javob berishingiz kerak. Barcha javoblaringiz o'zbek tilida bo'lishi kerak. Foydalanuvchining til afzalligini tasdiqlash uchun JSON kontekstidagi userProfile.appLanguage maydonini tekshiring."
        }
        prompt += language_instructions.get(final_language, language_instructions["en"])
        
        # Add reminder about language rules from system prompt
        prompt += "\n\n**REMINDER**: The LANGUAGE RULES section in the system prompt specifies that you must check userProfile.appLanguage in the JSON context and respond accordingly. Do not mix languages in one answer."
        
        # Add RAG context if available (MANDATORY - must use RAG documents)
        if rag_context and rag_context.get("documents"):
            context_str = self._format_rag_context(rag_context)
            prompt += "\n\n" + context_str
            prompt += "\n\n**IMPORTANT**: Use the RAG documents above as your primary source of information. Prioritize this information over general knowledge."
        elif rag_context:
            prompt += "\n\n**NOTE**: No relevant RAG documents found for this query. If you are uncertain about any visa requirements, explicitly state your uncertainty and advise contacting the embassy."
        
        # Add structured user context (JSON from backend) if available (MANDATORY - must use)
        if application_context:
            app_context_str = self._format_application_context(application_context)
            prompt += "\n\n" + app_context_str
            prompt += "\n\n**IMPORTANT**: Use the structured user context above to personalize your response. Reference their specific application details when relevant."
            # Extract and emphasize language from context
            context_language = (
                application_context.get("userLanguage") or 
                application_context.get("appLanguage") or 
                None
            )
            if context_language:
                prompt += f"\n\n**LANGUAGE FROM CONTEXT**: The user's app language is {context_language}. You MUST respond in {context_language} language as specified in the context."
        
        # Add user profile if available
        if user_profile:
            user_context_str = self._format_user_context(user_profile)
            prompt += "\n\n" + user_context_str
            # Check for appLanguage in user_profile as well
            profile_language = (
                user_profile.get("appLanguage") or 
                user_profile.get("language") or 
                None
            )
            if profile_language:
                prompt += f"\n\n**LANGUAGE FROM USER PROFILE**: The user's app language is {profile_language}. You MUST respond in {profile_language} language."
        
        return prompt
    
    def _format_rag_context(self, rag_context: Dict[str, Any]) -> str:
        """Format RAG retrieved documents for inclusion in prompt"""
        try:
            documents = rag_context.get("documents", [])
            if not documents:
                return ""
            
            context_parts = [
                self.CONTEXT_TEMPLATE.format(
                    query=rag_context.get("query", "your question"),
                    context="\n\n".join([
                        f"**Source: {doc['source']} ({doc['type'].upper()})**\n{doc['content']}"
                        for doc in documents
                    ])
                )
            ]
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error formatting RAG context: {str(e)}")
            return ""
    
    def _format_user_context(self, user_profile: Dict[str, str]) -> str:
        """Format user profile information for inclusion in prompt"""
        try:
            return self.USER_CONTEXT_TEMPLATE.format(
                nationality=user_profile.get("nationality", "Not specified"),
                location=user_profile.get("location", "Not specified"),
                target_country=user_profile.get("target_country", "Not specified"),
                visa_type=user_profile.get("visa_type", "Not specified"),
                status=user_profile.get("status", "Not started"),
                collected_docs=user_profile.get("collected_docs", 0),
                total_docs=user_profile.get("total_docs", 0),
                processing_time=user_profile.get("processing_time", "TBD"),
                visa_fee=user_profile.get("visa_fee", "TBD"),
            )
        except Exception as e:
            logger.error(f"Error formatting user context: {str(e)}")
            return ""
    
    def _format_application_context(self, app_context: Dict[str, Any]) -> str:
        """Format visa application context for inclusion in prompt"""
        try:
            missing_docs = app_context.get("missingDocuments", [])
            if isinstance(missing_docs, list):
                missing_docs_str = ", ".join(missing_docs) if missing_docs else "None"
            else:
                missing_docs_str = str(missing_docs)
            
            # Extract language from context - check multiple possible locations
            user_language = (
                app_context.get("userLanguage") or 
                app_context.get("appLanguage") or 
                "en"
            )
            
            context_str = f"""
**USER'S CURRENT VISA APPLICATION:**

**Destination**: {app_context.get("country", "Unknown")} ({app_context.get("countryCode", "XX")})
**Visa Type**: {app_context.get("visaType", "Not specified")}
**Application Status**: {app_context.get("status", "Draft")}
**Processing Time**: {app_context.get("processingDays", 14)} days
**Visa Fee**: ${app_context.get("fee", 0)}

**DOCUMENT STATUS:**
- Total Required: {app_context.get("documentsTotal", 0)}
- Uploaded: {app_context.get("documentsUploaded", 0)}
- Verified: {app_context.get("documentsVerified", 0)}
- Pending Review: {app_context.get("documentsPending", 0)}
- Rejected: {app_context.get("documentsRejected", 0)}

**MISSING DOCUMENTS**: {missing_docs_str}

**PROGRESS:**
- Checkpoints Completed: {app_context.get("checkpointsCompleted", 0)} of {app_context.get("checkpointsTotal", 0)}
- Next Step: {app_context.get("nextCheckpoint", "Complete all documents")}

**USER LANGUAGE**: {user_language} (from application context)

**IMPORTANT**: Use this specific application context to provide personalized advice. 
If user asks about documents, refer to their specific missing documents.
If user asks about next steps, refer to their next checkpoint.
Always respond in {user_language} language as specified in the context.
"""
            return context_str
        except Exception as e:
            logger.error(f"Error formatting application context: {str(e)}")
            return ""
    
    def build_messages(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        language: str = "en"
    ) -> List[Dict[str, str]]:
        """
        Build message list for OpenAI API call
        
        Args:
            user_message: Current user message
            conversation_history: Previous messages in conversation
            system_prompt: System prompt (uses default if not provided)
            language: Language code for system prompt (en, ru, uz). Default: en
            
        Returns:
            List of message dictionaries for API
        """
        messages = []
        
        # Add system message
        if system_prompt is None:
            system_prompt = self.language_prompts.get(language, self.system_prompt)
        messages.append({"role": "system", "content": system_prompt})
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                messages.append(msg)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
    def get_fallback_response(self, user_message: str, language: str = "en") -> str:
        """
        Get professional fallback response for when AI is not available
        
        Args:
            user_message: User's message
            language: Language code (uz, ru, en)
            
        Returns:
            Professional fallback response aligned with VisaBuddy system prompt
        """
        message_lower = user_message.lower()
        
        fallback_responses = {
            "requirements": (
                "Visa requirements vary significantly by country and visa type. "
                "Common requirements include: valid passport, proof of funds, accommodation proof, "
                "travel insurance, and specific documents for your visa category. "
                "Please specify which country you're interested in, and I can provide detailed information."
            ),
            "cost": (
                "Visa costs vary widely by country and type, typically ranging from $20-500 USD. "
                "Processing fees, application fees, and visa fees are separate. "
                "Which country are you considering?"
            ),
            "time": (
                "Processing times range from 2-12 weeks depending on the country and visa category. "
                "Tourist visas are usually faster (5-15 days) than work visas (4-8 weeks). "
                "Some countries offer expedited processing for extra fees."
            ),
            "document": (
                "Required documents typically include: passport, application form, photos, financial proof, "
                "accommodation proof, and specific documents for your visa type. "
                "Which country and visa type are you asking about?"
            ),
            "application": (
                "The general visa application process involves: 1) Determine visa type, "
                "2) Gather required documents, 3) Complete application form, 4) Schedule appointment/submit, "
                "5) Attend interview if required, 6) Wait for decision. "
                "Each country has slightly different procedures."
            ),
            "payment": (
                "Visa fees are typically paid during or after the application process. "
                "Payment methods vary by country - some accept credit cards, some require bank transfers, "
                "and some accept cash in person. Which country are you applying to?"
            ),
            "travel": (
                "For travel planning, ensure your passport is valid for 6+ months beyond your travel dates, "
                "arrange appropriate travel insurance, and have proof of return flight. "
                "It's also helpful to have accommodation booked and show financial proof."
            ),
            "default": (
                "I'm VisaBuddy's AI assistant, here to help with visa application questions. "
                "I can help you with information about visa requirements, application processes, documents needed, "
                "costs, processing times, and general immigration guidance. "
                "What specific visa question do you have?"
            )
        }
        
        # Find matching keyword
        for keyword, response in fallback_responses.items():
            if keyword in message_lower:
                return response
        
        return fallback_responses["default"]
    
    def extract_intent(self, message: str) -> Dict[str, Any]:
        """
        Attempt to extract user intent from message
        
        Args:
            message: User message
            
        Returns:
            Dictionary with extracted intent information
        """
        message_lower = message.lower()
        
        # Intent keywords
        intents = {
            "requirements": ["require", "requirement", "need", "document", "what do i need"],
            "cost": ["cost", "fee", "price", "how much", "expensive"],
            "timeline": ["how long", "time", "days", "weeks", "processing time"],
            "application": ["apply", "application", "apply for", "application process"],
            "eligibility": ["eligible", "qualify", "am i eligible", "can i apply"],
            "documentation": ["document", "passport", "proof", "certificate"],
            "country": ["spain", "usa", "uae", "japan", "germany", "uk", "canada", "australia"],
        }
        
        detected_intents = []
        for intent, keywords in intents.items():
            if any(keyword in message_lower for keyword in keywords):
                detected_intents.append(intent)
        
        # Detect country if mentioned
        target_country = None
        countries = ["spain", "usa", "uae", "japan", "germany", "uk", "canada", "australia", "france"]
        for country in countries:
            if country in message_lower:
                target_country = country
                break
        
        return {
            "intents": detected_intents,
            "target_country": target_country,
            "confidence": len(detected_intents) / len(intents) if detected_intents else 0
        }
    
    def get_clarification_question(self, intent: Dict[str, Any]) -> Optional[str]:
        """
        Generate clarification question based on detected intent
        
        Args:
            intent: Intent information from extract_intent
            
        Returns:
            Clarification question or None
        """
        if not intent.get("target_country"):
            return "Which country are you interested in applying for a visa to?"
        
        if "eligibility" in intent.get("intents", []):
            return f"Are you a citizen of which country? This helps determine your visa options for {intent.get('target_country').title()}."
        
        if "visa_type" not in intent:
            country = intent.get("target_country", "").title()
            return f"What type of visa are you applying for? (e.g., tourist, work, student, residence)"
        
        return None


# Global instance
_prompt_service = None


def get_prompt_service() -> PromptService:
    """Get or create prompt service instance"""
    global _prompt_service
    if _prompt_service is None:
        _prompt_service = PromptService()
    return _prompt_service