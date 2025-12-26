"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_service_1 = require("../services/chat.service");
const auth_1 = require("../middleware/auth");
const input_validation_1 = require("../middleware/input-validation");
const chat_rate_limit_1 = require("../middleware/chat-rate-limit");
const router = (0, express_1.Router)();
// ============================================================================
// MIDDLEWARE
// ============================================================================
// Require authentication for all chat routes
router.use(auth_1.authenticateToken);
// Apply rate limiting AFTER authentication (so we have userId)
router.use(chat_rate_limit_1.chatRateLimitMiddleware);
router.use(chat_rate_limit_1.attachChatLimitHeaders);
// ============================================================================
// ROUTES
// ============================================================================
/**
 * POST /api/chat
 * Send a message and get AI response (primary endpoint)
 */
router.post('/', input_validation_1.validateRAGRequest, async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { query, applicationId, conversationHistory } = req.body;
        // Use 'query' from middleware validation, fallback to 'content' for backward compatibility
        const content = query || req.body.content;
        // Validate required fields
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Message content is required',
                },
            });
        }
        console.log('[Chat Route] Processing message:', {
            userId,
            contentLength: content.length,
            hasApplicationId: !!applicationId,
            historyLength: conversationHistory?.length || 0,
        });
        // Phase 6: Use VisaConversationOrchestratorService for enhanced chat
        const { VisaConversationOrchestratorService } = await Promise.resolve().then(() => __importStar(require('../services/visa-conversation-orchestrator.service')));
        const orchestratorResponse = await VisaConversationOrchestratorService.handleUserMessage({
            userId,
            message: content,
            applicationId,
            conversationHistory,
        });
        // Convert orchestrator response to ChatService format for backward compatibility
        const response = {
            message: orchestratorResponse.reply,
            sources: orchestratorResponse.sources || [],
            tokens_used: orchestratorResponse.tokens_used || 0,
            model: orchestratorResponse.model || 'gpt-4',
            id: orchestratorResponse.id || `msg-${Date.now()}`,
            applicationContext: orchestratorResponse.applicationId
                ? {
                    applicationId: orchestratorResponse.applicationId,
                    countryCode: orchestratorResponse.countryCode,
                    visaType: orchestratorResponse.visaType,
                    riskLevel: orchestratorResponse.riskLevel,
                    riskDrivers: orchestratorResponse.riskDrivers,
                }
                : null,
            // Phase 6: Include self-check metadata (optional, for debugging/monitoring)
            selfCheck: orchestratorResponse.selfCheck,
        };
        // Validate response before sending
        if (!response || !response.message) {
            console.error('[Chat Route] Invalid response from orchestrator:', response);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'AI service returned invalid response. Please try again.',
                },
            });
        }
        console.log('[Chat Route] Message processed successfully (Phase 6):', {
            hasMessage: !!response.message,
            messageLength: response.message.length,
            hasId: !!response.id,
            model: response.model,
            messagePreview: response.message.substring(0, 100),
            selfCheckPassed: orchestratorResponse.selfCheck?.passed,
            selfCheckFlags: orchestratorResponse.selfCheck?.flags || [],
        });
        // Save messages to database (for history)
        try {
            const sessionId = await chat_service_1.chatService.getOrCreateSession(userId, applicationId);
            // Save user message
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    userId,
                    role: 'user',
                    content,
                    sources: JSON.stringify([]),
                    model: response.model,
                },
            });
            // Save assistant message
            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    userId,
                    role: 'assistant',
                    content: response.message,
                    sources: JSON.stringify(response.sources || []),
                    model: response.model,
                    tokensUsed: response.tokens_used || 0,
                },
            });
        }
        catch (saveError) {
            // Non-blocking: log but don't fail the request
            console.warn('[Chat Route] Failed to save messages to database:', saveError);
        }
        // Increment rate limit counter after successful message
        const { incrementChatMessageCount, getChatRateLimitInfo } = await Promise.resolve().then(() => __importStar(require('../middleware/chat-rate-limit')));
        await incrementChatMessageCount(userId);
        const limitInfo = await getChatRateLimitInfo(userId);
        // Ensure response structure is correct (handle optional properties)
        const responseData = {
            message: response.message,
            sources: response.sources || [],
            tokens_used: response.tokens_used || 0,
            model: response.model || 'gpt-4',
            id: response.id || `msg-${Date.now()}`,
            applicationContext: response.applicationContext || null,
        };
        console.log('[Chat Route] Sending response to client:', {
            hasMessage: !!responseData.message,
            messageLength: responseData.message.length,
            hasId: !!responseData.id,
        });
        res.status(201).json({
            success: true,
            data: responseData,
            quota: {
                messagesUsed: limitInfo.messagesUsed,
                messagesRemaining: limitInfo.messagesRemaining,
                limit: 50,
                resetTime: limitInfo.resetTime,
            },
        });
    }
    catch (error) {
        const userId = req.userId || req.user?.id;
        console.error('[Chat Route] Error processing message:', {
            error: error.message,
            stack: error.stack,
            userId,
            contentLength: req.body.content?.length || req.body.query?.length || 0,
        });
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to process message',
            },
        });
    }
});
/**
 * POST /api/chat/send
 * Send a message (legacy endpoint, redirects to POST /api/chat)
 */
