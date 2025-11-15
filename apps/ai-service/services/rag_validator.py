"""
RAG Validator
Tests and validates RAG retrieval accuracy with sample queries
"""

import logging
from typing import List, Dict, Any
import asyncio

logger = logging.getLogger(__name__)


class RAGValidator:
    """Validate RAG retrieval accuracy"""
    
    # Sample test queries with expected contexts
    TEST_QUERIES = [
        {
            "query": "How much does a US visitor visa cost?",
            "expected_keywords": ["USA", "visitor", "B1/B2", "fee", "cost"],
            "category": "cost"
        },
        {
            "query": "What documents do I need for a UK tourist visa?",
            "expected_keywords": ["UK", "documents", "passport", "tourist"],
            "category": "documents"
        },
        {
            "query": "How long does Schengen visa processing take?",
            "expected_keywords": ["Schengen", "processing", "days", "time"],
            "category": "processing_time"
        },
        {
            "query": "What are the requirements for working in Spain?",
            "expected_keywords": ["Spain", "work", "employment", "requirements"],
            "category": "work_requirements"
        },
        {
            "query": "How long can I stay in Australia on a visitor visa?",
            "expected_keywords": ["Australia", "visitor", "stay", "duration"],
            "category": "stay_duration"
        },
        {
            "query": "What should I do if my visa application is rejected?",
            "expected_keywords": ["refusal", "rejected", "denial", "appeal"],
            "category": "visa_refusal"
        },
        {
            "query": "Do I need a visa for Canada as a tourist?",
            "expected_keywords": ["Canada", "visitor", "tourist", "requirements"],
            "category": "visa_type"
        },
        {
            "query": "How much financial support do I need to show for Schengen visa?",
            "expected_keywords": ["Schengen", "funds", "financial", "requirement"],
            "category": "financial_requirements"
        },
        {
            "query": "What is the processing time for a US work visa?",
            "expected_keywords": ["USA", "work", "H1-B", "processing"],
            "category": "processing_time"
        },
        {
            "query": "Common reasons for visa rejection and how to avoid them",
            "expected_keywords": ["refusal", "reasons", "rejection", "avoid"],
            "category": "visa_refusal"
        }
    ]
    
    def __init__(self, rag_service):
        """Initialize RAG validator"""
        self.rag_service = rag_service
    
    async def validate_single_query(
        self, 
        query: str, 
        expected_keywords: List[str],
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Validate a single query
        
        Args:
            query: Query to test
            expected_keywords: Keywords that should appear in results
            top_k: Number of results to retrieve
            
        Returns:
            Validation result
        """
        try:
            # Retrieve context
            context = await self.rag_service.retrieve_context(
                query=query,
                top_k=top_k
            )
            
            documents = context.get("documents", [])
            sources = context.get("sources", [])
            
            # Check for expected keywords
            matched_keywords = []
            all_content = " ".join([doc["content"] for doc in documents]).lower()
            
            for keyword in expected_keywords:
                if keyword.lower() in all_content:
                    matched_keywords.append(keyword)
            
            # Calculate score
            match_ratio = len(matched_keywords) / len(expected_keywords) if expected_keywords else 0
            
            result = {
                "query": query,
                "retrieved_documents": len(documents),
                "sources": sources,
                "expected_keywords": expected_keywords,
                "matched_keywords": matched_keywords,
                "match_ratio": match_ratio,
                "passed": match_ratio >= 0.6,  # Pass if 60% of keywords matched
                "retrieval_source": context.get("source", "unknown"),
                "documents": documents
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error validating query: {str(e)}")
            return {
                "query": query,
                "error": str(e),
                "passed": False
            }
    
    async def run_validation_suite(self) -> Dict[str, Any]:
        """
        Run complete validation suite
        
        Returns:
            Validation results
        """
        logger.info(f"🧪 Running RAG Validation Suite with {len(self.TEST_QUERIES)} queries...")
        
        results = []
        passed_count = 0
        
        for test_case in self.TEST_QUERIES:
            logger.info(f"  Testing: {test_case['query'][:50]}...")
            
            result = await self.validate_single_query(
                query=test_case["query"],
                expected_keywords=test_case["expected_keywords"]
            )
            
            results.append(result)
            
            if result.get("passed", False):
                passed_count += 1
                logger.info(f"    ✅ PASSED (Match ratio: {result['match_ratio']:.1%})")
            else:
                logger.warning(f"    ❌ FAILED (Match ratio: {result.get('match_ratio', 0):.1%})")
        
        # Calculate statistics
        pass_rate = passed_count / len(self.TEST_QUERIES) if self.TEST_QUERIES else 0
        total_documents_retrieved = sum(r.get("retrieved_documents", 0) for r in results)
        avg_match_ratio = sum(r.get("match_ratio", 0) for r in results) / len(results) if results else 0
        
        summary = {
            "total_tests": len(self.TEST_QUERIES),
            "passed": passed_count,
            "failed": len(self.TEST_QUERIES) - passed_count,
            "pass_rate": pass_rate,
            "average_match_ratio": avg_match_ratio,
            "total_documents_retrieved": total_documents_retrieved,
            "results": results
        }
        
        logger.info("\n" + "="*60)
        logger.info("RAG VALIDATION RESULTS")
        logger.info("="*60)
        logger.info(f"Total Tests: {summary['total_tests']}")
        logger.info(f"Passed: {summary['passed']} ({summary['pass_rate']:.1%})")
        logger.info(f"Failed: {summary['failed']}")
        logger.info(f"Average Match Ratio: {summary['average_match_ratio']:.1%}")
        logger.info(f"Total Documents Retrieved: {summary['total_documents_retrieved']}")
        logger.info("="*60 + "\n")
        
        return summary
    
    async def test_filtering(self) -> Dict[str, Any]:
        """Test country and visa type filtering"""
        logger.info("🧪 Testing RAG Filtering...")
        
        tests = [
            {
                "name": "Filter by country (USA)",
                "query": "visitor visa requirements",
                "country": "USA",
                "expected_in_result": ["USA", "visitor"]
            },
            {
                "name": "Filter by visa type (Work)",
                "query": "work visa",
                "visa_type": "Work",
                "expected_in_result": ["work", "employment"]
            }
        ]
        
        results = []
        for test in tests:
            try:
                context = await self.rag_service.retrieve_context(
                    query=test["query"],
                    country=test.get("country"),
                    visa_type=test.get("visa_type"),
                    top_k=5
                )
                
                documents = context.get("documents", [])
                all_content = " ".join([doc["content"] for doc in documents]).lower()
                
                # Check if expected items are in results
                expected_found = all(
                    item.lower() in all_content 
                    for item in test.get("expected_in_result", [])
                )
                
                results.append({
                    "test": test["name"],
                    "passed": expected_found,
                    "documents_retrieved": len(documents),
                    "sources": context.get("sources", [])
                })
                
                logger.info(f"  {'✅' if expected_found else '❌'} {test['name']}")
                
            except Exception as e:
                logger.error(f"Error in test {test['name']}: {str(e)}")
                results.append({
                    "test": test["name"],
                    "passed": False,
                    "error": str(e)
                })
        
        return {
            "filter_tests": results,
            "filter_pass_rate": sum(1 for r in results if r.get("passed")) / len(results) if results else 0
        }
    
    async def test_retrieval_quality(self) -> Dict[str, Any]:
        """Test retrieval quality metrics"""
        logger.info("🧪 Testing Retrieval Quality...")
        
        # Test for duplicate results
        duplicate_test = await self.rag_service.retrieve_context(
            query="visa requirements",
            top_k=10
        )
        
        doc_ids = [d.get("content", "")[:50] for d in duplicate_test.get("documents", [])]
        unique_count = len(set(doc_ids))
        total_count = len(doc_ids)
        
        # Test score distribution
        scores = [d.get("score", 0) for d in duplicate_test.get("documents", [])]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        return {
            "retrieval_quality": {
                "total_retrieved": total_count,
                "unique_results": unique_count,
                "average_score": avg_score,
                "score_distribution": {
                    "high": len([s for s in scores if s > 0.8]),
                    "medium": len([s for s in scores if 0.5 <= s <= 0.8]),
                    "low": len([s for s in scores if s < 0.5])
                }
            }
        }


async def validate_rag_system(rag_service) -> Dict[str, Any]:
    """
    Complete RAG system validation
    
    Args:
        rag_service: RAG service instance
        
    Returns:
        Comprehensive validation report
    """
    validator = RAGValidator(rag_service)
    
    try:
        # Run validation suite
        suite_results = await validator.run_validation_suite()
        
        # Test filtering
        filter_results = await validator.test_filtering()
        
        # Test quality
        quality_results = await validator.test_retrieval_quality()
        
        report = {
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
            "validation_suite": suite_results,
            "filter_tests": filter_results,
            "quality_metrics": quality_results,
            "overall_status": "PASSED" if suite_results.get("pass_rate", 0) >= 0.6 else "NEEDS_IMPROVEMENT"
        }
        
        logger.info(f"Overall Status: {report['overall_status']}")
        
        return report
        
    except Exception as e:
        logger.error(f"Error running validation: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "overall_status": "ERROR"
        }