import express, { Request, Response, Router } from "express";
import { chatService as ChatService } from "../services/chat.service";
import { authenticateToken } from "../middleware/auth";
import { validateRAGRequest } from "../middleware/input-validation";

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Require authentication for all chat routes
router.use(authenticateToken);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/chat
 * Send a message and get AI response (primary endpoint)
 */
router.post("/", validateRAGRequest, async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
          message: "Message content is required",
        },
      });
    }

    const response = await ChatService.sendMessage(
      userId,
      content,
      applicationId,
      conversationHistory
    );

    // Increment rate limit counter after successful message
    const { incrementChatMessageCount, getChatRateLimitInfo } = await import("../middleware/chat-rate-limit");
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
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to process message",
      },
    });
  }
});

/**
 * POST /api/chat/send
 * Send a message (legacy endpoint, redirects to POST /api/chat)
 */
router.post("/send", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const { content, applicationId, conversationHistory } = req.body;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Message content is required",
        },
      });
    }

    const response = await ChatService.sendMessage(
      userId,
      content,
      applicationId,
      conversationHistory
    );

    // Increment rate limit counter after successful message
    const { incrementChatMessageCount, getChatRateLimitInfo } = await import("../middleware/chat-rate-limit");
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
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to process message",
      },
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
          message: "Limit cannot exceed 100",
        },
      });
    }

    const history = await ChatService.getConversationHistory(
      userId,
      applicationId,
      limit,
      offset
    );

    res.json({
      success: true,
      data: history,
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
 * POST /api/chat/search
 * Search documents and knowledge base
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Search query is required",
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
router.delete("/history", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const applicationId = req.query.applicationId as string | undefined;

    const result = await ChatService.clearConversationHistory(
      userId,
      applicationId
    );

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
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
 * Get specific session details with all messages
 */
router.get("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const { sessionId } = req.params;

    const session = await ChatService.getSessionDetails(sessionId, userId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    if (error.message === "Session not found") {
      return res.status(404).json({
        success: false,
        error: {
          message: "Session not found",
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
router.patch("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Title is required",
        },
      });
    }

    const session = await ChatService.renameSession(
      sessionId,
      userId,
      title.trim()
    );

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    if (error.message === "Session not found") {
      return res.status(404).json({
        success: false,
        error: {
          message: "Session not found",
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
router.delete("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const { sessionId } = req.params;

    const result = await ChatService.deleteSession(sessionId);

    res.json({
      success: true,
      data: result,
      message: "Session deleted successfully",
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
router.post(
  "/messages/:messageId/feedback",
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
      const { messageId } = req.params;
      const { feedback } = req.body;

      if (!feedback || !["thumbs_up", "thumbs_down"].includes(feedback)) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Valid feedback type required (thumbs_up or thumbs_down)",
          },
        });
      }

      const message = await ChatService.addMessageFeedback(
        messageId,
        userId,
        feedback
      );

      res.json({
        success: true,
        data: message,
        message: "Feedback recorded successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/chat/search (Enhanced with filters)
 * Search documents with optional country/visa type filters
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query, country, visaType, limit } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Search query is required",
        },
      });
    }

    const results = await ChatService.searchDocuments(
      query,
      country,
      visaType,
      limit
    );

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
router.get("/quota", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const { getChatRateLimitInfo } = await import("../middleware/chat-rate-limit");
    
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
        message: error.message || "Failed to fetch quota information",
      },
    });
  }
});

/**
 * GET /api/chat/usage/daily
 * Get daily usage and cost data
 */
router.get("/usage/daily", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
router.get("/usage/weekly", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
router.get("/usage/monthly", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
router.get("/usage/cost-analysis", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
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
router.post("/increment-message-count", async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not authenticated",
        },
      });
    }
    const { incrementChatMessageCount } = await import("../middleware/chat-rate-limit");
    
    const newCount = await incrementChatMessageCount(userId);
    
    const { getChatRateLimitInfo } = await import("../middleware/chat-rate-limit");
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