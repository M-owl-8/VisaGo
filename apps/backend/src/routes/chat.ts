import express, { Request, Response, Router } from 'express';
import { chatService as ChatService } from '../services/chat.service';
import { authenticateToken } from '../middleware/auth';
import { validateRAGRequest } from '../middleware/input-validation';
import { chatRateLimitMiddleware, attachChatLimitHeaders } from '../middleware/chat-rate-limit';
import { UsageTrackingService } from '../services/usage-tracking.service';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Require authentication for all chat routes
router.use(authenticateToken);

// Apply rate limiting AFTER authentication (so we have userId)
router.use(chatRateLimitMiddleware);
router.use(attachChatLimitHeaders);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/chat
 * Send a message and get AI response (primary endpoint)
 */
router.post('/', validateRAGRequest, async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const { query, applicationId, conversationHistory, sessionId } = req.body;
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

    // Pre-flight cost check (conservative estimate)
    const anticipatedCents = UsageTrackingService.estimateCostCents(undefined, 10);
    const preflight = await UsageTrackingService.ensureWithinLimit(userId, anticipatedCents);
    res.setHeader('X-RateLimit-AI-Daily-Limit', preflight.limitCents);
    res.setHeader('X-RateLimit-AI-Daily-Remaining', preflight.remainingCents);
    res.setHeader('X-RateLimit-AI-Daily-Reset', preflight.resetAt);
    if (preflight.isLimited) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'AI daily cost limit reached. Try again after reset.',
          code: 'AI_COST_LIMIT_EXCEEDED',
        },
        data: preflight,
      });
    }

    console.log('[Chat Route] Processing message:', {
      userId,
      contentLength: content.length,
      hasApplicationId: !!applicationId,
      hasSessionId: !!sessionId,
      historyLength: conversationHistory?.length || 0,
    });

    // Phase 6: Use VisaConversationOrchestratorService for enhanced chat
    const { VisaConversationOrchestratorService } = await import(
      '../services/visa-conversation-orchestrator.service'
    );

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

    // Track AI cost usage
    const costCents = UsageTrackingService.estimateCostCents(
      orchestratorResponse.tokens_used,
      anticipatedCents
    );
    const postCost = await UsageTrackingService.incrementAICost(userId, costCents);
    res.setHeader('X-RateLimit-AI-Daily-Limit', postCost.limitCents);
    res.setHeader('X-RateLimit-AI-Daily-Remaining', postCost.remainingCents);
    res.setHeader('X-RateLimit-AI-Daily-Reset', postCost.resetAt);

    // Save messages to database (for history)
    let resolvedSessionId = sessionId as string | undefined;
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      if (resolvedSessionId) {
        const session = await prisma.chatSession.findFirst({
          where: { id: resolvedSessionId, userId },
        });
        if (!session) {
          return res.status(404).json({
            success: false,
            error: { message: 'Session not found' },
          });
        }
      } else {
        resolvedSessionId = await ChatService.getOrCreateSession(userId, applicationId);
      }

      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId: resolvedSessionId,
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
          sessionId: resolvedSessionId,
          userId,
          role: 'assistant',
          content: response.message,
          sources: JSON.stringify(response.sources || []),
          model: response.model,
          tokensUsed: response.tokens_used || 0,
        },
      });

      if (resolvedSessionId) {
        await ChatService.ensureSessionTitle(
          resolvedSessionId,
          content,
          response.applicationContext
        );
      }
    } catch (saveError) {
      // Non-blocking: log but don't fail the request
      console.warn('[Chat Route] Failed to save messages to database:', saveError);
    }

    // Increment rate limit counter after successful message
    const { incrementChatMessageCount, getChatRateLimitInfo } = await import(
      '../middleware/chat-rate-limit'
    );
    await incrementChatMessageCount(userId);
    const limitInfo = await getChatRateLimitInfo(userId);

    // Ensure response structure is correct (handle optional properties)
    const responseData = {
      message: response.message,
      sources: response.sources || [],
      tokens_used: response.tokens_used || 0,
      model: response.model || 'gpt-4',
      id: response.id || `msg-${Date.now()}`,
      sessionId: resolvedSessionId,
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
  } catch (error: any) {
    const userId = req.userId || (req as any).user?.id;
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
router.post('/send', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const { content, applicationId, conversationHistory, sessionId } = req.body;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Message content is required',
        },
      });
    }

    const response = await ChatService.sendMessage(
      userId,
      content,
      applicationId,
      conversationHistory,
      sessionId
    );

    // Increment rate limit counter after successful message
    const { incrementChatMessageCount, getChatRateLimitInfo } = await import(
      '../middleware/chat-rate-limit'
    );
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
  } catch (error: any) {
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
 * POST /api/chat/sessions
 * Create a new chat session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
    }

    const { applicationId, title } = req.body;
    const session = await ChatService.createSession(userId, applicationId, title);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to create session',
      },
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history
 */