router.post('/send', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { content, applicationId, conversationHistory } = req.body;
        // Validate required fields
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Message content is required',
                },
            });
        }
        const response = await chat_service_1.chatService.sendMessage(userId, content, applicationId, conversationHistory);
        // Increment rate limit counter after successful message
        const { incrementChatMessageCount, getChatRateLimitInfo } = await Promise.resolve().then(() => __importStar(require('../middleware/chat-rate-limit')));
        await incrementChatMessageCount(userId);
        const limitInfo = await getChatRateLimitInfo(userId);
        res.status(201).json({
            success: true,
            data: response,
            quota: {
                messagesUsed: limitInfo.messagesUsed,
                messagesRemaining: limitInfo.messagesRemaining,
                limit: 50,
                resetTime: limitInfo.resetTime,
            },
        });
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to process message',
            },
        });
    }
});
/**
 * GET /api/chat/history
 * Get conversation history
 */
router.get('/history', async (req, res) => {
    // Extract userId outside try-catch so it's accessible in catch block
    const userId = req.userId || req.user?.id;
    try {
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const applicationId = req.query.applicationId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        // Validate pagination
        if (limit > 100) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Limit cannot exceed 100',
                },
            });
        }
        // Fix: Pass undefined (not null) when applicationId is missing to use new API path
        // This prevents falling into legacy mode which expects sessionId
        // The service handles undefined applicationId by treating it as null internally
        const history = await chat_service_1.chatService.getConversationHistory(userId, applicationId || undefined, // Pass undefined, service will handle it
        limit, offset, userId // Always pass verified userId for security
        );
        // Always return success with data (empty array if no history)
        res.json({
            success: true,
            data: history || [], // Ensure we always return an array
        });
    }
    catch (error) {
        // Rate-limited error logging to prevent spam
        const errorKey = `chat-history-error-${userId}`;
        const errorCache = global.__chatErrorCache || {};
        if (!errorCache[errorKey] || Date.now() - errorCache[errorKey] > 5000) {
            errorCache[errorKey] = Date.now();
            global.__chatErrorCache = errorCache;
            const { logError } = await Promise.resolve().then(() => __importStar(require('../middleware/logger')));
            logError('[ChatHistory] Error loading history', error instanceof Error ? error : new Error(String(error)), {
                userId: req.userId || req.user?.id,
                applicationId: req.query.applicationId,
            });
        }
        // Return empty array instead of error to allow user to start chatting
        // This prevents 500 errors when no session exists yet
        res.json({
            success: true,
            data: [], // Return empty array instead of error
        });
    }
});
/**
 * POST /api/chat/search
 * Search documents and knowledge base
 */
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Search query is required',
                },
            });
        }
        const results = await chat_service_1.chatService.searchDocuments(query);
        res.json({
            success: true,
            data: results,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * DELETE /api/chat/history
 * Clear conversation history
 */
router.delete('/history', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const applicationId = req.query.applicationId;
        const result = await chat_service_1.chatService.clearConversationHistory(userId, applicationId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * GET /api/chat/stats
 * Get chat statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const stats = await chat_service_1.chatService.getChatStats(userId);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
// ============================================================================
// SESSION MANAGEMENT ROUTES
// ============================================================================
/**
 * GET /api/chat/sessions
 * Get all chat sessions for user with pagination
 */
router.get('/sessions', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const result = await chat_service_1.chatService.getUserSessions(userId, limit, offset);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * GET /api/chat/sessions/:sessionId
 * Get specific session details with message history (last N messages, default 100)
 */
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        // Validate limit (max 1000 to prevent abuse)
        if (limit > 1000) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Limit cannot exceed 1000',
                },
            });
        }
        const session = await chat_service_1.chatService.getSessionDetails(sessionId, userId, limit);
        res.json({
            success: true,
            data: session,
        });
    }
    catch (error) {
        if (error.message === 'Session not found') {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Session not found',
                },
            });
        }
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * PATCH /api/chat/sessions/:sessionId
 * Update session (rename, etc)
 */
