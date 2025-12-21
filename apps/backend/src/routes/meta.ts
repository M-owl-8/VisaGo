import express, { Request, Response } from 'express';
import { ISO_COUNTRIES } from '../data/countries-iso2';

const router = express.Router();

/**
 * GET /api/meta/countries
 * Returns ISO 3166-1 alpha-2 country list for pickers and normalization.
 */
router.get('/countries', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: ISO_COUNTRIES,
  });
});

export default router;
