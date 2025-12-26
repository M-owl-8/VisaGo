import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { ISO_COUNTRIES } from '../data/countries-iso2';
import { COUNTRY_REGISTRY } from '../config/country-registry';

const router = express.Router();
const countriesETag = crypto
  .createHash('sha1')
  .update(JSON.stringify(ISO_COUNTRIES))
  .digest('hex');

/**
 * GET /api/meta/countries
 * Returns ISO 3166-1 alpha-2 country list for pickers and normalization.
 */
router.get('/countries', (_req: Request, res: Response) => {
  const ifNoneMatch = _req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === countriesETag) {
    return res.status(304).end();
  }

  res.setHeader('ETag', countriesETag);
  res.json({
    success: true,
    data: ISO_COUNTRIES,
  });
});

/**
 * GET /api/meta/country-registry
 * Returns canonical country registry with metadata (Schengen, aliases, visa categories)
 */
router.get('/country-registry', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: COUNTRY_REGISTRY,
  });
});

export default router;