router.patch('/sessions/:sessionId', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { sessionId } = req.params;
        const { title } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Title is required',
                },
            });
        }
        const session = await chat_service_1.chatService.renameSession(sessionId, userId, title.trim());
        res.json({
            success: true,
            data: session,
        });
    }
    catch (error) {
        if (error.message === 'Session not found') {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Session not found',
                },
            });
        }
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * DELETE /api/chat/sessions/:sessionId
 * Delete a specific chat session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { sessionId } = req.params;
        const result = await chat_service_1.chatService.deleteSession(sessionId);
        res.json({
            success: true,
            data: result,
            message: 'Session deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
// ============================================================================
// MESSAGE FEEDBACK AND SEARCH ROUTES
// ============================================================================
/**
 * POST /api/chat/messages/:messageId/feedback
 * Add feedback to a specific message
 */
router.post('/messages/:messageId/feedback', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { messageId } = req.params;
        const { feedback } = req.body;
        if (!feedback || !['thumbs_up', 'thumbs_down'].includes(feedback)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Valid feedback type required (thumbs_up or thumbs_down)',
                },
            });
        }
        const message = await chat_service_1.chatService.addMessageFeedback(messageId, userId, feedback);
        res.json({
            success: true,
            data: message,
            message: 'Feedback recorded successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * POST /api/chat/search (Enhanced with filters)
 * Search documents with optional country/visa type filters
 */
router.post('/search', async (req, res) => {
    try {
        const { query, country, visaType, limit } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Search query is required',
                },
            });
        }
        const results = await chat_service_1.chatService.searchDocuments(query, country, visaType, limit);
        res.json({
            success: true,
            data: results,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
// ============================================================================
// QUOTA AND USAGE TRACKING ROUTES
// ============================================================================
/**
 * GET /api/chat/quota
 * Check user's remaining chat message quota for today
 */
router.get('/quota', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { getChatRateLimitInfo } = await Promise.resolve().then(() => __importStar(require('../middleware/chat-rate-limit')));
        const limitInfo = await getChatRateLimitInfo(userId);
        res.json({
            success: true,
            data: {
                messagesUsed: limitInfo.messagesUsed,
                messagesRemaining: limitInfo.messagesRemaining,
                dailyLimit: limitInfo.messagesRemaining + limitInfo.messagesUsed,
                resetTime: limitInfo.resetTime,
                isLimited: limitInfo.isLimited,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to fetch quota information',
            },
        });
    }
});
/**
 * GET /api/chat/usage/daily
 * Get daily usage and cost data
 */
router.get('/usage/daily', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const usage = await chat_service_1.chatService.getDailyUsage(userId);
        res.json({
            success: true,
            data: {
                date: usage?.date || new Date(),
                requests: usage?.totalRequests || 0,
                tokens: usage?.totalTokens || 0,
                cost: usage?.totalCost || 0,
                avgResponseTime: usage?.avgResponseTime || 0,
                errors: usage?.errorCount || 0,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * GET /api/chat/usage/weekly
 * Get weekly usage and cost data
 */
router.get('/usage/weekly', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const usage = await chat_service_1.chatService.getWeeklyUsage(userId);
        res.json({
            success: true,
            data: usage,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * GET /api/chat/usage/monthly
 * Get monthly usage and cost data
 */
router.get('/usage/monthly', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const usage = await chat_service_1.chatService.getMonthlyUsage(userId);
        res.json({
            success: true,
            data: usage,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * GET /api/chat/usage/cost-analysis
 * Get comprehensive cost analysis across periods
 */
router.get('/usage/cost-analysis', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const costAnalysis = await chat_service_1.chatService.getCostAnalysis(userId);
        res.json({
            success: true,
            data: costAnalysis,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
/**
 * POST /api/chat/increment-message-count
 * Manually increment message count (for testing purposes)
 */
router.post('/increment-message-count', async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not authenticated',
                },
            });
        }
        const { incrementChatMessageCount } = await Promise.resolve().then(() => __importStar(require('../middleware/chat-rate-limit')));
        const newCount = await incrementChatMessageCount(userId);
        const { getChatRateLimitInfo } = await Promise.resolve().then(() => __importStar(require('../middleware/chat-rate-limit')));
        const limitInfo = await getChatRateLimitInfo(userId);
        res.json({
            success: true,
            data: {
                messagesUsed: limitInfo.messagesUsed,
                messagesRemaining: limitInfo.messagesRemaining,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map