"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_service_1 = require("../services/chat.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============================================================================
// MIDDLEWARE
// ============================================================================
// Require authentication for all chat routes
router.use(auth_1.authenticateToken);
// ============================================================================
// ROUTES
// ============================================================================
/**
 * POST /api/chat/send
 * Send a message and get AI response
 */
router.post("/send", async (req, res) => {
    try {
        const userId = req.user.id;
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
        const response = await chat_service_1.chatService.sendMessage(userId, content, applicationId, conversationHistory);
        res.status(201).json({
            success: true,
            data: response,
        });
    }
    catch (error) {
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
router.get("/history", async (req, res) => {
    try {
        const userId = req.user.id;
        const applicationId = req.query.applicationId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        // Validate pagination
        if (limit > 100) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Limit cannot exceed 100",
                },
            });
        }
        const history = await chat_service_1.chatService.getConversationHistory(userId, applicationId, limit, offset);
        res.json({
            success: true,
            data: history,
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
 * POST /api/chat/search
 * Search documents and knowledge base
 */
router.post("/search", async (req, res) => {
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
router.delete("/history", async (req, res) => {
    try {
        const userId = req.user.id;
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
router.get("/stats", async (req, res) => {
    try {
        const userId = req.user.id;
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
exports.default = router;
//# sourceMappingURL=chat.js.map