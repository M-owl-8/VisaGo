import express, { Request, Response, Router } from "express";
import { chatService as ChatService } from "../services/chat.service";
import { authenticateToken } from "../middleware/auth";

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
 * POST /api/chat/send
 * Send a message and get AI response
 */
router.post("/send", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
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

    res.status(201).json({
      success: true,
      data: response,
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
    const userId = (req as any).user.id;
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
    const userId = (req as any).user.id;
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
    const userId = (req as any).user.id;

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

export default router;