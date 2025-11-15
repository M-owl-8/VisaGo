#!/usr/bin/env python3
"""
RAG Knowledge Base Ingestion Script
Processes and indexes the knowledge base in Pinecone with fallback cache
Run this script to initialize or update the RAG system
"""

import asyncio
import logging
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main ingestion flow"""
    try:
        logger.info("="*60)
        logger.info("VisaBuddy RAG Knowledge Base Ingestion")
        logger.info("="*60)
        
        # Import and initialize services
        logger.info("\n📚 Loading services...")
        from services.rag import get_rag_service
        from services.rag_validator import validate_rag_system
        
        # Initialize RAG service
        logger.info("Initializing RAG service...")
        rag_service = get_rag_service()
        
        success = await rag_service.initialize()
        
        if not success:
            logger.error("❌ Failed to initialize RAG service")
            return 1
        
        # Print status
        status = rag_service.get_status()
        logger.info("\n✅ RAG Service Status:")
        logger.info(f"   - Initialized: {status['initialized']}")
        logger.info(f"   - Pinecone Available: {status['pinecone_available']}")
        logger.info(f"   - Cache Populated: {status['cache_populated']}")
        logger.info(f"   - Documents Indexed: {status['documents_indexed']}")
        logger.info(f"   - Using OpenAI Embeddings: {status['using_openai_embeddings']}")
        
        if status.get('cache_stats'):
            cache_stats = status['cache_stats']
            logger.info(f"   - Cache: {cache_stats.get('total_documents', 0)} documents")
        
        # Run validation suite
        logger.info("\n" + "="*60)
        logger.info("Running Validation Suite...")
        logger.info("="*60 + "\n")
        
        validation_report = await validate_rag_system(rag_service)
        
        # Print validation results
        suite_results = validation_report.get('validation_suite', {})
        if suite_results:
            logger.info(f"\n📊 Validation Results:")
            logger.info(f"   - Overall Status: {validation_report.get('overall_status')}")
            logger.info(f"   - Pass Rate: {suite_results.get('pass_rate', 0):.1%}")
            logger.info(f"   - Tests Passed: {suite_results.get('passed', 0)}/{suite_results.get('total_tests', 0)}")
            
            # Show failed tests
            failed_tests = [r for r in suite_results.get('results', []) if not r.get('passed')]
            if failed_tests:
                logger.warning(f"\n⚠️ Failed Tests ({len(failed_tests)}):")
                for test in failed_tests[:5]:  # Show first 5
                    logger.warning(f"   - {test.get('query', 'Unknown')[:50]}")
                    logger.warning(f"     Match Ratio: {test.get('match_ratio', 0):.1%}")
                    logger.warning(f"     Keywords Matched: {test.get('matched_keywords', [])}")
        
        logger.info("\n" + "="*60)
        logger.info("✅ RAG Ingestion Complete!")
        logger.info("="*60)
        
        # Print next steps
        logger.info("\nNext Steps:")
        logger.info("1. Start the AI service: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001")
        logger.info("2. Test the RAG endpoint: GET /api/rag/status")
        logger.info("3. Test chat with RAG: POST /api/chat")
        logger.info("4. Test search: POST /api/chat/search?query=<your_query>")
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Error during ingestion: {str(e)}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)