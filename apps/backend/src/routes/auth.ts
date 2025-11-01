import express, { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { authenticateToken } from "../middleware/auth";
import { ApiError } from "../utils/errors";

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login({
      email,
      password,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/google
 * Login/Register with Google OAuth
 */
router.post("/google", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { googleId, email, firstName, lastName, avatar } = req.body;

    if (!googleId || !email) {
      throw new ApiError(422, "googleId and email are required");
    }

    const result = await AuthService.verifyGoogleAuth({
      googleId,
      email,
      firstName,
      lastName,
      avatar,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get("/me", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await AuthService.getProfile(req.userId!);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/me
 * Update user profile (requires authentication)
 */
router.put("/me", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await AuthService.updateProfile(req.userId!, req.body);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;