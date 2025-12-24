import express, { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { chatRateLimitMiddleware, attachChatLimitHeaders } from '../middleware/chat-rate-limit';
import { isKetdikInstructionIntent } from '../services/ketdik/ketdik.intent';
import { getKetdikInstruction } from '../services/ketdik/ketdik.service';
import { logInfo, logWarn, logError } from '../middleware/logger';

const router = Router();

router.use(authenticateToken);
router.use(chatRateLimitMiddleware);
router.use(attachChatLimitHeaders);

router.post('/ketdik', async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
    }

    const { message, country, visaType, language } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'message is required' },
      });
    }

    if (!isKetdikInstructionIntent(message)) {
      logWarn('[Ketdik Route] Intent not eligible for Ketdik', {
        userId,
        country,
        visaType,
      });
      return res.status(400).json({
        success: false,
        error: {
          message:
            'This endpoint is only for document collection instructions. Please ask how/where to obtain or prepare a document.',
        },
      });
    }

    const result = await getKetdikInstruction({
      message,
      country,
      visaType,
      language: language as 'uz' | 'ru' | 'en' | undefined,
      userId,
    });

    logInfo('[Ketdik Route] Response sent', {
      userId,
      usedFallback: result.usedFallback,
      model: result.model,
    });

    return res.status(200).json({
      success: true,
      data: {
        answer: result.answer,
        model: 'ketdik',
        usedFallback: result.usedFallback,
      },
    });
  } catch (error: any) {
    logError('[Ketdik Route] Error', error, {});
    return res.status(500).json({
      success: false,
      error: { message: error?.message || 'Failed to process Ketdik request' },
    });
  }
});

export default router;
