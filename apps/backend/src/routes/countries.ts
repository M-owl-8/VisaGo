import express, { Request, Response, NextFunction } from "express";
import { CountriesService } from "../services/countries.service";

const router = express.Router();

/**
 * GET /api/countries
 * Get all countries (with optional search)
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const countries = await CountriesService.getAllCountries(search as string);

    res.json({
      success: true,
      data: countries,
      count: countries.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/countries/popular
 * Get popular countries (top 10)
 */
router.get("/popular", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countries = await CountriesService.getPopularCountries();

    res.json({
      success: true,
      data: countries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/countries/:id
 * Get country by ID
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const country = await CountriesService.getCountryById(req.params.id);

    res.json({
      success: true,
      data: country,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/countries/code/:code
 * Get country by ISO code (e.g., US, GB)
 */
router.get("/code/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const country = await CountriesService.getCountryByCode(req.params.code);

    res.json({
      success: true,
      data: country,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/countries/:countryId/visa-types
 * Get all visa types for a country
 */
router.get("/:countryId/visa-types", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visaTypes = await CountriesService.getVisaTypesByCountry(req.params.countryId);

    res.json({
      success: true,
      data: visaTypes,
    });
  } catch (error) {
    next(error);
  }
});

export default router;