import express, { Request, Response, NextFunction } from "express";
import { CountriesService } from "../services/countries.service";
import { checkVisaRequirement, getAllVisaRequiredCountries, getVisaRequirementsByRegion } from "../services/visa-requirements.service";

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

/**
 * GET /api/countries/visa-requirements/check
 * Check visa requirement for a country (for Uzbek citizens by default)
 * Query params: countryName (required), nationalityCode (optional, default: UZ)
 */
router.get("/visa-requirements/check", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { countryName, nationalityCode } = req.query;

    if (!countryName) {
      return res.status(400).json({
        success: false,
        error: { message: "countryName query parameter is required" },
      });
    }

    const requirement = await checkVisaRequirement(
      countryName as string,
      (nationalityCode as string) || 'UZ'
    );

    res.json({
      success: true,
      data: requirement,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/countries/visa-requirements/all
 * Get all countries that require visas (for Uzbek citizens by default)
 * Query params: nationalityCode (optional, default: UZ)
 */
router.get("/visa-requirements/all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nationalityCode } = req.query;
    const countries = getAllVisaRequiredCountries((nationalityCode as string) || 'UZ');

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
 * GET /api/countries/visa-requirements/regions
 * Get visa requirements organized by region (for Uzbek citizens by default)
 * Query params: nationalityCode (optional, default: UZ)
 */
router.get("/visa-requirements/regions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nationalityCode } = req.query;
    const regions = getVisaRequirementsByRegion((nationalityCode as string) || 'UZ');

    res.json({
      success: true,
      data: regions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;