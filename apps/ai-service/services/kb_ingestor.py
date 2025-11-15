"""
Knowledge Base Ingestion Service
Loads, processes, and indexes visa knowledge base documents
"""

import json
import logging
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class KnowledgeBaseIngestor:
    """Service for ingesting and processing knowledge base"""
    
    def __init__(self, kb_path: Optional[str] = None):
        """
        Initialize knowledge base ingestor
        
        Args:
            kb_path: Optional path to knowledge base JSON file
        """
        self.kb_path = kb_path or os.path.join(
            os.path.dirname(__file__), 
            "..", 
            "data", 
            "visa_kb.json"
        )
        self.kb_data = {}
        self.documents = []
    
    def load_knowledge_base(self) -> bool:
        """Load knowledge base from JSON file"""
        try:
            with open(self.kb_path, 'r', encoding='utf-8') as f:
                self.kb_data = json.load(f)
            
            logger.info(f"✅ Loaded knowledge base from {self.kb_path}")
            return True
            
        except FileNotFoundError:
            logger.error(f"Knowledge base file not found: {self.kb_path}")
            return False
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing knowledge base JSON: {str(e)}")
            return False
    
    def extract_visa_documents(self) -> List[Dict[str, Any]]:
        """
        Extract visa information documents from knowledge base
        
        Returns:
            List of documents
        """
        documents = []
        
        for country_name, country_data in self.kb_data.get("countries", {}).items():
            country_code = country_data.get("country_code", "")
            country_flag = country_data.get("flag", "")
            country_desc = country_data.get("description", "")
            
            # Create country overview document
            overview_text = f"""
{country_flag} {country_name}

{country_desc}

--- VISA INFORMATION ---
            """.strip()
            
            documents.append({
                "id": f"country_overview_{country_code.lower()}",
                "text": overview_text,
                "metadata": {
                    "type": "country_overview",
                    "country": country_name,
                    "country_code": country_code,
                    "source": "visa_kb"
                }
            })
            
            # Extract visa types for each country
            for visa_type, visa_info in country_data.get("visa_types", {}).items():
                visa_text = f"""
Country: {country_name}
Visa Type: {visa_type}

Requirements:
{visa_info.get('requirements', 'N/A')}

Processing Time: {visa_info.get('processing_time', 'N/A')}
Validity: {visa_info.get('validity', 'N/A')}
Fee: {visa_info.get('fee', 'N/A')}

Required Documents:
{', '.join(visa_info.get('documents', ['N/A']))}

Tips & Recommendations:
{visa_info.get('tips', 'N/A')}

Embassy Contact:
{visa_info.get('embassy', {}).get('url', 'Check official website')}
                """.strip()
                
                documents.append({
                    "id": f"visa_{country_code.lower()}_{visa_type.lower().replace(' ', '_')}",
                    "text": visa_text,
                    "metadata": {
                        "type": "visa_info",
                        "country": country_name,
                        "country_code": country_code,
                        "visa_type": visa_type,
                        "source": "visa_kb"
                    }
                })
        
        logger.info(f"Extracted {len(documents)} visa documents")
        return documents
    
    def extract_general_topics(self) -> List[Dict[str, Any]]:
        """
        Extract general topic documents
        
        Returns:
            List of documents
        """
        documents = []
        
        for topic_name, topic_data in self.kb_data.get("general_topics", {}).items():
            topic_text = f"""
Topic: {topic_name}

{topic_data.get('content', 'N/A')}
            """.strip()
            
            documents.append({
                "id": f"topic_{topic_name.lower().replace(' ', '_')}",
                "text": topic_text,
                "metadata": {
                    "type": "general_topic",
                    "topic": topic_name,
                    "source": "visa_kb"
                }
            })
        
        logger.info(f"Extracted {len(documents)} general topic documents")
        return documents
    
    def extract_faqs(self) -> List[Dict[str, Any]]:
        """
        Extract FAQ documents
        
        Returns:
            List of documents
        """
        documents = []
        faqs = self.kb_data.get("faqs", [])
        
        for idx, faq in enumerate(faqs):
            faq_text = f"""
Q: {faq.get('question', '')}

A: {faq.get('answer', '')}
            """.strip()
            
            documents.append({
                "id": f"faq_{idx}",
                "text": faq_text,
                "metadata": {
                    "type": "faq",
                    "question": faq.get('question', ''),
                    "source": "visa_kb"
                }
            })
        
        logger.info(f"Extracted {len(documents)} FAQ documents")
        return documents
    
    def prepare_all_documents(self) -> List[Dict[str, Any]]:
        """
        Prepare all documents for indexing
        
        Returns:
            List of all documents
        """
        if not self.kb_data:
            logger.warning("Knowledge base not loaded, loading now...")
            if not self.load_knowledge_base():
                return []
        
        all_documents = []
        
        # Extract visa documents
        visa_docs = self.extract_visa_documents()
        all_documents.extend(visa_docs)
        
        # Extract general topics
        if "general_topics" in self.kb_data:
            topic_docs = self.extract_general_topics()
            all_documents.extend(topic_docs)
        
        # Extract FAQs
        if "faqs" in self.kb_data:
            faq_docs = self.extract_faqs()
            all_documents.extend(faq_docs)
        
        self.documents = all_documents
        logger.info(f"✅ Prepared {len(all_documents)} documents for indexing")
        
        return all_documents
    
    def add_supplementary_documents(self) -> List[Dict[str, Any]]:
        """
        Add supplementary documents not in KB but useful for RAG
        
        Returns:
            List of supplementary documents
        """
        supplementary = [
            {
                "id": "visa_process_general",
                "text": """
General Visa Application Process:

1. Research & Planning
   - Identify visa type needed for your destination
   - Check eligibility criteria
   - Verify required documents
   - Plan timeline (apply 3-6 months in advance)

2. Gather Documents
   - Valid passport (usually 6+ months validity)
   - Completed application forms
   - Passport photos (typically 2x2 inches)
   - Financial documents (bank statements, income proof)
   - Travel plans (flight bookings, hotel reservations)
   - Employment letter or leave approval
   - Proof of accommodation

3. Application Submission
   - Fill application forms completely and accurately
   - Arrange supporting documents in order
   - Pay application fee (cash, check, or online)
   - Submit at embassy, consulate, or visa center
   - Obtain receipt and reference number

4. Interview (if required)
   - Be prepared to answer questions about trip purpose
   - Bring original documents and supporting copies
   - Dress professionally
   - Be honest and confident
   - Keep answers concise and relevant

5. Processing & Decision
   - Wait for processing (typically 5-30 days)
   - Monitor application status online if available
   - Respond promptly to any requests for additional info
   - Expect decision (approval, rejection, or extension)

6. Visa Issuance
   - Retrieve processed passport with visa
   - Verify visa details for accuracy
   - Plan travel dates according to visa validity
                """,
                "metadata": {
                    "type": "guide",
                    "topic": "General Visa Application Process",
                    "source": "internal"
                }
            },
            {
                "id": "document_requirements_guide",
                "text": """
Essential Documents for Most Visa Applications:

1. PASSPORT
   - Must be valid for at least 6 months beyond travel
   - Should have blank pages for visa stamp
   - Use recent/current passport
   - Some countries allow only 10-year passports

2. IDENTIFICATION
   - Birth certificate (original or certified copy)
   - National ID card (if applicable)
   - Marriage certificate (if name changed)
   - Divorce decree (if applicable)

3. FINANCIAL DOCUMENTS
   - Bank statements (3-6 months)
   - Investment statements
   - Income tax returns (1-2 years)
   - Employment letter with salary confirmation
   - Proof of steady income
   - Sponsor affidavit (if applicable)

4. TRAVEL DOCUMENTS
   - Flight booking confirmation
   - Hotel reservation
   - Travel insurance policy
   - Itinerary or travel plan
   - Return ticket confirmation

5. EMPLOYMENT & EDUCATION
   - Employment letter from current employer
   - Leave approval (if needed)
   - Educational certificates/diplomas
   - Enrollment letter (for students)
   - Employer recommendation letter

6. HEALTH & CHARACTER
   - Medical examination report (if required)
   - Vaccination records
   - Police clearance certificate
   - Character reference letters
   - Background check documentation

7. PHOTOGRAPHS
   - Passport-sized photos (usually 2x2 inches)
   - Recent, color, head-on shots
   - Specific background color per country
   - No glasses/sunglasses
   - Natural expression

Tips:
- Provide originals + 2 certified copies
- Get documents translated if not in visa country language
- Use official translations only
- Keep digital copies of all documents
- Submit well in advance of travel dates
                """,
                "metadata": {
                    "type": "guide",
                    "topic": "Document Requirements Guide",
                    "source": "internal"
                }
            },
            {
                "id": "visa_refusal_handling",
                "text": """
How to Handle Visa Refusal:

Common Reasons for Refusal:
1. Insufficient Financial Support
2. Lack of Ties to Home Country
3. Incomplete or Fraudulent Documentation
4. Previous Visa Violations
5. Criminal History or Security Concerns
6. Inconsistent Information
7. Overstaying Previous Visas

Steps to Take After Refusal:

1. Request Written Explanation
   - Ask embassy/consulate for detailed reason
   - Understand specific deficiencies
   - Document the official response

2. Review & Analyze
   - Carefully review what went wrong
   - Identify documentation gaps
   - Consider professional consultation

3. Plan Your Response
   - Address identified issues directly
   - Gather additional supporting documents
   - Prepare stronger application

4. Improve Your Case
   - If financial: show increased savings, sponsor support
   - If ties to home: document property, family, employment
   - If documents: obtain certified copies, translations
   - If history: obtain character reference, clearance

5. Consider Appeal (if available)
   - Check if country allows appeals
   - Submit within specified timeframe
   - Include new information addressing concerns

6. Reapply Strategically
   - Wait recommended period (usually 3-6 months)
   - Apply with significantly improved documentation
   - Consider different visa type if applicable
   - Use same documentation package that worked before

7. Seek Professional Help
   - Hire immigration lawyer/consultant
   - Use professional visa service
   - Get personalized case review
   - Improve odds with expert guidance

Prevention Tips:
- Be completely honest in application
- Provide only required documents (quality over quantity)
- Keep all information consistent
- Submit well-organized applications
- Don't rush - prepare thoroughly
- Keep originals, submit certified copies
                """,
                "metadata": {
                    "type": "guide",
                    "topic": "Visa Refusal Handling",
                    "source": "internal"
                }
            }
        ]
        
        logger.info(f"Added {len(supplementary)} supplementary documents")
        return supplementary
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all documents including supplementary"""
        if not self.documents:
            self.prepare_all_documents()
        
        supplementary = self.add_supplementary_documents()
        return self.documents + supplementary


# Global instance
_kb_ingestor = None


def get_kb_ingestor() -> KnowledgeBaseIngestor:
    """Get or create knowledge base ingestor instance"""
    global _kb_ingestor
    if _kb_ingestor is None:
        _kb_ingestor = KnowledgeBaseIngestor()
    return _kb_ingestor