router.get('/history', async (req: Request, res: Response) => {
  // Extract userId outside try-catch so it's accessible in catch block
  const userId = req.userId || (req as any).user?.id;

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const applicationId = req.query.applicationId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

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
    const history = await ChatService.getConversationHistory(
      userId,
      applicationId || undefined, // Pass undefined, service will handle it
      limit,
      offset,
      userId // Always pass verified userId for security
    );

    // Always return success with data (empty array if no history)
    res.json({
      success: true,
      data: history || [], // Ensure we always return an array
    });
  } catch (error: any) {
    // Rate-limited error logging to prevent spam
    const errorKey = `chat-history-error-${userId}`;
    const errorCache = (global as any).__chatErrorCache || {};

    if (!errorCache[errorKey] || Date.now() - errorCache[errorKey] > 5000) {
      errorCache[errorKey] = Date.now();
      (global as any).__chatErrorCache = errorCache;

      const { logError } = await import('../middleware/logger');
      logError(
        '[ChatHistory] Error loading history',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: req.userId || (req as any).user?.id,
          applicationId: req.query.applicationId,
        }
      );
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
router.post('/search', async (req: Request, res: Response) => {
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

    const results = await ChatService.searchDocuments(query);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
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
router.delete('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const applicationId = req.query.applicationId as string | undefined;

    const result = await ChatService.clearConversationHistory(userId, applicationId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
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
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }

    const stats = await ChatService.getChatStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
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
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await ChatService.getUserSessions(userId, limit, offset);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
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
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Validate limit (max 1000 to prevent abuse)
    if (limit > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Limit cannot exceed 1000',
        },
      });
    }

    const session = await ChatService.getSessionDetails(sessionId, userId, limit);

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
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
router.patch('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
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

    const session = await ChatService.renameSession(sessionId, userId, title.trim());

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
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
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const { sessionId } = req.params;

    const result = await ChatService.deleteSession(sessionId);

    res.json({
      success: true,
      data: result,
      message: 'Session deleted successfully',
    });
  } catch (error: any) {
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
router.post('/messages/:messageId/feedback', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
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

    const message = await ChatService.addMessageFeedback(messageId, userId, feedback);

    res.json({
      success: true,
      data: message,
      message: 'Feedback recorded successfully',
    });
  } catch (error: any) {
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
router.post('/search', async (req: Request, res: Response) => {
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

    const results = await ChatService.searchDocuments(query, country, visaType, limit);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
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
router.get('/quota', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const { getChatRateLimitInfo } = await import('../middleware/chat-rate-limit');

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
  } catch (error: any) {
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
router.get('/usage/daily', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }

    const usage = await ChatService.getDailyUsage(userId);

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
  } catch (error: any) {
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
router.get('/usage/weekly', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }

    const usage = await ChatService.getWeeklyUsage(userId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
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
router.get('/usage/monthly', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }

    const usage = await ChatService.getMonthlyUsage(userId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
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
router.get('/usage/cost-analysis', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }

    const costAnalysis = await ChatService.getCostAnalysis(userId);

    res.json({
      success: true,
      data: costAnalysis,
    });
  } catch (error: any) {
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
router.post('/increment-message-count', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not authenticated',
        },
      });
    }
    const { incrementChatMessageCount } = await import('../middleware/chat-rate-limit');

    const newCount = await incrementChatMessageCount(userId);

    const { getChatRateLimitInfo } = await import('../middleware/chat-rate-limit');
    const limitInfo = await getChatRateLimitInfo(userId);

    res.json({
      success: true,
      data: {
        messagesUsed: limitInfo.messagesUsed,
        messagesRemaining: limitInfo.messagesRemaining,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

export default router;
